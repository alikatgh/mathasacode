import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { Script, createContext } from 'node:vm';

const { parse } = createRequire(import.meta.url)('acorn');
const PAGES = [
  { id: 'inside-a-decompiler', title: 'Inside a Decompiler', names: ['C', 'F', 'M', 'Tm', 'Ck'], kind: 'decompiler', count: 7 },
  { id: 'inside-an-ai-agent', title: 'Inside an AI Agent', names: ['M', 'D'], kind: 'agent', count: 8 },
  { id: 'inside-an-llm-serving-gpu', title: 'Inside an LLM Serving GPU', names: ['C', 'Hw', 'Dt', 'M'], kind: 'gpu', count: 11 },
];
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const decode = value => String(value).replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (all, name) => {
  if (name[0] !== '#') return { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' }[name.toLowerCase()];
  const n = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
  return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '\uFFFD';
});
const plain = value => decode(String(value).replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
const route = (path, hash = '') => `?path=${encodeURIComponent(path)}${hash}`;
const forbidden = new Set(['process', 'require', 'global', 'globalThis', 'window', 'document', 'Function', 'eval', 'WebAssembly', 'fetch', 'XMLHttpRequest', 'navigator', 'console']);

function assertPureSubset(node, page, parent, field) {
  // This is a deliberately narrow importer for these three pinned source pages,
  // not a general HTML/JavaScript executor. Never include the surrounding IIFE.
  const propertyName = parent && (parent.type === 'Property' && field === 'key' && !parent.computed && !parent.shorthand || parent.type === 'MemberExpression' && field === 'property' && !parent.computed);
  if (node.type === 'Identifier' && !propertyName && forbidden.has(node.name) || ['ImportExpression', 'ImportDeclaration', 'WithStatement'].includes(node.type)) throw new Error(`Unexpected capability in ${page}: ${node.name || node.type}`);
  if (node.type === 'MemberExpression' && (!node.computed && ['constructor', '__proto__', 'prototype'].includes(node.property.name) || node.computed && node.property.type === 'Literal' && ['constructor', '__proto__', 'prototype'].includes(node.property.value))) throw new Error(`Unexpected reflective access in ${page}`);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'start' || key === 'end') continue;
    if (Array.isArray(value)) {
      for (const child of value) if (child && typeof child.type === 'string') assertPureSubset(child, page, node, key);
    } else if (value && typeof value.type === 'string') assertPureSubset(value, page, node, key);
  }
}

function modelOf(html, page) {
  let selected;
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const source = match[1];
    if (!source.includes('const M =')) continue;
    const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'script' });
    const call = ast.body[0]?.expression;
    if (ast.body.length !== 1 || call?.type !== 'CallExpression' || call.callee.type !== 'ArrowFunctionExpression' || call.callee.body.type !== 'BlockStatement') throw new Error(`Unexpected model wrapper: ${page.id}`);
    const declarations = call.callee.body.body.filter(node => node.type === 'VariableDeclaration' && node.kind === 'const').flatMap(node => node.declarations).filter(node => node.id.type === 'Identifier' && page.names.includes(node.id.name));
    if (declarations.length !== page.names.length || page.names.some(name => declarations.filter(node => node.id.name === name).length !== 1)) throw new Error(`Missing or duplicate model constant: ${page.id}`);
    for (const declaration of declarations) assertPureSubset(declaration, page.id);
    if (selected) throw new Error(`Duplicate model script: ${page.id}`);
    selected = declarations.map(node => `const ${source.slice(node.start, node.end)};`).join('\n');
  }
  if (!selected) throw new Error(`Missing model: ${page.id}`);
  const context = createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } });
  new Script(selected, { filename: page.id + '-pure-model.js' }).runInContext(context, { timeout: 500 });
  const evaluate = expression => {
    const serialized = new Script(`JSON.stringify(${expression})`).runInContext(context, { timeout: 500 });
    if (serialized === undefined) throw new Error(`Model value unavailable: ${page.id}`);
    return JSON.parse(serialized);
  };
  return { evaluate, source: selected };
}

