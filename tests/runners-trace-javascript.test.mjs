import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Marked } from 'marked';
import { executeJavaScript } from '../site/runners/javascript.mjs';
import { instrumentJavaScript } from '../site/runners/trace-javascript.mjs';
import { TRACE_LIMITS, createTraceCollector } from '../site/runners/trace-runtime.mjs';

const wasm = await readFile(new URL('../node_modules/@jitl/quickjs-wasmfile-release-sync/dist/emscripten-module.wasm', import.meta.url));
const assets = { 'quickjs.wasm': wasm };
async function run(source, trace = true, runtimeAssets = assets) {
  let output = '';
  const frames = [];
  try {
    const status = await executeJavaScript(source, runtimeAssets, text => { output += text; }, () => {}, { trace, onTrace: frame => frames.push(frame) });
    return { output, frames, ...status };
  } catch (error) { return { output, frames, error, ...error }; }
}

test('JavaScript traces actual loop bindings, lexical scopes, calls and return values', async () => {
  const source = 'let total = 0;\nfunction add(value) {\n  const next = value + 1;\n  return next;\n}\nfor (let i = 0; i < 3; i++) {\n  total += add(i);\n}\n{ const total = 99; console.log(total); }\ntotal';
  const result = await run(source);
  assert.equal(result.error, undefined);
  assert.equal(result.output, '99\n6\n');
  assert.deepEqual(result.frames.filter(frame => frame.line === 7).map(frame => frame.locals.i), ['0', '1', '2']);
  assert.deepEqual(result.frames.filter(frame => frame.event === 'return').map(frame => frame.locals['(return)']), ['1', '2', '3']);
  assert.equal(result.frames.at(-1).locals.total, '6', 'the inner lexical binding does not leak');
  assert.equal(result.traceFrames, result.frames.length);
  assert.equal(result.traceBytes, new TextEncoder().encode(result.frames.map(frame => JSON.stringify(frame)).join('')).length);
  assert.equal(result.traceTruncated, false);
});

test('AST instrumentation preserves one-line branches, labels, directives, comments and completion values', async () => {
  const snippets = [
    '"hello"; "use strict"; function f(){return this===undefined;} f()',
    'let n=0; outer:for(let i=0;i<3;i++){for(let j=0;j<3;j++){n++; continue outer}}\nn',
    'let i=0;while(i++<3);if(i===4) i+=2;else i=0;i',
    'const text="braces {} // okay"; /* ; { } */ const f=(x=2)=>({value:x+1}); f(4)',
    'function f(){\nreturn\n5;\n}\nf()',
    'const f = function(){}; const g=()=>1; [f.name,g.name]',
    'function f(){try {throw new Error("example")}catch(error){return error.message}} f()',
    '1;let a=2;',
    'const obj={x:7,f(){return this.x}}; obj.f()',
    'typeof neverDeclared',
  ];
  for (const source of snippets) {
    const normal = await run(source, false);
    const traced = await run(source);
    assert.equal(traced.error, undefined, source);
    assert.equal(traced.output, normal.output, source);
    assert.equal(instrumentJavaScript(source).source.split('\n').length, source.split('\n').length);
  }
});

test('continued array expressions and arrow bodies use their executed source lines', async () => {
  const result = await run('const xs = [\n  1,\n  2,\n  3\n];\nxs.reduce((sum,x)=>\n sum+x,0)');
  assert.equal(result.output, '6\n');
  for (const line of [1, 2, 3, 4, 6, 7]) assert.ok(result.frames.some(frame => frame.line === line), `executed line ${line}`);
  assert.deepEqual(result.frames.filter(frame => frame.event === 'return').map(frame => frame.locals['(return)']), ['1', '3', '6']);
});

test('safe snapshots show literal containers without calling getters, toJSON or proxy traps', async () => {
  const result = await run(`let calls=0;
const matrix=[[1,2],[3,4]];
const object={get secret(){calls++;return 42},toJSON(){calls++;return 'bad'}};
const proxy=new Proxy({}, {ownKeys(){calls++;return []},getOwnPropertyDescriptor(){calls++;return undefined}});
calls`);
  assert.equal(result.error, undefined);
  assert.equal(result.output, '0\n');
  const final = result.frames.at(-1).locals;
  assert.equal(final.matrix, '[[1, 2], [3, 4]]');
  assert.match(final.object, /Getter; not evaluated/);
  assert.equal(final.proxy, '[Object; preview omitted]');
  assert.ok(!Object.keys(final).some(name => /macTrace|globalThis|process|document/.test(name)));
});

