import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRAINING_INPUTS, TRAINING_LABELS, MAX_TRAINING_STEPS, MAX_GRID_SIZE,
  makeNeuralNetwork, neuralForward, neuralSampleLoss, neuralBackward, neuralMeanLoss,
  neuralMeanGradients, neuralTrainStep, neuralTrainingHistory, neuralFiniteDifference,
  neuralProbabilityGrid, reluCalculation,
} from '../site/experiments/neural-lab-model.mjs';

const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);

test('authored initial and 120-step networks retain their exact losses and predictions', () => {
  const history = neuralTrainingHistory();
  assert.equal(history.length, 121);
  assert.equal(history[0].loss.toFixed(6), '0.517813');
  assert.equal(history[120].loss.toFixed(6), '0.098281');
  for (const epoch of [0, 120]) {
    assert.deepEqual(history[epoch].predictions, [0, 1, 1, 0]);
    assert.equal(history[epoch].correct, 4);
  }
  const f = neuralForward(makeNeuralNetwork(), [1, 1]);
  assert.deepEqual(f.a, [0.8, -1.2]);
  assert.deepEqual(f.h, [0.8, 0]);
  close(f.z[0], 0.3); close(f.z[1], -0.3);
  assert.equal(neuralSampleLoss(makeNeuralNetwork(), [1, 1], 0).toFixed(6), '0.437488');
});

test('all twelve single-example gradients and mean gradients agree with finite differences away from bends', () => {
  const net = makeNeuralNetwork();
  let checked = 0;
  const mean = neuralMeanGradients(net);
  for (const name of ['W1', 'b1', 'W2', 'b2']) {
    const matrix = name.startsWith('W');
    for (let row = 0; row < 2; row++) for (let col = 0; col < (matrix ? 2 : 1); col++) {
      for (let i = 0; i < TRAINING_INPUTS.length; i++) {
        const check = neuralFiniteDifference(net, TRAINING_INPUTS[i], TRAINING_LABELS[i], name, row, col);
        assert.equal(check.crossesBend, false);
        close(check.analytic, check.numerical, 1e-7);
      }
      const above = structuredClone(net); const below = structuredClone(net);
      if (matrix) { above[name][row][col] += 1e-5; below[name][row][col] -= 1e-5; }
      else { above[name][row] += 1e-5; below[name][row] -= 1e-5; }
      const numerical = (neuralMeanLoss(above) - neuralMeanLoss(below)) / 2e-5;
      close(matrix ? mean[name][row][col] : mean[name][row], numerical, 1e-7);
      checked++;
    }
  }
  assert.equal(checked, 12);
});

test('reverse path uses old outgoing weights, sums both classes and blocks an inactive ReLU', () => {
  const net = makeNeuralNetwork(); const before = structuredClone(net);
  const f = neuralBackward(net, [1, 1], 0);
  assert.deepEqual(net, before);
  assert.equal(f.dz[0].toFixed(6), '-0.354344');
  assert.equal(f.gradient.W2[0][0].toFixed(6), '-0.283475');
  assert.equal(f.gradient.W1[0][0].toFixed(6), '-0.354344');
  assert.notEqual(f.dh[1], 0);
  assert.equal(f.da[1], 0);
  close(f.gradient.W2[1][0], 0);
  assert.equal(f.gradient.W1[0][1], 0);
  close(f.dh[0], f.dhContributions[0][0] + f.dhContributions[0][1]);
  const switched = neuralBackward(net, [1, 1], 1);
  assert.ok(switched.dz[0] > 0);
  assert.ok(switched.gradient.W1[0][0] > 0);
});

test('mean gradients average each sample exactly once and all parameter updates are simultaneous', () => {
  const net = makeNeuralNetwork(); const before = structuredClone(net);
  const mean = neuralMeanGradients(net);
  const { net: next, gradient } = neuralTrainStep(net, 0.1);
  assert.deepEqual(net, before); assert.deepEqual(gradient, mean);
  for (const name of ['W1', 'b1', 'W2', 'b2']) {
    const matrix = name.startsWith('W');
    for (let row = 0; row < 2; row++) for (let col = 0; col < (matrix ? 2 : 1); col++) {
      const value = object => matrix ? object[name][row][col] : object[name][row];
      const samples = TRAINING_INPUTS.map((x, i) => neuralBackward(net, x, TRAINING_LABELS[i]).gradient);
      close(value(mean), samples.reduce((sum, sample) => sum + value(sample), 0) / 4);
      close(value(next), value(net) - 0.1 * value(mean));
    }
  }
});

