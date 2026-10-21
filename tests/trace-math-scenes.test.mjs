import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Compile only these renderer sources in memory. No site build, output file,
// dependency install, browser, or executable user snippet is involved.
const compiled = await build({
  entryPoints: [new URL('../site/trace-math-scenes.jsx', import.meta.url).pathname],
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
});
const loaded = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(createRequire(import.meta.url), loaded, loaded.exports);
const { MathTraceScene, mathSceneDomain, mathSceneScale } = loaded.exports;
const scene = (kind, data) => ({ kind, title: kind + ' example', description: 'A recorded mathematical state', formulaText: 'exact mathematical relation', stage: 2, data });
const markup = state => renderToStaticMarkup(React.createElement(MathTraceScene, { scene: state }));
const drawing = html => html.replace(/<title[\s\S]*?<\/title>|<desc[\s\S]*?<\/desc>/g, '');
const points = [[-2, 4], [-1, 1], [0, 0], [1, 1], [2, 4]];
const fixtures = [
  scene('comparison', { a: 2, b: 3, operator: 'δ', equal: false, result: 0 }),
  scene('arithmetic', { operation: 'add', a: 2, b: 3, result: 5 }),
  scene('sequence', { operation: 'sum', values: [1, 2, -3, 4], index: 2, previous: 3, accumulator: 0 }),
  scene('vector', { operation: 'dot', a: [1, 2], b: [3, 4], result: 11 }),
  scene('matrix', { operation: 'multiply', a: [[1, 2], [3, 4]], b: [[5, 6], [7, 8]], result: [[19, 22], [43, 50]], row: 0, column: 1 }),
  scene('sets', { operation: 'intersection', a: [1, 2, 3], b: [2, 3, 4], result: [2, 3] }),
  scene('function', { operation: 'derivative', x: 1, points, slope: 2, result: 2 }),
  scene('probability', { operation: 'expectation', values: [1, 2, 3], weights: [.2, .5, .3], mean: 2.1, result: 2.1 }),
  scene('combinatorics', { operation: 'choose', n: 5, k: 2, result: 10 }),
  scene('network', { operation: 'affine', inputs: [1, 2], weights: [[.5], [-.25]], bias: [1], outputs: [1] }),
  scene('collections', { arrays: [{ name: 'v', values: [1, 2, 3] }], scalars: [{ name: 'n', value: 3 }], changed: ['v'] }),
  scene('relation', { operation: '≥', values: [2, 3], labels: ['a', 'b'], result: false }),
];

function assertSafeGeometry(html, label) {
  const svg = drawing(html);
  assert.doesNotMatch(svg, /(?:NaN|Infinity|undefined)/, label);
  for (const match of svg.matchAll(/\b(?:x|y|x1|x2|y1|y2|cx|cy|r|rx|ry|width|height)="(-?[\d.e+-]+)"/g)) {
    const value = Number(match[1]);
    assert.ok(Number.isFinite(value) && Math.abs(value) <= 1000, label + ': invalid coordinate ' + match[0]);
  }
  assert.ok((svg.match(/<(?:circle|line|path|rect|ellipse)\b/g) || []).length < 500, label + ': unbounded objects');
}

