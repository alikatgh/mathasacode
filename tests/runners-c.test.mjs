import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { prepareClangHost } from '../scripts/clang-host.mjs';
import { boundWasmMemory, RUN_LIMITS } from '../site/runners/limits.mjs';

const assets = Object.fromEntries(await Promise.all(['shared.js', 'clang', 'lld', 'memfs', 'sysroot.tar'].map(async name =>
  [name, await readFile(new URL('../site/runners/vendor/clang/' + name, import.meta.url))])));
const modules = Object.fromEntries(await Promise.all(['clang', 'lld', 'memfs'].map(async name =>
  [name, await WebAssembly.compile(boundWasmMemory(assets[name], RUN_LIMITS.compilerMemoryBytes))])));

async function c(source) {
  let output = '';
  const context = { WebAssembly, Uint8Array, Uint32Array, ArrayBuffer, Date, Map, Math, TextDecoder, setTimeout,
    console: { log() {}, warn() {}, error() {} } };
  context.self = context;
  vm.createContext(context);
  vm.runInContext(prepareClangHost(assets['shared.js'].toString()) + '\nself.MACClangAPI = API;', context);
  const api = new context.MACClangAPI({
    readBuffer: async name => assets[name].buffer.slice(assets[name].byteOffset, assets[name].byteOffset + assets[name].length),
    compileStreaming: async name => modules[name], hostWrite: text => { output += text; },
  });
  api.hostLog = () => {};
  await api.ready;
  output = '';
  api.memfs.addFile('edited.c', new TextEncoder().encode(source));
  try {
    await api.run(modules.clang, 'clang', '-cc1', '-emit-obj', '-triple', 'wasm32-unknown-wasi',
      '-isysroot', '/', '-internal-isystem', '/include', '-internal-isystem', '/lib/clang/8.0.1/include',
      '-std=c11', '-O0', '-o', 'edited.o', '-x', 'c', 'edited.c');
    await api.run(modules.lld, 'wasm-ld', '--no-threads', '-z', 'stack-size=1048576',
      '--max-memory=' + RUN_LIMITS.cMemoryBytes, '-Llib/wasm32-wasi', 'lib/wasm32-wasi/crt1.o', 'edited.o', '-lc', '-lm', 'lib/clang/8.0.1/lib/wasi/libclang_rt.builtins-wasm32.a', '-o', 'edited.wasm');
    await api.run(await WebAssembly.compile(boundWasmMemory(api.memfs.getFileContents('edited.wasm'), RUN_LIMITS.cMemoryBytes)), 'edited.wasm');
    return { output, success: true };
  } catch (error) { return { output, success: false, error }; }
}

test('actual WASM Clang compiles edited C11, links math and prints real output', async () => {
  const result = await c('#include <math.h>\n#include <stdio.h>\nint main(void) { printf("edited:%g\\n", sqrt(81)); return 0; }');
  assert.equal(result.success, true);
  assert.match(result.output, /edited:9/);
});

test('actual C programs preserve UTF-8 standard output', async () => {
  const result = await c('#include <stdio.h>\nint main(void) { printf("你好 ∇\\n"); return 0; }');
  assert.equal(result.success, true);
  assert.match(result.output, /你好 ∇/);
});

test('actual Clang diagnostics and failed assertions are failures, never canned success', async () => {
  const compile = await c('int main(void) { return missing_value; }');
  assert.equal(compile.success, false);
  assert.match(compile.output, /undeclared identifier 'missing_value'/);
  const runtime = await c('#include <assert.h>\nint main(void) { assert(2 == 3); return 0; }');
  assert.equal(runtime.success, false);
  assert.match(runtime.output, /assert|unreachable/i);
});

test('actual linked C program cannot allocate beyond its 64 MiB heap maximum', async () => {
  const result = await c('#include <stdlib.h>\n#include <stdio.h>\nint main(void) { printf("%d\\n", malloc(100 * 1024 * 1024) == 0); return 0; }');
  assert.equal(result.success, true);
  assert.match(result.output, /1/);
});

test('complex C arithmetic links the included compiler runtime helpers', async () => {
  const result = await c('#include <complex.h>\n#include <stdio.h>\nint main(void) { double complex a = 3.0 - I; double complex b = csqrt(-1.0 + 0.0 * I); double complex c = a * b; printf("%g %+.0fi\\n", creal(c), cimag(c)); return 0; }');
  assert.equal(result.success, true);
  assert.match(result.output, /1 \+3i/);
});
