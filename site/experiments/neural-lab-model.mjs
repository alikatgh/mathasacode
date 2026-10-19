// The exact two-input / two-hidden-unit network in docs/ml-deep-learning.md.
// All calculations are local, synchronous and bounded; an update returns new data.
export const TRAINING_INPUTS = Object.freeze([[1, 1], [1, -1], [-1, 1], [-1, -1]].map(Object.freeze));
export const TRAINING_LABELS = Object.freeze([0, 1, 1, 0]);
export const MAX_TRAINING_STEPS = 120;
export const MAX_GRID_SIZE = 25;

function bounded(value, min, max, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${name} must be a finite number between ${min} and ${max}.`);
  }
  return value;
}

function vector(values, name) {
  if (!Array.isArray(values) || values.length !== 2) throw new RangeError(`${name} must have two entries.`);
  return values.map(value => bounded(value, -1e6, 1e6, name));
}

function validNetwork(net) {
  if (!net || typeof net !== 'object') throw new RangeError('A network is required.');
  for (const name of ['W1', 'W2']) {
    if (!Array.isArray(net[name]) || net[name].length !== 2) throw new RangeError(`${name} must be 2 by 2.`);
    net[name].forEach(row => vector(row, name));
  }
  vector(net.b1, 'b1');
  vector(net.b2, 'b2');
  return net;
}

function labelIndex(label) {
  if (label !== 0 && label !== 1) throw new RangeError('The target label must be 0 or 1.');
  return label;
}

export function makeNeuralNetwork() {
  return { W1: [[0.5, -0.5], [0.5, -0.5]], b1: [-0.2, -0.2], W2: [[0.5, -0.5], [0.5, -0.5]], b2: [-0.1, 0.1] };
}

export function copyNeuralNetwork(net) {
  validNetwork(net);
  return { W1: net.W1.map(row => [...row]), b1: [...net.b1], W2: net.W2.map(row => [...row]), b2: [...net.b2] };
}

export function reluCalculation(value) {
  bounded(value, -1e6, 1e6, 'Preactivation');
  return { input: value, output: Math.max(0, value), slope: value > 0 ? 1 : 0, atBend: value === 0 };
}

export function neuralForward(net, input) {
  validNetwork(net);
  const x = vector(input, 'Input');
  const a = [0, 1].map(j => x.reduce((sum, value, d) => sum + value * net.W1[d][j], 0) + net.b1[j]);
  const h = a.map(value => Math.max(0, value));
  const z = [0, 1].map(k => h.reduce((sum, value, j) => sum + value * net.W2[j][k], 0) + net.b2[k]);
  const maximum = Math.max(...z);
  const e = z.map(value => Math.exp(value - maximum));
  const total = e[0] + e[1];
  return { x, a, h, z, p: e.map(value => value / total), maximum, logTotal: Math.log(total), prediction: z[0] >= z[1] ? 0 : 1 };
}

function lossFromForward(f, target) {
  return f.logTotal - (f.z[labelIndex(target)] - f.maximum);
}

export function neuralSampleLoss(net, input, target) {
  return lossFromForward(neuralForward(net, input), target);
}

function zeroGradients() {
  return { W1: [[0, 0], [0, 0]], b1: [0, 0], W2: [[0, 0], [0, 0]], b2: [0, 0] };
}

/** One example's loss sensitivities. These do not update any parameter. */
export function neuralBackward(net, input, target = 0) {
  labelIndex(target);
  const f = neuralForward(net, input);
  const dz = f.p.map((value, k) => value - (k === target ? 1 : 0));
  const dhContributions = [0, 1].map(j => dz.map((value, k) => net.W2[j][k] * value));
  const dh = dhContributions.map(row => row[0] + row[1]);
  const gates = f.a.map(value => value > 0 ? 1 : 0);
  const da = dh.map((value, j) => gates[j] ? value : 0);
  const gradient = {
    W1: f.x.map(value => da.map(sensitivity => value * sensitivity)), b1: [...da],
    W2: f.h.map(value => dz.map(sensitivity => value * sensitivity)), b2: [...dz],
  };
  return { ...f, target, loss: lossFromForward(f, target), dz, dhContributions, dh, gates, da, gradient };
}

export function neuralMeanLoss(net) {
  return TRAINING_INPUTS.reduce((sum, x, i) => sum + neuralSampleLoss(net, x, TRAINING_LABELS[i]), 0) / TRAINING_INPUTS.length;
}

export function neuralMeanGradients(net) {
  const gradient = zeroGradients();
  TRAINING_INPUTS.forEach((x, i) => {
    const single = neuralBackward(net, x, TRAINING_LABELS[i]).gradient;
    for (const name of ['W1', 'W2']) {
      for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) gradient[name][row][col] += single[name][row][col] / TRAINING_INPUTS.length;
    }
    for (const name of ['b1', 'b2']) for (let j = 0; j < 2; j++) gradient[name][j] += single[name][j] / TRAINING_INPUTS.length;
  });
  return gradient;
}

/** Compute all 12 gradients first, from the same old network, then subtract. */
export function neuralTrainStep(net, learningRate = 0.1) {
  bounded(learningRate, 0, 0.2, 'Learning rate');
  const next = copyNeuralNetwork(net);
  const gradient = neuralMeanGradients(net);
  for (const name of ['W1', 'W2']) {
    for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) next[name][row][col] -= learningRate * gradient[name][row][col];
  }
  for (const name of ['b1', 'b2']) for (let j = 0; j < 2; j++) next[name][j] -= learningRate * gradient[name][j];
  return { net: next, gradient };
}

export function neuralTrainingHistory(learningRate = 0.1, updates = MAX_TRAINING_STEPS) {
  bounded(learningRate, 0, 0.2, 'Learning rate');
  if (!Number.isInteger(updates) || updates < 0 || updates > MAX_TRAINING_STEPS) throw new RangeError(`Use 0 to ${MAX_TRAINING_STEPS} updates.`);
  const history = [];
  let net = makeNeuralNetwork();
  for (let epoch = 0; epoch <= updates; epoch++) {
    const predictions = TRAINING_INPUTS.map(input => neuralForward(net, input).prediction);
    history.push({ epoch, net, loss: neuralMeanLoss(net), predictions, correct: predictions.filter((label, i) => label === TRAINING_LABELS[i]).length });
    if (epoch < updates) net = neuralTrainStep(net, learningRate).net;
  }
  return history;
}

export function neuralFiniteDifference(net, input, target, name, row, col = 0, epsilon = 1e-5) {
  if (!['W1', 'W2', 'b1', 'b2'].includes(name) || !Number.isInteger(row) || row < 0 || row > 1 || !Number.isInteger(col) || col < 0 || col > 1) throw new RangeError('Invalid parameter index.');
  bounded(epsilon, 1e-8, 1e-2, 'Finite-difference step');
  const above = copyNeuralNetwork(net);
  const below = copyNeuralNetwork(net);
  const matrix = name.startsWith('W');
  if (matrix) { above[name][row][col] += epsilon; below[name][row][col] -= epsilon; }
  else { above[name][row] += epsilon; below[name][row] -= epsilon; }
  const numerical = (neuralSampleLoss(above, input, target) - neuralSampleLoss(below, input, target)) / (2 * epsilon);
  const backward = neuralBackward(net, input, target);
  const analytic = matrix ? backward.gradient[name][row][col] : backward.gradient[name][row];
  // A central difference can straddle a ReLU bend. It then is not a derivative.
  const aboveA = neuralForward(above, input).a;
  const belowA = neuralForward(below, input).a;
  const crossesBend = aboveA.some((value, j) => value !== belowA[j] && value * belowA[j] <= 0);
  return { analytic, numerical, error: Math.abs(numerical - analytic), epsilon, crossesBend };
}

/** A bounded grid, with the p(class 0)=0.5 contour linearly interpolated per cell. */
export function neuralProbabilityGrid(net, size = MAX_GRID_SIZE, extent = 1.6) {
  validNetwork(net);
  if (!Number.isInteger(size) || size < 2 || size > MAX_GRID_SIZE) throw new RangeError(`Grid size must be 2 to ${MAX_GRID_SIZE}.`);
  bounded(extent, 0.1, 4, 'Grid extent');
  const stride = extent * 2 / (size - 1);
  const nodes = Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, col) => {
    const x = -extent + col * stride;
    const y = extent - row * stride;
    const f = neuralForward(net, [x, y]);
    return { x, y, p0: f.p[0], gap: f.z[0] - f.z[1] };
  }));
  const contour = [];
  for (let row = 0; row < size - 1; row++) for (let col = 0; col < size - 1; col++) {
    const corners = [nodes[row][col], nodes[row][col + 1], nodes[row + 1][col + 1], nodes[row + 1][col]];
    const crossings = [];
    for (let edge = 0; edge < 4; edge++) {
      const a = corners[edge]; const b = corners[(edge + 1) % 4];
      if ((a.gap >= 0) !== (b.gap >= 0)) {
        const fraction = a.gap / (a.gap - b.gap);
        crossings.push([a.x + fraction * (b.x - a.x), a.y + fraction * (b.y - a.y)]);
      }
    }
    // This network produces at most two intersections in an ordinary grid cell.
    // Pair four intersections consistently if a caller supplies a saddle case.
    for (let i = 0; i + 1 < crossings.length; i += 2) contour.push([crossings[i], crossings[i + 1]]);
  }
  return { nodes, contour, size, extent, stride };
}
