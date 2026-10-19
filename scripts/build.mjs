import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Marked } from 'marked';
import GithubSlugger from 'github-slugger';
import katex from 'katex';
import { isEquationParagraph, pairComparisons } from './comparisons.mjs';
import { getCodeExample, codeLanguages, languageLabels } from './code-examples.mjs';
import { build as bundle } from 'esbuild';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHighlighter } from 'shiki';
import { buildRunnerAssets } from './runtime-assets.mjs';

const highlighter = await createHighlighter({ themes: ['light-plus', 'dark-plus'], langs: ['javascript', 'python', 'c', 'rust'] });
const highlighted = new Map();
const runFile = promisify(execFile);

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const documents = [
  { source: 'README.md', output: 'index.html', title: 'math-as-code', lang: 'en', guide: true },
  { source: 'PYTHON-README.md', output: 'PYTHON-README.html', title: 'math-as-code · Python', lang: 'en', guide: true },
  { source: 'README-zh.md', output: 'README-zh.html', title: 'math-as-code · 中文版', lang: 'zh', guide: true },
  { source: 'docs/ml-deep-learning.md', output: 'machine-learning.html', title: 'ML & deep learning · Math as Code', lang: 'en', guide: true, description: 'Read a neural network training formula, unpack every symbol, and train a tiny network with runnable code.' },
  { source: 'CONTRIBUTING.md', output: 'CONTRIBUTING.html', title: 'Contributing · math-as-code', lang: 'en' },
  { source: 'LICENSE.md', output: 'LICENSE.html', title: 'License · math-as-code', lang: 'en' },
  { source: 'docs/run-locally.md', output: 'run-locally.html', title: 'Run locally · math-as-code', lang: 'en' },
  { source: 'docs/blog.md', output: 'blog.html', title: 'Blog · math-as-code', lang: 'en', description: 'Notes on learning mathematical notation through code.' },
  { source: 'docs/changelog.md', output: 'changelog.html', title: 'Changelog · math-as-code', lang: 'en', description: 'Changes to this edition of Math as Code.' }
];

const escape = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const decodeEntities = text => text.replace(/&(?:amp|lt|gt|quot|apos|space|plus|#\d+|#x[0-9a-f]+);/gi, entity => {
  const name = entity.slice(1, -1).toLowerCase();
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", space: ' ', plus: '+' };
  if (name in named) return named[name];
  const value = name.startsWith('#x') ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
  return value <= 0x10ffff ? String.fromCodePoint(value) : '\ufffd';
});

