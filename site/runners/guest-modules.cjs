// Bundled and evaluated inside QuickJS. No module executes in the host worker.
const math = require('mathjs');
const notation = require('../../examples/notation.cjs');
const determinant = require('gl-mat2/determinant');
const nextafter = require('nextafter');
const IntervalModule = require('interval-arithmetic');
const Interval = IntervalModule.default || IntervalModule;

exports.require = function (name) {
  if (name === 'mathjs') return math;
  if (name === './examples/notation.cjs' || name === 'examples/notation.cjs') return notation;
  if (name === 'gl-mat2/determinant') return determinant;
  if (name === 'nextafter') return nextafter;
  if (name === 'interval-arithmetic') return Interval;
  throw new Error('Module "' + name + '" is unavailable. This browser runner includes mathjs, the guide helpers, gl-mat2/determinant, nextafter, and interval-arithmetic.');
};
