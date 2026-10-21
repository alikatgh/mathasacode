// Bounded, deterministic calculations shared by the explorer, formula and code.
// No user-authored source or TeX enters this module.
const control = (key, label, min, max, step, initial) => Object.freeze({ key, label, min, max, step, initial });
const c = control;
export const symbolExplorerDefinitions = Object.freeze({
  'dot-product': { title: 'Move two vectors', kind: 'vectors', controls: [c('ax', 'Vector a: x', -4, 4, 0.1, 2), c('ay', 'Vector a: y', -4, 4, 0.1, 1), c('bx', 'Vector b: x', -4, 4, 0.1, 1), c('by', 'Vector b: y', -4, 4, 0.1, 3)] },
  'vector-scaling': { title: 'Stretch or reverse a vector', kind: 'vectors', controls: [c('x', 'Vector v: x', -2, 2, 0.1, 1), c('y', 'Vector v: y', -2, 2, 0.1, 2), c('scale', 'Scalar s', -2, 2, 0.1, 1.5)] },
  'euclidean-norm': { title: 'Measure a vector', kind: 'vectors', controls: [c('x', 'Vector v: x', -4, 4, 0.1, 3), c('y', 'Vector v: y', -4, 4, 0.1, 2)] },
  derivative: { title: 'Bring a secant toward a tangent', kind: 'derivative', controls: [c('x', 'Curve point x', -2, 2, 0.1, 1), c('h', 'Forward step h', 0.01, 1, 0.01, 0.5)] },
  'conditional-probability': { title: 'Keep only the outcomes in B', kind: 'plot', controls: [c('both', 'A and B (out of 100)', 0, 50, 1, 20), c('onlyB', 'B without A (out of 100)', 0, 50, 1, 30)] },
  'bayes-theorem': { title: 'Change the base rate', kind: 'plot', controls: [c('prior', 'Prior P(A)', 0, 1, 0.01, 0.01), c('sensitivity', 'Signal rate P(B | A)', 0, 1, 0.01, 0.9), c('falsePositive', 'False signal rate P(B | not A)', 0, 1, 0.01, 0.05)] },
  'ml-softmax': { title: 'Turn three scores into one probability total', kind: 'plot', controls: [c('a', 'Class A score', -8, 8, 0.1, 2), c('b', 'Class B score', -8, 8, 0.1, 1), c('c', 'Class C score', -8, 8, 0.1, 0), c('offset', 'Offset added to every score', -1000, 1000, 100, 0)] },
  'ml-relu': { title: 'Follow one activation', kind: 'plot', controls: [c('input', 'Input a', -4, 4, 0.1, 0.8)] },
  'ml-learning-update': { title: 'Try one gradient step', kind: 'plot', controls: [c('theta', 'Current parameter θ', -3, 3, 0.1, -1), c('eta', 'Learning rate η (0 pauses)', 0, 3, 0.05, 0.5)] },
  'square-root': { title: 'Find the nonnegative square root', kind: 'plot', controls: [c('input', 'Input x', 0, 16, 0.1, 4)] },
  power: { title: 'Change the base and exponent', kind: 'plot', controls: [c('base', 'Positive base b', 0.5, 3, 0.1, 2), c('exponent', 'Exponent y', 0, 6, 0.1, 3)] },
});

export const symbolExplorerIds = Object.freeze(Object.keys(symbolExplorerDefinitions));
export const roundExplorerNumber = value => Number(value.toFixed(6));
export const explorerNumber = value => value === null ? 'undefined' : String(Number(value.toFixed(4)));
const n = explorerNumber;
const literal = value => JSON.stringify(value);
const texPair = values => String.raw`\begin{bmatrix}${values.map(n).join('\\\\')}\end{bmatrix}`;
const pair = values => `[${values.map(n).join(', ')}]`;
const chart = (labels, values, y, min, max, type = 'bar', x = 'Quantity', reference) => ({ labels, values, y, min, max, type, x, reference });
const code = lines => lines.join('\n');
const displayOutput = result => result === null ? 'undefined (P(B)=0)' : Array.isArray(result) ? JSON.stringify(result.map(roundExplorerNumber)) : String(roundExplorerNumber(result));

export function initialExplorerParameters(id) {
  const definition = symbolExplorerDefinitions[id];
  if (!definition) throw new RangeError(`Unknown symbol explorer: ${id}`);
  return Object.fromEntries(definition.controls.map(item => [item.key, item.initial]));
}

