import assert from 'node:assert/strict';

// Independently worked small examples. All four languages print the same values.
export const mathOutputs = [
  'power = 8.000000\nlogarithm = 3.000000',
  'sine = 0.500000\ncosine = 0.866025',
  'remainder = 2',
  'n_factorial = 120\nzero_factorial = 1\ncombinations = 10',
  'probability = 0.500000',
  'expected = 2.500000',
  'variance = 5.000000\nstandard_deviation = 2.236068',
  'evidence = 0.058500\nposterior = 0.153846',
  'covariance = 1.000000\ncorrelation = 0.981981',
  'entropy_bits = 1.500000',
];

export const mlOutputs = [
  'sample_loss 0.437488',
  'examples 4\nfeatures 2\nx0 1.000000 1.000000\ny0 0',
  'a 0.800000 -1.200000',
  'h 0.800000 0.000000',
  'scores 0.300000 -0.300000',
  'p 0.645656 0.354344\nsum 1.000000',
  'p_true 0.645656\nsample_loss 0.437488\nmean_loss 0.517813',
  'dz -0.354344 0.354344\nda -0.354344 0.000000\ndW2_00 -0.283475\ndW1_00 -0.354344',
  'gradient -0.283475\ndelta 0.028347\nweight_after 0.528347\nsample_loss_before 0.437488\nsample_loss_after 0.429511',
  'initial_loss 0.517813\nfinal_loss 0.098281\npredictions 0 1 1 0\ntraining_correct 4/4',
];

export function expandedMathIndex(id) {
  const [, guide, number] = /^(en|py|zh)-(\d+)$/.exec(id) || [];
  const index = Number(number) - ({ en: 62, py: 64, zh: 63 }[guide] ?? Infinity);
  return index >= 0 && index < mathOutputs.length ? index : -1;
}

export function assertExpandedOutput(id, output) {
  const index = expandedMathIndex(id);
  if (index >= 0) assert.equal(output.trim(), mathOutputs[index], id);
  if (id.startsWith('ml-')) {
    const expected = mlOutputs[Number(id.slice(3)) - 1];
    assert.ok(expected, `${id} needs an independently checked result`);
    assert.equal(output.trim(), expected, id);
  }
}
