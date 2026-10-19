import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('deployed manifest pins every runtime and worker to content-hashed bytes', async () => {
  const manifest = JSON.parse(await readFile(new URL('../dist/assets/runners/manifest.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(manifest.languages).sort(), ['c', 'javascript', 'python', 'rust']);
  assert.match(manifest.worker.path, /\/worker\.[0-9a-f]{16}\.js$/);
  const files = [manifest.worker, ...Object.values(manifest.languages).flat()];
  for (const file of files) {
    assert.match(file.path, /\.[0-9a-f]{16}\.(?:js|gz)$/);
    const bytes = await readFile(new URL('../dist' + file.path, import.meta.url));
    assert.equal(bytes.length, file.bytes);
    assert.equal(hash(bytes), file.sha256);
  }
  assert.equal(manifest.languages.python.some(file => /pyodide/.test(file.name)), false);
  assert.deepEqual(manifest.languages.rust.map(file => file.name).sort(), ['trace-parser.wasm', 'trace-rust.wasm']);
});

test('a mismatched worker fails integrity before edited source is sent to a worker', async () => {
  const savedFetch = globalThis.fetch;
  const savedDocument = globalThis.document;
  const savedAdd = globalThis.addEventListener;
  const savedRemove = globalThis.removeEventListener;
  let sent = false;
  globalThis.document = { createElement: () => ({ style: {}, setAttribute() {}, remove() {}, contentWindow: { postMessage() { sent = true; } } }), body: { append() {} } };
  globalThis.addEventListener = () => {};
  globalThis.removeEventListener = () => {};
  const expected = new TextEncoder().encode('expected');
  const worker = { path: '/assets/runners/worker.0000000000000000.js', bytes: expected.length, sha256: hash(expected) };
  const calls = [];
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options });
    if (path.endsWith('/manifest.json')) return new Response(JSON.stringify({ languages: { javascript: [] }, worker }));
    return new Response('tampered');
  };
  try {
    const { runCode } = await import('../site/runners/controller.mjs?worker-integrity-test');
    const result = await runCode({ language: 'javascript', source: '42' }).promise;
    assert.equal(result.status, 'error');
    assert.match(result.error, /integrity check failed/);
    assert.equal(calls[0].options.cache, 'no-cache');
    assert.equal(calls[1].options.credentials, 'omit');
    assert.equal(sent, false);
  } finally { globalThis.fetch = savedFetch; globalThis.document = savedDocument; globalThis.addEventListener = savedAdd; globalThis.removeEventListener = savedRemove; }
});
