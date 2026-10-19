import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { executeJavaScript } from '../site/runners/javascript.mjs';
import { RUN_LIMITS, validateRun, outputBuffer, boundWasmMemory } from '../site/runners/limits.mjs';
import { runCode, runnerInfo } from '../site/runners/controller.mjs';

const wasm = await readFile(new URL('../node_modules/@jitl/quickjs-wasmfile-release-sync/dist/emscripten-module.wasm', import.meta.url));
const modules = await build({ entryPoints: [new URL('../site/runners/guest-modules.cjs', import.meta.url).pathname], bundle: true,
  write: false, minify: true, format: 'iife', globalName: 'MACModules', platform: 'browser', target: 'es2020' });
const assets = { 'quickjs.wasm': wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength), 'guest-modules.js': modules.outputFiles[0].contents };
async function js(source) {
  let output = '';
  await executeJavaScript(source, assets, text => { output += text; });
  return output;
}

test('source and output limits apply to edited Unicode source and repeated output', () => {
  assert.throws(() => validateRun('javascript', 'é'.repeat(RUN_LIMITS.sourceBytes / 2 + 1)), /64 KB/);
  assert.throws(() => validateRun('html', 'anything'), /Choose/);
  const buffer = outputBuffer(4);
  assert.equal(buffer.append('abc'), false);
  assert.equal(buffer.append('def'), true);
  assert.equal(buffer.text, 'abcd');
});

test('real QuickJS evaluates edited code and includes actual guide dependencies', async () => {
  assert.equal(await js('const edited = 11; console.log(edited * 3)'), '33\n');
  assert.equal(await js('var math = require("mathjs"); console.log(math.multiply(math.complex(3,-1),math.sqrt(-1)).toString())'), '1 + 3i\n');
  assert.equal(await js('console.log(require("./examples/notation.cjs").mean([2,4]))'), '3\n');
  assert.equal(await js('console.log(require("gl-mat2/determinant")([1,2,3,4]))'), '-2\n');
  assert.equal(await js('console.log(require("nextafter")(1, 2) > 1)'), 'true\n');
  assert.equal(await js('var Interval = require("interval-arithmetic"); console.log(Interval(3, 5).lo, typeof Interval.intersection)'), '3 function\n');
  assert.equal(await js('console.assert(true, "not printed"); console.assert(false, "edited assertion")'), 'Assertion failed: edited assertion\n');
});

test('guest JavaScript has no DOM, network, worker, storage, process or host constructor', async () => {
  assert.equal(await js('console.log(typeof fetch, typeof document, typeof process, typeof Worker, typeof indexedDB, typeof XMLHttpRequest)'), 'undefined undefined undefined undefined undefined undefined\n');
  assert.equal(await js('console.log(console.log.constructor("return typeof fetch")())'), 'undefined\n');
  await assert.rejects(js('require("node:fs")'), /unavailable/);
});

test('real syntax/runtime errors, infinite loops and memory exhaustion fail', async () => {
  await assert.rejects(js('const broken = ;'), /SyntaxError/);
  await assert.rejects(js('throw new Error("edited failure")'), /edited failure/);
  await assert.rejects(js('new ArrayBuffer(100 * 1024 * 1024)'), /out of memory/i);
  const began = Date.now();
  await assert.rejects(js('while (true) {}'), /interrupted/i);
  assert.ok(Date.now() - began < 8000);
});

test('C wasm memory maxima cannot be grown past configured bytes', async () => {
  const raw = new Uint8Array([0,97,115,109,1,0,0,0,5,3,1,0,1,7,10,1,6,109,101,109,111,114,121,2,0]);
  const bounded = boundWasmMemory(raw, 2 * 65536);
  const { instance } = await WebAssembly.instantiate(bounded);
  assert.equal(instance.exports.memory.grow(1), 1);
  assert.throws(() => instance.exports.memory.grow(1), RangeError);
  assert.throws(() => boundWasmMemory(raw, 0), /memory exceeds/);
});

