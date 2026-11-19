import { register, render } from 'pele/core';
import flowchart from 'pele/diagrams/flowchart';
import xychart from 'pele/diagrams/xychart';

register(flowchart, xychart);

// Small, authored datasets. Every point is also printed in an accessible table;
// straight segments connect samples rather than claiming an exact smooth curve.
export const symbolPlots = {
  'square-root': {
    title: 'A square root grows more slowly than its input', x: 'Input x', y: 'Square root',
    labels: ['0', '1', '2', '3', '4'], values: [0, 1, Math.sqrt(2), Math.sqrt(3), 2], min: 0, max: 2,
    caption: 'Moving from 1 to 4 makes the input four times bigger, but its square root only doubles: from 1 to 2.',
  },
  'power': {
    title: 'Each extra power doubles this value', x: 'Exponent', y: '2 to the power',
    labels: ['0', '1', '2', '3', '4'], values: [1, 2, 4, 8, 16], min: 0, max: 16,
    caption: 'For base 2, increasing the exponent by 1 multiplies the previous result by 2. The exponent 0 gives 1.',
  },
  'logarithm-exponential': {
    title: 'A logarithm asks how many doublings', x: 'Input x', y: 'Log base 2',
    labels: ['1', '2', '3', '4', '5'], values: [0, 1, Math.log2(3), 2, Math.log2(5)], min: 0, max: 3,
    caption: 'The logarithm of 4 is 2 because two doublings take 1 to 4. Inputs between powers of 2 have fractional answers.',
  },
  'trigonometry': {
    title: 'Sine over one full turn', x: 'Degrees', y: 'Sine',
    labels: ['0', '90', '180', '270', '360'], values: [0, 1, 0, -1, 0], min: -1, max: 1,
    caption: 'These five landmarks track the vertical position on a unit circle. The real sine curve bends smoothly between them; JavaScript expects radians.',
  },
  'absolute-value': {
    title: 'Distance from zero is never negative', x: 'Input x', y: 'Absolute value',
    labels: ['-2', '-1', '0', '1', '2'], values: [2, 1, 0, 1, 2], min: 0, max: 2,
    caption: 'Both -2 and 2 are two steps from zero. Absolute value keeps the distance and drops the direction.',
  },
  'derivative': {
    title: 'The slope of x squared changes with x', x: 'Input x', y: 'Slope 2x',
    labels: ['-2', '-1', '0', '1', '2'], values: [-4, -2, 0, 2, 4], min: -4, max: 4,
    caption: 'For f(x) = x², the exact derivative is 2x. A negative slope means the curve goes down as x increases; a positive slope means it goes up.',
  },
  'definite-integral': {
    title: 'Accumulated area under y = x', x: 'Upper bound b', y: 'Area from 0 to b',
    labels: ['0', '1', '2', '3', '4'], values: [0, 0.5, 2, 4.5, 8], min: 0, max: 8,
    caption: 'For a nonnegative upper bound b, the area is a triangle with base b and height b. Its area is b² / 2.',
  },
  'entropy': {
    title: 'A fair coin is hardest to predict', x: 'Chance of heads', y: 'Entropy in bits',
    labels: ['0', '0.25', '0.5', '0.75', '1'], values: [0, 0.811278, 1, 0.811278, 0], min: 0, max: 1,
    caption: 'A certain outcome has zero uncertainty. A 50–50 coin has the most uncertainty: one bit per toss. The endpoint terms use the limit 0 log₂ 0 = 0.',
  },
  'ml-relu': {
    title: 'ReLU discards the negative part', x: 'Input x', y: 'Output',
    labels: ['-2', '-1', '0', '1', '2'], values: [0, 0, 0, 1, 2], min: 0, max: 2,
    caption: 'Every negative input becomes zero. Positive inputs pass through unchanged. This is the function max(0, x).',
  },
  'ml-softmax': {
    title: 'Softmax shares one total across three classes', x: 'Class', y: 'Probability', type: 'bar',
    labels: ['A', 'B', 'C'], values: [Math.exp(2)/(Math.exp(2)+Math.E+1), Math.E/(Math.exp(2)+Math.E+1), 1/(Math.exp(2)+Math.E+1)], min: 0, max: 1,
    caption: 'Scores [2, 1, 0] become approximately [0.665, 0.245, 0.090]. All three probabilities are positive and add to 1.',
  },
  'ml-cross-entropy': {
    title: 'More probability on the correct answer means less loss', x: 'Correct-class probability', y: 'Loss in nats',
    labels: ['0.2', '0.4', '0.6', '0.8', '1.0'], values: [0.2,0.4,0.6,0.8,1].map(p=>-Math.log(p)), min: 0, max: 2,
    caption: 'For one correct class the loss is -ln(p). It reaches zero at p = 1 and grows without bound as p approaches zero.',
  },
};

const options = (id, width) => ({
  maxWidth: width, autoDirection: false, fontFamily: 'system-ui, sans-serif', fontSize: 13,
  padding: 8, links: false, images: false, maxEdges: 8, limit: 4000, outputLimit: 100000,
  idPrefix: `symbol-diagram-${id}-${width}`,
});

export function renderSymbolDiagram(id, definition, narrow = false) {
  const nodes = definition.nodes;
  if (!Array.isArray(nodes) || nodes.length < 2 || nodes.length > 5) throw new TypeError(`Invalid diagram for ${id}`);
  const quoted = value => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/[\r\n]/g, ' ');
  const source = `flowchart ${narrow ? 'TD' : 'LR'}\n${nodes.map((label,i)=>`N${i}["${quoted(label)}"]`).join('\n')}\n${nodes.slice(1).map((_,i)=>`N${i} --> N${i+1}`).join('\n')}`;
  return render(source, options(id, narrow ? 260 : 1000));
}

export function renderSymbolPlot(id, narrow = false) {
  const plot = symbolPlots[id];
  if (!plot) return null;
  const source = `xychart\nx-axis "${plot.x}" [${plot.labels.map(label=>`"${label}"`).join(', ')}]\ny-axis "${plot.y}" ${plot.min} --> ${plot.max}\n${plot.type || 'line'} [${plot.values.map(value=>Number(value.toFixed(6))).join(', ')}]`;
  return render(source, options(`plot-${id}`, narrow ? 270 : 640));
}
