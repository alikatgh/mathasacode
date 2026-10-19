const finite = (value, name) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new RangeError(`${name} must be finite.`);
  return value;
};

function bounded(value, min, max, name) {
  finite(value, name);
  if (value < min || value > max) throw new RangeError(`${name} must be between ${min} and ${max}.`);
  return value;
}

function vector2(values, name = 'weights') {
  if (!Array.isArray(values) || values.length !== 2) throw new RangeError(`${name} must contain two values.`);
  return values.map(value => bounded(value, -1e6, 1e6, name));
}

/** Expected natural frequencies; null means that conditioning has a zero denominator. */
export function bayesNaturalFrequencies(priorPercent = 1, sensitivity = 0.9, falsePositiveRate = 0.05, population = 10000) {
  const prior = bounded(priorPercent, 0, 100, 'Prior') / 100;
  bounded(sensitivity, 0, 1, 'Sensitivity');
  bounded(falsePositiveRate, 0, 1, 'False-positive rate');
  bounded(population, 1, 1e6, 'Population');
  const target = population * prior;
  const nonTarget = population - target;
  const trueSignals = target * sensitivity;
  const falseSignals = nonTarget * falsePositiveRate;
  const totalSignals = trueSignals + falseSignals;
  return { population, prior, sensitivity, falsePositiveRate, target, nonTarget, trueSignals, falseSignals, totalSignals, posterior: totalSignals === 0 ? null : trueSignals / totalSignals };
}

export function gradientLoss(weights) {
  const [w0, w1] = vector2(weights);
  return ((w0 - 2) ** 2 + (w1 - 4) ** 2) / 4;
}

export function gradientAt(weights) {
  const [w0, w1] = vector2(weights);
  return [(w0 - 2) / 2, (w1 - 4) / 2];
}

/** All coordinates use the same old weights, so this is a simultaneous update. */
export function gradientCandidate(weights, learningRate = 0.5) {
  const current = vector2(weights);
  bounded(learningRate, 0, 3.5, 'Learning rate');
  const gradient = gradientAt(current);
  const delta = gradient.map(value => -learningRate * value);
  const next = current.map((value, index) => value + delta[index]);
  return { weights: next, gradient, delta, loss: gradientLoss(next) };
}

export const MAX_GRADIENT_UPDATES = 20;

export function createGradientRun() {
  return { weights: [0, 0], trail: [[0, 0]], updates: 0 };
}

export function advanceGradientRun(run, learningRate) {
  if (!run || !Number.isInteger(run.updates) || run.updates < 0 || run.updates > MAX_GRADIENT_UPDATES || !Array.isArray(run.trail) || run.trail.length !== run.updates + 1) {
    throw new RangeError('Invalid gradient run.');
  }
  vector2(run.weights);
  run.trail.forEach(point => vector2(point));
  bounded(learningRate, 0, 3.5, 'Learning rate');
  if (run.updates === MAX_GRADIENT_UPDATES || learningRate === 0 || gradientLoss(run.weights) < 1e-12) return run;
  const candidate = gradientCandidate(run.weights, learningRate);
  return { weights: candidate.weights, trail: [...run.trail, candidate.weights], updates: run.updates + 1 };
}

export function weightedSumCalculation(inputs = [1, 1]) {
  if (!Array.isArray(inputs) || inputs.length !== 2) throw new RangeError('Two inputs are required.');
  const x = inputs.map(value => bounded(value, -2, 2, 'Input'));
  const weights = [[0.5, -0.5], [0.5, -0.5]];
  const biases = [-0.2, -0.2];
  const contributions = [0, 1].map(unit => x.map((value, input) => value * weights[input][unit]));
  const sums = contributions.map(values => values[0] + values[1]);
  const activations = sums.map((value, unit) => value + biases[unit]);
  return { inputs: x, weights, biases, contributions, sums, activations };
}

export function stableSoftmax(logits) {
  if (!Array.isArray(logits) || logits.length < 1 || logits.length > 32) throw new RangeError('Use between 1 and 32 logits.');
  logits.forEach(value => finite(value, 'Logit'));
  const maximum = Math.max(...logits);
  const exponentials = logits.map(value => Math.exp(value - maximum));
  const denominator = exponentials.reduce((total, value) => total + value, 0);
  return exponentials.map(value => value / denominator);
}

export function softmaxCalculation(gap = 0.6) {
  bounded(gap, -6, 6, 'Score gap');
  const logits = [gap / 2, -gap / 2];
  const maximum = Math.max(...logits);
  const shifted = logits.map(value => value - maximum);
  const exponentials = shifted.map(value => Math.exp(value));
  const denominator = exponentials[0] + exponentials[1];
  const probabilities = stableSoftmax(logits);
  return { gap, logits, maximum, shifted, exponentials, denominator, probabilities, total: probabilities[0] + probabilities[1] };
}
