import test from 'node:test';
import assert from 'node:assert/strict';
import {
  currentTrace, foldsCoveringTraceLine, mapTraceFrames, traceSourceWindow, traceStep, TRACE_VIEW_LIMITS,
} from '../site/trace-view-model.mjs';

const frame = (line, locals = {}) => ({ line, event: 'line', locals });

test('maps captured runtime lines to authored code, excluding helper and synthetic main frames', () => {
  const source = 'value = helper(3)\nprint(value)';
  const executable = `def helper(x):\n    return x * 2\n\n${source}\n\n# synthetic entry point`;
  assert.deepEqual(traceSourceWindow(source, executable), { startLine: 4, endLine: 5 });
  const result = mapTraceFrames([frame(1), frame(4, { value: '6' }), frame(2), frame(5), frame(7)], source, executable);
  assert.deepEqual(result.frames.map(item => item.line), [1, 2]);
  assert.equal(result.frames[0].locals.value, '6');
  assert.equal(result.truncated, false);
});

test('preserves repeated execution and return values without inventing unexecuted lines', () => {
  const source = 'for i in range(2):\n    total += i\nreturn total';
  const input = [frame(1, { i: '0' }), frame(2, { total: '0' }), frame(1, { i: '1' }), frame(2, { total: '0' }),
    { line: 3, event: 'return', locals: { '(return)': '1' } }];
  const result = mapTraceFrames(input, source, source);
  assert.deepEqual(result.frames.map(item => [item.line, item.event]), [[1, 'line'], [2, 'line'], [1, 'line'], [2, 'line'], [3, 'return']]);
  assert.equal(result.frames.at(-1).locals['(return)'], '1');
  assert.deepEqual(mapTraceFrames([], source, source).frames, []);
  assert.deepEqual(mapTraceFrames(input, source, 'different source'), { frames: [], truncated: false, mapped: false });
  assert.deepEqual(mapTraceFrames([], '', ''), { frames: [], truncated: false, mapped: true });
});

test('rejects invalid frame locations/events and retains only formatted string locals', () => {
  const result = mapTraceFrames([frame(0), frame(1.5), frame(2), { line: 1, event: 'made-up', locals: {} },
    frame(1, JSON.parse('{"__proto__":"visible text","list":"[1, 2]","bad":17}'))], 'x', 'x');
  assert.equal(result.frames.length, 1);
  assert.equal(result.frames[0].locals.__proto__, 'visible text');
  assert.equal(result.frames[0].locals.list, '[1, 2]');
  assert.equal(Object.hasOwn(result.frames[0].locals, 'bad'), false);
});

test('bounds retained frame count and UTF-8 payload bytes', () => {
  const byCount = mapTraceFrames(Array.from({ length: 501 }, () => frame(1)), 'x', 'x');
  assert.equal(byCount.frames.length, TRACE_VIEW_LIMITS.frames);
  assert.equal(byCount.truncated, true);
  const byBytes = mapTraceFrames(Array.from({ length: 500 }, () => frame(1, { x: '界'.repeat(100) })), 'x', 'x');
  assert.ok(new TextEncoder().encode(JSON.stringify(byBytes.frames)).length <= TRACE_VIEW_LIMITS.bytes);
  assert.ok(byBytes.frames.length < 500);
  assert.equal(byBytes.truncated, true);
});

test('trace identity requires both language and exact draft, and replay indices stay in bounds', () => {
  const trace = { language: 'javascript', source: 'x = 1', frames: [frame(1)] };
  assert.equal(currentTrace(trace, 'javascript', 'x = 1'), trace);
  assert.equal(currentTrace(trace, 'python', 'x = 1'), undefined);
  assert.equal(currentTrace(trace, 'javascript', 'x = 2'), undefined);
  assert.equal(traceStep(-1, 4), 0);
  assert.equal(traceStep(4, 4), 3);
  assert.equal(traceStep(NaN, 4), 0);
  assert.equal(traceStep(10, 0), 0);
});

test('reveals every containing folded region while preserving unrelated folds and fold-start lines', () => {
  const regions = [{ start: 1, end: 10 }, { start: 3, end: 6 }, { start: 12, end: 18 }];
  assert.deepEqual(foldsCoveringTraceLine(regions, [1, 3, 12], 5), [1, 3]);
  assert.deepEqual(foldsCoveringTraceLine(regions, [1, 3, 12], 3), [1]);
  assert.deepEqual(foldsCoveringTraceLine(regions, [1, 3, 12], 20), []);
});
