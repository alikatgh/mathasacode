import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSiteServer } from '../scripts/serve.mjs';

const headerSource = await readFile(new URL('../site/_headers', import.meta.url), 'utf8');
const mainPolicy = headerSource.match(/\n\/\n\s+Content-Security-Policy: ([^\n]+)/)[1];
const sandboxPolicy = headerSource.match(/\n\/assets\/runners\/sandbox\*\n\s+Content-Security-Policy: ([^\n]+)/)[1];
const compressed = Buffer.from([0x1f, 0x8b, 0x08, 0x00]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const servers = new Map();
let fixtureNumber = 0;

// Exercise the actual HTTP request handler and filesystem without requiring a
// listening socket. The normal site test also covers a real loopback connection.
function dispatch(server, path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const headers = new Headers();
    let status = 200;
    const response = {
      setHeader(name, value) { headers.set(name, String(value)); },
      writeHead(code, extra = {}) {
        status = code;
        for (const [name, value] of Object.entries(extra)) headers.set(name, String(value));
        return response;
      },
      end(body) { resolve(new Response(method === 'HEAD' ? null : body, { status, headers })); },
    };
    Promise.resolve(server.listeners('request')[0]({ method, url: path }, response)).catch(reject);
  });
}

async function serve(url, options = {}) {
  const parsed = new URL(url);
  const server = servers.get(parsed.origin);
  assert.ok(server, 'Unknown server fixture');
  const response = await dispatch(server, parsed.pathname + parsed.search, options.method);
  Object.defineProperty(response, 'url', { value: parsed.href });
  if (response.status === 307 && options.redirect !== 'manual') return serve(new URL(response.headers.get('location'), parsed).href, options);
  return response;
}

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'math-as-code-server-test-'));
  const root = join(directory, 'public');
  await mkdir(join(root, 'assets', 'runners'), { recursive: true });
  await mkdir(join(root, 'scripts'));
  for (const [name, bytes] of Object.entries({
    'index.html': '<!doctype html><title>Main guide</title>',
    'PYTHON-README.html': '<!doctype html><title>Python guide</title>',
    'README-zh.html': '<!doctype html><title>Chinese guide</title>',
    'assets/runners/sandbox.html': '<!doctype html><title>Sandbox</title>',
    'assets/runners/manifest.json': '{"version":1}',
    'assets/runners/runtime.gz': compressed,
    'assets/logo.png': png,
    'assets/sample.wasm': Buffer.from([0x00, 0x61, 0x73, 0x6d]),
    'scripts/build.mjs': 'do not serve source directories',
    'package.json': '{}',
    'secrets.json': 'fixture only',
    '.hidden': 'fixture only',
  })) await writeFile(join(root, name), bytes);
  await writeFile(join(directory, 'outside.txt'), 'outside the public artifact');
  await symlink(join(directory, 'outside.txt'), join(root, 'assets', 'outside.txt'));
  await symlink(join(root, 'secrets.json'), join(root, 'assets', 'linked.json'));
  const server = createSiteServer(root);
  const origin = `http://fixture-${++fixtureNumber}.invalid`;
  servers.set(origin, server);
  t.after(async () => {
    servers.delete(origin);
    await rm(directory, { recursive: true, force: true });
  });
  return origin;
}

test('local documents receive the production parent and opaque-sandbox policies', async t => {
  const origin = await fixture(t);
  for (const path of ['/', '/PYTHON-README', '/README-zh']) {
    const response = await serve(origin + path);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-security-policy'), mainPolicy);
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.match(mainPolicy, /script-src 'self' 'wasm-unsafe-eval'/);
    assert.match(mainPolicy, /connect-src 'self' https:\/\/play\.rust-lang\.org;/);
    assert.ok(!mainPolicy.includes("'unsafe-eval'"));
  }
  const sandbox = await serve(origin + '/assets/runners/sandbox.html');
  assert.equal(sandbox.status, 200);
  assert.equal(new URL(sandbox.url).pathname, '/assets/runners/sandbox');
  assert.equal(sandbox.headers.get('content-security-policy'), sandboxPolicy);
  assert.equal(sandbox.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.match(sandboxPolicy, /connect-src blob:;/);
  assert.match(sandboxPolicy, /worker-src blob:;/);
  assert.match(sandboxPolicy, /sandbox allow-scripts$/);
  assert.ok(!sandboxPolicy.includes('allow-same-origin'));
  assert.ok(!sandboxPolicy.includes('https:'));
  assert.equal(sandbox.headers.get('x-robots-tag'), 'noindex');
});

test('runtime and image files have usable MIME types and compressed bytes stay opaque', async t => {
  const origin = await fixture(t);
  for (const [path, type] of [
    ['/assets/runners/manifest.json', 'application/json; charset=utf-8'],
    ['/assets/runners/runtime.gz', 'application/octet-stream'],
    ['/assets/logo.png', 'image/png'],
    ['/assets/sample.wasm', 'application/wasm'],
  ]) {
    const response = await serve(origin + path);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), type);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('content-security-policy'), null, 'Asset routes must not inherit the parent document policy');
    if (path.endsWith('.gz')) {
      assert.equal(response.headers.get('content-encoding'), null);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), compressed);
    }
  }
  const head = await serve(origin + '/assets/logo.png', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(Number(head.headers.get('content-length')), png.length);
  assert.equal((await head.arrayBuffer()).byteLength, 0);
});

test('HTML aliases redirect to deployed canonical paths and preserve the query', async t => {
  const origin = await fixture(t);
  for (const [path, canonical] of [
    ['/index.html', '/'],
    ['/PYTHON-README.html?chapter=sum', '/PYTHON-README?chapter=sum'],
    ['/README-zh/', '/README-zh'],
    ['/assets/runners/sandbox.html', '/assets/runners/sandbox'],
  ]) {
    const response = await serve(origin + path, { redirect: 'manual' });
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), canonical);
    assert.equal((await serve(origin + canonical)).status, 200);
  }
});

async function rawStatus(origin, path) { return (await dispatch(servers.get(origin), path)).status; }

test('local serving keeps writes, private paths, traversal and outside symlinks blocked', async t => {
  const origin = await fixture(t);
  const write = await serve(origin + '/', { method: 'POST' });
  assert.equal(write.status, 405);
  assert.equal(write.headers.get('allow'), 'GET, HEAD');
  assert.equal(write.headers.get('x-content-type-options'), 'nosniff');
  for (const path of ['/.hidden', '/.git/config', '/package.json', '/secrets.json', '/scripts/build.mjs', '/site/app.jsx', '/assets/outside.txt', '/assets/linked.json', '/%2e%2e%2fscripts/build.mjs', '/assets/../scripts/build.mjs', '/assets/%5c..%5cindex.html', '/missing.html']) {
    assert.equal(await rawStatus(origin, path), 404, path);
  }
  assert.equal(await rawStatus(origin, '/%ZZ'), 400);
  assert.throws(() => createSiteServer(new URL('../', import.meta.url).pathname), /not project sources/);
});
