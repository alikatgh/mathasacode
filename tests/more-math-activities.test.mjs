import test from 'node:test';
import assert from 'node:assert/strict';
import { activities } from '../dist/assets/activities.mjs';

const headings = new Map([
  ['powers-and-logarithms', '幂与对数'],
  ['trigonometry', '三角函数'],
  ['modular-arithmetic', '模运算'],
  ['factorials-and-combinations', '阶乘与组合'],
  ['probability', '概率'],
  ['expected-value', '期望值'],
  ['variance-and-standard-deviation', '方差与标准差'],
  ['conditional-probability-and-bayes', '条件概率与贝叶斯定理'],
  ['covariance-and-correlation', '协方差与相关性'],
  ['entropy', '熵']
]);
const mlHeadings = new Map([
  ['ml-weighted-sum', 'weighted-sums-and-bias'],
  ['ml-softmax', 'from-scores-to-probabilities'],
  ['ml-cross-entropy', 'measuring-the-mistake'],
  ['ml-gradient-step', 'gradient-descent']
]);
const find = id => {
  const activity = activities.find(item => item.id === id);
  assert.ok(activity, `missing ${id}`);
  return activity;
};
const calculate = (id, values = {}) => {
  const activity = find(id);
  const defaults = Object.fromEntries(activity.fields.map(field => [field.key, field.value]));
  return activity.calculate({ ...defaults, ...values });
};
const close = (actual, expected, tolerance = 1e-10) => {
  assert.ok(Number.isFinite(actual), `non-finite result ${actual}`);
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
};
const numericParts = result => [...result.matchAll(/[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi)].map(match => Number(match[0]));
const scalar = (id, values) => Number(calculate(id, values).result);

test('the new activities retain stable headings and complete bilingual controls and three-answer quizzes', () => {
  for (const [id, zh] of headings) {
    assert.deepEqual(find(id).headingIds, { en: [id], zh: [zh] });
  }
  for (const [id, heading] of mlHeadings) {
    assert.deepEqual(find(id).headingIds, { en: [heading], zh: [] });
  }
  for (const id of [...headings.keys(), ...mlHeadings.keys()]) {
    const activity = find(id);
    assert.equal(activity.quiz.options.length, 3, id);
    assert.equal(activity.quiz.options.filter(option => option.id === activity.quiz.answer).length, 1, id);
    const localized = [activity.title, activity.description, activity.quiz.prompt, activity.quiz.explanation,
      ...activity.fields.map(field => field.label),
      ...activity.fields.flatMap(field => (field.options || []).map(option => option.label)),
      ...activity.quiz.options.map(option => option.text)];
    for (const label of localized) for (const lang of ['en', 'zh']) assert.ok(label[lang]?.trim(), `${id}: missing ${lang}`);
    const result = calculate(id);
    assert.ok(result.expression && result.result, id);
    assert.doesNotMatch(result.result, /NaN|Infinity|undefined/, id);
  }
});

test('powers and logarithms are inverse operations and reject invalid or unrepresentable domains', () => {
  close(scalar('powers-and-logarithms', { base: '3', x: '4' }), 81);
  close(scalar('powers-and-logarithms', { operation: 'log', base: '3', x: '81' }), 4);
  close(scalar('powers-and-logarithms', { operation: 'log', base: '0.5', x: '8' }), -3);
  for (const values of [{ base: '1' }, { base: '0' }, { base: '-2' }, { x: '0' }, { x: '-1' }, { operation: 'eval' }, { base: '1000000', x: '100' }, { base: '0.000001', x: '100' }]) {
    assert.throws(() => calculate('powers-and-logarithms', values));
  }
});

test('trigonometry converts degrees and preserves the unit-circle identity and periodicity', () => {
  const [radians, sine, cosine] = numericParts(calculate('trigonometry', { degrees: '90' }).result);
  close(radians, Math.PI / 2);
  close(sine, 1);
  close(cosine, 0);
  const [, s1, c1] = numericParts(calculate('trigonometry', { degrees: '-37' }).result);
  const [, s2, c2] = numericParts(calculate('trigonometry', { degrees: '323' }).result);
  close(s1 * s1 + c1 * c1, 1);
  close(s1, s2);
  close(c1, c2);
  for (const degrees of ['Infinity', '360001', '']) assert.throws(() => calculate('trigonometry', { degrees }));
});

test('Euclidean modulo returns a canonical residue for negative and positive integers', () => {
  for (const a of [-1000000000, -17, -7, -5, -1, 0, 7, 1000000000]) {
    const residue = scalar('modular-arithmetic', { a, modulus: 5 });
    assert.ok(Number.isInteger(residue) && residue >= 0 && residue < 5);
    assert.ok((a - residue) % 5 === 0);
  }
  assert.equal(scalar('modular-arithmetic'), 3);
  assert.equal(scalar('modular-arithmetic', { modulus: 1 }), 0);
  for (const values of [{ a: 1.5 }, { modulus: 0 }, { modulus: -5 }, { modulus: 2.5 }, { a: 1e10 }]) assert.throws(() => calculate('modular-arithmetic', values));
});

test('factorials and combinations respect zero, symmetry, Pascal’s identity and bounded integer work', () => {
  assert.equal(scalar('factorials-and-combinations', { operation: 'factorial', n: 0, k: '' }), 1);
  assert.equal(scalar('factorials-and-combinations', { operation: 'factorial', n: 5 }), 120);
  assert.equal(scalar('factorials-and-combinations', { n: 0, k: 0 }), 1);
  assert.equal(scalar('factorials-and-combinations', { n: 30, k: 15 }), 155117520);
  for (let k = 0; k <= 10; k++) {
    assert.equal(scalar('factorials-and-combinations', { n: 10, k }), scalar('factorials-and-combinations', { n: 10, k: 10 - k }));
  }
  assert.equal(scalar('factorials-and-combinations', { n: 8, k: 3 }), scalar('factorials-and-combinations', { n: 7, k: 2 }) + scalar('factorials-and-combinations', { n: 7, k: 3 }));
  for (const values of [{ n: 31 }, { n: -1 }, { n: 4.5 }, { n: 3, k: 4 }, { k: -1 }, { k: 0.5 }]) assert.throws(() => calculate('factorials-and-combinations', values));
});

test('equally likely probability handles impossible and certain events and rejects invalid counts', () => {
  assert.equal(scalar('probability', { favorable: 0, total: 6 }), 0);
  assert.equal(scalar('probability', { favorable: 6, total: 6 }), 1);
  close(scalar('probability', { favorable: 3, total: 6 }), 0.5);
  for (const values of [{ total: 0 }, { favorable: 7, total: 6 }, { favorable: -1 }, { total: 1.5 }, { favorable: 0.5 }]) assert.throws(() => calculate('probability', values));
});

test('expectation uses the supplied distribution without silently normalizing it', () => {
  assert.equal(scalar('expected-value'), 2);
  assert.equal(scalar('expected-value', { values: '[-10,0,10]', probabilities: '[0.25,0.5,0.25]' }), 0);
  close(scalar('expected-value', { values: '[3,13]', probabilities: '[0.8,0.2]' }), 5);
  // Accepted rounding tolerance must not rescale the actual weights.
  assert.equal(scalar('expected-value', { values: '[0,1000000000000]', probabilities: '[0.5,0.50000000005]' }), 500000000050);
  for (const values of [
    { probabilities: '[0.4,0.4]' }, { probabilities: '[-0.1,1.1]' }, { probabilities: '[1]' },
    { values: '[]' }, { values: '[1,null]' }, { values: '[1,"2"]' }, { values: '[1e309,2]' },
    { values: '[1000000000001,0]' }, { probabilities: '[0.8,0.200001]' },
    { values: JSON.stringify(Array(21).fill(1)), probabilities: JSON.stringify(Array(21).fill(1 / 21)) },
    { values: 'globalThis.untrustedInputWasExecuted = true' }
  ]) assert.throws(() => calculate('expected-value', values));
});

test('variance distinguishes sample and population conventions and standard deviation preserves scale', () => {
  const population = numericParts(calculate('variance-and-standard-deviation').result);
  const sample = numericParts(calculate('variance-and-standard-deviation', { mode: 'sample' }).result);
  close(population[0], 2 / 3);
  close(sample[0], 1);
  close(sample[1], 1);
  close(population[1] ** 2, population[0]);
  const shifted = numericParts(calculate('variance-and-standard-deviation', { values: '[1001,1002,1003]' }).result);
  close(shifted[0], population[0]);
  const scaled = numericParts(calculate('variance-and-standard-deviation', { values: '[2,4,6]' }).result);
  close(scaled[0], 4 * population[0]);
  close(scaled[1], 2 * population[1]);
  assert.deepEqual(numericParts(calculate('variance-and-standard-deviation', { values: '[7]' }).result), [0, 0]);
  for (const values of [{ mode: 'sample', values: '[7]' }, { values: '[]' }, { values: '[1e309,0]' }, { mode: 'unknown' }]) assert.throws(() => calculate('variance-and-standard-deviation', values));
});

test('Bayes accounts for base rates, agrees with uninformative evidence and rejects impossible evidence', () => {
  close(scalar('conditional-probability-and-bayes'), 1 / 6);
  close(scalar('conditional-probability-and-bayes', { prior: 0.23, likelihood: 0.4, falsePositive: 0.4 }), 0.23);
  assert.equal(scalar('conditional-probability-and-bayes', { prior: 0, likelihood: 0.8, falsePositive: 0.3 }), 0);
  assert.equal(scalar('conditional-probability-and-bayes', { prior: 1, likelihood: 0.8, falsePositive: 0.3 }), 1);
  for (const values of [{ prior: -0.1 }, { likelihood: 1.1 }, { falsePositive: -1 }, { likelihood: 0, falsePositive: 0 }, { prior: 1, likelihood: 0 }]) assert.throws(() => calculate('conditional-probability-and-bayes', values));
});

test('covariance is symmetric and correlation keeps sign and ignores positive scale and translation', () => {
  const [covariance, correlation] = numericParts(calculate('covariance-and-correlation').result);
  close(covariance, 4 / 3);
  close(correlation, 1);
  const swapped = numericParts(calculate('covariance-and-correlation', { x: '[2,4,6]', y: '[1,2,3]' }).result);
  close(swapped[0], covariance);
  close(swapped[1], correlation);
  const translated = numericParts(calculate('covariance-and-correlation', { x: '[1,2,3]', y: '[12,14,16]' }).result);
  close(translated[0], covariance);
  close(translated[1], correlation);
  close(numericParts(calculate('covariance-and-correlation', { y: '[6,4,2]' }).result)[1], -1);
  close(numericParts(calculate('covariance-and-correlation', { x: '[1e-200,2e-200,3e-200]', y: '[6e-200,4e-200,2e-200]' }).result)[1], -1);
  for (const values of [{ x: '[1,1,1]' }, { y: '[3,3,3]' }, { x: '[1]' }, { y: '[1,2]' }, { x: '[1,null,3]' }, { x: JSON.stringify(Array(21).fill(1)) }]) assert.throws(() => calculate('covariance-and-correlation', values));
});

test('entropy is zero for certainty, log₂(n) for a uniform distribution, and ignores zero entries', () => {
  assert.equal(scalar('entropy', { probabilities: '[1]' }), 0);
  assert.equal(scalar('entropy', { probabilities: '[0,1,0]' }), 0);
  assert.equal(scalar('entropy'), 1);
  assert.equal(scalar('entropy', { probabilities: '[0.25,0.25,0.25,0.25]' }), 2);
  close(scalar('entropy', { probabilities: '[0,0.5,0.5,0]' }), 1);
  assert.ok(scalar('entropy', { probabilities: '[0.9,0.1]' }) < 1);
  for (const probabilities of ['[]', '[0,0]', '[0.4,0.4]', '[-0.1,1.1]', '[null,1]', '[0.5,"0.5"]', JSON.stringify(Array(21).fill(1 / 21))]) assert.throws(() => calculate('entropy', { probabilities }));
});

test('the weighted sum includes both feature contributions and a bias independently', () => {
  close(scalar('ml-weighted-sum'), 0.8);
  close(scalar('ml-weighted-sum', { x1: 0, x2: 0, bias: 7 }), 7);
  close(scalar('ml-weighted-sum', { w1: 2, x1: 3, w2: -4, x2: 5, bias: 1 }), -13);
  for (const values of [{ w1: 'Infinity' }, { x2: '' }, { bias: 1000001 }]) assert.throws(() => calculate('ml-weighted-sum', values));
});

test('softmax is normalized, translation invariant and stable at extreme logits', () => {
  const ordinary = JSON.parse(calculate('ml-softmax', { scores: '[1,2,3]' }).result);
  const shifted = JSON.parse(calculate('ml-softmax', { scores: '[100001,100002,100003]' }).result);
  close(ordinary.reduce((sum, p) => sum + p, 0), 1);
  ordinary.forEach((p, i) => close(p, shifted[i]));
  assert.ok(ordinary[0] < ordinary[1] && ordinary[1] < ordinary[2]);
  assert.deepEqual(JSON.parse(calculate('ml-softmax', { scores: '[1000000,-1000000]' }).result), [1, 0]);
  assert.deepEqual(JSON.parse(calculate('ml-softmax', { scores: '[-1000000,-1000000]' }).result), [0.5, 0.5]);
  assert.deepEqual(JSON.parse(calculate('ml-softmax', { scores: '[0]' }).result), [1]);
  for (const scores of ['[]', '[1000001,0]', '[null,0]', '[0,"1"]', JSON.stringify(Array(9).fill(0))]) assert.throws(() => calculate('ml-softmax', { scores }));
});

test('cross-entropy uses the target index and stays finite when its probability would round to zero', () => {
  close(scalar('ml-cross-entropy', { scores: '[0,0]', target: 1 }), Math.log(2));
  close(scalar('ml-cross-entropy', { scores: '[100.3,99.7]', target: 0 }), scalar('ml-cross-entropy'));
  assert.equal(scalar('ml-cross-entropy', { scores: '[1000000,-1000000]', target: 1 }), 2000000);
  assert.equal(scalar('ml-cross-entropy', { scores: '[-1000000,1000000]', target: 0 }), 2000000);
  assert.equal(scalar('ml-cross-entropy', { scores: '[1000000,-1000000]', target: 0 }), 0);
  assert.ok(scalar('ml-cross-entropy', { target: 1 }) > scalar('ml-cross-entropy', { target: 0 }));
  for (const values of [{ scores: '[1]' }, { scores: '[1,2,3]' }, { target: -1 }, { target: 2 }, { target: 0.5 }, { target: '' }]) assert.throws(() => calculate('ml-cross-entropy', values));
});

test('logistic gradient steps subtract the gradient, honor zero rate and keep extreme losses finite', () => {
  const [probability, gradient, oldWeight, newWeight, oldLoss, newLoss] = numericParts(calculate('ml-gradient-step').result);
  close(probability, 0.5);
  close(gradient, -1);
  close(oldWeight, 0);
  close(newWeight, 0.1);
  assert.ok(newLoss < oldLoss);
  const zeroRate = numericParts(calculate('ml-gradient-step', { weight: 3, x: -2, target: 0, eta: 0 }).result);
  close(zeroRate[2], zeroRate[3]);
  close(zeroRate[4], zeroRate[5]);
  const oppositeTarget = numericParts(calculate('ml-gradient-step', { target: 0 }).result);
  close(oppositeTarget[1], 1);
  close(oppositeTarget[3], -0.1);
  for (const values of [{ weight: 1e6, x: 1e6, target: 0, eta: 10 }, { weight: -1e6, x: 1e6, target: 1, eta: 10 }]) {
    const result = calculate('ml-gradient-step', values).result;
    assert.doesNotMatch(result, /NaN|Infinity/);
    assert.ok(numericParts(result).every(Number.isFinite));
  }
  const zeroFeature = numericParts(calculate('ml-gradient-step', { x: 0, weight: 5 }).result);
  close(zeroFeature[1], 0);
  close(zeroFeature[2], zeroFeature[3]);
  for (const values of [{ target: 0.5 }, { target: 2 }, { eta: -0.1 }, { eta: 10.1 }, { weight: 'Infinity' }]) assert.throws(() => calculate('ml-gradient-step', values));
});
