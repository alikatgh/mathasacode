import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { once } from 'node:events';
import { documents, projectRoot, renderDocument, localHref } from '../scripts/build.mjs';
import { createSiteServer } from '../scripts/serve.mjs';

const decode = value => value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'");
const dist = join(projectRoot, 'dist');

test('all authored formulas render and every guide link targets a real heading or local file', async () => {
  let formulas = 0;
  for (const document of documents) {
    const source = await readFile(join(projectRoot, document.source), 'utf8');
    const { html, headings, formulaCount } = renderDocument(source, document);
    assert.equal(await readFile(join(dist, document.output), 'utf8'), html, `${document.output} is stale`);
    formulas += formulaCount;
    assert.equal(new Set(headings.map(heading => heading.id)).size, headings.length);
    const allIds = new Set(Array.from(html.matchAll(/\bid="([^"]+)"/g), match => decode(match[1])));
    assert.ok(!html.includes('katex-error'));
    assert.ok(!html.includes('<img '), 'formulas must not depend on remote images');
    for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      const target = decode(match[1]);
      if (target.startsWith('#')) {
        assert.ok(allIds.has(decodeURIComponent(target.slice(1))), `${document.source} has missing anchor ${target}`);
      } else if (target.startsWith('/')) {
        const [filename, hash] = target.split('#');
        const path = join(dist, filename === '/' ? 'index.html' : filename.slice(1));
        assert.ok((await stat(path)).isFile(), `missing ${target}`);
        if (hash) {
          const linked = await readFile(path, 'utf8');
          assert.ok(linked.includes(`id="${decodeURIComponent(hash)}"`), `missing ${target}`);
        }
      }
    }
  }
  assert.ok(formulas >= 216);
});

test('renderer escapes unsafe raw HTML and rejects unsafe link protocols', () => {
  const { html } = renderDocument('# sample\n\n<script>bad()</script>\n\n[x](javascript:bad)\n');
  assert.ok(!html.includes('<script>bad()'));
  assert.equal(localHref('  java\nscript:bad'), '#');
  assert.equal(localHref('README-zh.md#函数'), '/README-zh.html#函数');
  assert.throws(() => renderDocument('![bad](https://example.com/image.svg)'), /Unsupported image/);
  assert.throws(() => renderDocument('![bad](https://latex.codecogs.com/svg.latex?%5Cnotarealcommand)'), /Invalid formula/);
});

test('every route has a topic and prehighlighting preserves exact local source lines', async () => {
  let variants = 0;
  for (const document of documents) {
    const result = renderDocument(await readFile(join(projectRoot, document.source), 'utf8'), document);
    assert.ok(result.headings.length > 0, `${document.output} must initialize the reader`);
    assert.match(result.html, /data-reader="true"/);
    assert.doesNotMatch(result.html, /src="(?:\/navigation|\/assets\/(?:code-tabs|code-viewer|learn|reader))/);
    for (const match of result.html.matchAll(/<script type="application\/json" class="code-example__tokens">(.*?)<\/script>/gs)) {
      const lines = JSON.parse(match[1]);
      for (const [index, line] of lines.entries()) {
        assert.equal(line.number, index + 1);
        assert.equal(line.tokens.map(token => token.content).join(''), line.text);
      }
      variants++;
    }
  }
  assert.ok(variants >= 744, 'all four variants of every guide example are prehighlighted');
  const { html } = renderDocument("# source\n\n```js\nconsole.log('</script>')\n```\n");
  const metadata = html.match(/class="code-example__tokens">(.*?)<\/script>/s)[1];
  assert.ok(!metadata.includes('<'), 'source cannot terminate its inert JSON script');
  assert.equal(JSON.parse(metadata).map(line => line.text).join('\n'), "console.log('</script>')");
});

test('server serves only local built assets, denies writes and handles malformed paths', async () => {
  const server = createSiteServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const main = await fetch(origin);
    assert.equal(main.status, 200);
    assert.match(await main.text(), /math-as-code/);
    assert.match(main.headers.get('content-security-policy'), /connect-src 'self' https:\/\/play\.rust-lang\.org/);
    assert.equal((await fetch(`${origin}/assets/app.mjs`)).status, 200);
    assert.equal((await fetch(`${origin}/`, { method: 'HEAD' })).status, 200);
    assert.equal((await fetch(`${origin}/`, { method: 'POST' })).status, 405);
    for (const path of ['/.git/config', '/package.json', '/%2e%2e%2fscripts/build.mjs', '/missing.html']) assert.equal((await fetch(origin + path)).status, 404);
    assert.equal((await fetch(origin + '/%ZZ')).status, 400);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
