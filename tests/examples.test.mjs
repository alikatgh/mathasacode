import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const math = require('../examples/notation.cjs');
const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} is not near ${expected}`);

test('mean handles large finite values and rejects empty or excessive input', () => {
  assert.equal(math.mean([2, 4, 6, 8]), 5);
  assert.equal(math.mean([1e308, 1e308]), 1e308);
  assert.equal(math.mean([1e308, -1e308]), 0);
  near(math.mean([1e16, 1, -1e16]), 1 / 3);
  near(math.mean([1e308, 1, -1e308]), 1 / 3);
  for (const invalid of [[], [NaN], [true], ['2'], Array(10001).fill(1)]) assert.throws(() => math.mean(invalid));
});

test('gradient descent averages sample gradients and updates all weights simultaneously', () => {
  const weights = [0, 0];
  const samples = [{ x: [1, 0], y: 2 }, { x: [0, 1], y: 4 }];
  const before = JSON.stringify([weights, samples]);
  assert.deepEqual(math.gradientDescentStep(weights, samples, 0.5), {
    gradient: [-1, -2], weights: [0.5, 1], lossBefore: 5, lossAfter: 2.8125
  });
  assert.equal(JSON.stringify([weights, samples]), before);
  const coupled = math.gradientDescentStep([1, 1], [{ x: [1, 1], y: 0 }], 0.1);
  assert.deepEqual(coupled.gradient, [2, 2]);
  assert.deepEqual(coupled.weights, [0.8, 0.8]);
  near(math.gradientDescentStep([0], [-1e16, -1, 1e16].map(y => ({ x: [1], y })), 1).gradient[0], 1 / 3);
  const overshoot = math.gradientDescentStep([0], [{ x: [1], y: 2 }], 3);
  assert.ok(overshoot.lossAfter > overshoot.lossBefore);
  for (const rate of [0, -1, Infinity, NaN]) assert.throws(() => math.gradientDescentStep(weights, samples, rate));
  for (const bad of [[], [{ x: [1], y: 2 }], [{ x: [NaN, 0], y: 2 }], Array(10001).fill(samples[0])]) assert.throws(() => math.gradientDescentStep(weights, bad, 0.1));
  assert.throws(() => math.gradientDescentStep(Array(21).fill(0), [{ x: Array(21).fill(0), y: 1 }], 0.1));
  assert.throws(() => math.gradientDescentStep(Array(20).fill(0), Array(5001).fill({ x: Array(20).fill(1), y: 1 }), 0.1));
  assert.throws(() => math.gradientDescentStep([1e308], [{ x: [1e308], y: 0 }], 0.1));
});

test('matrix product uses row by column, preserves inputs and rejects invalid dimensions', () => {
  const a = [[1, 2, 3], [4, 5, 6]];
  const b = [[7, 8], [9, 10], [11, 12]];
  const before = JSON.stringify([a, b]);
  assert.deepEqual(math.multiplyMatrices(a, b), [[58, 64], [139, 154]]);
  assert.equal(JSON.stringify([a, b]), before);
  for (const invalid of [[], [[1], [2, 3]], [[NaN]], [[true]]]) assert.throws(() => math.multiplyMatrices(invalid, [[1]]));
  assert.throws(() => math.multiplyMatrices([[1, 2]], [[3, 4]]));
  assert.throws(() => math.multiplyMatrices([[Number.MAX_VALUE]], [[2]]));
});

test('Kronecker keeps every pair of indices and rejects an oversized expansion', () => {
  assert.deepEqual(math.kroneckerProduct([[1], [2]], [[3, 4, 5]]), [[3, 4, 5], [6, 8, 10]]);
  assert.deepEqual(math.kroneckerProduct([[1, 2]], [[0, 5], [6, 7]]), [[0, 5, 0, 10], [6, 7, 12, 14]]);
  const matrix = Array.from({ length: 100 }, () => Array(100).fill(1));
  assert.throws(() => math.kroneckerProduct(matrix, matrix), /size limit/);
  assert.equal(math.kroneckerDelta(-2, -2), 1);
  assert.equal(math.kroneckerDelta(2, 3), 0);
  for (const index of [0.5, Infinity, Number.MAX_SAFE_INTEGER + 1, '2']) assert.throws(() => math.kroneckerDelta(index, 2));
});

test('derivative estimates a smooth function with two calls and rejects unusable samples', () => {
  let calls = 0;
  near(math.derivative(x => { calls++; return x * x; }, 2), 4);
  assert.equal(calls, 2);
  near(math.derivative(Math.sin, 0), 1);
  for (const h of [0, -1, Infinity]) assert.throws(() => math.derivative(x => x, 2, h));
  assert.throws(() => math.derivative(x => x, 1e20, 1e-5));
  assert.throws(() => math.derivative(() => NaN, 1));
});

test('quadrature has signed bounds, bounded calls and a fail-closed work limit', () => {
  let calls = 0;
  near(math.integrateTrapezoid(x => { calls++; return x * x; }, 0, 1, 1000), 0.3333335);
  assert.equal(calls, 1001);
  near(math.integrateTrapezoid(x => x * x, 1, 0, 1000), -0.3333335);
  near(math.integrateTrapezoid(x => 2 * x, 0, 1, 10), 1);
  assert.equal(math.integrateTrapezoid(() => { throw Error('must not evaluate'); }, 3, 3), 0);
  for (const count of [0, -1, 0.5, 1000001, 1e20, Infinity]) {
    let invoked = false;
    assert.throws(() => math.integrateTrapezoid(() => { invoked = true; return 1; }, 0, 1, count));
    assert.equal(invoked, false);
  }
  assert.throws(() => math.integrateTrapezoid(() => Infinity, 0, 1));
});

test('Lambertian example applies beam cosine once and is invariant to vector scale', () => {
  near(math.lambertianReflection(0.5, 2 * Math.PI, [0, 0, 1], [0, Math.sqrt(3), 1]), 0.5);
  near(math.lambertianReflection(0.5, 10, [0, 0, 1e300], [0, 0, 1e300]), 5 / Math.PI);
  assert.equal(math.lambertianReflection(1, 10, [0, 0, 1], [0, 0, -1]), 0);
  for (const rho of [-0.1, 1.1, NaN]) assert.throws(() => math.lambertianReflection(rho, 10, [0, 0, 1], [0, 0, 1]));
  assert.throws(() => math.lambertianReflection(1, -1, [0, 0, 1], [0, 0, 1]));
  assert.throws(() => math.lambertianReflection(1, 1, [0, 0, 0], [0, 0, 1]));
});

test('new English and Chinese code examples execute, and copied integration is bounded', async () => {
  for (const [filename, heading] of [['README.md', '## matrix multiplication'], ['README-zh.md', '## 矩阵乘法']]) {
    const source = await readFile(new URL(`../${filename}`, import.meta.url), 'utf8');
    const added = source.slice(source.indexOf(heading));
    const context = vm.createContext({ require: path => { assert.equal(path, './examples/notation.cjs'); return math; }, console: { log() {} } });
    for (const match of added.matchAll(/```js\n([\s\S]*?)```/g)) vm.runInContext(match[1], context, { timeout: 1000 });
    if (filename === 'README-zh.md') {
      assert.throws(() => vm.runInContext('integrateTrapezoid(x => x, 0, 1, 1e20)', context, { timeout: 100 }), /1000000/);
    }
  }
});