export function localHref(href, source = 'README.md') {
  href = href.trim().replace(/[\u0000-\u001f\u007f]/g, '');
  const [path, hash] = href.split('#');
  const filename = path.replace(/^\.\//, '');
  const relative = !/^(?:[a-z][a-z\d+.-]*:|\/)/i.test(path)
    ? posix.normalize(posix.join(posix.dirname(source), filename)) : filename;
  const document = documents.find(page => page.source === relative) || documents.find(page => page.source === filename);
  if (document) return `/${document.output}${hash ? `#${hash}` : ''}`;
  if (/^https?:\/\/github\.com\/(?:Jam3|Experience-Monks)\/math-as-code\/blob\/master\/LICENSE\.md$/i.test(path)) return '/LICENSE.html';
  if (relative === 'examples/notation.cjs' || relative === 'examples/notation.py') return `/${relative}${hash ? `#${hash}` : ''}`;
  if (/^(?:https?:|mailto:|#|\/)/i.test(href)) return href;
  if (/^[a-z][a-z\d+.-]*:/i.test(href)) return '#';
  return href;
}

export function renderDocument(markdown, document = documents[0], { comparisons = true } = {}) {
  const slugger = new GithubSlugger();
  const headings = [];
  let formulaCount = 0;
  let comparisonCount = 0;
  let displayMath = false;
  let codeCount = 0;
  let switcherCount = 0;
  const renderCode = (text, language) => {
    const key = `${language}:${text}`;
    if (!highlighted.has(key)) {
      const tokens = language ? highlighter.codeToTokens(text, { lang: language, themes: { light: 'light-plus', dark: 'dark-plus' } }).tokens : text.split('\n').map(content => [{ content }]);
      highlighted.set(key, tokens.map((line, index) => ({ number: index + 1, text: text.split('\n')[index], tokens: line.map(token => ({ content: token.content, ...(token.htmlStyle?.color ? { color: token.htmlStyle.color, colorDark: token.htmlStyle['--shiki-dark'] } : {}) })) })));
    }
    const lines = JSON.stringify(highlighted.get(key)).replaceAll('<', '\\u003c');
    const fallback = highlighted.get(key).map(line => line.tokens.map(token => token.colorDark
      ? `<span style="color:${escape(token.colorDark)}">${escape(token.content)}</span>` : escape(token.content)).join('')).join('\n');
    return `<div class="code-fence"><pre><code${language ? ` class="language-${language}"` : ''}>${fallback}</code></pre><script type="application/json" class="code-example__tokens">${lines}</script></div>\n`;
  };
  const marked = new Marked({ gfm: true });
  marked.use({
    hooks: { processAllTokens(tokens) { return comparisons ? pairComparisons(tokens) : tokens; } },
    extensions: [{
      name: 'comparison', level: 'block', childTokens: ['notation', 'implementation'],
      renderer(token) {
        comparisonCount++;
        const label = document.lang === 'zh' ? '数学表达' : 'Notation';
        const codeToken = token.implementation.find(item => item.type === 'code');
        const language = getCodeExample(codeToken.text, document.source) ? (document.lang === 'zh' ? '代码' : 'Code') : /^(py|python|python3)$/.test(token.lang || '') ? 'Python' : /^(js|javascript)$/.test(token.lang || '') ? 'JavaScript' : document.lang === 'zh' ? '代码' : 'Code';
        return `<div class="comparison"><div class="comparison__notation"><p class="comparison__label">${label}</p>${this.parser.parse(token.notation)}</div><div class="comparison__implementation"><p class="comparison__label">${language}</p>${this.parser.parse(token.implementation)}</div></div>\n`;
      }
    }],
    renderer: {
    paragraph(token) {
      const previous = displayMath;
      displayMath = isEquationParagraph(token);
      try {
        return `<p${displayMath ? ' class="display-equation"' : ''}>${this.parser.parseInline(token.tokens)}</p>\n`;
      } finally { displayMath = previous; }
    },
    heading({ tokens, depth }) {
      const content = this.parser.parseInline(tokens);
      const text = decodeEntities(content.replace(/<[^>]*>/g, ''));
      const id = slugger.slug(text);
      headings.push({ id, text, depth });
      return `<h${depth} id="${escape(id)}">${content}</h${depth}>\n`;
    },
    link({ href, title, tokens }) {
      const target = localHref(decodeEntities(href), document.source);
      return `<a href="${escape(target)}"${title ? ` title="${escape(title)}"` : ''}>${this.parser.parseInline(tokens)}</a>`;
    },
    image({ href, text }) {
      if (/^https?:\/\/latex\.codecogs\.com\/svg\.latex\?/i.test(href)) {
        let tex = decodeEntities(decodeURIComponent(href.slice(href.indexOf('?') + 1)));
        tex = tex.replace(/\\begin\{align\*?\}/g, '\\begin{aligned}').replace(/\\end\{align\*?\}/g, '\\end{aligned}');
        formulaCount++;
        try {
          return `<span class="formula${displayMath ? ' formula--display' : ''}">${katex.renderToString(tex, { displayMode: displayMath, throwOnError: true, trust: false, strict: 'error', maxExpand: 1000, output: 'htmlAndMathml' })}</span>`;
        } catch (error) {
          throw new Error(`Invalid formula '${text}' in ${document.source}: ${error.message}`, { cause: error });
        }
      }
      throw new Error(`Unsupported image in ${document.source}: ${text}. Add a local asset rather than a runtime network dependency.`);
    },
    code({ text, lang }) {
      const example = getCodeExample(text, document.source);
      codeCount++;
      if (example) {
        switcherCount++;
        const id = `code-example-${codeCount}`;
        const tabs = codeLanguages.map(language => {
          const active = language === example.nativeLanguage;
          return `<button class="code-example__tab" id="${id}-${language}-tab" type="button" role="tab" aria-controls="${id}-${language}-panel" aria-selected="${active}" tabindex="${active ? 0 : -1}" data-language="${language}">${languageLabels[language]}</button>`;
        }).join('');
        const panels = codeLanguages.map(language => `<div class="code-example__panel" id="${id}-${language}-panel" role="tabpanel" aria-labelledby="${id}-${language}-tab" tabindex="0" data-language="${language}"${language === example.nativeLanguage ? '' : ' hidden'}>${renderCode(example.variants[language], language)}</div>`).join('');
        return `<div class="code-example" data-code-example="${example.id}" data-default-language="${example.nativeLanguage}"><div class="code-example__tabs" role="tablist" aria-label="${document.lang === 'zh' ? '代码语言' : 'Code language'}">${tabs}</div>${panels}</div>\n`;
      }
      const language = /^(js|javascript)$/.test(lang || '') ? 'javascript' : /^(py|python|python3)$/.test(lang || '') ? 'python' : null;
      return renderCode(text, language);
    },
    html({ text }) {
      if (/^\s*<!--[\s\S]*-->\s*$/.test(text)) return '';
      // Authored inline notation and compatibility anchors are the only raw HTML.
      if (/^<\/?(?:sup|sub|em|strong|br)\s*\/?\s*>$/i.test(text)) return text;
      if (/^\s*<a id="[\p{L}\p{N}_-]+"><\/a>\s*$/u.test(text)) return text;
      if (/^<a id="[\p{L}\p{N}_-]+">$|^<\/a>$/u.test(text)) return text;
      return escape(text);
    }
  } });
  let content = marked.parse(markdown);
  // Source-only documents such as the MIT license still need a reader route.
  if (!headings.length) {
    const title = document.title.split(' · ')[0];
    const id = slugger.slug(title);
    headings.push({ id, text: title, depth: 1 });
    content = `<h1 id="${escape(id)}">${escape(title)}</h1>\n${content}`;
  }
  const description = document.description || (document.lang === 'zh'
    ? '用代码、示例和练习理解数学符号。'
    : 'Mathematical notation explained through code, examples and practice.');
  const canonicalPath = document.output === 'index.html' ? '/' : `/${document.output.replace(/\.html$/, '')}`;
  const html = `<!doctype html>
<html lang="${document.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(document.title)}</title>
<meta name="description" content="${escape(description)}"><link rel="canonical" href="https://mathasacode.aulenor.com${escape(canonicalPath)}"><link rel="icon" type="image/png" href="/assets/logo.png">
<link rel="stylesheet" href="/assets/katex.min.css"><link rel="stylesheet" href="/assets/app.css"><script type="module" src="/assets/app.mjs"></script></head>
<body data-reader="true" data-guide="${document.guide ? 'true' : 'false'}" class="style-vega"><div class="app-loading" role="status"><div class="app-loading__brand">Math as Code</div><div class="app-loading__body">${document.lang === 'zh' ? '正在打开指南…' : 'Opening the guide…'}</div></div><noscript><style>html:has(body[data-reader="true"]){height:auto;overflow:auto}body[data-reader="true"]:not(.app-ready){height:auto;overflow:auto;padding:24px;max-width:1000px;margin:auto}body[data-reader="true"]:not(.app-ready)>:is(main,nav){display:block}.app-loading{display:none}body:not(.app-ready) main>:is(h1,h2,h3,h4){margin:30px 0 15px;font-size:1.4em;font-weight:600}body:not(.app-ready) main>:is(p,ul,ol,blockquote){margin-bottom:20px;line-height:1.8}body:not(.app-ready) .code-example__tabs{display:none}</style></noscript><a class="skip-link" href="#guide-content">${document.lang === 'zh' ? '跳至正文' : 'Skip to guide'}</a><nav aria-label="Guide versions"><a href="/">JavaScript guide</a><a href="/PYTHON-README.html">Python guide</a><a href="/README-zh.html">中文版</a><a href="https://github.com/alikatgh/mathasacode">Repository</a></nav><main id="guide-content" tabindex="-1">${content}</main></body></html>\n`;
  return { html, headings, formulaCount, comparisonCount, codeCount, switcherCount };
}

export async function buildSite(outDir = join(projectRoot, 'dist')) {
  await mkdir(outDir, { recursive: true });
  const pages = [];
  for (const document of documents) {
    const source = await readFile(join(projectRoot, document.source), 'utf8');
    const result = renderDocument(source, document);
    if (document.guide && result.switcherCount !== result.codeCount) {
      throw new Error(`${document.source} has an untranslated code example. Update its translations and source fingerprint before building.`);
    }
    await writeFile(join(outDir, document.output), result.html);
    pages.push({ ...document, ...result });
  }
  await mkdir(join(outDir, 'assets'), { recursive: true });
  for (const name of ['_headers', 'robots.txt', 'sitemap.xml', '404.html']) {
    await cp(join(projectRoot, 'site', name), join(outDir, name));
  }
  await cp(join(projectRoot, 'site/assets/logo.png'), join(outDir, 'assets/logo.png'));
  await cp(join(projectRoot, 'node_modules/katex/dist/katex.min.css'), join(outDir, 'assets/katex.min.css'));
  await cp(join(projectRoot, 'node_modules/katex/dist/fonts'), join(outDir, 'assets/fonts'), { recursive: true });
  // Numerical catalog modules also serve the direct Node verification suite.
  for (const name of ['activities.mjs', 'progress.mjs']) {
    await cp(join(projectRoot, 'site', name), join(outDir, 'assets', name));
  }
  await buildRunnerAssets(outDir);
  await bundle({
    entryPoints: [join(projectRoot, 'site/app.jsx')],
    outdir: join(outDir, 'assets'),
    entryNames: 'app',
    chunkNames: 'chunks/[name]-[hash]',
    outExtension: { '.js': '.mjs' },
    splitting: true,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    jsx: 'automatic',
    plugins: [{ name: 'canonical-notation', setup(build) {
      build.onResolve({ filter: /^\.\/notation\.mjs$/ }, () => ({ path: 'notation', namespace: 'canonical-notation' }));
      build.onLoad({ filter: /.*/, namespace: 'canonical-notation' }, async () => ({ contents: (await readFile(join(projectRoot, 'examples/notation.cjs'), 'utf8')).replace('module.exports = {', 'export {'), loader: 'js' }));
    } }],
    loader: { '.module.css': 'local-css' },
    define: { 'process.env.NODE_ENV': '"production"' },
    minify: true,
    legalComments: 'eof',
    logLevel: 'silent'
  });
  await runFile(process.execPath, [join(projectRoot, 'node_modules/@tailwindcss/cli/dist/index.mjs'), '-i', join(projectRoot, 'site/app.css'), '-o', join(outDir, 'assets/app.css'), '--minify'], { cwd: projectRoot });
  const examples = await readFile(join(projectRoot, 'examples/notation.cjs'), 'utf8');
  if ((examples.match(/module\.exports = \{/g) || []).length !== 1) throw new Error('Expected one canonical numerical helper export');
  await writeFile(join(outDir, 'assets/notation.mjs'), examples.replace('module.exports = {', 'export {'));
  await mkdir(join(outDir, 'examples'), { recursive: true });
  for (const name of ['notation.cjs', 'notation.py']) {
    try {
      await cp(join(projectRoot, 'examples', name), join(outDir, 'examples', name));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return pages;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const index = process.argv.indexOf('--out');
  const outDir = index >= 0 ? resolve(process.argv[index + 1]) : undefined;
  const pages = await buildSite(outDir);
  console.log(`Built ${pages.length} pages with ${pages.reduce((sum, page) => sum + page.formulaCount, 0)} locally rendered formulas.`);
}
