import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm, access } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import vm from 'node:vm';
import { Marked } from 'marked';
import { prepareClangHost } from '../scripts/clang-host.mjs';
import { getCodeExample } from '../scripts/code-examples.mjs';
import { prepareRunnableExample } from '../scripts/run-context.mjs';
import { boundWasmMemory, RUN_LIMITS } from '../site/runners/limits.mjs';
import { instrumentCompiledTrace, COMPILED_TRACE_LIMITS } from '../site/runners/trace-compiled.mjs';

const execute = promisify(execFile);
const assets = Object.fromEntries(await Promise.all([
  ['parser', 'web-tree-sitter/web-tree-sitter.wasm'],
  ['c', 'tree-sitter-c/tree-sitter-c.wasm'],
  ['rust', 'tree-sitter-rust/tree-sitter-rust.wasm'],
].map(async ([name, path]) => [`trace-${name}.wasm`, await readFile(new URL(`../node_modules/${path}`, import.meta.url))])));

function splitTrace(output, marker) {
  const frames = [];
  let normal = '';
  let cursor = 0;
  while (true) {
    const start = output.indexOf(marker, cursor);
    if (start < 0) { normal += output.slice(cursor); break; }
    normal += output.slice(cursor, start);
    const end = output.indexOf('\n', start);
    assert.ok(end >= 0, 'Complete trace marker');
    frames.push(JSON.parse(output.slice(start + marker.length, end)));
    cursor = end + 1;
  }
  return { output: normal, frames, traceBytes: Buffer.byteLength(output) - Buffer.byteLength(normal) };
}

async function createCDriver() {
  const files = Object.fromEntries(await Promise.all(['shared.js', 'clang', 'lld', 'memfs', 'sysroot.tar'].map(async name =>
    [name, await readFile(new URL('../site/runners/vendor/clang/' + name, import.meta.url))])));
  const modules = Object.fromEntries(await Promise.all(['clang', 'lld', 'memfs'].map(async name =>
    [name, await WebAssembly.compile(boundWasmMemory(files[name], RUN_LIMITS.compilerMemoryBytes))])));
  let output = '';
  const context = { WebAssembly, Uint8Array, Uint32Array, ArrayBuffer, Date, Map, Math, TextDecoder, setTimeout, console: { log() {}, warn() {}, error() {} } };
  context.self = context;
  vm.createContext(context);
  vm.runInContext(prepareClangHost(files['shared.js'].toString()) + '\nself.MACClangAPI=API;', context);
  const api = new context.MACClangAPI({
    readBuffer: async name => files[name].buffer.slice(files[name].byteOffset, files[name].byteOffset + files[name].length),
    compileStreaming: async name => modules[name], hostWrite: text => { output += text; },
  });
  api.hostLog = () => {};
  await api.ready;
  let count = 0;
  return async source => {
    output = '';
    const name = `fixture${count++}`;
    api.memfs.addFile(`${name}.c`, new TextEncoder().encode(source));
    try {
      await api.run(modules.clang, 'clang', '-cc1', '-emit-obj', '-triple', 'wasm32-unknown-wasi', '-isysroot', '/', '-internal-isystem', '/include', '-internal-isystem', '/lib/clang/8.0.1/include', '-std=c11', '-O0', '-o', `${name}.o`, '-x', 'c', `${name}.c`);
      await api.run(modules.lld, 'wasm-ld', '--no-threads', '-z', 'stack-size=1048576', '--max-memory=' + RUN_LIMITS.cMemoryBytes, '-Llib/wasm32-wasi', 'lib/wasm32-wasi/crt1.o', `${name}.o`, '-lc', '-lm', 'lib/clang/8.0.1/lib/wasi/libclang_rt.builtins-wasm32.a', '-o', `${name}.wasm`);
      await api.run(await WebAssembly.compile(boundWasmMemory(api.memfs.getFileContents(`${name}.wasm`), RUN_LIMITS.cMemoryBytes)), `${name}.wasm`);
      return { success: true, output };
    } catch (error) { return { success: false, output, error: error.message }; }
  };
}