test('bounded histories are deterministic, independent snapshots; eta zero keeps every parameter', () => {
  assert.deepEqual(neuralTrainingHistory(0.1, 5), neuralTrainingHistory(0.1, 5));
  const zero = neuralTrainingHistory(0);
  zero.forEach(frame => { assert.deepEqual(frame.net, makeNeuralNetwork()); close(frame.loss, zero[0].loss); });
  assert.notEqual(zero[0].net, zero[1].net);
  const bounded = neuralTrainingHistory(0.2, MAX_TRAINING_STEPS);
  assert.equal(bounded.length, MAX_TRAINING_STEPS + 1);
  assert.ok(bounded.every(frame => Number.isFinite(frame.loss)));
  assert.throws(() => neuralTrainingHistory(0.1, 121), RangeError);
  assert.throws(() => neuralTrainingHistory(0.1, -1), RangeError);
  assert.throws(() => neuralTrainingHistory(0.1, 1.5), RangeError);
  for (const rate of [-0.1, 0.21, NaN, Infinity, '0.1']) assert.throws(() => neuralTrainingHistory(rate), RangeError);
});

test('stable loss and probabilities remain finite at allowed extremes; invalid inputs fail closed', () => {
  const net = makeNeuralNetwork();
  net.W2 = [[1e6, -1e6], [1e6, -1e6]];
  const f = neuralForward(net, [1e6, 1e6]);
  assert.ok(f.p.every(Number.isFinite));
  close(f.p[0] + f.p[1], 1);
  assert.ok(Number.isFinite(neuralSampleLoss(net, [1e6, 1e6], 1)));
  for (const input of [null, [], [1], [1, 2, 3], [NaN, 1], [Infinity, 0], ['1', 1], [1e7, 0]]) assert.throws(() => neuralForward(net, input), RangeError);
  assert.throws(() => neuralForward({ ...net, W1: [[1, 2], [3]] }, [1, 1]), RangeError);
  assert.throws(() => neuralBackward(net, [1, 1], 2), RangeError);
  assert.throws(() => neuralFiniteDifference(net, [1, 1], 0, 'W3', 0, 0), RangeError);
});

test('the ReLU zero-subgradient convention is explicit and the bend is detected for numerical checks', () => {
  assert.deepEqual(reluCalculation(-1.2), { input: -1.2, output: 0, slope: 0, atBend: false });
  assert.deepEqual(reluCalculation(0), { input: 0, output: 0, slope: 0, atBend: true });
  assert.equal(reluCalculation(0.8).slope, 1);
  const net = makeNeuralNetwork(); net.b1[0] = -1;
  const check = neuralFiniteDifference(net, [1, 1], 0, 'W1', 0, 0);
  assert.equal(check.analytic, 0);
  assert.equal(check.crossesBend, true);
  assert.throws(() => reluCalculation(NaN), RangeError);
});

test('the probability plane is bounded, deterministic and evaluates the actual selected network', () => {
  const net = makeNeuralNetwork(); const before = structuredClone(net);
  const grid = neuralProbabilityGrid(net);
  assert.equal(grid.nodes.length, MAX_GRID_SIZE);
  assert.equal(grid.nodes.flat().length, 625);
  assert.deepEqual(grid, neuralProbabilityGrid(net));
  assert.deepEqual(net, before);
  grid.nodes.flat().forEach(node => close(node.p0, neuralForward(net, [node.x, node.y]).p[0]));
  assert.ok(grid.contour.length > 0);
  assert.ok(grid.contour.flat(2).every(Number.isFinite));
  for (const size of [0, 1, 26, 500, 2.5, NaN]) assert.throws(() => neuralProbabilityGrid(net, size), RangeError);
  assert.throws(() => neuralProbabilityGrid(net, 25, Infinity), RangeError);
});
