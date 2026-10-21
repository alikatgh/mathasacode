import test from 'node:test';
import assert from 'node:assert/strict';
import { register, render } from 'pele/core';
import flowchart from 'pele/diagrams/flowchart';
import xychart from 'pele/diagrams/xychart';
import {
  TRACE_VISUAL_LIMITS, traceChanges, traceCollection, traceDiagramLabel,
  traceFlowSource, traceHistory, tracePeleOptions, traceScalar, traceVisualization,
} from '../site/trace-visualizer-model.mjs';

register(flowchart, xychart);
const frame = (line, locals = {}, event = 'line') => ({ line, locals, event });
const source = 'sum = 0\nfor i in values:\n    sum += i\nprint(sum)';
const trace = (frames, step = frames.length - 1, extra = {}) => ({ language: 'python', source, status: 'success', frames, step, ...extra });
const sample = [frame(1), frame(2, { sum: '0' }), frame(3, { sum: '0', i: '1' }), frame(2, { sum: '1', i: '1' }), frame(3, { sum: '1', i: '2' }), frame(2, { sum: '3', i: '2' })];

test('selected before-line snapshots and deltas never use a future frame', () => {
  const model = traceVisualization(trace(sample, 4), source);
  assert.equal(model.step, 4);
  assert.equal(model.frame.line, 3);
  assert.equal(model.sourceLine, '    sum += i');
  assert.deepEqual(model.changes, [
    { name: 'sum', before: '1', after: '1', kind: 'unchanged' },
    { name: 'i', before: '1', after: '2', kind: 'changed' },
  ]);
  const history = traceHistory(model, 'sum');
  assert.deepEqual(history.points.map(item => item.preview), ['0', '0', '1', '1']);
  assert.equal(history.points.at(-1).step, 5);
  assert.ok(!history.points.some(item => item.preview === '3'));
  const previous = traceVisualization(trace(sample, 3), source);
  assert.notEqual(traceFlowSource(previous), traceFlowSource(model));
  assert.notEqual(traceHistory(previous, 'sum').source, history.source);
  assert.match(traceFlowSource(model), /Before line 3/);
  assert.ok(!traceFlowSource(model).includes('print(sum)'));
});

test('all locals survive changes, new snapshots, identical previews and departures', () => {
  const before = frame(1, Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`v${i}`, `${i}`])));
  const after = frame(2, { ...before.locals, v0: '100', v25: '25' });
  delete after.locals.v24;
  const changes = traceChanges(before, after);
  assert.equal(changes.length, 26);
  assert.equal(changes.find(item => item.name === 'v0').kind, 'changed');
  assert.equal(changes.find(item => item.name === 'v1').kind, 'unchanged');
  assert.deepEqual(changes.find(item => item.name === 'v25'), { name: 'v25', before: undefined, after: '25', kind: 'new' });
  assert.deepEqual(changes.find(item => item.name === 'v24'), { name: 'v24', before: '24', after: undefined, kind: 'removed' });
  const special = JSON.parse('{"__proto__":"1","constructor":"2"}');
  assert.deepEqual(traceChanges(null, frame(1, special)).map(item => item.name), ['__proto__', 'constructor']);
  assert.deepEqual(traceChanges(null, frame(1)), []);
});

test('all four runtime preview formats remain text unless safely recognized numeric', () => {
  const previews = {
    javascript: { number: '1.25', string: '"<img onerror=evil()>"', object: '[Object; selected properties: {"x": 1}]', list: '[1, 2]', omitted: '[Getter; not evaluated]', bigint: '123n' },
    python: { number: '-2.5e+3', string: "'hello'", object: "{'x': 1}", list: '[1, 2]', omitted: '<object; preview omitted>', tuple: '(1, 2)' },
    c: { number: '1.0000000000000002', list: '[[1, 2], [3, 4]]', integer: '18446744073709551615', omitted: '[…]' },
    rust: { number: '-0', string: '"text"', list: '[1, 2]', object: 'Some(1)', omitted: '...' },
  };
  for (const [language, values] of Object.entries(previews)) {
    const model = traceVisualization(trace([frame(1, values)], 0, { language }), source, language);
    assert.equal(model.changes.length, Object.keys(values).length);
    for (const [name, preview] of Object.entries(values)) assert.equal(model.changes.find(item => item.name === name).after, preview);
    assert.ok(model.numericNames.includes('number'));
    assert.equal(model.collections[0].name, 'list');
    assert.ok(render(traceHistory(model, 'number').source, tracePeleOptions(`format-${language}`)).svg.startsWith('<svg'));
  }
  for (const value of ['NaN', 'nan', 'Infinity', '-Infinity', 'inf', '-inf', 'True', 'false', 'null', 'None', 'undefined', '5n', '"2"', '', ' ', '1 + 2', '<object>', '0xFF', '1e999']) assert.equal(traceScalar(value), null, value);
  assert.equal(traceScalar('0'), 0);
  assert.equal(Object.is(traceScalar('-0'), -0), true);
  assert.equal(traceScalar('9007199254740993'), null, 'Never round an exact integer preview into a different scalar');
});

