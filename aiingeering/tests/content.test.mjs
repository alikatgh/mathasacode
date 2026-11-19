import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { contentURL, routeURL, renderContent, hydrateContent } from '../site/content.mjs';

const source = 'phases/01-math/01-vectors/docs/en.md';
const catalog = {
  files: [
    source, 'README.md', 'ROADMAP.md', 'glossary/terms.md',
    'phases/01-math/02-matrices/docs/en.md',
    'phases/01-math/01-vectors/code/main.py',
    'phases/01-math/01-vectors/outputs/skill.md',
    'phases/01-math/01-vectors/docs/vector.svg',
    'manuals/demo/sections/1-start.md', 'manuals/demo/figures/one.svg',
  ].map(path => ({ path, bytes: 1, sha256: 'fixture' })),
  entries: [
    { path: source, title: 'Vectors' },
    { path: 'phases/01-math/02-matrices/docs/en.md', title: 'Matrices' },
    { path: 'manuals/demo/sections/1-start.md', title: 'Start' },
  ],
};

test('content URLs encode each segment and reject noncanonical or unsafe paths', () => {
  assert.equal(contentURL('manuals/a b/figure.svg'), './content/manuals/a%20b/figure.svg');
  assert.equal(routeURL('phases/01/doc.md'), '?path=phases%2F01%2Fdoc.md');
  for (const path of ['', '/etc/passwd', '../outside', 'a/../b', 'a/./b', 'a//b', 'a\\b', 'https://evil.test/x', 'a?b', 'a#b', 'a/%2e%2e/b', 'a/%2fb', 'a/%5cb', 'a/%252e%252e', 'a/\u0000b', 'a/%zz']) {
    assert.throws(() => contentURL(path), TypeError, path);
    assert.throws(() => routeURL(path), TypeError, path);
  }
});

test('lesson directories, code, outputs and images resolve within the imported snapshot', () => {
  const { html } = renderContent('[Next](../../02-matrices/) [Code](../code/main.py) [Artifact](../outputs/skill.md#use) ![Vector](vector.svg)', source, catalog);
  assert.match(html, /href="\?path=phases%2F01-math%2F02-matrices%2Fdocs%2Fen\.md"/);
  assert.match(html, /href="\?path=phases%2F01-math%2F01-vectors%2Fcode%2Fmain\.py"/);
  assert.match(html, /href="\?path=phases%2F01-math%2F01-vectors%2Foutputs%2Fskill\.md#use"/);
  assert.match(html, /src="\.\/content\/phases\/01-math\/01-vectors\/docs\/vector\.svg"/);
});

test('directories without a landing document open the source browser', () => {
  const { html } = renderContent('[Code folder](../code/) [Explicit folder](?folder=phases%2F01-math%2F01-vectors%2Foutputs)', source, catalog);
  assert.match(html, /href="\?folder=phases%2F01-math%2F01-vectors%2Fcode"/);
  assert.match(html, /href="\?folder=phases%2F01-math%2F01-vectors%2Foutputs"/);
});

test('references absent from the original snapshot keep their labels without broken reader links', () => {
  const { html } = renderContent('[Omitted capture](missing.md) [Omitted download](missing.pdf) ![Omitted illustration](missing.svg)', source, catalog);
  assert.match(html, /Omitted capture/);
  assert.match(html, /Omitted download/);
  assert.doesNotMatch(html, /(?:href|src)="[^"]*missing\./);
  assert.match(html, /title="Reference not included in the source snapshot"/);
  assert.match(html, /Image unavailable in the source snapshot: Omitted illustration/);
});

test('old lesson routes and source GitHub URLs become local reader links', () => {
  const { html } = renderContent('[Lesson](/lesson?path=phases/01-math/02-matrices#practice) [Source](https://github.com/rohitg00/ai-engineering-from-scratch/blob/main/phases/01-math/01-vectors/code/main.py) [Glossary](https://aiengineeringfromscratch.com/glossary) [Paper](https://doi.org/10.1000/test(thing))', source, catalog);
  assert.match(html, /href="\?path=phases%2F01-math%2F02-matrices%2Fdocs%2Fen\.md#practice"/);
  assert.match(html, /href="\?path=phases%2F01-math%2F01-vectors%2Fcode%2Fmain\.py"/);
  assert.match(html, /href="\?path=glossary%2Fterms\.md"/);
  assert.match(html, /href="https:\/\/doi\.org\/10\.1000\/test\(thing\)" target="_blank" rel="noopener noreferrer"/);
});