test('object previews never present uninspected dynamic properties as an empty object', async () => {
  const sources = [
    'const state={}; state.x=42; state.x',
    "const key='x';const state={[key]:42};state.x",
    'const state={...{x:42}};state.x',
  ];
  for (const source of sources) {
    const result = await run(source);
    assert.equal(result.error, undefined, source);
    assert.equal(result.output, '42\n', source);
    assert.equal(result.frames.at(-1).locals.state, '[Object; properties not inspected]', source);
  }
  const selected = await run('const state={y:1};state.x=42;state.x');
  assert.equal(selected.output, '42\n');
  assert.equal(selected.frames.at(-1).locals.state, '[Object; selected properties: {"y": 1}]', 'known fields are explicitly a partial preview');
});

test('library bodies are not instrumented and the native trace callback is not exposed globally', async () => {
  const runtimeAssets = { ...assets, 'guest-modules.js': new TextEncoder().encode('globalThis.MACModules={require:()=>({double:function(value){return value*2}})};') };
  const result = await run('const helper = require("included");\nconst result = helper.double(8);\nconsole.log(Object.getOwnPropertyNames(globalThis).some(name => /macTrace/.test(name)));\nresult', true, runtimeAssets);
  assert.equal(result.output, 'false\n16\n');
  assert.ok(result.frames.every(frame => frame.line >= 1 && frame.line <= 4));
  assert.ok(!result.frames.some(frame => frame.locals.value === '8'), 'included helper locals never enter the trace');
});

test('trace frame and byte caps stop recording while the program continues normally', async () => {
  const frames = await run('let n=0;for(let i=0;i<1000;i++) n++;n');
  assert.equal(frames.output, '1000\n');
  assert.equal(frames.traceTruncated, true);
  assert.ok(frames.traceFrames <= TRACE_LIMITS.frames);
  const declarations = Array.from({ length: 20 }, (_, index) => `const value${index}=${JSON.stringify('界'.repeat(100))};`).join('\n');
  const bytes = await run(`${declarations}\nlet n=0;for(let i=0;i<20;i++)n++;n`);
  assert.equal(bytes.output, '20\n');
  assert.equal(bytes.traceTruncated, true);
  assert.ok(bytes.traceFrames < TRACE_LIMITS.frames);
  assert.ok(bytes.traceBytes <= TRACE_LIMITS.bytes);
});

test('errors retain actual source lines and bounded trace metadata', async () => {
  const result = await run('const value=7;\nthrow new Error("trace failure");');
  assert.match(result.error.message, /trace failure.*example.js:2/s);
  assert.equal(result.frames.at(-1).line, 2);
  assert.equal(result.frames.at(-1).locals.value, '7');
  assert.equal(result.traceFrames, 2);
  const huge = await run('é'.repeat(32769));
  assert.match(huge.error.message, /64 KB/);
  assert.equal(huge.traceFrames, 0);
  for (const source of ['async function f(){}', 'function* f(){}', 'class Example {}', 'eval("1")', 'with({}) {}', 'function f(){try{return 1}finally{return 2}}', 'if (true) function f(){}']) {
    assert.match((await run(source)).error.message, /Tracing does not yet support/);
  }
});

test('the authored full ML classifier completes with the same result after its bounded trace truncates', async () => {
  const markdown = await readFile(new URL('../docs/ml-deep-learning.md', import.meta.url), 'utf8');
  const source = new Marked().lexer(markdown).filter(token => token.type === 'code' && token.lang === 'js').at(-1).text;
  const traced = await run(source);
  const normal = await run(source, false);
  assert.equal(traced.error, undefined);
  assert.equal(traced.output, normal.output);
  assert.match(traced.output, /final_loss 0\.098281\npredictions 0 1 1 0\ntraining_correct 4\/4/);
  assert.equal(traced.traceTruncated, true);
  assert.ok(traced.traceBytes <= TRACE_LIMITS.bytes);
});

test('traced infinite loops retain the existing execution deadline', async () => {
  const began = Date.now();
  const result = await run('while(true) {}');
  assert.match(result.error.message, /interrupted/i);
  assert.ok(Date.now() - began < 8000);
  assert.equal(result.traceTruncated, true);
  assert.ok(result.traceFrames <= TRACE_LIMITS.frames);
});

test('host collector rejects malformed records and enforces the same aggregate budget', () => {
  const collector = createTraceCollector();
  for (const frame of [null, { line: 0, event: 'line', locals: {} }, { line: 1, event: 'made-up', locals: {} }, { line: 1, event: 'line', locals: { bad: 1 } }]) assert.equal(collector.push(frame), false);
  for (let index = 0; index < 1000; index++) collector.push({ line: 1, event: 'line', locals: { x: '界'.repeat(100) } });
  assert.equal(collector.truncated, true);
  assert.ok(collector.frames.length <= TRACE_LIMITS.frames);
  assert.ok(collector.bytes <= TRACE_LIMITS.bytes);
});
