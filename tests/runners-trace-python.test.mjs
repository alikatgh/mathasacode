import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { executePython } from '../site/runners/python.mjs';
import { createPythonTraceOutput } from '../site/runners/trace-python.mjs';
import { TRACE_LIMITS, createTraceCollector } from '../site/runners/trace-runtime.mjs';

const paths = { 'python.wasm': 'bin/python-3.12.0.wasm', 'python312.zip': 'usr/local/lib/python312.zip', 'os.py': 'usr/local/lib/python3.12/os.py' };
const assets = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([name, path]) =>
  [name, await readFile(new URL('../site/runners/vendor/python-wasi/' + path, import.meta.url))])));
assets['notation.py'] = await readFile(new URL('../examples/notation.py', import.meta.url));
async function run(source, trace = true) {
  let output = '';
  const frames = [];
  try {
    const status = await executePython(source, assets, text => { output += text; }, () => {}, { trace, onTrace: frame => frames.push(frame) });
    return { output, frames, ...status };
  } catch (error) { return { output, frames, error, ...error }; }
}

test('CPython supplies real function, loop and return snapshots without library frames', async () => {
  const source = 'from examples.notation import mean\nvalues=[2,4]\ndef add(x):\n    result=x+1\n    return result\nfor i in range(2):\n    values.append(add(i))\nmean(values)';
  const result = await run(source);
  assert.equal(result.error, undefined);
  assert.equal(result.output, '2.25\n');
  assert.deepEqual(result.frames.filter(frame => frame.line === 4).map(frame => frame.locals.x), ['0', '1']);
  assert.deepEqual(result.frames.filter(frame => frame.event === 'return' && frame.line === 5).map(frame => frame.locals['(return)']), ['1', '2']);
  assert.ok(result.frames.every(frame => frame.line >= 1 && frame.line <= 8));
  assert.ok(!result.frames.some(frame => Object.hasOwn(frame.locals, 'numbers')), 'helper function locals are excluded');
  assert.equal(result.frames.at(-1).locals['(return)'], '2.25');
  assert.equal(result.traceFrames, result.frames.length);
  assert.equal(result.traceTruncated, false);
});

test('Python snapshots never invoke user repr or container-subclass methods', async () => {
  const source = `calls=0
class Loud:
    def __repr__(self):
        global calls
        calls+=1
        return 'custom repr'
class LoudList(list):
    def __iter__(self):
        global calls
        calls+=1
        return iter([])
value=Loud()
subclass=LoudList([1,2])
containers=[value,subclass]
calls`;
  const result = await run(source);
  assert.equal(result.error, undefined);
  assert.equal(result.output, '0\n');
  assert.equal(result.frames.at(-1).locals.value, '<object; preview omitted>');
  assert.equal(result.frames.at(-1).locals.subclass, '<object; preview omitted>');
  assert.match(result.frames.at(-1).locals.containers, /object; preview omitted/);
});

test('Python trace streams preserve ordinary output, Unicode and partial writes', async () => {
  const source = 'import sys\nsys.stdout.write("before")\ntext="界"\nprint(text)\ntext';
  const normal = await run(source, false);
  const traced = await run(source);
  assert.equal(traced.output, normal.output);
  assert.equal(traced.error, undefined);
  assert.ok(!traced.output.includes('MAC_TRACE'));
  assert.equal(traced.frames.at(-1).locals.text, "'界'");
});

test('Python trace caps stop recording, continue execution and retain bounded metadata on errors', async () => {
  const result = await run('n=0\nfor i in range(1200):\n    n+=1\nn');
  assert.equal(result.output, '1200\n');
  assert.equal(result.traceTruncated, true);
  assert.ok(result.traceFrames <= TRACE_LIMITS.frames);
  assert.ok(result.traceBytes <= TRACE_LIMITS.bytes);
  const declarations = Array.from({ length: 20 }, (_, index) => `value${index}=${JSON.stringify('界'.repeat(100))}`).join('\n');
  const bytes = await run(`${declarations}\nfor i in range(50):\n    n=i\nn`);
  assert.equal(bytes.error, undefined);
  assert.equal(bytes.output, '49\n');
  assert.equal(bytes.traceTruncated, true);
  assert.ok(bytes.traceFrames < TRACE_LIMITS.frames);
  assert.ok(bytes.traceBytes <= TRACE_LIMITS.bytes);
  const error = await run('value=7\nraise ValueError("trace error")');
  assert.match(error.error.message, /Python exited/);
  assert.match(error.output, /example.py.*line 2.*trace error/s);
  assert.ok(error.frames.some(frame => frame.line === 2 && frame.locals.value === '7'));
  assert.equal(error.traceFrames, error.frames.length);
});

test('reserved trace records demultiplex across every byte boundary without swallowing normal output', () => {
  const collector = createTraceCollector();
  let output = '';
  const marker = '\x1eTEST_TRACE:';
  const stream = createPythonTraceOutput(marker, collector, text => { output += text; });
  const data = 'before' + marker + JSON.stringify({ line: 4, event: 'line', locals: { x: '7' } }) + '\nafter\n';
  for (const character of data) stream.append(1, character);
  stream.append(2, 'stderr');
  stream.flush();
  assert.equal(output, 'beforeafter\nstderr');
  assert.equal(collector.frames.length, 1);
  assert.equal(collector.frames[0].locals.x, '7');
});

test('Python tracing validates source before creating its runtime', async () => {
  const result = await run('é'.repeat(32769));
  assert.match(result.error.message, /64 KB/);
  assert.equal(result.traceFrames, 0);
  assert.equal(result.frames.length, 0);
});