test('running, empty, failed, return and stale source/language states remain explicit', () => {
  const running = traceVisualization(trace(sample, 2, { status: 'running' }), source);
  assert.equal(running.frame, null);
  assert.equal(traceFlowSource(running), null);
  assert.deepEqual(running.changes, []);
  assert.equal(traceVisualization(trace([], 99), source).frame, null);
  const partial = traceVisualization(trace([frame(3, { sum: '3', '(return)': '3' }, 'return')], 0, { status: 'error', truncated: true, warnings: ['Partial capture'] }), source);
  assert.equal(partial.frame.event, 'return');
  assert.match(traceFlowSource(partial), /Return at line 3/);
  assert.deepEqual(partial.changes.map(item => item.kind), ['new', 'new']);
  assert.equal(partial.status, 'error');
  assert.equal(partial.truncated, true);
  assert.deepEqual(partial.warnings, ['Partial capture']);
  assert.equal(traceVisualization(undefined, source), null);
  assert.equal(traceVisualization(trace(sample), `${source}\n# edited`), null);
  assert.equal(traceVisualization(trace(sample), source, 'javascript'), null);
  assert.equal(traceVisualization(trace([frame(999)]), source).frame, null);
  assert.equal(traceVisualization(trace([frame(1, {}, 'invented')]), source).frame, null);
  assert.equal(traceVisualization(trace(sample, -99), source).step, 0);
  assert.equal(traceVisualization(trace(sample, NaN), source).step, 0);
});

test('history never bridges absent, nonnumeric, NaN or Infinity snapshots', () => {
  const model = traceVisualization(trace([frame(1, { x: '1' }), frame(2, { x: 'NaN' }), frame(2), frame(3, { x: '2' }), frame(3, { x: '3' })]), source);
  assert.deepEqual(traceHistory(model, 'x').points.map(item => item.step), [4, 5]);
  const infinity = traceVisualization(trace([frame(1, { x: 'Infinity' })]), source);
  assert.equal(traceHistory(infinity, 'x'), null);
  for (const preview of ['1e308', '-1e308', '1e-308', '0']) {
    const extreme = traceVisualization(trace([frame(1, { x: preview }), frame(2, { x: preview })]), source);
    const history = traceHistory(extreme, 'x');
    assert.ok(history.samples.every(item => Number.isFinite(item.value)));
    const output = render(history.source, tracePeleOptions('extreme')).svg;
    assert.ok(!/NaN|Infinity/.test(output), preview);
  }
});

test('nearby scalar values retain full double precision and a strictly increasing Pele axis', () => {
  for (const values of [[1.00000000001, 1.00000000002], [1, 1 + Number.EPSILON], [-1, -1 - Number.EPSILON], [999999.9999999998, 1000000]]) {
    const previews = values.map(String);
    const model = traceVisualization(trace(previews.map(x => frame(1, { x }))), source);
    const history = traceHistory(model, 'x');
    assert.deepEqual(history.points.map(point => point.preview), previews);
    assert.match(history.source, new RegExp(`line \\[${previews.map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(', ')}\\]`));
    const bounds = history.source.match(/y-axis "[^\n]*" ([^ ]+) --> ([^\n]+)/);
    const min = Number(bounds[1]), max = Number(bounds[2]);
    assert.ok(Number.isFinite(min) && Number.isFinite(max) && min < max, history.source);
    assert.ok(min <= Math.min(...values) && max >= Math.max(...values));
    const output = render(history.source, tracePeleOptions('precision', 350));
    assert.ok(Number.isFinite(output.width) && Number.isFinite(output.height));
    assert.ok(!/NaN|Infinity/.test(output.svg));
    // The actual plotted path has distinct y coordinates, not a flattened line.
    const line = output.svg.match(/<path[^>]*d="M([\d.-]+),([\d.-]+)L([\d.-]+),([\d.-]+)"/);
    assert.ok(line, 'Pele rendered the selected two-point series');
    assert.notEqual(line[2], line[4]);
    assert.ok((output.svg.match(/<text\b/g)?.length ?? 0) < 20, 'Tick arithmetic remains bounded for adjacent doubles');
  }
});