function linkOf(value, contentRoot) {
  const href = decode(value);
  if (/^https?:\/\//.test(href)) return href;
  if (href.startsWith('#')) return href;
  const parsed = new URL(href, 'https://source.invalid/');
  const hash = parsed.hash;
  if (parsed.pathname === '/lesson' && parsed.searchParams.has('path')) {
    const path = parsed.searchParams.get('path').replace(/^\/+|\/$/g, '');
    if (!path.split('/').includes('..') && existsSync(join(contentRoot, path, 'docs/en.md'))) return route(path + '/docs/en.md', hash);
    return undefined;
  }
  const manual = /^\/manual-([a-z0-9-]+)\.html$/.exec(parsed.pathname);
  if (manual) {
    const dir = join(contentRoot, 'manuals', manual[1]);
    if (!existsSync(dir)) return undefined;
    // Manual heading anchors are declared in the original section frontmatter.
    if (hash && existsSync(join(dir, 'sections'))) for (const file of readdirSync(join(dir, 'sections')).filter(file => file.endsWith('.md'))) {
      const source = readFileSync(join(dir, 'sections', file), 'utf8');
      if (hash === '#s-' + file.replace(/^(?:\d+|r)-\d+-/, '').replace(/\.md$/, '') || source.includes(`anchor: ${hash.slice(1)}`) || source.includes(`anchor: "${hash.slice(1)}"`)) return route(`manuals/${manual[1]}/sections/${file}`, hash);
    }
    return route(`manuals/${manual[1]}/front.md`, hash);
  }
  if (/^\/anatomy\/[a-z0-9-]+\.png$/.test(parsed.pathname)) return './content/site' + parsed.pathname;
  if (parsed.pathname === '/' || /^\/(?:catalog|index)\.html$/.test(parsed.pathname)) return route('README.md');
  if (/^\/inside-[a-z0-9-]+\.html$/.test(parsed.pathname)) return route('site' + parsed.pathname, hash);
  return undefined;
}

export function semanticProse(html, contentRoot) {
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1];
  if (!main) throw new Error('Explainer has no main content');
  const input = main.replace(/<svg\b[\s\S]*?<\/svg>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  const root = { tag: '', children: [] }, stack = [root];
  const voids = new Set(['input', 'img', 'br', 'hr', 'meta', 'link', 'source', 'wbr']);
  for (const match of input.matchAll(/<\/?([a-z][a-z0-9-]*)\b([^>]*)>|([^<]+)/gi)) {
    if (match[3] !== undefined) { stack.at(-1).children.push({ text: match[3] }); continue; }
    const tag = match[1].toLowerCase();
    if (match[0].startsWith('</')) {
      const index = stack.map(node => node.tag).lastIndexOf(tag);
      if (index > 0) stack.length = index;
    } else {
      const node = { tag, attrs: match[2], children: [] };
      stack.at(-1).children.push(node);
      if (!voids.has(tag) && !/\/\s*>$/.test(match[0])) stack.push(node);
    }
  }
  const blocked = new Set(['script', 'style', 'svg', 'button', 'select', 'label', 'input', 'nav']);
  const blocks = new Set(['h1', 'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'blockquote', 'pre']);
  const inline = new Set(['strong', 'em', 'code', 'small', 'br']);
  function render(node, inside = false) {
    if (node.text !== undefined) return inside ? escape(decode(node.text)) : '';
    if (blocked.has(node.tag)) return '';
    // Placeholder readouts and instructions for removed controls are not prose.
    if (['p', 'pre', 'a', 'ul', 'ol'].includes(node.tag) && /\bdata-(?:am|dm|gm)-/.test(node.attrs)) return '';
    if (node.tag === 'p' && /class="[^"]*\b(?:am|dm|gm)-(?:label|source|bytes|hint|now)\b/.test(node.attrs)) {
      const text = plain(node.children.map(child => child.text || '').join(''));
      return /^NVIDIA (?:L4|GB10)$/.test(text) ? `<h3>${escape(text)}</h3>` : '';
    }
    const isBlock = blocks.has(node.tag);
    if (inline.has(node.tag) && !inside) return '';
    const children = node.children.map(child => render(child, inside || isBlock || node.tag === 'a')).join('');
    if (!plain(children)) return '';
    if (node.tag === 'a') {
      const href = /\bhref=(?:"([^"]*)"|'([^']*)')/.exec(node.attrs);
      const target = href && linkOf(href[1] ?? href[2], contentRoot);
      return target ? `<a href="${escape(target)}"${target.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${children || escape(plain(node.children.map(child => child.text || '').join('')))}</a>` : children;
    }
    if (node.tag === 'br') return '<br>';
    if (node.tag === 'h2' && plain(children) === 'Try to break it') return '';
    if (node.tag === 'small') return ` <small>${children}</small>`;
    if (isBlock || inline.has(node.tag)) return `<${node.tag}>${children}</${node.tag}>${node.tag === 'strong' ? ' ' : ''}`;
    return children;
  }
  return render(root);
}

function valueHTML(value, contentRoot) {
  if (value === null || value === undefined) return '<span>None</span>';
  if (typeof value !== 'object') return `<p>${escape(value)}</p>`;
  if (Array.isArray(value)) return `<ol>${value.map(item => `<li>${valueHTML(item, contentRoot)}</li>`).join('')}</ol>`;
  if (typeof value.href === 'string' && typeof value.title === 'string') {
    const href = linkOf(value.href, contentRoot);
    return href ? `<p><a href="${escape(href)}"${href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escape(value.title)}</a></p>` : `<p>${escape(value.title)}</p>`;
  }
  return `<dl>${Object.entries(value).map(([key, item]) => `<div><dt>${escape(({ is: 'What it is', does: 'What it does', why: 'Why it matters', without: 'Without it', code: 'Implementation', lesson: 'Build it', l4: 'NVIDIA L4', gb10: 'NVIDIA GB10' })[key] || key)}</dt><dd>${key === 'code' && typeof item === 'string' ? `<pre><code>${escape(item)}</code></pre>` : valueHTML(item, contentRoot)}</dd></div>`).join('')}</dl>`;
}

function partsHTML(info, order, concepts, contentRoot) {
  return `<section class="engineering-record"><h2>Inspect every part</h2>${order.map((id, index) => {
    const part = info[id];
    if (!part) throw new Error(`Missing part explanation: ${id}`);
    const concept = concepts?.[id];
    const title = typeof part.name === 'string' ? part.name : typeof concept === 'string' ? concept : id.replace(/[-_]/g, ' ');
    return `<section id="part-${escape(id)}"><h3>${index + 1}. ${escape(title)}</h3>${valueHTML(part, contentRoot)}</section>`;
  }).join('')}</section>`;
}

function agentScenarios(html) {
  return [...html.matchAll(/<button\b[^>]*\bdata-am-scenario=(?:'([^']*)'|"([^"]*)")[^>]*>([\s\S]*?)<\/button>/g)].map(match => ({
    label: plain(/<strong>([\s\S]*?)<\/strong>/.exec(match[3])?.[1] || ''),
    note: plain(match[3].replace(/<strong>[\s\S]*?<\/strong>/, '')),
    config: JSON.parse(decode(match[1] ?? match[2])),
  }));
}