test('unsafe links, images and traversal cannot become executable URLs', () => {
  const { html } = renderContent('[Unsafe](javascript:alert%281%29) [Data](data:text/html,hi) [Outside](../../../../../../private.txt) ![Unsafe](data:image/svg+xml,evil) <a href="java&#x73;cript:alert(1)">raw</a> <img src="jav&#x09;ascript:alert(1)" onerror="alert(1)">', source, catalog);
  assert.doesNotMatch(html, /(?:href|src)="(?:javascript|data|file|vbscript):/i);
  assert.doesNotMatch(html, /\sonerror=/i);
  assert.doesNotMatch(html, /href="[^"]*private\.txt/);
  assert.match(html, /Unsafe/);
});

test('headings use stable GitHub anchors, disambiguate repeats, and preserve inline formatting', () => {
  const result = renderContent('# Vectors & **spaces**\n\n## Dot `product`\n\n## Dot `product`\n\n### 日本語', source, catalog);
  assert.deepEqual(result.headings, [
    { id: 'vectors--spaces', text: 'Vectors & spaces', depth: 1 },
    { id: 'dot-product', text: 'Dot product', depth: 2 },
    { id: 'dot-product-1', text: 'Dot product', depth: 2 },
    { id: '日本語', text: '日本語', depth: 3 },
  ]);
  assert.match(result.html, /<h1 id="vectors--spaces">Vectors &amp; <strong>spaces<\/strong><\/h1>/);
});

