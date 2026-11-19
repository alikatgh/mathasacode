import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import { documents, renderDocument, localHref } from '../scripts/build.mjs';

test('every document has a page-specific canonical, description and local favicon', () => {
  for (const document of documents) {
    const { html } = renderDocument('# A page\n\nReadable content.', document);
    const path = document.output === 'index.html' ? '/' : `/${document.output.replace(/\.html$/, '')}`;
    assert.ok(html.includes(`<link rel="canonical" href="https://mathasacode.aulenor.com${path}">`));
    assert.match(html, /<meta name="description" content="[^"]+">/);
    assert.match(html, /<link rel="icon" type="image\/png" href="\/assets\/logo\.png">/);
    assert.ok(html.includes('<main id="guide-content" tabindex="-1">'), 'the existing reader remains the page entry');
  }
});

test('blog and changelog render as reader resources', async () => {
  for (const name of ['blog', 'changelog']) {
    const document = documents.find(document => document.output === `${name}.html`);
    assert.equal(document.source, `docs/${name}.md`);
    assert.notEqual(document.guide, true);
    const source = await readFile(new URL(`../${document.source}`, import.meta.url), 'utf8');
    const result = renderDocument(source, document);
    assert.ok(result.headings.length > 0);
    assert.match(result.html, /data-guide="false"/);
  }
});

test('the cheatsheet remains one reader topic with all categories nested in its article', async () => {
  const document = documents.find(document => document.output === 'cheatsheet.html');
  const source = await readFile(new URL(`../${document.source}`, import.meta.url), 'utf8');
  const result = renderDocument(source, document);
  assert.deepEqual(result.headings.map(heading => heading.id), ['symbol-cheatsheet']);
  assert.match(result.html, /<article class="symbol-sheet" data-symbol-sheet>/);
  assert.match(result.html, /data-symbol-entry=/);
  assert.match(result.html, /href="\/cheatsheet.html">Symbol cheatsheet/);
  assert.equal(localHref('./cheatsheet.md', 'docs/blog.md'), '/cheatsheet.html');
});

test('source-relative guide links work in both nested Markdown and built pages', () => {
  assert.equal(localHref('../README.md', 'docs/ml-deep-learning.md'), '/index.html');
  assert.equal(localHref('./ml-deep-learning.md#the-final-boss', 'docs/blog.md'), '/machine-learning.html#the-final-boss');
  assert.equal(localHref('../examples/notation.py', 'docs/run-locally.md'), '/examples/notation.py');
  assert.equal(localHref('https://example.com/README.md', 'docs/blog.md'), 'https://example.com/README.md');
});

test('read-only token metadata uses the same VS Code palettes as editable examples', () => {
  const source = 'const value = 42;';
  const { html } = renderDocument(`# Code\n\n\`\`\`js\n${source}\n\`\`\`\n`);
  const lines = JSON.parse(html.match(/class="code-example__tokens">(.*?)<\/script>/s)[1]);
  assert.equal(lines.map(line => line.text).join('\n'), source);
  assert.ok(lines[0].tokens.some(token => token.content === '42' && token.color === '#098658' && token.colorDark === '#B5CEA8'));
});

test('guide version selection accepts canonical and .html routes', async () => {
  // Transform only the app module. Its imports are inert here, and registering
  // DOMContentLoaded avoids mounting a reader just to test the real resolver.
  const source = await readFile(new URL('../site/app.jsx', import.meta.url), 'utf8');
  const { code } = await transform(source, { loader: 'jsx', format: 'cjs', jsx: 'transform', target: 'es2022' });
  const compiled = { exports: {} };
  const document = { documentElement: { lang: 'en' }, body: { dataset: {} }, readyState: 'loading', addEventListener() {} };
  new Function('require', 'module', 'exports', 'document', code)(() => ({}), compiled, compiled.exports, document);
  const { guideVersionPath } = compiled.exports;
  for (const suffix of ['', '.html', '/', '.html/']) {
    assert.equal(guideVersionPath(`/PYTHON-README${suffix}`), '/PYTHON-README.html');
    assert.equal(guideVersionPath(`/README-zh${suffix}`), '/README-zh.html');
    assert.equal(guideVersionPath(`/machine-learning${suffix}`), '/machine-learning.html');
  }
  for (const path of ['/', '/index.html', '/blog', '/changelog.html']) assert.equal(guideVersionPath(path), '/');
});