test('every semantic family renders actual geometry with its exact accessible data', () => {
  assert.equal(new Set(fixtures.map(item => item.kind)).size, 12);
  for (const state of fixtures) {
    const html = markup(state);
    assert.match(html, /viewBox="0 0 480 300"/);
    assert.match(html, /role="img"/);
    assert.match(html, /Exact scene values:/);
    assert.match(html, /data-scene-stage="2"/);
    assert.ok(html.includes(state.kind + ' example'));
    assertSafeGeometry(html, state.kind);
  }
  const comparison = drawing(markup(fixtures[0]));
  assert.match(comparison, /translateX\(/, 'animated objects have their real initial positions on the first render');
  assert.match(comparison, /i = 2/);
  assert.match(comparison, /j = 3/);
  assert.match(comparison, /δᵢⱼ = 0/);
  assert.doesNotMatch(comparison, /Recorded at line|source|flowchart/i);
  assert.match(drawing(markup(fixtures[4])), /C\[0, 1\] = 22/);
  const missingOperand = drawing(markup(scene('matrix', { operation: 'multiply', a: [[1, 2], [3, 4], [5, 6], [7, 8]], b: null, result: null })));
  assert.match(missingOperand, /Column not recorded/);
  assert.doesNotMatch(missingOperand, /C\[0, 0\] = 0|C\[/, 'an absent second matrix cannot fabricate an output cell');
  const shape = drawing(markup(scene('matrix', { operation: 'shapes', a: [[1, 2], [3, 4], [5, 6], [7, 8]], b: null, result: null })));
  assertSafeGeometry(shape, 'matrix shape');
  assert.match(shape, /4 rows/);
  assert.match(shape, /2 columns/);
  assert.doesNotMatch(shape, /C\[|Output cell|Each row becomes a column/, 'a shape diagram describes dimensions without implying a product or transpose');
});

test('operations change the physical representation rather than restyling one diagram', () => {
  const arithmetic = {
    add: [2, 3, 5], subtract: [2, 3, -1], multiply: [3, 4, 12], divide: [11, 3, 11 / 3],
    absolute: [-3, 0, 3], floor: [2.7, 0, 2], ceil: [2.1, 0, 3], round: [2.7, 0, 3],
    mod: [11, 3, 2], power: [2, 3, 8], root: [9, 2, 3], log: [8, 2, 3], min: [2, 4, 2], max: [2, 4, 4],
  };
  const variants = Object.entries(arithmetic).map(([operation, [a, b, result]]) => scene('arithmetic', { operation, a, b, result }));
  variants.push(
    scene('sequence', { operation: 'mean', values: [2, 3, 4], index: 2, previous: 2.5, accumulator: 3 }),
    scene('sequence', { operation: 'product', values: [2, 3, 4], index: 1, previous: 2, accumulator: 6 }),
    scene('vector', { operation: 'scale', a: [1, 2], scalar: 2, result: [2, 4] }),
    scene('vector', { operation: 'normalize', a: [3, 4], result: [.6, .8] }),
    scene('vector', { operation: 'add', a: [1, 2], b: [3, 1], result: [4, 3] }),
    scene('vector', { operation: 'cross', a: [1, 0, 0], b: [0, 1, 0], result: [0, 0, 1] }),
    scene('vector', { operation: 'outer', a: [1, 2], b: [3, 4], result: [[3, 4], [6, 8]] }),
    scene('vector', { operation: 'complex', a: [1, 2], b: [2, 1], result: [3, 3] }),
    ...['determinant', 'transpose', 'identity', 'rotation', 'tensor'].map(operation => scene('matrix', { operation, a: [[1, 0], [0, 1]], b: [[2, 3], [4, 5]], result: operation === 'determinant' ? 1 : [[1, 0], [0, 1]] })),
    ...['membership', 'union', 'difference', 'subset'].map(operation => scene('sets', { operation, a: [1, 2], b: [2, 3], element: 2, result: operation === 'membership' })),
    ...['curve', 'integral', 'limit', 'trig', 'exp', 'log'].map(operation => scene('function', { operation, x: 1, points, a: 0, b: 1, result: 1 })),
    ...['distribution', 'conditional', 'bayes', 'variance', 'correlation'].map(operation => scene('probability', { operation, values: [1, 2, 3], weights: [.2, .5, .3], points: [[1, 2], [2, 3], [3, 5]], result: .7 })),
    scene('combinatorics', { operation: 'factorial', n: 5, result: 120 }),
    ...['relu', 'softmax', 'loss', 'gradient', 'update', 'batch'].map(operation => scene('network', { operation, inputs: [-1, 2], outputs: operation === 'softmax' ? [.1, .9] : [0, 2], previous: [1, 3], target: [1, 1], gradient: [1, 1], learningRate: .1 })),
  );
  for (const state of variants) assertSafeGeometry(markup(state), state.kind + '/' + state.data.operation);
  assert.match(drawing(markup(variants.find(item => item.data.operation === 'multiply'))), /Two lengths make an area/);
  assert.match(drawing(markup(variants.find(item => item.data.operation === 'divide'))), /Fit lengths/);
  assert.match(drawing(markup(variants.find(item => item.data.operation === 'root'))), /side 3/);
  assert.match(drawing(markup(variants.find(item => item.data.operation === 'normalize'))), /length 1/);
  assert.match(drawing(markup(variants.find(item => item.data.operation === 'tensor'))), /block product/);
  assert.match(drawing(markup(variants.find(item => item.data.operation === 'complex'))), />Re</);
});

test('domain scaling stays finite and bounded across signed extreme finite inputs', () => {
  for (const values of [[-1e308, 1e308], [0, 0], [1e-300, 1e-300], [-1e308, -1e308], [1e308, 1e308], [-Number.MAX_VALUE, -Number.MAX_VALUE], [Number.MAX_VALUE, Number.MAX_VALUE], [NaN, Infinity, null]]) {
    const domain = mathSceneDomain(values);
    assert.ok(domain.every(Number.isFinite));
    const scale = mathSceneScale(domain, 40, 440);
    for (const value of [...values, 0, -1e308, 1e308]) {
      const coordinate = scale(value);
      assert.ok(Number.isFinite(coordinate) && coordinate >= 40 && coordinate <= 440);
    }
  }
  const extreme = [
    scene('comparison', { a: -1e308, b: 1e308, result: false, operator: '=' }),
    scene('arithmetic', { a: 1e308, b: 1e-308, result: 0, operation: 'divide' }),
    scene('arithmetic', { a: 1e308, b: 1e308, result: 1e308, operation: 'multiply' }),
    scene('vector', { a: [1e308, -1e308], b: [-1e308, 1e308], result: [1e308, 1e308], operation: 'add' }),
    scene('function', { operation: 'derivative', points: [[-1e308, 1e308], [1e308, -1e308]], x: 1e308, result: -1, slope: -1 }),
    scene('probability', { operation: 'expectation', values: [-1e308, 1e308], weights: [1e308, 1e308], result: 0 }),
    scene('network', { operation: 'update', inputs: [-1e308, 1e308], previous: [1e308, -1e308], outputs: [0, 1e308], learningRate: .1 }),
    scene('vector', { operation: 'cross', a: [Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE], b: [1, 0, 0], result: [0, -Number.MAX_VALUE, Number.MAX_VALUE] }),
    scene('matrix', { operation: 'determinant', a: [[Number.MAX_VALUE, Number.MAX_VALUE], [-Number.MAX_VALUE, Number.MAX_VALUE]], result: 1 }),
    scene('sequence', { operation: 'mean', values: [-Number.MAX_VALUE, Number.MAX_VALUE], index: 1, accumulator: 0 }),
    scene('sets', { operation: 'interval', intervals: [{ name: 'A', lo: -Number.MAX_VALUE, hi: Number.MAX_VALUE, openLeft: true, openRight: false }] }),
    scene('combinatorics', { operation: 'choose', n: Number.MAX_VALUE, k: 2, result: Number.MAX_VALUE }),
    scene('collections', { arrays: [{ name: 'a', values: [-Number.MAX_VALUE, Number.MAX_VALUE, 0, 1, 2] }], scalars: [], changed: [] }),
    scene('relation', { operation: 'compare', values: [-Number.MAX_VALUE, Number.MAX_VALUE], labels: ['lo', 'hi'], result: true }),
  ];
  for (const state of extreme) assertSafeGeometry(markup(state), state.kind + ' extreme');
});

test('intervals retain open/closed endpoints, scalar norms are lengths, and secants are average rates', () => {
  const intervals = markup(scene('sets', { operation: 'interval', intervals: [
    { name: 'A', lo: 0, hi: 1, openLeft: true, openRight: true },
    { name: 'B', lo: 1, hi: 2, openLo: false, openHi: false },
  ] }));
  assertSafeGeometry(intervals, 'interval endpoints');
  assert.match(drawing(intervals), /\(0, 1\)/);
  assert.match(drawing(intervals), /\[1, 2\]/);
  assert.match(drawing(intervals), /fill="var\(--math-paper\)"/, 'open endpoints remain hollow');
  assert.doesNotMatch(drawing(intervals), /<ellipse/);
  const norm = drawing(markup(scene('vector', { operation: 'norm', a: [0, 4, -3], result: 5 })));
  assert.match(norm, /length 5/);
  assert.match(norm, /‖a‖ = 5/);
  assert.doesNotMatch(norm, /a \+ b/);
  const secant = drawing(markup(scene('function', { operation: 'derivative', x: 3, a: 3, b: 4, points: [[2, 4], [3, 9], [4, 16]], slope: 7, result: 7 })));
  assert.match(secant, /secant: rise ÷ run/);
  assert.match(secant, /average rate = 7/);
  assert.doesNotMatch(secant, /instantaneous/);
});

test('recorded sequence snapshots never claim an unapplied term has been added', () => {
  const snapshot = drawing(markup(scene('sequence', { operation: 'sum', values: [0, 1, 2], index: 1, previous: 0, accumulator: 0 })));
  assert.match(snapshot, /recorded sum = 0/);
  assert.match(snapshot, /term 1/);
  assert.doesNotMatch(snapshot, /0 \+ 1 = 0/);
  for (const index of [null, undefined, -1, 9]) {
    const unselected = drawing(markup(scene('sequence', { operation: 'sum', values: [3, 5, 7], index, accumulator: 3 })));
    assert.match(unselected, /No selected term recorded/);
    assert.doesNotMatch(unselected, /Selected term|>term 3<|current i =/);
    assert.match(unselected, /recorded sum = 3/);
  }
  const completed = drawing(markup(scene('sequence', { operation: 'sum', values: [0, 1, 2], index: 1, previous: 0, accumulator: 1, applied: true })));
  assert.match(completed, /0 \+ 1 = 1/);
  const derived = drawing(markup(scene('sequence', { operation: 'mean', values: [2, 4, 6, 8], index: 3, accumulator: 5, accumulatorRecorded: false })));
  assert.match(derived, /mean = 5/);
  assert.doesNotMatch(derived, /recorded mean/);
});

test('an accumulator grows against a stable scale for its sequence', () => {
  const state = accumulator => drawing(markup(scene('sequence', { operation: 'sum', values: [1, 2, 3, 4], index: 2, accumulator })));
  const before = state(3), after = state(6);
  const tapeWidth = html => Number(html.match(/<rect[^>]*width="([\d.]+)px"/)?.[1]);
  assert.ok(tapeWidth(before) < tapeWidth(after), 'larger totals occupy more of the same tape');
  assert.equal(tapeWidth(after), tapeWidth(before) * 2);
  assert.match(before, />10<\/text>/);
  assert.match(after, />10<\/text>/);
});

test('network edges keep input-major weights and gradient sensitivities are separate from updates', () => {
  const affine = drawing(markup(scene('network', { operation: 'affine', inputs: [1, 2], weights: [[1, -.5], [.5, 1]], outputs: [2, 1.5], bias: [0, 0] })));
  assert.match(affine, /fill="var\(--math-c\)"[^>]*>-0\.5</);
  assert.match(affine, /fill="var\(--math-b\)"[^>]*>0\.5</);
  // Four selected edge labels in input order: W00, W01, W10, W11.
  const labels = [...affine.matchAll(/class="math-scene__label math-scene__small">(-?[\d.]+)<\/text>/g)].map(match => Number(match[1]));
  assert.deepEqual(labels.slice(0, 4), [1, -.5, .5, 1]);
  const gradient = drawing(markup(scene('network', { operation: 'gradient', inputs: [1, 2], outputs: [-.2, .4] })));
  assert.match(gradient, /Sensitivities/);
  assert.doesNotMatch(gradient, /Move against|new = previous|activation/);
  const loss = drawing(markup(scene('network', { operation: 'loss', inputs: [.8], outputs: [-Math.log(.8)] })));
  assert.match(loss, /Loss = −ln probability of the true class/);
  assert.doesNotMatch(loss, /Blue target|prediction error/);
  const batch = drawing(markup(scene('network', { operation: 'batch', inputs: [.2, .4, .6], outputs: [.4] })));
  assert.match(batch, /batch mean loss = 0\.4/);
  assert.doesNotMatch(batch, /weighted sum/);
});

test('probability distributions do not invent a result by substituting their outcome mean', () => {
  const html = drawing(markup(scene('probability', { operation: 'distribution', values: [1, 2, 3, 4, 5, 6], weights: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6], result: null })));
  assert.doesNotMatch(html, /result = 3\.5|E\[X\] = 3\.5/);
  assert.match(html, /Heights show the supplied relative masses/);
});

test('a supplied discontinuity splits a function path instead of drawing a false ramp', () => {
  const html = drawing(markup(scene('function', { operation: 'curve', x: 0, result: 0, discontinuities: [0], points: [[-2, -1], [-1, -1], [0, 0], [1, 1], [2, 1]] })));
  const curve = [...html.matchAll(/<path d="([^"]+)"[^>]*stroke="var\(--math-a\)"/g)][0]?.[1];
  assert.ok(curve);
  assert.equal((curve.match(/M/g) || []).length, 3, 'left constant branch, isolated zero, right constant branch');
});

test('null numeric inputs do not invent zero-valued geometry or a function curve', () => {
  for (const kind of ['comparison', 'arithmetic', 'sequence', 'vector', 'matrix', 'combinatorics', 'network']) {
    const html = drawing(markup(scene(kind, { a: null, b: null, result: null, values: [], inputs: [], outputs: [] })));
    assert.doesNotMatch(html, /<circle|<rect|>0</, kind);
    assertSafeGeometry(html, kind + ' empty');
  }
  const missingCurve = drawing(markup(scene('function', { operation: 'derivative', points: [], x: 0, result: 0 })));
  assert.match(missingCurve, /No sampled function values/);
  assert.doesNotMatch(missingCurve, /<path/);
});

test('multiple scenes own unique accessible SVG titles and descriptions', () => {
  const html = renderToStaticMarkup(React.createElement(React.Fragment, null, ...fixtures.slice(0, 4).map((state, i) => React.createElement(MathTraceScene, { key: i, scene: state }))));
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, 8);
  assert.equal(new Set(ids).size, ids.length);
  for (const match of html.matchAll(/aria-labelledby="([^"]+)"/g)) for (const id of match[1].split(' ')) assert.ok(ids.includes(id));
});

test('bounded drawings disclose omitted values while the accessible text retains exact inputs', () => {
  const values = Array.from({ length: 20 }, (_, i) => i + .123456789);
  const sequence = markup(scene('sequence', { operation: 'sum', values, index: 15, previous: 10, accumulator: 25 }));
  assert.match(sequence, /First 12 of 20 terms shown/);
  assert.match(sequence, /selected term 16/);
  assert.match(sequence, /19\.123456789/);
  assert.match(markup(scene('combinatorics', { operation: 'choose', n: 20, k: 4, result: 4845 })), /First 10 of 20 objects shown/);
  assert.match(markup(scene('sets', { operation: 'union', a: values, b: [], result: values })), /12 additional elements omitted/);
  const snapshot = markup(scene('collections', { arrays: [{ name: 'v', values }], scalars: [{ name: 'x', value: 1 }, { name: 'y', value: 2 }], changed: ['x'] }));
  assert.match(snapshot, /first 8 shown/);
  assert.match(snapshot, /Additional recorded values/);
  assert.doesNotMatch(snapshot, /y="3\d\d"/, 'scalar labels stay inside the SVG');
});

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}

test('semantic colors remain distinct and readable in light and dark themes; motion honors preference', async () => {
  const css = await readFile(new URL('../site/trace-math-scenes.css', import.meta.url), 'utf8');
  const source = await readFile(new URL('../site/trace-math-scenes.jsx', import.meta.url), 'utf8');
  const colors = [...css.matchAll(/--math-(?:a|b|c|result):\s*(#[a-f\d]{6})/g)].map(match => match[1]);
  assert.equal(colors.length, 8);
  assert.equal(new Set(colors).size, 8);
  for (const [i, color] of colors.entries()) {
    const bg = luminance(i < 4 ? '#ffffff' : '#121212');
    const fg = luminance(color);
    const contrast = (Math.max(bg, fg) + .05) / (Math.min(bg, fg) + .05);
    assert.ok(contrast >= 4.5, color + ': contrast ' + contrast);
  }
  assert.match(source, /reducedMotion="user"/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