test('numeric array and matrix cells are bounded and incomplete/non-numeric previews stay text', () => {
  assert.deepEqual(traceCollection('[1, 2]').cells.map(item => item.value), [1, 2]);
  const matrix = traceCollection('[[1, 2], [3, 4]]');
  assert.equal(matrix.kind, 'matrix');
  assert.deepEqual(matrix.cells.map(item => item.label), ['[0, 0]', '[0, 1]', '[1, 0]', '[1, 1]']);
  const long = traceCollection(JSON.stringify(Array.from({ length: 100 }, (_, i) => i)));
  assert.equal(long.total, 100);
  assert.equal(long.cells.length, TRACE_VISUAL_LIMITS.collectionCells);
  assert.deepEqual(traceCollection('[9007199254740993, -0, 1.00]').cells.map(item => item.preview), ['9007199254740993', '-0', '1.00']);
  for (const preview of ['[]', '[[1], [2, 3]]', '[1, …]', '[NaN]', '[1e999]', '[null]', '[true]', '["<script>"]', '(1, 2)', '[1, [2]]', '['.repeat(5000)]) assert.equal(traceCollection(preview), null, preview.slice(0, 40));
});

test('maximum replay and chart sampling bounds preserve endpoints, exact data and real Pele rendering', () => {
  const frames = Array.from({ length: 501 }, (_, i) => frame(2, { x: `${i}`, ['y'.repeat(300)]: `${-i}` }));
  const model = traceVisualization(trace(frames, 9999), source);
  assert.equal(model.count, TRACE_VISUAL_LIMITS.frames);
  assert.equal(model.step, 499);
  assert.equal(model.truncated, true);
  const history = traceHistory(model, 'x');
  assert.equal(history.points.length, 500);
  assert.ok(history.samples.length <= TRACE_VISUAL_LIMITS.historyPoints);
  assert.ok(history.samples[0].step <= 8);
  assert.equal(history.samples.at(-1).step, 500);
  assert.equal(new Set(history.samples.map(item => item.step)).size, history.samples.length);
  assert.ok(history.samples.slice(1).every((point, index) => point.step - history.samples[index].step === 8));
  for (const diagram of [traceFlowSource(model), history.source, traceHistory(model, 'y'.repeat(300)).source]) {
    assert.ok(diagram.length < tracePeleOptions('bounds').limit);
    const rendered = render(diagram, tracePeleOptions('bounds', 180));
    assert.ok(rendered.svg.length < tracePeleOptions('bounds').outputLimit);
    assert.ok(Number.isFinite(rendered.width) && Number.isFinite(rendered.height));
    assert.deepEqual(rendered.links, []);
  }
});

test('hostile code/name labels cannot inject Pele syntax, markup, links, images or directives', () => {
  const hostile = '"]; X["injected"]\nclick X "javascript:evil()"\n%%{init: {theme: "bad"}}%% <script>alert(1)</script><img src=x onerror=evil()> &quot; #34; `';
  const input = `log(${hostile})`;
  const model = traceVisualization(trace([frame(1, { [hostile]: '1', html: '<svg onload=evil()>' }), frame(1, { [hostile]: '2' })], 1, { source: input }), input);
  for (const diagram of [traceFlowSource(model), traceHistory(model, hostile).source]) {
    assert.ok(!diagram.includes('<script>'));
    assert.ok(!diagram.includes('\nclick'));
    assert.ok(!diagram.includes('%%{'));
    const result = render(diagram, tracePeleOptions('safe'));
    assert.deepEqual(result.links, []);
    assert.ok(!/<(?:script|image|img|foreignObject|a)\b/i.test(result.svg));
    assert.ok(!/\bon(?:load|error|click)\s*=/i.test(result.svg));
  }
  const ordinary = render(`flowchart TD\nA["${traceDiagramLabel('value = "<img>" & x[0] · 1')}"]`, tracePeleOptions('literal')).svg;
  assert.ok(ordinary.includes('&lt;img&gt;'));
  assert.ok(ordinary.includes('&quot;'));
  assert.ok(!ordinary.includes('&amp;·'));
  assert.equal(traceDiagramLabel('a'.repeat(10000)), `${'a'.repeat(TRACE_VISUAL_LIMITS.diagramLabel - 1)}#8230;`);
  const options = tracePeleOptions('unsafe!<>');
  assert.equal(options.idPrefix, 'unsafe');
  assert.equal(options.links, false);
  assert.equal(options.images, false);
  assert.equal(options.config.flowchart.htmlLabels, false);
  assert.equal(options.icons('anything'), null);
});