test('GFM tables, nested lists, checkboxes and code remain real structured content', () => {
  const { html } = renderContent('| A | B |\n|---|---|\n| **one** | `two` |\n\n- outer\n  - inner\n- [x] shipped\n\n```python\nvalue = "<script>"\nprint(value)\n```', source, catalog);
  assert.match(html, /<table>/);
  assert.match(html, /<td><strong>one<\/strong><\/td>/);
  assert.match(html, /<ul>[\s\S]*<ul>[\s\S]*inner/);
  assert.match(html, /<input checked="" disabled="" type="checkbox">/);
  assert.match(html, /class="copy-code"/);
  assert.match(html, /language-python/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test('math renders with KaTeX while currency, code spans and code blocks stay literal', () => {
  const { html } = renderContent('Compute $x_i^2 + y_i^2$ and $p < q$.\n\n$$\n\\frac{1}{n} \\sum_i x_i\n$$\n\n```math\nE = mc^2\n```\n\nThe cost is $5 and then $10. Use `$x$`.\n\n```bash\necho "$HOME" $x$\n```', source, catalog);
  assert.equal((html.match(/class="math-inline"/g) || []).length, 2);
  assert.equal((html.match(/class="math-display"/g) || []).length, 2);
  assert.match(html, /class="katex/);
  assert.match(html, /The cost is \$5 and then \$10\. Use <code>\$x\$<\/code>/);
  assert.match(html, /\$HOME/);
  assert.match(html, /language-bash/);
  assert.doesNotMatch(renderContent('$\\href{javascript:alert(1)}{click}$', source, catalog).html, /href="javascript:/i);
});

test('figures retain the entire configuration and diagrams keep a readable source fallback', () => {
  const { html } = renderContent('```figure\nkv-cache-sizer {"layers":32,"caption":"<safe>"}\n```\n\n```mermaid\ngraph LR\n A[Input] --> B[Output]\n```', source, catalog);
  assert.match(html, /class="lesson-figure" data-figure="kv-cache-sizer \{&quot;layers&quot;:32,&quot;caption&quot;:&quot;&lt;safe&gt;&quot;\}"/);
  assert.match(html, /class="figure-status"/);
  assert.match(html, /class="diagram-output"/);
  assert.match(html, /class="curriculum-diagram-viewport" role="region" aria-label="Scrollable diagram" tabindex="0"/);
  assert.match(html, /<details class="diagram-source" open>/);
  assert.match(html, /A\[Input\] --&gt; B\[Output\]/);
});

test('manual HTML preserves SVG geometry and anchors, rewrites assets, and removes executable markup', () => {
  const manualPath = 'manuals/demo/sections/1-start.md';
  const manualCatalog = {
    ...catalog,
    rendered: { [manualPath]: '<h1 id="start">Start</h1><p><a href="?path=manuals%2Fdemo%2Fsections%2F1-start.md#start">Read</a><img src="/manual-assets/demo/figures/one.svg"></p><svg viewBox="0 0 100 100" role="img"><defs><marker id="arrow" markerWidth="4" markerHeight="4"><path d="M 0 0 L 4 2 L 0 4 Z" fill="currentColor"></path></marker></defs><path d="M0 0 L100 100" marker-end="url(#arrow)" style="stroke:currentColor;stroke-width:2"></path><text x="10" y="20">Figure</text><foreignObject><iframe src="https://evil.test"></iframe></foreignObject></svg><script>alert(1)</script><a href="data:text/html,evil" onclick="run()">Unsafe</a>' },
  };
  const { html, headings } = renderContent('ignored DSL', manualPath, manualCatalog);
  assert.deepEqual(headings, [{ id: 'start', text: 'Start', depth: 1 }]);
  assert.match(html, /href="\?path=manuals%2Fdemo%2Fsections%2F1-start\.md#start"/);
  assert.match(html, /src="\.\/content\/manuals\/demo\/figures\/one\.svg"/);
  assert.match(html, /<svg viewbox="0 0 100 100" role="img">/);
  assert.match(html, /marker-end="url\(#arrow\)"/);
  assert.match(html, /<text x="10" y="20">Figure<\/text>/);
  assert.doesNotMatch(html, /<script|<iframe|foreignobject|onclick=|href="data:/i);
  assert.doesNotMatch(html, /alert\(1\)/);
});

test('prerendered math placeholders become safe KaTeX expressions', () => {
  const path = 'cheatsheets/math.md';
  const result = renderContent('DSL', path, { ...catalog, rendered: { [path]: '<h1>Math</h1><span class="math-inline" data-math="inline">x_i^2 &lt; y</span><div class="math-display" data-math="display">\\frac{1}{n} \\sum_i x_i</div><span class="math-inline" data-math="inline">\\href{javascript:alert(1)}{unsafe}</span>' } });
  assert.equal((result.html.match(/data-math-rendered="true"/g) || []).length, 3);
  assert.match(result.html, /class="katex/);
  assert.match(result.html, /<math /);
  assert.doesNotMatch(result.html, /href="javascript:/);
});

test('captured research links follow their explicit upstream page provenance', () => {
  const path = 'manuals/demo/research/sources/docs.md';
  const result = renderContent('<!-- page: https://docs.example.org/guide/start/ fetched 2026-10-08 -->\n\n# Captured guide\n\n[Root](/guide/tools/) [Sibling](../next/) ![Diagram](/images/diagram.svg)\n\n<!-- page: https://other.example.org/reference/ fetched 2026-10-08 -->\n\n[Other](details/)', path, catalog);
  assert.match(result.html, /href="https:\/\/docs\.example\.org\/guide\/tools\/"/);
  assert.match(result.html, /href="https:\/\/docs\.example\.org\/guide\/next\/"/);
  assert.match(result.html, /src="https:\/\/docs\.example\.org\/images\/diagram\.svg"/);
  assert.match(result.html, /href="https:\/\/other\.example\.org\/reference\/details\/"/);
});

test('authored interactive source pages link to the reader when present in the catalog', () => {
  const all = { ...catalog, entries: [...catalog.entries, { path: 'site/inside-a-decompiler.html', title: 'Inside a decompiler' }] };
  const result = renderContent('[Machine](/inside-a-decompiler#trace)', source, all);
  assert.match(result.html, /href="\?path=site%2Finside-a-decompiler\.html#trace"/);
});

test('quoted tag delimiters and malformed raw HTML cannot escape sanitizer boundaries', () => {
  const result = renderContent('<img src="vector.svg" title="a > b" onerror="run()"><div style="background-color:url(javascript:run());color:red" data-test="ok">safe</div>\n\n<svg><use href="https://evil.test/x#x"></use><path fill="url(https://evil.test)"></path></svg>', source, catalog);
  assert.match(result.html, /title="a &gt; b"/);
  assert.match(result.html, /style="color:red"/);
  assert.doesNotMatch(result.html, /onerror|javascript|href="https:\/\/evil|fill="url\(https:/i);
});

test('source artifacts are highlighted as escaped code and hydration is safe outside a browser', async () => {
  const result = renderContent('print("<unsafe>")\n', 'phases/01-math/01-vectors/code/main.py', catalog);
  assert.equal(result.headings.length, 0);
  assert.match(result.html, /language-python/);
  assert.match(result.html, /&lt;unsafe&gt;/);
  assert.equal(typeof await hydrateContent(null), 'function');
});

test('imported copy commands and print controls work and dispose their listeners', async () => {
  const descriptors = new Map(['window', 'navigator'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const copied = [];
  let printed = 0;
  const listeners = new Map();
  function control(className, attributes, textContent) {
    const classes = new Set(className.split(' '));
    const attrs = new Map(Object.entries(attributes));
    const item = {
      textContent,
      classList: { contains: value => classes.has(value), add: value => classes.add(value), remove: value => classes.delete(value) },
      hasAttribute: name => attrs.has(name),
      getAttribute: name => attrs.get(name) ?? null,
      setAttribute: (name, value) => attrs.set(name, value),
      closest(selector) {
        return selector.split(',').some(value => {
          const normalized = value.trim();
          return normalized.startsWith('.') ? classes.has(normalized.slice(1)) : /^\[([^\]]+)\]$/.test(normalized) && attrs.has(normalized.slice(1, -1));
        }) ? item : null;
      },
    };
    return item;
  }
  const blockCopy = control('cs-copy', { 'data-copy': 'python3 main.py\n' }, 'Copy');
  const command = control('cs-cmd', {}, 'git status');
  const print = control('cs-print', { 'data-print': '' }, 'Print');
  const controls = [blockCopy, command, print];
  const host = {
    isConnected: true,
    querySelector: () => null,
    querySelectorAll: selector => selector === '.cs-cmd' ? [command] : [],
    contains: target => controls.includes(target),
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: (name, listener) => { if (listeners.get(name) === listener) listeners.delete(name); },
  };
  try {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { print: () => { printed++; } } });
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async text => { copied.push(text); } } } });
    const cleanup = await hydrateContent(host);
    await listeners.get('click')({ target: blockCopy });
    assert.equal(blockCopy.textContent, 'Copied');
    await listeners.get('click')({ target: command });
    assert.equal(command.textContent, 'git status');
    let prevented = false;
    listeners.get('keydown')({ target: command, key: 'Enter', preventDefault: () => { prevented = true; } });
    await Promise.resolve();
    await listeners.get('click')({ target: print });
    assert.deepEqual(copied, ['python3 main.py\n', 'git status', 'git status']);
    assert.equal(prevented, true);
    assert.equal(printed, 1);
    assert.equal(command.getAttribute('role'), 'button');
    cleanup();
    assert.equal(listeners.size, 0);
  } finally {
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
});

const root = fileURLToPath(new URL('../', import.meta.url));
const builtCatalog = join(root, 'dist/catalog.json');
test('every imported catalog document renders and every emitted local image exists', { skip: !existsSync(builtCatalog) ? 'Build the imported corpus first' : false }, () => {
  const all = JSON.parse(readFileSync(builtCatalog, 'utf8'));
  const paths = new Set(all.files.map(file => file.path));
  const issues = [];
  for (const entry of all.entries) {
    try {
      const text = readFileSync(join(root, 'content', entry.path), 'utf8');
      const prebuilt = entry.renderedPath ? JSON.parse(readFileSync(join(root, 'dist', entry.renderedPath), 'utf8')).html : undefined;
      const result = renderContent(text, entry.path, prebuilt ? { ...all, rendered: { [entry.path]: prebuilt } } : all);
      if (!result.html.trim()) issues.push(entry.path + ': empty render');
      for (const match of result.html.matchAll(/src="\.\/content\/([^"#?]+)"/g)) {
        const target = decodeURIComponent(match[1]);
        if (!paths.has(target)) issues.push(entry.path + ': missing local image ' + target);
      }
      for (const match of result.html.matchAll(/href="\?folder=([^"&#]+)"/g)) {
        const folder = decodeURIComponent(match[1]);
        if (!all.files.some(file => file.path.startsWith(folder + '/'))) issues.push(entry.path + ': missing source folder ' + folder);
      }
      for (const match of result.html.matchAll(/href="\?path=([^"&#]+)"/g)) {
        const target = decodeURIComponent(match[1]);
        if (!paths.has(target) && !all.entries.some(item => item.path === target)) issues.push(entry.path + ': missing reader target ' + target);
      }
      for (const match of result.html.matchAll(/href="\.\/content\/([^"#?]+)"/g)) {
        const target = decodeURIComponent(match[1]);
        if (!paths.has(target)) issues.push(entry.path + ': missing download ' + target);
      }
    } catch (error) { issues.push(entry.path + ': ' + error.message); }
  }
  assert.deepEqual(issues, []);
});
