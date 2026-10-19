import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { prepareClangHost } from '../scripts/clang-host.mjs';
import { Marked } from 'marked';
import { getCodeExample } from '../scripts/code-examples.mjs';
import { prepareRunnableExample } from '../scripts/run-context.mjs';
import { executePython } from '../site/runners/python.mjs';
import { boundWasmMemory, outputBuffer, RUN_LIMITS } from '../site/runners/limits.mjs';
import { assertExpandedOutput } from './expanded-examples.mjs';

const examples = [];
for (const filename of ['README.md', 'PYTHON-README.md', 'README-zh.md', 'docs/ml-deep-learning.md']) {
  for (const token of new Marked().lexer(await readFile(new URL(`../${filename}`, import.meta.url), 'utf8'))) {
    if (token.type === 'code') examples.push(getCodeExample(token.text, filename));
  }
}

async function createCDriver() {
  const assets = Object.fromEntries(await Promise.all(['shared.js', 'clang', 'lld', 'memfs', 'sysroot.tar'].map(async name =>
    [name, await readFile(new URL('../site/runners/vendor/clang/' + name, import.meta.url))])));
  const modules = Object.fromEntries(await Promise.all(['clang', 'lld', 'memfs'].map(async name =>
    [name, await WebAssembly.compile(boundWasmMemory(assets[name], RUN_LIMITS.compilerMemoryBytes))])));
  let output;
  const context = { WebAssembly, Uint8Array, Uint32Array, ArrayBuffer, Date, Map, Math, TextDecoder, setTimeout,
    console: { log() {}, warn() {}, error() {} } };
  context.self = context;
  vm.createContext(context);
  vm.runInContext(prepareClangHost(assets['shared.js'].toString()) + '\nself.MACClangAPI = API;', context);
  const api = new context.MACClangAPI({
    readBuffer: async name => assets[name].buffer.slice(assets[name].byteOffset, assets[name].byteOffset + assets[name].length),
    compileStreaming: async name => modules[name],
    hostWrite: text => { if (output?.append(text)) throw new Error('Output stopped at 32 KB.'); },
  });
  api.hostLog = () => {};
  await api.ready;
  return async (id, source) => {
    output = outputBuffer();
    // Separate virtual artifacts prevent a failed compilation from accidentally
    // linking a previous example's object. Nothing is written to the host disk.
    const input = `${id}.c`, object = `${id}.o`, binary = `${id}.wasm`;
    api.memfs.addFile(input, new TextEncoder().encode(source));
    try {
      await api.run(modules.clang, 'clang', '-cc1', '-emit-obj', '-triple', 'wasm32-unknown-wasi',
        '-isysroot', '/', '-internal-isystem', '/include', '-internal-isystem', '/lib/clang/8.0.1/include',
        '-ferror-limit', '8', '-fmessage-length', '80', '-std=c11', '-O0', '-o', object, '-x', 'c', input);
      await api.run(modules.lld, 'wasm-ld', '--no-threads', '-z', 'stack-size=1048576',
        '--max-memory=' + RUN_LIMITS.cMemoryBytes, '-Llib/wasm32-wasi', 'lib/wasm32-wasi/crt1.o', object, '-lc', '-lm',
        'lib/clang/8.0.1/lib/wasi/libclang_rt.builtins-wasm32.a', '-o', binary);
      const module = await WebAssembly.compile(boundWasmMemory(api.memfs.getFileContents(binary), RUN_LIMITS.cMemoryBytes));
      await api.run(module, binary);
      return { success: true, output: output.text };
    } catch (error) { return { success: false, output: output.text, error: error.message }; }
  };
}

test('all 226 prepared C examples compile, link and run in the actual WASM toolchain', { timeout: 120_000 }, async t => {
  let run;
  const failures = [];
  let passed = 0;
  for (const [index, example] of examples.entries()) {
    // The browser creates a fresh sandbox per run. Bound this verification
    // driver's inode table too, rather than filling one filesystem forever.
    if (index % 96 === 0) run = await createCDriver();
    const prepared = prepareRunnableExample({ exampleId: example.id, language: 'c', source: example.variants.c });
    assert.equal(prepared.runnable, true, example.id);
    const result = await run(example.id, prepared.source);
    if (example.id === 'py-36') {
      if (result.success || !/assert|unreachable/i.test(result.output + result.error)) failures.push(`${example.id}: expected intentional assertion failure\n${result.output}\n${result.error || ''}`);
    } else if (!result.success) failures.push(`${example.id}: ${result.error}\n${result.output}`);
    else { assertExpandedOutput(example.id, result.output); passed++; }
  }
  t.diagnostic(`${passed} C examples succeeded; py-36 retains its intentional assertion failure.`);
  assert.equal(examples.length, 226);
  assert.deepEqual(failures, []);
});

test('all runnable Python examples execute in actual bounded WASI CPython', { timeout: 120_000 }, async t => {
  const paths = { 'python.wasm': 'bin/python-3.12.0.wasm', 'python312.zip': 'usr/local/lib/python312.zip', 'os.py': 'usr/local/lib/python3.12/os.py' };
  const assets = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([name, path]) =>
    [name, await readFile(new URL('../site/runners/vendor/python-wasi/' + path, import.meta.url))])));
  assets['notation.py'] = await readFile(new URL('../examples/notation.py', import.meta.url));
  const failures = [];
  let passed = 0, limitations = 0, intentional = 0;
  for (const example of examples) {
    const prepared = prepareRunnableExample({ exampleId: example.id, language: 'python', source: example.variants.python });
    if (!prepared.runnable) { limitations++; continue; }
    const output = outputBuffer();
    let error;
    try {
      await executePython(prepared.source, assets, text => { if (output.append(text)) throw new Error('Output stopped at 32 KB.'); });
    } catch (failure) { error = failure; }
    const expected = { 'py-6': /TypeError/, 'py-36': /AssertionError/ }[example.id];
    if (expected) {
      intentional++;
      if (!error || !expected.test(output.text)) failures.push(`${example.id}: expected deliberate ${expected}\n${output.text}\n${error?.message || ''}`);
    } else if (error) failures.push(`${example.id}: ${error.message}\n${output.text}`);
    else { assertExpandedOutput(example.id, output.text); passed++; }
  }
  t.diagnostic(`${passed} Python examples succeeded; ${intentional} deliberate errors; ${limitations} explicit NumPy limitations.`);
  assert.equal(passed + intentional + limitations + failures.length, examples.length);
  assert.equal(limitations, 14);
  assert.deepEqual(failures, []);
});