test('Stop and invalid source resolve without starting a runtime or request', async () => {
  const task = runCode({ language: 'python', source: 'while True: pass' });
  task.stop();
  assert.equal((await task.promise).status, 'stopped');
  assert.equal((await runCode({ language: 'javascript', source: 'x'.repeat(65537) }).promise).status, 'error');
});

test('worker timeout retains partial trace, capture limit and bounded warnings', async () => {
  const names = ['document', 'fetch', 'addEventListener', 'removeEventListener', 'MessageChannel'];
  const saved = Object.fromEntries(names.map(name => [name, globalThis[name]]));
  let ready;
  const frame = {
    style: {}, setAttribute() {}, remove() {},
    contentWindow: { postMessage(_payload, _origin, [port]) {
      port.peer.onmessage({ data: { type: 'trace', frame: { line: 1, event: 'line', locals: { x: '1' } } } });
      port.peer.onmessage({ data: { type: 'timeout', traceTruncated: true, traceWarnings: ['Unknown pointer values omitted.', 'x'.repeat(300)] } });
      // Late messages after teardown cannot mutate the retained result.
      port.peer.onmessage({ data: { type: 'trace', frame: { line: 2, event: 'line', locals: {} } } });
    } },
  };
  globalThis.document = { createElement: () => frame, body: { append: () => queueMicrotask(() => ready?.({ source: frame.contentWindow, data: { type: 'math-as-code-ready' } })) } };
  globalThis.addEventListener = (_type, listener) => { ready = listener; };
  globalThis.removeEventListener = () => {};
  globalThis.MessageChannel = class { constructor() { this.port1 = { start() {}, close() {}, postMessage() {} }; this.port2 = { peer: this.port1 }; } };
  const worker = new TextEncoder().encode('// isolated worker fixture');
  const hash = Buffer.from(await crypto.subtle.digest('SHA-256', worker)).toString('hex');
  globalThis.fetch = async path => path.endsWith('manifest.json')
    ? Response.json({ languages: { javascript: [] }, worker: { path: '/fixture-worker.js', bytes: worker.length, sha256: hash } })
    : new Response(worker);
  try {
    const result = await runCode({ language: 'javascript', source: 'while (true) {}', trace: true }).promise;
    assert.equal(result.status, 'timeout');
    assert.equal(result.traceTruncated, true);
    assert.equal(result.traceFrames.length, 1);
    assert.equal(result.traceWarnings[0], 'Unknown pointer values omitted.');
    assert.equal(result.traceWarnings[1].length, 240);
  } finally {
    for (const name of names) {
      if (saved[name] === undefined) delete globalThis[name];
      else globalThis[name] = saved[name];
    }
  }
});

test('Rust sends current edited source once, omits credentials and surfaces service compile errors', async () => {
  const savedFetch = globalThis.fetch;
  const savedNow = Date.now;
  const calls = [];
  let now = 100000;
  Date.now = () => now;
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ success: false, stdout: '', stderr: 'error[E0425]: cannot find value edited in this scope\n' }));
  };
  try {
    const source = 'fn main() { println!("{}", edited); }';
    const result = await runCode({ language: 'rust', source }).promise;
    assert.equal(result.status, 'error');
    assert.match(result.output, /E0425/);
    assert.equal(calls.length, 1);
    assert.equal(JSON.parse(calls[0].options.body).code, source);
    assert.equal(calls[0].options.credentials, 'omit');
    assert.equal(calls[0].url, 'https://play.rust-lang.org/execute');
    assert.match(runnerInfo('rust').note, /sends this code/);
    const cooldown = await runCode({ language: 'rust', source }).promise;
    assert.equal(cooldown.status, 'error');
    assert.equal(calls.length, 1);
    now += RUN_LIMITS.remoteCooldownMs;
    globalThis.fetch = async () => new Response('unavailable', { status: 503 });
    assert.match((await runCode({ language: 'rust', source }).promise).error, /503/);
  } finally { globalThis.fetch = savedFetch; Date.now = savedNow; }
});