/** Import only authored educational content and pure deterministic model traces. */
export function buildExplainers(contentRoot) {
  return PAGES.map(page => {
    const path = `site/${page.id}.html`;
    const html = readFileSync(join(contentRoot, path), 'utf8');
    const model = modelOf(html, page);
    const info = model.evaluate(page.kind === 'agent' ? 'D.INFO' : 'C.INFO');
    const constants = model.evaluate(`({${page.names.join(',')}})`);
    const order = page.kind === 'agent' ? ['intake', 'memory', 'retrieval', 'model', 'tools', 'verifier', 'exit', 'printer', 'controller', 'carriage'] : model.evaluate('C.PART_ORDER');
    const authoredScenarios = page.kind === 'agent' ? agentScenarios(html) : model.evaluate('C.SCENARIOS');
    if (authoredScenarios.length !== page.count) throw new Error(`Scenario count changed in ${path}`);
    const scenarios = authoredScenarios.map((scenario, index) => {
      const result = model.evaluate(`M.simulate(${JSON.stringify(scenario.config)})`);
      if (!result.events?.length || !result.outcome || !result.config) throw new Error(`Incomplete scenario: ${path} ${index}`);
      return { id: `${page.kind}-${index + 1}`, title: scenario.label, description: scenario.note, changes: scenario.config, config: result.config, result,
        ...(page.kind === 'decompiler' ? { timings: model.evaluate(`M.simulate(${JSON.stringify(scenario.config)}).events.map(event => Ck.realOf(M.configOf(${JSON.stringify(scenario.config)}), event.type))`), fixture: model.evaluate(`F.FIXTURE[M.keyOf(M.configOf(${JSON.stringify(scenario.config)}))]`) } : {}),
      };
    });
    const chapters = page.kind === 'agent' ? model.evaluate('D.TOUR') : [];
    const chapterHTML = chapters.length ? `<section class="engineering-record"><h2>The six-chapter tour</h2>${chapters.map((chapter, index) => `<section id="tour-${index + 1}"><h3>${index + 1}. ${escape(chapter.title)}</h3><p>${escape(chapter.text)}</p>${chapter.config ? `<p>Setup: <code>${escape(JSON.stringify(chapter.config))}</code></p>` : ''}<p><a href="#part-${escape(chapter.part)}">Inspect ${escape(info[chapter.part]?.name || chapter.part)}</a></p></section>`).join('')}</section>` : '';
    const modelData = page.kind === 'agent' ? { M: constants.M, INFO: constants.D.INFO, CONCEPT: constants.D.CONCEPT, TOUR: constants.D.TOUR } : constants;
    const prose = semanticProse(html, contentRoot);
    const poster = `./content/site/anatomy/${page.id}-poster.png`;
    const rendered = `${prose}<figure><img src="${poster}" alt="${escape(page.title)}: the authored machine diagram" loading="lazy"><figcaption>Original machine diagram. <a href="${poster}" download>Download poster</a></figcaption></figure>${chapterHTML}${partsHTML(info, order, constants.C?.CONCEPT || constants.C?.NAMES || constants.D?.CONCEPT, contentRoot)}<section class="engineering-record"><h2>Model data and provenance</h2><p>The scenarios above preserve the original deterministic simulation. Its complete fixture, assumptions, limits, measurements, source references and educational metadata are available below. Values describe the captured source snapshot.</p><details><summary>All authored model data</summary><pre><code>${escape(JSON.stringify(modelData, null, 2))}</code></pre></details><details><summary>Original pure simulation and data declarations</summary><pre><code>${escape(model.source)}</code></pre></details></section>`;
    return { path, title: page.title, html: rendered, simulation: {
      id: page.id, title: page.title, kind: page.kind,
      description: page.kind === 'decompiler' ? 'Captured fixture bytes and lesson-tool output. Step through how facts and inferences become pseudocode.' : page.kind === 'agent' ? 'A fixed model script, real invoice arithmetic, and simulated timing. Step through the runtime decisions.' : 'Captured measured GPU runs with arithmetic admission and bandwidth estimates. This reader does not run a model.',
      scenarios, parts: info, chapters,
      ...(page.kind === 'agent' ? { cards: [constants.M.REQUEST, constants.M.MEMORY, ...constants.M.CORPUS] } : {}),
    } };
  });
}
