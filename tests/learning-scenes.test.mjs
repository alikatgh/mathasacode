import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bayesNaturalFrequencies, gradientLoss, gradientAt, gradientCandidate,
  createGradientRun, advanceGradientRun, MAX_GRADIENT_UPDATES,
  weightedSumCalculation, stableSoftmax, softmaxCalculation,
} from '../site/experiments/learning-scene-model.mjs';

const near = (actual, expected, tolerance = 1e-12) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`);

test('Bayes separates target cases and false signals before conditioning', () => {
  const model = bayesNaturalFrequencies();
  assert.equal(model.population, 10000);
  assert.equal(model.target, 100);
  assert.equal(model.trueSignals, 90);
  assert.equal(model.falseSignals, 495);
  assert.equal(model.totalSignals, 585);
  near(model.posterior, 90 / 585);
  near(model.target + model.nonTarget, model.population);
  assert.equal(bayesNaturalFrequencies(0).posterior, 0);
  assert.equal(bayesNaturalFrequencies(100).posterior, 1);
  assert.equal(bayesNaturalFrequencies(0, 0, 0).posterior, null);
  assert.equal(bayesNaturalFrequencies(100, 0, 0.05).posterior, null);
  assert.throws(() => bayesNaturalFrequencies(-1), RangeError);
  assert.throws(() => bayesNaturalFrequencies(1, NaN), RangeError);
});

test('gradient descent uses the exact half-square mean loss and simultaneous negative-gradient update', () => {
  assert.equal(gradientLoss([0, 0]), 5);
  assert.deepEqual(gradientAt([0, 0]), [-1, -2]);
  const candidate = gradientCandidate([0, 0], 0.5);
  assert.deepEqual(candidate.delta, [0.5, 1]);
  assert.deepEqual(candidate.weights, [0.5, 1]);
  assert.equal(candidate.loss, 2.8125);
  assert.ok(candidate.loss < gradientLoss([0, 0]));
  const current = [1, 3];
  const next = gradientCandidate(current, 0.5);
  assert.deepEqual(current, [1, 3], 'preview does not mutate current weights');
  assert.deepEqual(next.gradient, [-0.5, -0.5]);
  assert.deepEqual(next.weights, [1.25, 3.25]);
  assert.equal(gradientLoss([2, 4]), 0);
  assert.throws(() => gradientCandidate([0, 0], 4), RangeError);
});

test('gradient runs retain a finite bounded trail and stop after at most 20 manual updates', () => {
  let run = createGradientRun();
  const initial = run;
  for (let i = 0; i < 100; i++) run = advanceGradientRun(run, 3.5);
  assert.equal(initial.updates, 0);
  assert.deepEqual(initial.trail, [[0, 0]]);
  assert.equal(run.updates, MAX_GRADIENT_UPDATES);
  assert.equal(run.trail.length, MAX_GRADIENT_UPDATES + 1);
  assert.ok(run.trail.flat().every(Number.isFinite));
  assert.equal(advanceGradientRun(run, 3.5), run);
  const zeroRate = createGradientRun();
  assert.equal(advanceGradientRun(zeroRate, 0), zeroRate);
});

test('weighted sums preserve both input contributions, then add each bias once', () => {
  const model = weightedSumCalculation();
  assert.deepEqual(model.contributions, [[0.5, 0.5], [-0.5, -0.5]]);
  assert.deepEqual(model.sums, [1, -1]);
  assert.deepEqual(model.activations, [0.8, -1.2]);
  const changed = weightedSumCalculation([2, -1]);
  assert.deepEqual(changed.contributions, [[1, -0.5], [-1, 0.5]]);
  assert.deepEqual(changed.activations, [0.3, -0.7]);
  assert.throws(() => weightedSumCalculation([3, 0]), RangeError);
});

test('softmax subtracts the maximum, normalizes to one and stays stable at extreme scores', () => {
  const model = softmaxCalculation();
  assert.deepEqual(model.logits, [0.3, -0.3]);
  assert.deepEqual(model.shifted, [0, -0.6]);
  near(model.exponentials[0], 1);
  near(model.exponentials[1], 0.5488116360940265);
  near(model.probabilities[0], 0.6456563062257954);
  near(model.probabilities[1], 0.3543436937742045);
  near(model.total, 1);
  const translated = stableSoftmax([10000.3, 9999.7]);
  translated.forEach((value, index) => near(value, model.probabilities[index], 1e-11));
  assert.deepEqual(stableSoftmax([Number.MAX_VALUE, -Number.MAX_VALUE]), [1, 0]);
  assert.deepEqual(stableSoftmax([1e300, 1e300]), [0.5, 0.5]);
  for (const gap of [-6, 0, 6]) {
    const values = softmaxCalculation(gap);
    near(values.total, 1);
    assert.ok(values.probabilities.every(value => value >= 0 && value <= 1));
    assert.ok(values.exponentials.every(value => value > 0 && value <= 1));
  }
  assert.throws(() => stableSoftmax([Infinity, 0]), RangeError);
  assert.throws(() => stableSoftmax(Array(33).fill(0)), RangeError);
  assert.throws(() => softmaxCalculation(7), RangeError);
});
