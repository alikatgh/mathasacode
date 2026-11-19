// Worked details for probability, statistics, and machine-learning notation.
// Every example is independent and prints one deterministic JSON result.
export const statisticsDetails = {
  'event-probability': {
    readAs: 'P of A; omega is the sample space.',
    intuition: 'Think of a fair die: an event is a collection of faces you would count as a success. The sample space contains all possible outcomes, and an event contains some of them. Its probability is the sum of their probabilities; counting faces works here because each face is equally likely.',
    steps: [
      'List the six equally likely outcomes: 1, 2, 3, 4, 5, 6.',
      'Let A mean an even result, so A contains 2, 4, and 6.',
      'Divide the 3 outcomes in A by the 6 outcomes in the sample space.',
      'P(A) = 3 / 6 = 0.5.',
    ],
    example: {
      title: 'An even result on a fair die',
      code: `const outcomes = [1, 2, 3, 4, 5, 6];
const event = outcomes.filter(face => face % 2 === 0);
const favourable = event.length;
const total = outcomes.length;
// Counting is valid because these six outcomes are equally likely.
const probability = favourable / total;
console.log(JSON.stringify({ event, probability }));`,
      output: '{"event":[2,4,6],"probability":0.5}',
      notes: [
        'filter keeps precisely the die faces satisfying the event condition.',
        'favourable / total gives 3 / 6; a weighted die would require adding its face probabilities instead.',
      ],
    },
    pitfalls: [
      'Do not use event size divided by sample-space size when outcomes have different probabilities.',
      'A probability of 0.5 does not guarantee exactly three successes in the next six rolls.',
    ],
    related: ['conditional-probability', 'expected-value', 'set-membership'],
    diagram: {
      nodes: ['Fair die: 1, 2, 3, 4, 5, 6', 'Keep even faces: 2, 4, 6', 'Count: 3 of 6', 'P(even) = 0.5'],
      caption: 'The event selects three of the six equally likely faces.',
    },
  },
  'expected-value': {
    readAs: 'The expected value of X.',
    intuition: 'Imagine averaging the payouts from many repetitions of the same prize draw. Expectation weights each payout by its probability. It describes the distribution’s average, and need not be a payout available on a single draw.',
    steps: [
      'The payout is 0 with probability 0.75, or 10 with probability 0.25.',
      'Check that the probabilities add to 1.',
      'Multiply each value by its probability: 0 × 0.75 = 0 and 10 × 0.25 = 2.5.',
      'Add the contributions to get E[X] = 2.5.',
    ],
    example: {
      title: 'Average payout of a prize draw',
      code: `const payouts = [0, 10];
const probabilities = [0.75, 0.25];
const probabilityTotal = probabilities.reduce((sum, p) => sum + p, 0);
// Each payout contributes its value multiplied by its probability.
const contributions = payouts.map((value, i) => value * probabilities[i]);
const expected = contributions.reduce((sum, value) => sum + value, 0);
console.log(JSON.stringify({ probabilityTotal, contributions, expected }));`,
      output: '{"probabilityTotal":1,"contributions":[0,2.5],"expected":2.5}',
      notes: [
        'payouts[i] and probabilities[i] describe the same possible outcome.',
        'map computes the two weighted contributions; reduce adds them into the expected payout.',
      ],
    },
    pitfalls: [
      'An expected payout of 2.5 does not mean a single draw can pay 2.5.',
      'Probabilities must be nonnegative and sum to 1; arbitrary weights need normalization first.',
    ],
    related: ['event-probability', 'arithmetic-mean', 'population-variance'],
    diagram: {
      nodes: ['Payouts: 0 and 10', 'Probabilities: 0.75 and 0.25', 'Weighted payouts: 0 and 2.5', 'E[X] = 2.5'],
      caption: 'The less frequent payout contributes 10 × 0.25, rather than 10, to the average.',
    },
  },
  'population-variance': {
    readAs: 'Sigma squared; the variance of X.',
    intuition: 'Think of measuring how far every score in a whole class sits from the class average. Population variance averages the squared distances from the population mean. Squaring prevents positive and negative deviations from cancelling and gives the result squared units.',
    steps: [
      'Treat 2, 4, 6, and 8 as the complete population, with mean 5.',
      'Subtract 5 to get deviations −3, −1, 1, and 3.',
      'Square them to get 9, 1, 1, and 9, with total 20.',
      'Divide by all 4 population members: σ² = 20 / 4 = 5.',
    ],
    example: {
      title: 'Spread of a complete four-value population',
      code: `const population = [2, 4, 6, 8];
const count = population.length;
const mean = population.reduce((sum, value) => sum + value, 0) / count;
const squaredDistances = population.map(value => (value - mean) ** 2);
const sumSquares = squaredDistances.reduce((sum, value) => sum + value, 0);
// This array is the whole equally weighted population, so divide by n.
const variance = sumSquares / count;
console.log(JSON.stringify({ mean, squaredDistances, variance }));`,
      output: '{"mean":5,"squaredDistances":[9,1,1,9],"variance":5}',
      notes: [
        'mean is computed from the same population whose spread we measure.',
        'The squaredDistances array retains one squared deviation per population member.',
        'sumSquares / count uses n, not the n − 1 correction used for the usual sample estimate.',
      ],
    },
    pitfalls: [
      'Do not divide by n − 1 when the goal is the variance of this complete finite population.',
      'Variance has squared units; it is not the average absolute distance from the mean.',
    ],
    related: ['sample-variance', 'standard-deviation', 'expected-value'],
    diagram: {
      nodes: ['Population: 2, 4, 6, 8; μ = 5', 'Squared distances: 9, 1, 1, 9', 'Sum 20; divide by 4', 'Population variance = 5'],
      caption: 'All four population members contribute to the mean squared distance.',
    },
  },
  'sample-variance': {
    readAs: 'S squared; the sample variance.',
    intuition: 'A few measurements are like a small scoop used to learn about a larger batch. The usual sample variance estimates population variance from independent observations drawn from the same distribution. Because the sample mean is estimated from those observations, the unbiased variance estimate divides squared deviations by n − 1.',
    steps: [
      'Take the sample 2, 4, 6, and 8, whose sample mean is 5.',
      'The squared deviations are 9, 1, 1, and 9, adding to 20.',
      'There are n = 4 observations, so n − 1 = 3.',
      'The sample variance is 20 / 3, approximately 6.666667.',
    ],
    example: {
      title: 'Estimate variance from four observations',
      code: `const sample = [2, 4, 6, 8];
const n = sample.length;
const mean = sample.reduce((sum, value) => sum + value, 0) / n;
const sumSquares = sample.reduce((sum, value) => sum + (value - mean) ** 2, 0);
// The usual unbiased estimate requires n > 1 and divides by n - 1.
const sampleVariance = sumSquares / (n - 1);
const rounded = Number(sampleVariance.toFixed(6));
console.log(JSON.stringify({ mean, sumSquares, sampleVariance: rounded }));`,
      output: '{"mean":5,"sumSquares":20,"sampleVariance":6.666667}',
      notes: [
        'mean uses the sample itself, rather than a separately known population mean.',
        'The denominator n − 1 supplies the usual correction for estimating that mean.',
        'toFixed rounds only the displayed result; it does not change the variance calculation.',
      ],
    },
    pitfalls: [
      'With only one observation, n − 1 is zero and this sample variance is undefined.',
      'The unbiased-estimate claim assumes independent, identically distributed observations with finite variance; it does not make every individual estimate exact.',
    ],
    related: ['population-variance', 'standard-deviation', 'arithmetic-mean'],
    diagram: {
      nodes: ['Sample: 2, 4, 6, 8; mean = 5', 'Squared distances total 20', 'Divide by n − 1 = 3', 's² ≈ 6.666667'],
      caption: 'The same four numbers give a different denominator when estimating a larger population’s variance.',
    },
  },
  'standard-deviation': {
    readAs: 'Sigma; the population standard deviation.',
    intuition: 'If variance describes spread in squared metres, standard deviation brings the scale back to metres. It is the nonnegative square root of variance. Here the four values form a complete population, so we first use population variance.',
    steps: [
      'The population 2, 4, 6, and 8 has mean 5.',
      'Its squared deviations add to 20.',
      'Divide by 4 to obtain population variance 5.',
      'Take the square root: σ = √5, approximately 2.236068 in the original units.',
    ],
    example: {
      title: 'Return a spread measure to the original units',
      code: `const population = [2, 4, 6, 8];
const n = population.length;
const mean = population.reduce((sum, value) => sum + value, 0) / n;
const variance = population.reduce((sum, value) => sum + (value - mean) ** 2, 0) / n;
// Square root changes squared units back to the original units.
const standardDeviation = Math.sqrt(variance);
const rounded = Number(standardDeviation.toFixed(6));
console.log(JSON.stringify({ variance, standardDeviation: rounded }));`,
      output: '{"variance":5,"standardDeviation":2.236068}',
      notes: [
        'The variance line divides by n because population contains every member being described.',
        'Math.sqrt returns the nonnegative root; the final rounding is only for display.',
      ],
    },
    pitfalls: [
      'Standard deviation is not the mean absolute deviation; taking a square root happens after averaging squared distances.',
      'Use a variance formula matching the question: population variance and the usual sample variance have different denominators.',
    ],
    related: ['population-variance', 'sample-variance', 'square-root'],
    diagram: {
      nodes: ['Values: 2, 4, 6, 8; mean = 5', 'Squared distances total 20', 'Variance: 20 / 4 = 5', 'σ = √5 ≈ 2.236068'],
      caption: 'The last square root restores the units of the original measurements.',
    },
  },
  'conditional-probability': {
    readAs: 'The probability of A given B.',
    intuition: 'Conditioning is like narrowing a die roll to a smaller set of possible faces after receiving a clue. P(A given B) asks how much probability A occupies within B. It equals P(A and B) divided by P(B), provided P(B) is positive; it does not assume A and B are independent.',
    steps: [
      'Roll a fair die and let B mean a face greater than 3.',
      'Knowing B leaves the equally likely faces 4, 5, and 6.',
      'Let A mean even: within B, the matching faces are 4 and 6.',
      'Divide 2 matching faces by 3 remaining faces: P(A given B) = 2 / 3.',
    ],
    example: {
      title: 'An even roll, given that it exceeds three',
      code: `const outcomes = [1, 2, 3, 4, 5, 6];
const given = outcomes.filter(face => face > 3);
const both = given.filter(face => face % 2 === 0);
// Each remaining face has equal conditional probability for this fair die.
const probabilityB = given.length / outcomes.length;
const jointProbability = both.length / outcomes.length;
const conditional = jointProbability / probabilityB;
const rounded = Number(conditional.toFixed(6));
console.log(JSON.stringify({ given, both, conditional: rounded }));`,
      output: '{"given":[4,5,6],"both":[4,6],"conditional":0.666667}',
      notes: [
        'given restricts the sample space before both tests the event A inside it.',
        'jointProbability / probabilityB is (2 / 6) / (3 / 6), which equals 2 / 3.',
      ],
    },
    pitfalls: [
      'P(A given B) and P(B given A) generally differ; the event after the bar sets the denominator.',
      'This ratio is undefined when P(B) = 0, and conditioning does not automatically leave P(A) unchanged.',
    ],
    related: ['event-probability', 'bayes-theorem', 'intersection'],
    diagram: {
      nodes: ['Fair die: 1, 2, 3, 4, 5, 6', 'Given > 3: 4, 5, 6', 'Even among those: 4, 6', 'P(even | > 3) = 2 / 3'],
      caption: 'The clue changes the denominator from six possible faces to three.',
    },
  },
  'bayes-theorem': {
    readAs: 'P of A given B equals P of B given A, times P of A, divided by P of B.',
    intuition: 'A spam flag is a clue, rather than proof that a message is spam. Bayes’ theorem combines how common spam is with how often the filter flags each kind of message. It reverses the conditional by dividing the joint probability by the total probability of a flag.',
    steps: [
      'In a model of 10,000 messages, 1% are spam: 100 spam and 9,900 other messages.',
      'A 90% hit rate flags 90 spam messages.',
      'A 5% false-alarm rate flags 495 other messages.',
      'Of the 585 flagged messages, 90 are spam: 90 / 585 ≈ 0.153846.',
    ],
    example: {
      title: 'Reverse a spam filter’s conditional probability',
      code: `const messages = 10000, spamRate = 0.01;
const hitRate = 0.9, falseAlarmRate = 0.05;
// These are the model's expected counts in 10,000 messages.
const spamAndFlag = messages * spamRate * hitRate;
const otherAndFlag = messages * (1 - spamRate) * falseAlarmRate;
const allFlagged = spamAndFlag + otherAndFlag;
const spamGivenFlag = spamAndFlag / allFlagged;
const rounded = Number(spamGivenFlag.toFixed(6));
console.log(JSON.stringify({ spamAndFlag, otherAndFlag, spamGivenFlag: rounded }));`,
      output: '{"spamAndFlag":90,"otherAndFlag":495,"spamGivenFlag":0.153846}',
      notes: [
        'spamAndFlag combines the prior spam rate with the filter’s hit rate.',
        'otherAndFlag includes the much larger non-spam group; both kinds contribute to allFlagged.',
        'Dividing by allFlagged reverses the question from “flagged given spam” to “spam given flagged.”',
      ],
    },
    pitfalls: [
      'A 90% hit rate means P(flag given spam), rather than a 90% probability of spam given a flag.',
      'Include every route to the evidence in the denominator, and require its total probability to be positive.',
    ],
    related: ['conditional-probability', 'event-probability', 'expected-value'],
    diagram: {
      nodes: ['10,000 messages: 100 are spam', 'Spam flags: 90; other flags: 495', 'Total flags: 90 + 495 = 585', 'P(spam | flag) ≈ 0.153846'],
      caption: 'Expected flagged counts make the prior and both routes to a flag visible.',
    },
  },
  covariance: {
    readAs: 'The covariance of X and Y.',
    intuition: 'Picture two runners speeding up and slowing down together. Covariance checks whether paired measurements tend to sit on the same side of their respective means. This population version averages products of deviations, with units equal to the product of the two measurement units.',
    steps: [
      'Pair x = [1, 2, 3] with y = [2, 4, 6], whose means are 2 and 4.',
      'The x deviations are −1, 0, 1, and the y deviations are −2, 0, 2.',
      'Multiply within each pair to obtain 2, 0, and 2.',
      'Divide their sum 4 by the 3 population pairs: covariance = 4 / 3.',
    ],
    example: {
      title: 'Measure paired population co-movement',
      code: `const x = [1, 2, 3], y = [2, 4, 6];
const n = x.length;
const meanX = x.reduce((sum, value) => sum + value, 0) / n;
const meanY = y.reduce((sum, value) => sum + value, 0) / n;
const pairedProducts = x.map((value, i) => (value - meanX) * (y[i] - meanY));
// Preserve the pairing; use n for this complete population.
const populationCovariance = pairedProducts.reduce((sum, value) => sum + value, 0) / n;
const rounded = Number(populationCovariance.toFixed(6));
console.log(JSON.stringify({ pairedProducts, populationCovariance: rounded }));`,
      output: '{"pairedProducts":[2,0,2],"populationCovariance":1.333333}',
      notes: [
        'meanX and meanY center each variable on its own mean.',
        'x.map uses y[i] to keep corresponding observations together.',
        'Dividing by n gives population covariance; the usual sample estimator would divide the same sum by n − 1.',
      ],
    },
    pitfalls: [
      'Reordering one array alone changes which observations are paired and can change the answer.',
      'Covariance depends on units, and a value of zero does not establish independence.',
    ],
    related: ['correlation', 'population-variance', 'sample-variance'],
    diagram: {
      nodes: ['x: 1, 2, 3; y: 2, 4, 6', 'Means: 2 and 4', 'Deviation products: 2, 0, 2', 'Cov = 4 / 3 ≈ 1.333333'],
      caption: 'Both nonzero pairs lie on matching sides of their means, giving positive products.',
    },
  },
  correlation: {
    readAs: 'Rho; the Pearson correlation of X and Y.',
    intuition: 'Think of comparing two patterns after removing their different units and scales. Pearson correlation divides covariance by both standard deviations to measure linear association. It lies between −1 and 1 when both spreads are nonzero; it does not establish causation.',
    steps: [
      'For x = [1, 2, 3] and y = [2, 4, 6], subtract means 2 and 4.',
      'Compute population covariance 4 / 3.',
      'Compute population variances 2 / 3 and 8 / 3.',
      'Their standard-deviation product is √((2 / 3)(8 / 3)) = 4 / 3.',
      'Divide covariance by that product: ρ = 1, a perfect positive linear association.',
    ],
    example: {
      title: 'Normalize covariance into Pearson correlation',
      code: `const x = [1, 2, 3], y = [2, 4, 6], n = x.length;
const meanX = x.reduce((sum, value) => sum + value, 0) / n;
const meanY = y.reduce((sum, value) => sum + value, 0) / n;
const dx = x.map(value => value - meanX);
const dy = y.map(value => value - meanY);
const covariance = dx.reduce((sum, value, i) => sum + value * dy[i], 0) / n;
const varianceX = dx.reduce((sum, value) => sum + value ** 2, 0) / n;
const varianceY = dy.reduce((sum, value) => sum + value ** 2, 0) / n;
// Use the same population denominator for all three quantities.
const correlation = covariance / Math.sqrt(varianceX * varianceY);
console.log(JSON.stringify({ covariance: Number(covariance.toFixed(6)), correlation }));`,
      output: '{"covariance":1.333333,"correlation":1}',
      notes: [
        'dx and dy contain centered observations, so the covariance and variance lines use matching pairs and means.',
        'Math.sqrt(varianceX * varianceY) equals the product of the two standard deviations.',
        'Because y is exactly twice x, the normalized linear association is 1.',
      ],
    },
    pitfalls: [
      'A constant variable has zero standard deviation, so Pearson correlation with it is undefined.',
      'Zero correlation can hide a nonlinear relationship, and nonzero correlation does not prove a causal link.',
    ],
    related: ['covariance', 'standard-deviation', 'population-variance'],
    diagram: {
      nodes: ['Pairs: (1,2), (2,4), (3,6)', 'Population covariance = 4 / 3', 'σx × σy = 4 / 3', 'ρ = (4 / 3) / (4 / 3) = 1'],
      caption: 'Normalizing removes the scale difference between x and y.',
    },
  },
  entropy: {
    readAs: 'H base two equals minus the sum of p sub i times log base two of p sub i.',
    intuition: 'A fair coin needs one bit to distinguish its two equally likely outcomes. Shannon entropy averages the information −log₂ p of each outcome using its probability. Base-two logarithms measure this average in bits, and a zero-probability outcome contributes zero.',
    steps: [
      'Use outcome probabilities 0.5, 0.25, 0.25, and 0; they sum to 1.',
      'The first outcome contributes −0.5 × log₂(0.5) = 0.5 bits.',
      'Each 0.25 outcome also contributes 0.5 bits; the zero-probability outcome contributes 0.',
      'Add the weighted contributions: H₂ = 0.5 + 0.5 + 0.5 = 1.5 bits.',
    ],
    example: {
      title: 'Average information in bits',
      code: `const probabilities = [0.5, 0.25, 0.25, 0];
// Define the zero-probability term by its limiting value, zero.
const contribution = p => p === 0 ? 0 : -p * Math.log2(p);
const terms = probabilities.map(contribution);
const bits = terms.reduce((sum, term) => sum + term, 0);
console.log(JSON.stringify({ terms, bits }));`,
      output: '{"terms":[0.5,0.5,0.5,0],"bits":1.5}',
      notes: [
        'Math.log2 selects bits as the information unit.',
        'The explicit p === 0 branch avoids evaluating 0 × log₂(0), which would produce NaN in JavaScript.',
        'terms contains probability-weighted information, rather than the surprise of each outcome alone.',
      ],
    },
    pitfalls: [
      'Using Math.log instead gives nats, so the numerical result and unit change.',
      'Entropy needs a valid probability distribution; negative values or probabilities that do not sum to 1 are invalid inputs.',
    ],
    related: ['expected-value', 'logarithm-exponential', 'ml-cross-entropy'],
    diagram: {
      nodes: ['p: 0.5, 0.25, 0.25, 0', 'Use −p × log₂(p); zero → 0', 'Terms: 0.5, 0.5, 0.5, 0', 'Entropy = 1.5 bits'],
      caption: 'Three weighted information contributions add to 1.5 bits.',
    },
  },
  'ml-data': {
    readAs: 'Capital X; x sub i; y sub i; capital N.',
    intuition: 'Think of a table where each row is one example and a matching list holds its answer. X stores the feature rows, xᵢ selects one row, and yᵢ selects that row’s label. N counts examples, while the row width counts features; these examples use zero-based indexing.',
    steps: [
      'Store two feature rows: [1, 1] and [1, −1].',
      'Keep labels [0, 1] in the same row order.',
      'Count N = 2 examples and D = 2 features per example.',
      'Choose i = 1 to retrieve the second row [1, −1] and its class label 1.',
    ],
    example: {
      title: 'Keep an input row aligned with its label',
      code: `const X = [[1, 1], [1, -1]];
const y = [0, 1];
const N = X.length;
const D = X[0].length;
// Zero-based index 1 selects the second example in both arrays.
const i = 1;
const example = { features: X[i], label: y[i] };
console.log(JSON.stringify({ N, D, example }));`,
      output: '{"N":2,"D":2,"example":{"features":[1,-1],"label":1}}',
      notes: [
        'X.length counts rows; X[0].length counts feature columns in this rectangular dataset.',
        'Using the same index i for X and y preserves the input–answer pairing.',
      ],
    },
    pitfalls: [
      'Shuffling feature rows without shuffling labels identically assigns the wrong answers to examples.',
      'N counts examples, not features; every row must have the feature shape expected by the model.',
    ],
    related: ['matrix-shape', 'vector-component', 'ml-indicator-one-hot'],
    diagram: {
      nodes: ['X: [[1,1], [1,−1]]', 'Labels: [0,1]; N=2, D=2', 'Select row index i = 1', 'Features [1,−1]; label 1'],
      caption: 'The same row index retrieves both an example and its correct class.',
    },
  },
  'ml-weights-bias': {
    readAs: 'Capital W; b; x times W plus b.',
    intuition: 'Weights act like volume knobs for individual inputs, while a bias shifts the combined result. An affine layer multiplies each feature by its connection weight, sums the contributions for each output, then adds that output’s bias. Here W[d][j] connects input feature d to output unit j.',
    steps: [
      'Use input x = [1, 1] and two output units.',
      'For the first unit, 1 × 0.5 + 1 × 0.5 = 1.',
      'For the second unit, 1 × (−0.5) + 1 × (−0.5) = −1.',
      'Add bias −0.2 once to each unit to obtain [0.8, −1.2].',
    ],
    example: {
      title: 'Compute two weighted sums and their biases',
      code: `const x = [1, 1];
const W = [[0.5, -0.5], [0.5, -0.5]];
const b = [-0.2, -0.2];
// Column j holds all connections feeding output unit j.
const weightedSums = b.map((_, j) => x.reduce((sum, value, d) => sum + value * W[d][j], 0));
const scores = weightedSums.map((sum, j) => sum + b[j]);
console.log(JSON.stringify({ weightedSums, scores }));`,
      output: '{"weightedSums":[1,-1],"scores":[0.8,-1.2]}',
      notes: [
        'The outer map visits output units, while reduce adds the contributions of input features.',
        'W[d][j] follows the row-vector xW convention used here; other libraries may store the transpose.',
        'The scores line adds each bias once after its weighted sum.',
      ],
    },
    pitfalls: [
      'Check the weight-matrix orientation instead of assuming every framework uses W[d][j].',
      'Adding the bias inside the feature sum would add it multiple times.',
    ],
    related: ['dot-product', 'matrix-product', 'ml-parameters'],
    diagram: {
      nodes: ['Input x = [1,1]', 'Weighted sums = [1,−1]', 'Add biases [−0.2,−0.2]', 'Scores = [0.8,−1.2]'],
      caption: 'Each output gets its own dot product and one bias addition.',
    },
  },
  'ml-parameters': {
    readAs: 'Theta; the collection of trainable parameters.',
    intuition: 'Think of theta as a toolbox holding every adjustable knob in a model. It is a collective name for trainable weights and biases, rather than necessarily one number. Training changes these values while the model’s chosen structure determines how many there are.',
    steps: [
      'Put the two-by-two weight matrix and two biases inside theta.',
      'Count the 4 individual weights in the matrix.',
      'Count the 2 bias values.',
      'Add them to obtain 6 trainable scalar parameters.',
    ],
    example: {
      title: 'Count the adjustable values in a layer',
      code: `const theta = { W: [[0.5, -0.5], [0.5, -0.5]], b: [-0.2, -0.2] };
const weights = theta.W.flat();
const biases = theta.b;
// Count individual scalar values, rather than array containers.
const weightCount = weights.length;
const biasCount = biases.length;
const total = weightCount + biasCount;
console.log(JSON.stringify({ weightCount, biasCount, total }));`,
      output: '{"weightCount":4,"biasCount":2,"total":6}',
      notes: [
        'flat turns this two-dimensional weight matrix into its four scalar entries for counting.',
        'theta groups W and b, but they retain different shapes and roles in the layer.',
      ],
    },
    pitfalls: [
      'Theta can denote an entire collection; treating it as one scalar loses parameter shapes.',
      'Training examples, class labels, and the learning rate are not trainable weights or biases in this model.',
    ],
    related: ['ml-weights-bias', 'ml-learning-update', 'ml-backpropagation'],
    diagram: {
      nodes: ['θ contains W and b', 'W: 2 × 2 = 4 scalar weights', 'b: 2 scalar biases', 'Total trainable values: 6'],
      caption: 'Count each adjustable scalar, rather than the two containers holding them.',
    },
  },
  'ml-learning-update': {
    readAs: 'Eta; theta is updated to theta minus eta times the gradient of L with respect to theta.',
    intuition: 'Walking downhill uses the local slope to choose a direction and a step size. The gradient points toward the steepest local increase in loss, so gradient descent subtracts it. Eta scales the step; all gradient components must be evaluated at the same old parameter values.',
    steps: [
      'Start at theta = [0, 0] with target [1, 2] and loss equal to half the sum of squared errors.',
      'The initial loss is (1² + 2²) / 2 = 2.5.',
      'Differentiate this loss to get gradient theta − target = [−1, −2].',
      'With eta = 0.5, subtract 0.5 times that gradient to get [0.5, 1].',
      'The new loss is (0.5² + 1²) / 2 = 0.625.',
    ],
    example: {
      title: 'Take one gradient-descent step on a quadratic loss',
      code: `const theta = [0, 0], target = [1, 2], eta = 0.5;
const loss = parameters => parameters.reduce((sum, value, i) => sum + (value - target[i]) ** 2 / 2, 0);
const gradient = theta.map((value, i) => value - target[i]);
const before = loss(theta);
// Every component uses the gradient at the same original theta.
const updated = theta.map((value, i) => value - eta * gradient[i]);
const after = loss(updated);
console.log(JSON.stringify({ gradient, updated, before, after }));`,
      output: '{"gradient":[-1,-2],"updated":[0.5,1],"before":2.5,"after":0.625}',
      notes: [
        'For this half-squared-error loss, each partial derivative is value − target[i].',
        'Subtracting a negative gradient component increases that parameter toward its target.',
        'updated is a new array, so no parameter is changed while other gradient components are being calculated.',
      ],
    },
    pitfalls: [
      'The gradient is an increase direction; adding it generally moves uphill, while an overly large subtraction step can also increase loss.',
      'Recomputing some gradient components after partially updating parameters changes this simultaneous gradient-descent step.',
    ],
    related: ['ml-parameters', 'gradient', 'ml-backpropagation'],
    diagram: {
      nodes: ['θ=[0,0]; loss=2.5', 'Gradient=[−1,−2]', 'Subtract 0.5 × gradient', 'θ=[0.5,1]; loss=0.625'],
      caption: 'A negative gradient produces a positive parameter change when it is subtracted.',
    },
  },
  'ml-relu': {
    readAs: 'ReLU of a; the maximum of zero and a.',
    intuition: 'A one-way gate passes positive values and stops negative ones at zero. ReLU applies max(0, a) to each input, creating a nonlinear bend. Its ordinary derivative is undefined at zero; this example chooses the common subgradient convention of zero there.',
    steps: [
      'Start with activations 0.8, −1.2, and 0.',
      'Keep 0.8 because it is positive; replace −1.2 with 0.',
      'The input 0 also produces output 0.',
      'The local slopes are 1 for 0.8, 0 for −1.2, and the chosen subgradient 0 at the bend.',
    ],
    example: {
      title: 'Apply ReLU and state the convention at zero',
      code: `const inputs = [0.8, -1.2, 0];
const relu = value => Math.max(0, value);
// At zero this is a chosen subgradient, not an ordinary derivative.
const chosenSlope = value => value > 0 ? 1 : 0;
const outputs = inputs.map(relu);
const chosenSlopes = inputs.map(chosenSlope);
console.log(JSON.stringify({ outputs, chosenSlopes }));`,
      output: '{"outputs":[0.8,0,0],"chosenSlopes":[1,0,0]}',
      notes: [
        'Math.max preserves positive values exactly and clamps negative inputs to zero.',
        'value > 0 deliberately excludes zero, implementing the stated subgradient convention.',
      ],
    },
    pitfalls: [
      'ReLU has no ordinary derivative at zero; choosing 0 there is a convention used for training.',
      'ReLU does not cap positive outputs at 1 and does not turn values into probabilities.',
    ],
    related: ['function-composition', 'ml-weights-bias', 'ml-backpropagation'],
    diagram: {
      nodes: ['Inputs: [0.8,−1.2,0]', 'Apply max(0, value)', 'Outputs: [0.8,0,0]', 'Chosen slopes: [1,0,0]'],
      caption: 'The negative input is blocked; the slope displayed at zero is an explicit choice.',
    },
  },
  'function-composition': {
    readAs: 'g composed with f, applied to x.',
    intuition: 'An assembly line feeds one machine’s output into the next machine. Function composition does the same: g composed with f applies f first and then g. Swapping the machines can change the result.',
    steps: [
      'Choose f(x) = 2x − 3 and g(x) = max(0, x).',
      'Start with x = 1 and apply f to obtain −1.',
      'Feed −1 into g to obtain 0, so (g ∘ f)(1) = 0.',
      'Reversing the order gives f(g(1)) = f(1) = −1.',
    ],
    example: {
      title: 'Follow the order of two composed functions',
      code: `const f = x => 2 * x - 3;
const g = x => Math.max(0, x);
const x = 1;
// The function nearest x runs first in g(f(x)).
const afterF = f(x);
const composed = g(afterF);
const reversed = f(g(x));
console.log(JSON.stringify({ afterF, composed, reversed }));`,
      output: '{"afterF":-1,"composed":0,"reversed":-1}',
      notes: [
        'afterF makes the intermediate value −1 visible before g receives it.',
        'reversed runs g first and demonstrates that these two functions do not commute.',
      ],
    },
    pitfalls: [
      'Read g ∘ f from the input outward: f runs first, even though g is written on the left.',
      'The circle can also denote an element-wise product elsewhere; check which objects and definition are in use.',
    ],
    related: ['ml-relu', 'ml-weights-bias', 'hadamard-product'],
    diagram: {
      nodes: ['Input x = 1', 'f(1) = 2 × 1 − 3 = −1', 'g(−1) = max(0,−1) = 0'],
      caption: 'The output of f becomes the input to g; reversing the order instead produces −1.',
    },
  },
  'ml-softmax': {
    readAs: 'p sub k equals the softmax of z, component k.',
    intuition: 'Turn competing scores into shares of one pie. Softmax exponentiates each score and divides by the total, producing nonnegative probabilities that sum to 1. Subtracting the largest score first preserves those shares while preventing positive exponential overflow for finite inputs.',
    steps: [
      'Start with class scores 1000, 999, and 998.',
      'Subtract the maximum 1000 to get 0, −1, and −2.',
      'Exponentiate to obtain approximately 1, 0.367879, and 0.135335.',
      'Divide by their total, about 1.503215, to obtain probabilities [0.665241, 0.244728, 0.090031].',
    ],
    example: {
      title: 'Normalize large scores without exponential overflow',
      code: `const scores = [1000, 999, 998];
const maximum = Math.max(...scores);
// A shared shift cancels between every numerator and the denominator.
const shifted = scores.map(value => value - maximum);
const exponentials = shifted.map(value => Math.exp(value));
const total = exponentials.reduce((sum, value) => sum + value, 0);
const probabilities = exponentials.map(value => Number((value / total).toFixed(6)));
console.log(JSON.stringify({ shifted, probabilities }));`,
      output: '{"shifted":[0,-1,-2],"probabilities":[0.665241,0.244728,0.090031]}',
      notes: [
        'Subtracting maximum leaves the largest shifted score at zero, whose exponential is 1.',
        'All classes share the same total, so the unrounded probabilities sum to 1 up to floating-point error.',
        'toFixed rounds the displayed probabilities; independently rounded entries need not always sum to exactly 1.',
      ],
    },
    pitfalls: [
      'Math.exp(1000) overflows to Infinity; exponentiate shifted scores rather than these raw scores.',
      'Use finite scores and a nonempty class list; softmax cannot normalize an empty list or arbitrary infinities.',
    ],
    related: ['logarithm-exponential', 'ml-cross-entropy', 'ml-backpropagation'],
    diagram: {
      nodes: ['Scores: [1000,999,998]', 'Subtract 1000 → [0,−1,−2]', 'Exponentials: [1,0.3679,0.1353]', 'Shares: [0.6652,0.2447,0.0900]'],
      caption: 'The shared shift keeps exponentials finite, then one common total converts them to shares.',
    },
  },
  'ml-cross-entropy': {
    readAs: 'Ell sub i equals minus log p sub i, y sub i; L is the mean of the example losses.',
    intuition: 'A prediction pays a larger penalty when it puts little probability on the correct answer. For a class label, cross-entropy is the negative natural logarithm of that class’s probability, measured in nats here. L averages these losses across examples; computing it directly from shifted scores avoids numerical zero probabilities.',
    steps: [
      'Use logits [1000, 1000] with target class 0, and [1000, 1001] with target class 1.',
      'Subtract each row’s maximum to obtain [0, 0] and [−1, 0].',
      'The correct-class probabilities are 0.5 and approximately 0.731059.',
      'Their negative natural logs are approximately 0.693147 and 0.313262 nats.',
      'Average the two unrounded losses to obtain approximately 0.503204 nats.',
    ],
    example: {
      title: 'Compute stable cross-entropy directly from logits',
      code: `const logits = [[1000, 1000], [1000, 1001]];
const labels = [0, 1];
const losses = logits.map((row, i) => {
  const maximum = Math.max(...row);
  const shifted = row.map(score => score - maximum);
  // log(sum(exp(shifted))) minus the correct shifted score is -log(p).
  const logNormalizer = Math.log(shifted.reduce((sum, score) => sum + Math.exp(score), 0));
  return logNormalizer - shifted[labels[i]];
});
const mean = losses.reduce((sum, loss) => sum + loss, 0) / losses.length;
const round = value => Number(value.toFixed(6));
console.log(JSON.stringify({ losses: losses.map(round), mean: round(mean) }));`,
      output: '{"losses":[0.693147,0.313262],"mean":0.503204}',
      notes: [
        'labels[i] selects the correct class within logit row i.',
        'logNormalizer − shifted[labels[i]] is a stable log-sum-exp form of negative log probability.',
        'The mean uses unrounded losses; Math.log supplies natural logarithms, so the result is in nats.',
      ],
    },
    pitfalls: [
      'Computing −Math.log(p) after p numerically underflows to zero gives Infinity; the shifted-score form avoids that intermediate underflow.',
      'Natural logs give nats, while base-two logs give bits; an actual zero probability for the correct class has infinite cross-entropy.',
    ],
    related: ['ml-softmax', 'entropy', 'ml-indicator-one-hot'],
    diagram: {
      nodes: ['Targets: classes 0 and 1', 'Correct p: 0.5 and 0.731059', '−ln p: 0.693147, 0.313262', 'Mean loss: 0.503204 nats'],
      caption: 'The code obtains these two negative log probabilities directly from logits before averaging.',
    },
  },
  'ml-indicator-one-hot': {
    readAs: 'One if the condition holds; e sub y, the one-hot vector for class y.',
    intuition: 'Imagine three class lights with exactly one light switched on for the answer. An indicator converts a true condition to 1 and a false condition to 0. A one-hot vector applies that test at every class index, placing its single 1 at the label.',
    steps: [
      'Choose class label y = 1 among zero-based classes 0, 1, and 2.',
      'Test k = y for each index to produce [0, 1, 0].',
      'Multiply probabilities [0.2, 0.5, 0.3] by those indicators.',
      'Adding the products selects only the correct-class probability, 0.5.',
    ],
    example: {
      title: 'Select a class probability with a one-hot label',
      code: `const label = 1, classes = 3;
const oneHot = Array.from({ length: classes }, (_, k) => Number(k === label));
const probabilities = [0.2, 0.5, 0.3];
// Multiplying by the mask keeps only the entry at the correct class.
const correctProbability = probabilities.reduce((sum, p, k) => sum + p * oneHot[k], 0);
console.log(JSON.stringify({ oneHot, correctProbability }));`,
      output: '{"oneHot":[0,1,0],"correctProbability":0.5}',
      notes: [
        'Number(k === label) converts the Boolean comparison into the numeric indicator 0 or 1.',
        'The reduce computes a dot product with the one-hot mask, selecting probabilities[1].',
      ],
    },
    pitfalls: [
      'An out-of-range label produces no 1 at all; validate labels against the zero-based class range.',
      'The one-hot vector encodes the target class, while the model’s probability vector expresses its prediction.',
    ],
    related: ['ml-data', 'dot-product', 'ml-backpropagation'],
    diagram: {
      nodes: ['Label 1; classes 0, 1, 2', 'Indicators: [0,1,0]', 'Multiply p=[0.2,0.5,0.3]', 'Correct-class probability = 0.5'],
      caption: 'Only the probability aligned with the one-hot vector’s 1 survives the sum.',
    },
  },
  'ml-backpropagation': {
    readAs: 'g sub z equals p minus e sub y; the gradient of L with respect to theta.',
    intuition: 'Think of tracing a final bill back through each subtotal to the item prices. Backpropagation applies the chain rule to trace loss sensitivities backward through a network. For one softmax cross-entropy example with natural logarithms, the score gradient is p minus the one-hot target; computing gradients does not itself update any parameters.',
    steps: [
      'Use probabilities [0.7, 0.3] and correct class 0, whose one-hot target is [1, 0].',
      'Subtract the target to obtain score gradient [−0.3, 0.3].',
      'For an affine layer xW + b with input x = [2, −1], multiply each score gradient by each input.',
      'The weight-gradient rows are [−0.6, 0.6] and [0.3, −0.3]; the bias gradient is [−0.3, 0.3].',
      'Keep these as sensitivities; a later optimizer step decides how to update the parameters.',
    ],
    example: {
      title: 'Carry one example’s loss gradient into an affine layer',
      code: `const probabilities = [0.7, 0.3], label = 0;
const features = [2, -1];
const target = probabilities.map((_, k) => Number(k === label));
const scoreGradient = probabilities.map((p, k) => p - target[k]);
// W[d][k] contributes features[d] times the score gradient for class k.
const weightGradient = features.map(x => scoreGradient.map(g => x * g));
const biasGradient = scoreGradient;
const round = value => Number(value.toFixed(6));
console.log(JSON.stringify({ scoreGradient: scoreGradient.map(round), weightGradient: weightGradient.map(row => row.map(round)), biasGradient: biasGradient.map(round) }));`,
      output: '{"scoreGradient":[-0.3,0.3],"weightGradient":[[-0.6,0.6],[0.3,-0.3]],"biasGradient":[-0.3,0.3]}',
      notes: [
        'scoreGradient is the derivative of this example’s natural-log softmax cross-entropy with respect to each score.',
        'features.map constructs the outer product xᵀg for the W[d][k] storage convention.',
        'Each bias adds directly to one score, so its gradient equals the corresponding score gradient.',
      ],
    },
    pitfalls: [
      'A gradient measures sensitivity toward increasing loss; the usual descent update subtracts it rather than treating it as an update direction to add.',
      'p minus target is specific to softmax with this cross-entropy; a mean over N examples also requires averaging the example gradients.',
    ],
    related: ['ml-cross-entropy', 'ml-learning-update', 'vector-tensor-product'],
    diagram: {
      nodes: ['p=[0.7,0.3]; label=0', 'Subtract target [1,0]', 'g_z=[−0.3,0.3]', 'W grad rows: 2g_z and −g_z'],
      caption: 'The input [2, −1] scales the score gradient into the two weight-gradient rows; no update occurs yet.',
    },
  },
};