const rustc = process.env.RUSTC || join(homedir(), '.rustup/toolchains/1.98.1-aarch64-apple-darwin/bin/rustc');
let hasRust = true;
try { await access(rustc); } catch { hasRust = false; }
async function rust(source, metadataOnly = false) {
  const directory = await mkdtemp(join(process.env.TRACE_TEST_SCRATCH || tmpdir(), 'compiled-trace-'));
  try {
    const input = join(directory, 'fixture.rs');
    const output = join(directory, metadataOnly ? 'fixture.rmeta' : 'fixture');
    await writeFile(input, source);
    await execute(rustc, ['--edition=2021', '--crate-name=trace_fixture', '-Awarnings', ...(metadataOnly ? ['--emit=metadata', '--crate-type=lib'] : []), input, '-o', output], { timeout: 60000, maxBuffer: 2 * 1024 * 1024 });
    if (metadataOnly) return '';
    return (await execute(output, [], { timeout: 5000, maxBuffer: 100000 })).stdout;
  } finally { await rm(directory, { recursive: true, force: true }); }
}

const examples = [];
for (const filename of ['README.md', 'PYTHON-README.md', 'README-zh.md', 'docs/ml-deep-learning.md']) {
  for (const token of new Marked().lexer(await readFile(new URL(`../${filename}`, import.meta.url), 'utf8'))) {
    if (token.type === 'code') { const example = getCodeExample(token.text, filename); if (example) examples.push(example); }
  }
}

test('C actual execution traces loops, single-line branches, nested scopes, arrays, strings and return values', { timeout: 60000 }, async () => {
  const source = `#include <stdio.h>\nint bump(int x) { if (x > 2) return x+1; else return x; }\nint main(void) {\n  int sum=0, data[3]={1,2,3};\n  for(int i=0;i<3;i++) if(i!=1) sum+=data[i];\n  { int sum=9; printf("inner:%d;",sum); }\n  printf("quoted:\\" %d\\n",bump(sum));\n  return 0;\n}`;
  const run = await createCDriver();
  const baseline = await run(source);
  const compiled = await instrumentCompiledTrace('c', source, assets);
  const result = await run(compiled.source);
  assert.equal(result.success, true, result.output);
  const trace = splitTrace(result.output, compiled.markerPrefix);
  assert.equal(trace.output, baseline.output);
  assert.ok(trace.frames.some(frame => frame.locals.sum === '4'));
  assert.ok(trace.frames.some(frame => frame.locals.sum === '9'));
  assert.ok(trace.frames.some(frame => frame.locals.data === '[1, 2, 3]'));
  assert.ok(trace.frames.some(frame => frame.event === 'return' && frame.locals['(return)'] === '5'));
  assert.ok(trace.frames.filter(frame => frame.line === 5).length >= 4);
  assert.ok(trace.frames.every(frame => frame.line >= 1 && frame.line <= source.split('\n').length));
});

test('C does not snapshot arbitrary pointers, uninitialized arrays, or volatile locals', { timeout: 60000 }, async () => {
  const source = '#include <stdio.h>\nint main(void){int a[2],x; int *bad=(int*)1; volatile int flag=2; x=3; a[0]=x; printf("%d",a[0]); return 0;}';
  const compiled = await instrumentCompiledTrace('c', source, assets);
  const run = await createCDriver();
  const baseline = await run(source);
  const result = await run(compiled.source);
  assert.equal(result.success, true, result.output);
  const trace = splitTrace(result.output, compiled.markerPrefix);
  assert.equal(trace.output, baseline.output);
  assert.ok(trace.frames.some(frame => frame.locals['a[0]'] === '3'));
  assert.ok(trace.frames.every(frame => !('bad' in frame.locals) && !('flag' in frame.locals) && !('a' in frame.locals)));
});

test('C pointer and struct returns preserve their original types and normal results', { timeout: 60000 }, async () => {
  const source = '#include <stdio.h>\ntypedef struct {int value;} Box; char *word(void){return "ok";} Box box(void){return (Box){7};} int main(void){Box b=box();printf("%s:%d",word(),b.value);return 0;}';
  const compiled = await instrumentCompiledTrace('c', source, assets);
  const run = await createCDriver();
  const baseline = await run(source);
  const result = await run(compiled.source);
  assert.equal(result.success, true, result.output);
  assert.equal(splitTrace(result.output, compiled.markerPrefix).output, baseline.output);
});