/** Pointer/keyboard movement snaps to exactly the same bounded range as sliders. */
export function boundExplorerControl(id, key, value) {
  const item = symbolExplorerDefinitions[id]?.controls.find(candidate => candidate.key === key);
  if (!item || !Number.isFinite(value)) throw new RangeError('Invalid explorer control');
  const snapped = item.min + Math.round((Math.max(item.min, Math.min(item.max, value)) - item.min) / item.step) * item.step;
  return Number(Math.max(item.min, Math.min(item.max, snapped)).toFixed(8));
}

export function symbolExplorerState(id, supplied = {}) {
  const definition = symbolExplorerDefinitions[id];
  if (!definition) throw new RangeError(`Unknown symbol explorer: ${id}`);
  const p = { ...initialExplorerParameters(id), ...supplied };
  for (const { key, min, max } of definition.controls) {
    if (typeof p[key] !== 'number' || !Number.isFinite(p[key]) || p[key] < min || p[key] > max) throw new RangeError(`Invalid ${id} control: ${key}`);
  }
  let result, formulaText, formulaTex, explanation, source, plot, rows, vectors;
  if (id === 'dot-product') {
    const a = [p.ax, p.ay], b = [p.bx, p.by];
    const products = [a[0] * b[0], a[1] * b[1]];
    const sum = products[0] + products[1];
    // Bound only floating-point roundoff from the two products and their sum.
    // The bound scales with their magnitudes, so small nonzero dots stay signed.
    const roundoff = 2 * Number.EPSILON * (Math.abs(products[0]) + Math.abs(products[1]));
    result = Math.abs(sum) <= roundoff ? 0 : sum;
    const lengths = [Math.hypot(...a), Math.hypot(...b)];
    explanation = lengths.includes(0) ? 'A zero vector makes the dot product zero. An angle requires both vectors to be nonzero.' : result === 0 ? 'The nonzero vectors are perpendicular: their component products cancel.' : `The dot product is ${result > 0 ? 'positive: the vectors point partly in the same direction' : 'negative: the vectors point partly in opposite directions'}.`;
    formulaText = `a · b = (${n(p.ax)} × ${n(p.bx)}) + (${n(p.ay)} × ${n(p.by)}) = ${n(result)}`;
    formulaTex = String.raw`\mathbf a\cdot\mathbf b=(${n(p.ax)})(${n(p.bx)})+(${n(p.ay)})(${n(p.by)})=${n(result)}`;
    vectors = [{ label: 'a', values: a, keys: ['ax', 'ay'] }, { label: 'b', values: b, keys: ['bx', 'by'], secondary: true }];
    rows = [['a', pair(a)], ['b', pair(b)], ['x component product', n(a[0] * b[0])], ['y component product', n(a[1] * b[1])], ['Dot product', n(result)]];
    source = code([`const a = ${literal(a)};`, `const b = ${literal(b)};`, 'const products = a.map((value, i) => value * b[i]);', 'const dot = products.reduce((sum, value) => sum + value, 0);', 'console.log(Number(dot.toFixed(6)));']);
  } else if (id === 'vector-scaling') {
    const v = [p.x, p.y];
    result = v.map(value => p.scale * value);
    explanation = p.scale < 0 ? 'A negative scalar reverses direction. The length is multiplied by the absolute value of s.' : p.scale === 0 ? 'A zero scalar collapses the vector to the origin.' : 'Each component changes by the same factor, so the direction is preserved.';
    formulaText = `${n(p.scale)} × ${pair(v)} = ${pair(result)}`;
    formulaTex = String.raw`${n(p.scale)}${texPair(v)}=${texPair(result)}`;
    vectors = [{ label: 'v', values: v, keys: ['x', 'y'] }, { label: 's·v', values: result, secondary: true }];
    rows = [['v', pair(v)], ['s', n(p.scale)], ['s·v', pair(result)], ['Original length', n(Math.hypot(...v))], ['Scaled length', n(Math.hypot(...result))]];
    source = code([`const v = ${literal(v)};`, `const scale = ${p.scale};`, 'const scaled = v.map(value => scale * value);', 'const rounded = scaled.map(value => Number(value.toFixed(6)));', 'console.log(JSON.stringify(rounded));']);
  } else if (id === 'euclidean-norm') {
    const v = [p.x, p.y];
    result = Math.hypot(...v);
    explanation = 'Length is the distance from the origin. The dashed right triangle shows the two component lengths; either component may be negative.';
    formulaText = `‖v‖ = √((${n(p.x)})² + (${n(p.y)})²) ≈ ${n(result)}`;
    formulaTex = String.raw`\lVert\mathbf v\rVert=\sqrt{(${n(p.x)})^2+(${n(p.y)})^2}\approx ${n(result)}`;
    vectors = [{ label: 'v', values: v, keys: ['x', 'y'] }];
    rows = [['x', n(p.x)], ['y', n(p.y)], ['x² + y²', n(p.x ** 2 + p.y ** 2)], ['Length', n(result)]];
    source = code([`const v = ${literal(v)};`, 'const squares = v.map(value => value * value);', 'const squaredLength = squares.reduce((sum, value) => sum + value, 0);', 'const length = Math.sqrt(squaredLength);', 'console.log(Number(length.toFixed(6)));']);
  } else if (id === 'derivative') {
    const y = p.x ** 2, nearby = (p.x + p.h) ** 2;
    result = 2 * p.x;
    const secant = (nearby - y) / p.h;
    explanation = `For f(x) = x², the forward secant has slope 2x + h = ${n(secant)}. The exact tangent slope is ${n(result)}. Decreasing h shrinks the error; h stays positive.`;
    formulaText = `f′(${n(p.x)}) = 2 × ${n(p.x)} = ${n(result)}; Δf / h = ${n(secant)}`;
    formulaTex = String.raw`f'(${n(p.x)})=2(${n(p.x)})=${n(result)},\qquad\frac{f(x+h)-f(x)}h=${n(secant)}`;
    rows = [['x', n(p.x)], ['f(x)', n(y)], ['h', n(p.h)], ['f(x + h)', n(nearby)], ['Forward secant slope', n(secant)], ['Exact tangent slope', n(result)], ['Secant minus tangent', n(secant - result)]];
    source = code([`const x = ${p.x}, h = ${p.h};`, 'const f = value => value * value;', 'const secant = (f(x + h) - f(x)) / h;', 'const tangent = 2 * x;', '// Try logging secant instead to compare the finite-step slope.', 'console.log(Number(tangent.toFixed(6)));']);
  } else if (id === 'conditional-probability') {
    const b = p.both + p.onlyB;
    result = b === 0 ? null : p.both / b;
    explanation = b === 0 ? 'There are no outcomes in B, so conditioning on B is undefined. Increase either count.' : `Of the ${b} equally likely outcomes in B, ${p.both} are also in A. The other ${100 - b} outcomes in the sample space are excluded.`;
    formulaText = b === 0 ? 'P(A | B) is undefined because P(B) = 0' : `P(A | B) = ${p.both} / (${p.both} + ${p.onlyB}) ≈ ${n(result)}`;
    formulaTex = b === 0 ? String.raw`\operatorname P(A\mid B)\text{ is undefined: }\operatorname P(B)=0` : String.raw`\operatorname P(A\mid B)=\frac{${p.both}}{${b}}\approx ${n(result)}`;
    rows = [['Sample space size', '100'], ['A ∩ B outcomes', String(p.both)], ['B without A outcomes', String(p.onlyB)], ['P(A ∩ B)', n(p.both / 100)], ['P(B)', n(b / 100)], ['P(A | B)', n(result)]];
    plot = chart(['A and B', 'B without A'], [p.both, p.onlyB], 'Outcome count', 0, 100, 'bar', 'Parts of B');
    source = code([`const both = ${p.both}, onlyB = ${p.onlyB};`, 'const outcomesInB = both + onlyB;', 'const conditional = outcomesInB === 0 ? null : both / outcomesInB;', 'const output = conditional === null ? "undefined (P(B)=0)" : Number(conditional.toFixed(6));', 'console.log(output);']);
  } else if (id === 'bayes-theorem') {
    const trueSignal = p.prior * p.sensitivity, falseSignal = (1 - p.prior) * p.falsePositive;
    const evidence = trueSignal + falseSignal;
    result = evidence === 0 ? null : trueSignal / evidence;
    explanation = evidence === 0 ? 'These settings produce no signals B. A posterior given B is undefined.' : `Among ${n(evidence * 10000)} expected signals per 10,000 cases, ${n(trueSignal * 10000)} come from A. Fractional counts are expectations, not parts of a person.`;
    formulaText = evidence === 0 ? 'P(A | B) is undefined because P(B) = 0' : `P(A | B) = (${n(p.sensitivity)} × ${n(p.prior)}) / ${n(evidence)} ≈ ${n(result)}`;
    formulaTex = evidence === 0 ? String.raw`\operatorname P(A\mid B)\text{ is undefined: }\operatorname P(B)=0` : String.raw`\operatorname P(A\mid B)=\frac{(${n(p.sensitivity)})(${n(p.prior)})}{${n(evidence)}}\approx ${n(result)}`;
    rows = [['P(A)', n(p.prior)], ['P(B | A)', n(p.sensitivity)], ['P(B | not A)', n(p.falsePositive)], ['P(A ∩ B)', n(trueSignal)], ['P(B)', n(evidence)], ['P(A | B)', n(result)]];
    plot = chart(['True signals', 'False signals'], [trueSignal * 10000, falseSignal * 10000], 'Expected per 10,000', 0, 10000, 'bar', 'Signals B');
    source = code([`const prior = ${p.prior};`, `const sensitivity = ${p.sensitivity}, falsePositive = ${p.falsePositive};`, 'const trueSignal = prior * sensitivity;', 'const evidence = trueSignal + (1 - prior) * falsePositive;', 'const posterior = evidence === 0 ? null : trueSignal / evidence;', 'console.log(posterior === null ? "undefined (P(B)=0)" : Number(posterior.toFixed(6)));']);
  } else if (id === 'ml-softmax') {
    const z = [p.a, p.b, p.c].map(value => value + p.offset);
    const maximum = Math.max(...z), weights = z.map(value => Math.exp(value - maximum));
    const total = weights.reduce((sum, value) => sum + value, 0);
    result = weights.map(value => value / total);
    explanation = 'The probabilities sum to 1 before rounding. A shared score offset changes neither the differences nor the probabilities; subtracting the maximum keeps the exponentials finite.';
    formulaText = `softmax(${pair(z)}) ≈ ${pair(result)}; Σp = ${n(result.reduce((a, b) => a + b, 0))}`;
    formulaTex = String.raw`p_i=\frac{e^{z_i-\max z}}{\sum_j e^{z_j-\max z}},\qquad\mathbf p\approx ${texPair(result)}`;
    rows = z.map((value, i) => [`Class ${['A', 'B', 'C'][i]}: score → probability`, `${n(value)} → ${n(result[i])}`]);
    rows.push(['Unrounded probability sum', n(result.reduce((a, b) => a + b, 0))]);
    plot = chart(['A', 'B', 'C'], result, 'Probability', 0, 1, 'bar', 'Class');
    source = code([`const scores = ${literal([p.a, p.b, p.c])};`, `const z = scores.map(value => value + ${p.offset});`, 'const maximum = Math.max(...z);', 'const weights = z.map(value => Math.exp(value - maximum));', 'const total = weights.reduce((sum, value) => sum + value, 0);', 'const probabilities = weights.map(value => value / total);', 'console.log(JSON.stringify(probabilities.map(value => Number(value.toFixed(6)))));']);
  } else if (id === 'ml-relu') {
    result = Math.max(0, p.input);
    const slope = p.input > 0 ? 1 : 0;
    explanation = p.input === 0 ? 'At zero the ordinary derivative is undefined. This guide chooses subgradient 0 for a training implementation.' : p.input < 0 ? 'This unit is inactive: its output and local derivative are zero.' : 'This unit is active: the output equals the input and its local derivative is one.';
    formulaText = `ReLU(${n(p.input)}) = max(0, ${n(p.input)}) = ${n(result)}`;
    formulaTex = String.raw`\operatorname{ReLU}(${n(p.input)})=\max(0,${n(p.input)})=${n(result)}`;
    rows = [['Input', n(p.input)], ['Output', n(result)], [p.input === 0 ? 'Chosen subgradient at zero' : 'Local derivative', String(slope)]];
    plot = chart(['Input a', 'ReLU(a)'], [p.input, result], 'Value', -4, 4, 'bar', 'Before and after activation');
    source = code([`const input = ${p.input};`, 'const relu = value => Math.max(0, value);', 'const output = relu(input);', '// At input 0, the ordinary derivative does not exist.', 'console.log(Number(output.toFixed(6)));']);
  } else if (id === 'ml-learning-update') {
    const gradient = p.theta - 1;
    result = p.theta - p.eta * gradient;
    const before = 0.5 * gradient ** 2, after = 0.5 * (result - 1) ** 2;
    // Analytically L(new θ) = (1 - η)² L(old θ). At η = 2 the losses are
    // equal even when evaluating the two squares introduces different roundoff.
    const lossUnchanged = gradient === 0 || p.eta === 0 || p.eta === 2;
    const lossChange = lossUnchanged ? 'The loss is unchanged.' : p.eta > 2 ? 'This step is too large and increases loss.' : 'This proposed step decreases loss.';
    explanation = `One scalar parameter, L(θ) = ½(θ − 1)². Loss ${n(before)} → ${n(after)}. ${lossChange} This is one update, not a training loop.`;
    formulaText = `θnew = ${n(p.theta)} − ${n(p.eta)} × (${n(gradient)}) = ${n(result)}`;
    formulaTex = String.raw`\theta_{\mathrm{new}}=${n(p.theta)}-(${n(p.eta)})(${n(gradient)})=${n(result)}`;
    rows = [['Old θ', n(p.theta)], ['Gradient at old θ', n(gradient)], ['Learning rate η', n(p.eta)], ['New θ', n(result)], ['Loss before', n(before)], ['Loss after', n(after)]];
    plot = chart(['Before step', 'After step'], [before, after], 'Quadratic loss', 0, Math.max(1, before, after), 'bar', 'One proposed update');
    source = code([`const theta = ${p.theta};`, `const eta = ${p.eta};`, 'const gradient = theta - 1; // derivative of 0.5 * (theta - 1) ** 2', 'const nextTheta = theta - eta * gradient;', 'console.log(Number(nextTheta.toFixed(6)));']);
  } else if (id === 'square-root') {
    result = Math.sqrt(p.input);
    formulaText = `√${n(p.input)} ≈ ${n(result)}; (${n(result)})² ≈ ${n(p.input)}`;
    formulaTex = String.raw`\sqrt{${n(p.input)}}\approx ${n(result)}`;
    explanation = 'The principal square root is nonnegative. The curve is sampled every 2 input units; the horizontal reference marks the current output.';
    rows = [['Input x', n(p.input)], ['Square root', n(result)], ['Square of the unrounded root', n(result ** 2)]];
    const samples = Array.from({ length: 9 }, (_, i) => i * 2);
    plot = chart(samples.map(String), samples.map(Math.sqrt), 'Square root', 0, 4, 'line', 'Input x', samples.map(() => result));
    source = code([`const input = ${p.input};`, '// Math.sqrt returns the nonnegative principal square root.', 'const root = Math.sqrt(input);', 'const rounded = Number(root.toFixed(6));', 'console.log(rounded);']);
  } else if (id === 'power') {
    result = p.base ** p.exponent;
    formulaText = `${n(p.base)} ^ ${n(p.exponent)} ≈ ${n(result)}`;
    formulaTex = String.raw`(${n(p.base)})^{${n(p.exponent)}}\approx ${n(result)}`;
    explanation = 'Positive bases keep these fractional powers real. The curve joins integer-exponent samples; the horizontal reference marks the chosen power.';
    rows = [['Base', n(p.base)], ['Exponent', n(p.exponent)], ['Power', n(result)]];
    const samples = Array.from({ length: 7 }, (_, i) => i);
    const values = samples.map(value => p.base ** value);
    plot = chart(samples.map(String), values, 'Power', 0, Math.max(1, ...values), 'line', 'Exponent y', samples.map(() => result));
    source = code([`const base = ${p.base};`, `const exponent = ${p.exponent};`, '// A positive base also supports fractional exponents.', 'const power = base ** exponent;', 'console.log(Number(power.toFixed(6)));']);
  }
  return { id, ...definition, parameters: p, result, output: displayOutput(result), formulaText, formulaTex, explanation, source, rows, plot, vectors };
}

/** Only numeric model values and fixed labels enter Pele's source language. */
export function explorerPlotSource(plot) {
  if (!plot || !plot.values.every(Number.isFinite) || ![plot.min, plot.max].every(Number.isFinite)) throw new RangeError('Invalid explorer plot');
  const quoted = value => JSON.stringify(String(value));
  const values = items => items.map(value => Number(value.toFixed(8))).join(', ');
  return `xychart\nx-axis ${quoted(plot.x)} [${plot.labels.map(quoted).join(', ')}]\ny-axis ${quoted(plot.y)} ${plot.min} --> ${plot.max}\n${plot.type} [${values(plot.values)}]${plot.reference ? `\nline [${values(plot.reference)}]` : ''}`;
}
