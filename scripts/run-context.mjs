// These are explicit contexts for the guide's original illustrations, not a
// general prelude. The caller must use this only while source is the unedited
// authored variant. Display/copy always retain that original source.
const javascript = new Map();
const python = new Map();
const both = indices => indices.flatMap(index => [`en-${index}`, `zh-${index}`]);
function context(map, ids, prefix, note) {
  for (const id of ids) map.set(id, { prefix, note });
}

const helpers = {
  multiply: `function multiply(a, b) {
  return [a[0] * b[0], a[1] * b[1]];
}
function multiplyScalar(a, scalar) {
  return [a[0] * scalar, a[1] * scalar];
}`,
  dot: `function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}`,
  cross: `function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}`,
  length: `function length(vec) {
  return Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2]);
}`,
  normalize: `function normalize(vec) {
  var x = vec[0], y = vec[1], z = vec[2];
  var squaredLength = x * x + y * y + z * z;
  if (squaredLength > 0) {
    var length = Math.sqrt(squaredLength);
    vec[0] = x / length; vec[1] = y / length; vec[2] = z / length;
  }
  return vec;
}`,
};
context(javascript, both([7]), "var math = require('mathjs');", 'Run includes the mathjs import from the preceding example.');
context(javascript, both([10]), helpers.multiply, 'Run includes the multiply and multiplyScalar helpers shown next.');
context(javascript, [...both([12]), 'py-13'], helpers.dot, 'Run includes the dot helper shown next.');
context(javascript, [...both([14]), 'py-15'], helpers.cross, 'Run includes the cross helper shown next.');
context(javascript, [...both([23]), 'py-25', 'py-27'], helpers.length, 'Run includes the length helper from this topic.');
context(javascript, [...both([26]), 'py-30'], helpers.normalize, 'Run includes the normalize helper shown next.');
context(javascript, both([33]), `function isInteger(n) { return typeof n === 'number' && n % 1 === 0; }`, 'Run includes the isInteger helper from the preceding topic.');
context(javascript, ['en-54', 'py-56'], "var { kroneckerProduct } = require('./examples/notation.cjs');", 'Run includes the guide helper import from the preceding example.');

context(javascript, [...both([2, 9]), 'py-2', 'py-9'], 'var k = 2, j = 3;', 'Demo inputs for Run: k = 2, j = 3.');
context(javascript, both([4]), 'var k = 2, j = 3, x = 12;', 'Demo inputs for Run: k = 2, j = 3, x = 12.');
context(javascript, both([40, 41]), 'var x = 3.5;', 'Demo input for Run: x = 3.5.');
context(javascript, both([42]), 'var A = true, B = true;', 'Demo inputs for Run: A = true, B = true.');
context(javascript, both([44]), `function orderOfMagnitude(n) { return Math.trunc(Math.log(n) / Math.LN10); }
var k = 1000, j = 10;`, 'Run includes the orderOfMagnitude helper and demo inputs k = 1000, j = 10.');
context(javascript, both([46, 47]), 'var k = 3;', 'Demo input for Run: k = 3.');
context(javascript, both([48]), 'var A = true, B = false;', 'Demo inputs for Run: A = true, B = false.');
context(javascript, both([49]), 'var x = 2, y = 3;', 'Demo inputs for Run: x = 2, y = 3.');

context(python, ['py-2', 'py-9'], 'k = 2\nj = 3', 'Demo inputs for Run: k = 2, j = 3.');
context(python, ['py-4'], 'def plus(x, y):\n    return x + y', 'Run includes the plus helper from the preceding example.');
context(python, ['py-10'], `def multiply(a, b):
    return [aa * bb for aa, bb in zip(a, b)]

def multiply_scalar(scalar, a):
    return [scalar * aa for aa in a]`, 'Run includes the multiply and multiply_scalar helpers shown next.');
context(python, ['py-15'], `def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])`, 'Run includes the cross helper shown next.');
context(python, ['py-25'], `import math

def length(vec):
    return math.sqrt(vec[0] ** 2 + vec[1] ** 2 + vec[2] ** 2)`, 'Run includes math and the length helper shown next.');
context(python, ['py-30'], `import math

def normalize(vec):
    squared_length = vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2]
    if squared_length > 0:
        length = math.sqrt(squared_length)
        vec[0] /= length
        vec[1] /= length
        vec[2] /= length
    return vec`, 'Run includes math and the normalize helper shown next.');
context(python, ['py-6', 'py-26', 'py-31', 'py-38', 'py-40', 'py-42'], 'import math', 'Run includes the math import from the preceding example.');
context(python, ['py-54'], 'A = [[1, 2], [3, 4]]\nB = [[5, 6], [7, 8]]', 'Run includes matrices A = [[1, 2], [3, 4]] and B = [[5, 6], [7, 8]] from the preceding example.');

const numpyExamples = new Set([1, 5, 7, 12, 13, 23, 27, 28, 29, 32, 35, 37, 45, 52].map(index => `py-${index}`));
const setNotationExamples = new Set(['en-32', 'zh-32']);

// These exact authored variants contain declarations/functions only. Supplying
// an empty entry point checks them without inventing a call or canned output.
const cDefinitions = new Set([
  ...both([2, 3, 4, 9, 11, 13, 15, 24, 27, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 44, 45, 46, 47, 48, 49]),
  ...[2, 3, 9, 11, 12, 14, 16, 18, 26, 31, 32, 38, 39, 40, 41, 42, 43, 44, 48, 49, 50, 61].map(index => `py-${index}`),
]);
const rustDefinitions = new Set([
  ...both([2, 3, 4, 9, 11, 13, 15, 24, 27, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 44, 45, 46, 47, 48, 49]),
  ...[2, 9, 14, 16, 26, 31, 38, 40, 41, 44].map(index => `py-${index}`),
]);

/**
 * Prepare only known, unedited guide examples for execution. `source` in this
 * result is execution-only: never use it to replace visible/copied source.
 * Per-example mount suffixes (en-12-12) are accepted as well as authored IDs.
 */
export function prepareRunnableExample({ exampleId, language, source }) {
  if (typeof source !== 'string') throw new TypeError('Example source must be a string.');
  const match = /^(en|py|zh)-(\d+)(?:-\d+)?$/.exec(exampleId || '');
  const id = match ? `${match[1]}-${Number(match[2])}` : '';
  if (language === 'javascript' && setNotationExamples.has(id)) {
    return { source, runnable: false, note: 'This is illustrative set notation, not executable JavaScript.' };
  }
  if (language === 'python' && numpyExamples.has(id)) {
    return { source, runnable: false, note: 'This example requires NumPy, which is not available in the local Python runtime.' };
  }
  const entry = (language === 'javascript' ? javascript : language === 'python' ? python : null)?.get(id);
  if (entry) return { source: `${entry.prefix}\n\n${source}`, note: entry.note, runnable: true };
  const definitions = language === 'c' ? cDefinitions : language === 'rust' ? rustDefinitions : null;
  const hasMain = language === 'c' ? /\bmain\s*\(/.test(source) : /\bfn\s+main\s*\(/.test(source);
  if (definitions?.has(id) && !hasMain) {
    return {
      source: `${source}\n\n${language === 'c' ? 'int main(void) { return 0; }' : 'fn main() {}'}\n`,
      note: 'This illustration compiles with an empty main; no example function is called.', runnable: true,
    };
  }
  return { source, runnable: true };
}