test('C multiline subscript assignments produce valid single-line JSON with normalized local labels', { timeout: 60000 }, async () => {
  const source = 'int main(void){int a[2];\na[\n 0\n] = 3;\nreturn 0;}';
  const compiled = await instrumentCompiledTrace('c', source, assets);
  const run = await createCDriver();
  const baseline = await run(source);
  const result = await run(compiled.source);
  assert.equal(result.success, true, result.output);
  const trace = splitTrace(result.output, compiled.markerPrefix);
  assert.equal(trace.output, baseline.output);
  assert.ok(trace.frames.some(frame => frame.locals['a[0]'] === '3'));
  assert.ok(trace.frames.every(frame => Object.keys(frame.locals).every(name => !/[\r\n\t]/.test(name))));
});

test('Rust actual traces preserve loops, early returns, closures, arrays, strings and tail return values', { skip: !hasRust, timeout: 60000 }, async () => {
  const source = `fn bump(x:i32)->i32 { if x>2 {return x+1;} x }\nfn main(){\n let mut sum=0; let data=[1,2,3];\n for i in 0..3 { if i!=1 {sum+=data[i];} }\n let add=|x:i32| x+1;\n {let sum=9; print!("inner:{};",sum);}\n println!("quoted:\\" {} {}",bump(sum),add(sum));\n}`;
  const compiled = await instrumentCompiledTrace('rust', source, assets);
  const output = await rust(compiled.source);
  const trace = splitTrace(output, compiled.markerPrefix);
  assert.equal(trace.output, await rust(source));
  assert.ok(trace.frames.some(frame => frame.locals.sum === '4'));
  assert.ok(trace.frames.some(frame => frame.locals.sum === '9'));
  assert.ok(trace.frames.some(frame => frame.locals.data === '[1, 2, 3]'));
  assert.ok(trace.frames.some(frame => frame.event === 'return' && frame.locals['(return)'] === '5'));
  assert.ok(trace.frames.filter(frame => frame.line === 4).length >= 4);
});

test('Rust tracing preserves mutable references, moved closures, and opaque non-Debug values', { skip: !hasRust, timeout: 60000 }, async () => {
  const source = 'struct Opaque; fn main(){let opaque=Opaque;let mut a=[1,2];let r=&mut a;r[0]+=1;let mut f=move || {r[1]+=2;r[0]+r[1]};println!("{}",f());let _=opaque;}';
  const compiled = await instrumentCompiledTrace('rust', source, assets);
  assert.equal(splitTrace(await rust(compiled.source), compiled.markerPrefix).output, await rust(source));
  assert.ok(compiled.warnings.length > 0);
});

test('Rust shadowed function calls never invoke custom Debug or require Debug on opaque results', { skip: !hasRust, timeout: 60000 }, async () => {
  for (const debug of ['', `impl std::fmt::Debug for Wrapped {fn fmt(&self,f:&mut std::fmt::Formatter<'_>)->std::fmt::Result {print!("debug-side-effect;");write!(f,"Wrapped")}}`]) {
    const source = `struct Wrapped; ${debug} fn make()->i32{1} fn main(){let make=||Wrapped;let x=make();let _=x;println!("done");}`;
    const compiled = await instrumentCompiledTrace('rust', source, assets);
    const trace = splitTrace(await rust(compiled.source), compiled.markerPrefix);
    assert.equal(trace.output, await rust(source));
    assert.equal(trace.output, 'done\n');
    assert.ok(trace.frames.every(frame => !('x' in frame.locals)));
  }
});

test('Rust custom trait methods on primitive receivers never invoke custom Debug on unannotated results', { skip: !hasRust, timeout: 60000 }, async () => {
  for (const debug of ['', `impl std::fmt::Debug for Wrapped {fn fmt(&self,f:&mut std::fmt::Formatter<'_>)->std::fmt::Result {print!("debug-side-effect;");write!(f,"Wrapped")}}`]) {
    const source = `struct Wrapped; ${debug} trait Root{fn sqrt(self)->Wrapped;} impl Root for i32{fn sqrt(self)->Wrapped{Wrapped}} fn main(){let a=1_i32;let x=a.sqrt();let _=x;println!("done");}`;
    const compiled = await instrumentCompiledTrace('rust', source, assets);
    const trace = splitTrace(await rust(compiled.source), compiled.markerPrefix);
    assert.equal(trace.output, await rust(source));
    assert.equal(trace.output, 'done\n');
    assert.ok(trace.frames.every(frame => !('x' in frame.locals)));
  }
});

