import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Marked } from 'marked';
import katex from 'katex';
import { getCodeExample } from '../scripts/code-examples.mjs';
import { MATH_TRACE_REGISTRY, mathTraceCollection, mathTraceScene } from '../site/trace-math-model.mjs';

const examples = new Map();
for (const path of ['README.md', 'PYTHON-README.md', 'README-zh.md', 'docs/ml-deep-learning.md']) {
  const tokens = new Marked().lexer(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
  for (const token of tokens.filter(item => item.type === 'code')) {
    const entry = getCodeExample(token.text, path);
    examples.set(entry.id, { ...entry, exampleId: `${entry.id}-999`, element: { dataset: { codeExample: entry.id } },
      variants: Object.fromEntries(Object.entries(entry.variants).map(([language, source]) => [language, { source }])),
    });
  }
}

function inspect(id, locals = {}, line = 1, options = {}) {
  const example = examples.get(id), language = options.language ?? example.nativeLanguage;
  const source = options.source ?? example.variants[language].source;
  const frame = { line, event: options.event ?? 'line', locals };
  const model = { frame, step: 0, frames: [frame], sourceLine: source.split('\n')[line - 1] ?? '', ...options.model };
  return mathTraceScene({ example, model, source, language });
}

test('all 226 authored examples and all 904 language variants have mathematical scene coverage', () => {
  assert.equal(examples.size, 226);
  assert.deepEqual(Object.keys(MATH_TRACE_REGISTRY).sort(), [...examples.keys()].sort());
  let variants = 0;
  for (const [id, example] of examples) for (const language of Object.keys(example.variants)) {
    const scene = inspect(id, {}, 1, { language });
    assert.equal(scene.authored, true, `${id}/${language}`);
    assert.equal(scene.exampleId, id);
    assert.notEqual(scene.kind, 'collections', `${id}/${language} must explain its authored mathematics`);
    assert.ok(scene.title && scene.formulaText && scene.data);
    assert.doesNotMatch(scene.formulaTex, /[\u0000-\u001f]/);
    assert.doesNotThrow(() => katex.renderToString(scene.formulaTex, { throwOnError: true }), `${id}/${language}: ${scene.formulaTex}`);
    variants++;
  }
  assert.equal(variants, 904);
});

test('imported Kronecker delta uses the selected literal operands without inventing captured returns', () => {
  const before = inspect('en-56', { kroneckerDelta: 'undefined' }, 1);
  assert.equal(before.data.a, null);
  assert.equal(before.data.result, null);
  const equal = inspect('en-56', { kroneckerDelta: '[Function; preview omitted]' }, 2);
  const different = inspect('en-56', { kroneckerDelta: '[Function; preview omitted]' }, 3);
  assert.deepEqual([equal.data.a, equal.data.b, equal.data.result], [2, 2, 1]);
  assert.deepEqual([different.data.a, different.data.b, different.data.result], [2, 3, 0]);
  assert.equal(different.provenance, 'authored');
  assert.match(different.description, /different.*delta is 0/);
  assert.equal(different.data['(return)'], undefined);
});

test('sigma uses the actual current index and accumulator, without applying the pending update', () => {
  const scene = inspect('en-16', { i: '4', sum: '6' }, 3, { model: { previous: { locals: { i: '3', sum: '3' } } } });
  assert.equal(scene.data.index, 3);
  assert.equal(scene.data.values[scene.data.index], 4);
  assert.equal(scene.data.accumulator, 6);
  assert.equal(scene.data.accumulatorRecorded, true);
  assert.equal(scene.data.applied, undefined);
  assert.equal(inspect('en-16', {}, 1).data.accumulator, null, 'an authored initialization is not a recorded accumulator');
});

test('omitted mean helper still explains the mathematical mean of recorded inputs', () => {
  const scene = inspect('en-20', { values: '[2, 4, 6, 8]', mean: '[Function; preview omitted]' }, 4);
  assert.deepEqual(scene.data.values, [2, 4, 6, 8]);
  assert.equal(scene.data.accumulator, 5);
  assert.equal(scene.data.accumulatorRecorded, false);
  assert.match(scene.description, /total 20/);
  const compiled = inspect('en-20', { values: '[2,4,6,8]', sum: '20', average: '5' }, 8, { language: 'c' });
  assert.equal(compiled.data.accumulator, 5, 'the captured sum is not the mean');
  assert.equal(compiled.data.accumulatorRecorded, true);
});

test('the mixed NumPy sum/product example selects the operation and its own accumulator', () => {
  const example = examples.get('py-23'), source = example.variants.c.source;
  const lines = source.split('\n');
  const sumLine = lines.findIndex(line => /sum\s*\+=/.test(line)) + 1;
  const productLine = lines.findIndex(line => /product\s*\*=/.test(line)) + 1;
  const locals = { sum: '10200', product: '720' };
  const addition = inspect('py-23', locals, sumLine, { language: 'c' });
  const product = inspect('py-23', locals, productLine, { language: 'c' });
  assert.equal(addition.data.operation, 'sum');
  assert.equal(addition.data.accumulator, 10200);
  assert.equal(addition.data.values[0], 3);
  assert.equal(product.data.operation, 'product');
  assert.equal(product.data.accumulator, 720);
  assert.deepEqual(product.data.values, [1, 2, 3, 4, 5, 6]);
});

test('vector constructions use the selected operands and never look ahead into future frames', () => {
  const initial = inspect('en-23', { v: '[3, 4]' }, 2);
  assert.deepEqual(initial.data.a, [3, 4]);
  assert.equal(initial.data.result, 5);
  const withFuture = inspect('en-23', { v: '[3, 4]' }, 2, { model: { frames: [{ locals: { v: '[3,4]' } }, { locals: { v: '[90,120]' } }] } });
  assert.deepEqual(withFuture.data, initial.data);
  const definition = inspect('en-13', { dot: '[Function; preview omitted]' }, 1);
  assert.deepEqual(definition.data.a, []);
  assert.equal(definition.data.result, null);
});

test('literal tensor operands form blocks; source arrays do not require a captured library result', () => {
  const scene = inspect('en-53', {}, 3);
  assert.equal(scene.data.operation, 'tensor');
  assert.deepEqual(scene.data.a, [[1], [2]]);
  assert.deepEqual(scene.data.b, [[3, 4, 5]]);
  assert.deepEqual(scene.data.result, [[3, 4, 5], [6, 8, 10]]);
});

test('interval, complex, rounding and Lambertian scenes show their real mathematical operations', () => {
  const intervals = inspect('en-50');
  assert.equal(intervals.data.operation, 'interval');
  assert.deepEqual(intervals.data.intervals.map(item => [item.openLeft, item.openRight]), [[true, true], [true, false], [false, true], [false, false]]);
  const complex = inspect('en-7');
  assert.equal(complex.data.action, 'multiply');
  assert.deepEqual(complex.data.result, [1, 3]);
  const rounding = inspect('en-40', { x: '3.5' }, 2);
  assert.equal(rounding.data.operation, 'ceil');
  assert.equal(rounding.data.result, 4);
  assert.equal(rounding.formulaTex, String.raw`\lceil x\rceil`);
  for (const id of ['en-61', 'py-63']) {
    const light = inspect(id);
    assert.ok(Math.abs(Math.hypot(...light.data.a) - 1) < 1e-12);
    assert.ok(Math.abs(Math.hypot(...light.data.b) - 1) < 1e-12);
    assert.ok(Math.abs(light.data.result - 0.5) < 1e-12);
  }
});

test('function definitions stay symbolic while secant endpoints are exact', () => {
  assert.equal(inspect('en-34').data.x, null);
  assert.equal(inspect('en-34').data.result, null);
  assert.deepEqual(inspect('en-37').data.discontinuities, [0]);
  const change = inspect('zh-55', { x0: '2', x1: '2.5' }, 7);
  assert.equal(change.data.slope, 4.5);
  assert.ok(change.data.points.some(([x, y]) => x === 2 && y === 4));
  assert.ok(change.data.points.some(([x, y]) => x === 2.5 && y === 6.25));
  for (const language of ['javascript', 'python', 'c', 'rust']) {
    const length = inspect('en-35', {}, 1, { language });
    assert.equal(length.kind, 'vector', language);
    assert.equal(length.data.operation, 'norm', language);
    assert.deepEqual(length.data.a, [], language);
    assert.equal(length.formulaTex, String.raw`\ell(x,y)=\sqrt{x^2+y^2}`, language);
    assert.match(length.description, /horizontal and vertical sides/, language);
  }
});

test('logical disjunction and conjunction retain their own mathematical rules', () => {
  assert.equal(inspect('en-48', { A: 'true', B: 'false' }).data.operation, 'or');
  assert.equal(inspect('en-48').formulaTex, String.raw`A\lor B`);
  assert.equal(inspect('en-46').formulaTex, String.raw`A\land B`);
  assert.equal(inspect('py-3').data.operation, 'add');
  assert.notEqual(inspect('en-45').data.operation, 'implication');
});

test('neural scene outputs match the weights and layer they depict', () => {
  const shapes = inspect('ml-2');
  assert.equal(shapes.data.operation, 'shapes');
  assert.equal(shapes.data.a.length, 4);
  assert.equal(shapes.data.b, null);
  assert.equal(shapes.data.result, null);
  const first = inspect('ml-5', {}, 7);
  assert.deepEqual(first.data.inputs, [1, 1]);
  assert.deepEqual(first.data.outputs, [0.8, -1.2]);
  const second = inspect('ml-5', {}, 11);
  assert.deepEqual(second.data.inputs, [0.8, 0]);
  assert.ok(Math.abs(second.data.outputs[0] - 0.3) < 1e-12);
  const backward = inspect('ml-8');
  assert.equal(backward.data.operation, 'gradient');
  assert.equal(backward.data.outputs[1], 0);
  assert.ok(Math.abs(backward.data.outputs[0] + 0.3543436937742046) < 1e-12);
  const batch = inspect('ml-10');
  assert.equal(batch.data.inputs.length, 4);
  assert.equal(batch.data.outputs.length, 1);
  assert.ok(Math.abs(batch.data.outputs[0] - 0.517813409778785) < 1e-9);
  assert.ok(batch.data.outputs[0] > 0.5, 'do not substitute a final trained loss into an early snapshot');
});

test('all four authored training variants read their initial literal network and four losses', () => {
  for (const language of ['javascript', 'python', 'c', 'rust']) {
    const batch = inspect('ml-10', {}, 1, { language });
    assert.equal(batch.kind, 'network', language);
    assert.equal(batch.data.operation, 'batch', language);
    assert.equal(batch.data.inputs.length, 4, language);
    assert.equal(batch.data.outputs.length, 1, language);
    assert.ok(Math.abs(batch.data.inputs[0] - 0.4374879504858857) < 1e-12, language);
    assert.ok(Math.abs(batch.data.inputs[1] - 0.5981388693815918) < 1e-12, language);
    assert.ok(Math.abs(batch.data.outputs[0] - 0.5178134099337388) < 1e-12, language);
    assert.equal(batch.data.initialParameters, true, language);
    assert.equal(batch.provenance, 'authored', language);
    assert.match(batch.title, /starting network/, language);
    assert.match(batch.description, /before training begins/, language);
    const edited = inspect('ml-10', {}, 1, { language, source: examples.get('ml-10').variants[language].source + '\n// edited' });
    assert.equal(edited.kind, 'collections', language);
    assert.equal(edited.authored, false, language);
  }
});

test('training uses complete captured parameters together and never mixes a partial update into the initial network', () => {
  const zeros = { W1: '[[0,0],[0,0]]', W2: '[[0,0],[0,0]]', b1: '[0,0]', b2: '[0,0]' };
  const captured = inspect('ml-10', zeros);
  assert.equal(captured.data.initialParameters, false);
  assert.ok(Math.abs(captured.data.outputs[0] - Math.log(2)) < 1e-12);
  const partial = inspect('ml-10', { W1: zeros.W1 });
  assert.equal(partial.data.initialParameters, true);
  assert.ok(Math.abs(partial.data.outputs[0] - 0.5178134099337388) < 1e-12);
});

test('edited source loses authored assumptions and treats preview strings only as bounded data', () => {
  const source = 'const x = 700; // edited';
  const scene = inspect('en-56', { x: '700', v: '[3,4]', omitted: '[1, …]', code: 'globalThis.executed = true' }, 1, { source });
  assert.equal(scene.authored, false);
  assert.equal(scene.kind, 'collections');
  assert.deepEqual(scene.data.scalars, [{ name: 'x', value: 700 }]);
  assert.deepEqual(scene.data.arrays, [{ name: 'v', values: [3, 4] }]);
  assert.equal(scene.data.result, undefined);
  for (const preview of ['[9007199254740993]', '[1e400]', '[1, …]', '[[1],[2,3]]', '["3"]', '[1,2];throw Error()']) assert.equal(mathTraceCollection(preview), null, preview);
  assert.deepEqual(mathTraceCollection('[[1,2],[3,4]]'), [[1, 2], [3, 4]]);
});