test('both runtime tracers stop at an explicit bounded truncation marker without stopping normal execution', { timeout: 60000 }, async () => {
  for (const language of hasRust ? ['c', 'rust'] : ['c']) {
    const source = language === 'c' ? '#include <stdio.h>\nint main(void){int x=0;for(int i=0;i<2000;i++)x++;printf("done:%d",x);return 0;}' : 'fn main(){let mut x=0;for _i in 0..2000{x+=1;}print!("done:{}",x);}';
    const compiled = await instrumentCompiledTrace(language, source, assets);
    const run = language === 'c' ? await createCDriver() : null;
    const output = language === 'c' ? (await run(compiled.source)).output : await rust(compiled.source);
    const trace = splitTrace(output, compiled.markerPrefix);
    assert.equal(trace.output, language === 'c' ? (await run(source)).output : 'done:2000');
    assert.equal(trace.frames.at(-1).event, 'truncated');
    assert.ok(trace.frames.length <= COMPILED_TRACE_LIMITS.frames);
    assert.ok(trace.traceBytes <= COMPILED_TRACE_LIMITS.traceBytes);
  }
});

test('real syntax instrumentation covers all 226 authored C and Rust variants', { timeout: 60000 }, async () => {
  assert.equal(examples.length, 226);
  for (const language of ['c', 'rust']) for (const example of examples) {
    const prepared = prepareRunnableExample({ exampleId: example.id, language, source: example.variants[language] });
    try {
      const compiled = await instrumentCompiledTrace(language, prepared.source, assets);
      assert.ok(compiled.source.length > prepared.source.length, example.id);
    } catch (error) { throw new Error(`${language}/${example.id}: ${error.message}`); }
  }
});

test('all authored C traces compile and execute in actual bounded Clang WASI', { timeout: 120000 }, async t => {
  const failures = [];
  let run;
  for (const [index, example] of examples.entries()) {
    if (index % 64 === 0) run = await createCDriver();
    const source = prepareRunnableExample({ exampleId: example.id, language: 'c', source: example.variants.c }).source;
    let compiled;
    try { compiled = await instrumentCompiledTrace('c', source, assets); } catch (error) { failures.push(`${example.id}: ${error.message}`); continue; }
    const result = await run(compiled.source);
    if (example.id === 'py-36') {
      if (result.success || !/assert|unreachable/i.test(result.output + result.error)) failures.push(`${example.id}: missing deliberate assertion error`);
    } else if (!result.success) failures.push(`${example.id}: ${result.output}\n${result.error}`);
  }
  t.diagnostic(`${examples.length - failures.length} authored C trace compilations matched expected execution status.`);
  assert.deepEqual(failures, []);
});

test('all authored Rust trace variants pass actual compiler type and borrow checks together', { skip: !hasRust, timeout: 120000 }, async () => {
  const modules = [];
  for (const [index, example] of examples.entries()) {
    const source = prepareRunnableExample({ exampleId: example.id, language: 'rust', source: example.variants.rust }).source;
    const compiled = await instrumentCompiledTrace('rust', source, assets);
    modules.push(`mod fixture_${index}{${compiled.source}}`);
  }
  await rust(modules.join('\n'), true);
});

test('unsupported syntax and source/AST limits fail explicitly rather than silently inventing trace states', async () => {
  await assert.rejects(instrumentCompiledTrace('javascript', '', assets), /C and Rust/);
  await assert.rejects(instrumentCompiledTrace('c', 'x'.repeat(65537), assets), /64 KB/);
  await assert.rejects(instrumentCompiledTrace('c', 'int main( {', assets), /syntactically valid/);
  await assert.rejects(instrumentCompiledTrace('c', 'int main(){goto end;end:return 0;}', assets), /does not yet support/);
  await assert.rejects(instrumentCompiledTrace('rust', 'fn main(){let _=async {1};}', assets), /does not yet support/);
  await assert.rejects(instrumentCompiledTrace('c', `int main(){${'{'.repeat(110)}0;${'}'.repeat(110)}}`, assets), /work limit/);
  const collision = await instrumentCompiledTrace('c', 'int main(){int mac_trace_0=1;return mac_trace_0;}', assets);
  assert.doesNotMatch(collision.markerPrefix, /mac_trace_0__/);
  assert.equal(COMPILED_TRACE_LIMITS.parserMemoryBytes, 64 * 1024 * 1024);
});
