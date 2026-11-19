import { parseExpressionAt } from 'acorn';
import { traceScalar } from './trace-visualizer-model.mjs';
import { neuralForward, neuralBackward, neuralSampleLoss, neuralMeanGradients } from './experiments/neural-lab-model.mjs';

// This is an authored topic index, not a guess based on variable names. Every
// guide fence has one entry; edited drafts never inherit its worked values.
const registry = Object.create(null);
const ids = specification => specification.split(',').filter(Boolean).flatMap(part => {
  const [first, last = first] = part.split('-').map(Number);
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
});
function register(family, en, py, zh = en) {
  for (const [prefix, specification] of [['en', en], ['py', py], ['zh', zh]]) {
    for (const index of ids(specification)) {
      const key = `${prefix}-${index}`;
      if (registry[key]) throw new Error(`Duplicate mathematical scene: ${key}`);
      registry[key] = Object.freeze({ family });
    }
  }
}
register('comparison', '1-4,42-49', '1-4,46-50');
register('arithmetic', '8-9,22,40-41,62,64', '8-9,24,45,64,66', '8-9,22,40-41,63,65');
register('complex', '5-7', '5-7');
register('vector', '10-15,23-24,26-27', '10-16,25-27,30-32');
register('sequence', '16-21', '17-23');
register('matrix', '25,52-54', '28-29,53-56');
register('sets', '28-33,50-51', '33-37,51-52');
register('function', '34-38', '38-43');
register('derivative', '39,55,57', '44,57,59', '39,55,58');
register('delta', '56', '58');
register('dirac', '', '', '57');
register('gradient', '58', '60', '59');
register('integral', '59-60', '61-62', '60-61');
register('trig', '63', '65', '64');
register('combinatorics', '65', '67', '66');
register('probability', '66-67,69,71', '68-69,71,73', '67-68,70,72');
register('statistics', '68,70', '70,72', '69,71');
register('light', '61', '63', '62');
for (let index = 1; index <= 10; index++) registry[`ml-${index}`] = Object.freeze({ family: 'network' });
export const MATH_TRACE_REGISTRY = Object.freeze(registry);

const MAX_ITEMS = 128;
const numeric = value => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1e100
  && (!Number.isInteger(value) || Number.isSafeInteger(value));
const finiteResult = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
const isVector = value => Array.isArray(value) && value.length > 0 && value.length <= MAX_ITEMS && value.every(numeric);
const isMatrix = value => Array.isArray(value) && value.length > 0 && value.length <= MAX_ITEMS
  && value.every(isVector) && value.every(row => row.length === value[0].length) && value.length * value[0].length <= MAX_ITEMS;

/** Runtime previews are data. Never run a preview or call an inspected object. */
export function mathTraceCollection(preview) {
  if (typeof preview !== 'string' || preview.length > 4096 || !preview.trim().startsWith('[')) return null;
  try {
    const value = JSON.parse(preview);
    return isVector(value) || isMatrix(value) ? value : null;
  } catch { return null; }
}

const CONSTANTS = Object.freeze({ PI: Math.PI, pi: Math.PI, E: Math.E, e: Math.E });
const PURE = Object.freeze({
  sqrt: Math.sqrt, abs: Math.abs, pow: Math.pow, sin: Math.sin, cos: Math.cos, tan: Math.tan,
  log: Math.log, log2: Math.log2, log10: Math.log10, exp: Math.exp, floor: Math.floor,
  ceil: Math.ceil, round: Math.round, trunc: Math.trunc, min: Math.min, max: Math.max,
  hypot: Math.hypot, radians: value => value * Math.PI / 180,
});

// A deliberately small constant reader for trusted authored operands. This is
// not a JavaScript interpreter: user functions, getters and arbitrary calls are
// never invoked, and edited source never enters it.
function constant(node, bindings, budget = { left: 512 }) {
  if (!node || --budget.left < 0) return null;
  const read = child => constant(child, bindings, budget);
  if (node.type === 'Literal') return numeric(node.value) || typeof node.value === 'boolean' ? node.value : null;
  if (node.type === 'Identifier') return bindings.get(node.name) ?? CONSTANTS[node.name] ?? null;
  if (node.type === 'ArrayExpression') {
    if (node.elements.length > MAX_ITEMS) return null;
    const values = node.elements.map(read);
    return isVector(values) || isMatrix(values) ? values : null;
  }
  if (node.type === 'UnaryExpression') {
    const value = read(node.argument);
    if (typeof value !== 'number') return null;
    return node.operator === '-' ? -value : node.operator === '+' ? value : null;
  }
  if (node.type === 'MemberExpression') {
    if (!node.computed && ['Math', 'math', 'np'].includes(node.object?.name)) return CONSTANTS[node.property.name] ?? null;
    const object = read(node.object), index = node.computed ? read(node.property) : null;
    return Array.isArray(object) && Number.isInteger(index) && index >= 0 && index < object.length ? object[index] : null;
  }
  if (node.type === 'BinaryExpression') {
    const a = read(node.left), b = read(node.right);
    if (typeof a !== 'number' || typeof b !== 'number') return null;
    const operation = { '+': () => a + b, '-': () => a - b, '*': () => a * b, '/': () => a / b,
      '%': () => a % b, '**': () => a ** b }[node.operator];
    if (!operation) return null;
    const result = operation();
    return numeric(result) ? result : null;
  }
  if (node.type === 'CallExpression') {
    let name;
    if (node.callee.type === 'Identifier' && Object.hasOwn(PURE, node.callee.name)) name = node.callee.name;
    if (node.callee.type === 'MemberExpression' && !node.callee.computed
      && ['Math', 'math'].includes(node.callee.object?.name)) name = node.callee.property.name;
    const args = node.arguments.map(read);
    if (name && Object.hasOwn(PURE, name) && args.every(value => typeof value === 'number')) {
      return finiteResult(PURE[name](...args));
    }
    if (node.callee.type === 'MemberExpression' && node.callee.object?.name === 'np'
      && node.callee.property?.name === 'array' && args.length === 1 && (isVector(args[0]) || isMatrix(args[0]))) return args[0];
    if (node.callee.type === 'Identifier' && node.callee.name === 'set' && isVector(args[0])) return [...new Set(args[0])];
    if (node.callee.type === 'Identifier' && node.callee.name === 'range' && args.length >= 1 && args.length <= 3 && args.every(Number.isInteger)) {
      const [from, to, step] = args.length === 1 ? [0, args[0], 1] : [args[0], args[1], args[2] ?? 1];
      const count = step === 0 ? Infinity : Math.max(0, Math.ceil((to - from) / step));
      if (count > 0 && count <= MAX_ITEMS) return Array.from({ length: count }, (_, i) => from + i * step);
    }
  }
  if (node.type === 'NewExpression' && node.callee.name === 'Set' && node.arguments.length === 1) {
    const value = read(node.arguments[0]);
    return isVector(value) ? [...new Set(value)] : null;
  }
  return null;
}

function expression(text, bindings) {
  if (typeof text !== 'string' || text.length > 8192) return null;
  let normalized = text.trim().replace(/\bstd::f(?:32|64)::consts::PI\b/g, 'Math.PI')
    .replace(/\bM_PI\b/g, 'Math.PI').replace(/\b(\d+(?:\.\d+)?)(?:_f64|_f32)\b/g, '$1');
  if (normalized.startsWith('{')) normalized = normalized.replaceAll('{', '[').replaceAll('}', ']');
  let depth = 0;
  for (let index = 0; index < normalized.length; index++) {
    const character = normalized[index];
    if ('([{'.includes(character)) depth++;
    else if (')]}'.includes(character)) { if (depth === 0) { normalized = normalized.slice(0, index); break; } depth--; }
    else if (depth === 0 && ',;\n'.includes(character)) { normalized = normalized.slice(0, index); break; }
  }
  const repeated = /^\[\s*([+-]?[\d.]+)\s*;\s*(\d+)\s*\]/.exec(normalized);
  if (repeated) {
    const value = Number(repeated[1]), count = Number(repeated[2]);
    return numeric(value) && count > 0 && count <= MAX_ITEMS ? Array(count).fill(value) : null;
  }
  try { return constant(parseExpressionAt(normalized, 0, { ecmaVersion: 'latest' }), bindings); }
  catch { return null; }
}

function sourceBindings(source, language) {
  if (language === 'python') source = source.replace(/#[^\n]*/g, '');
  const result = new Map();
  // Assignment names and right-hand literals are sufficient for authored input
  // declarations in all four syntaxes. No inferred function body is executed.
  const declaration = /\b([A-Za-z_]\w*)\s*(?:\[[\d ]*\]\s*)*(?::\s*(?:\[[^\]\n]*\]|[A-Za-z_]\w*))?\s*=(?!=|>)/g;
  let attempts = 0;
  for (const match of source.matchAll(declaration)) {
    if (++attempts > 128) break;
    if (result.has(match[1])) continue;
    const value = expression(source.slice(match.index + match[0].length, match.index + match[0].length + 8192), result);
    if (value !== null) result.set(match[1], value);
  }
  // The full classifier's initial parameters are literal object fields in its
  // factory. Read only those four named numeric fields, never call the factory.
  for (const match of source.matchAll(/\b(W1|W2|b1|b2)\s*:\s*/g)) {
    if (result.has(match[1])) continue;
    const value = expression(source.slice(match.index + match[0].length, match.index + match[0].length + 8192), result);
    if (isVector(value) || isMatrix(value)) result.set(match[1], value);
  }
  return result;
}

function context(example, model, source, language) {
  const match = /^(en|py|zh|ml)-(\d+)(?:-\d+)?$/.exec(example?.element?.dataset?.codeExample || example?.exampleId || '');
  const id = match ? `${match[1]}-${Number(match[2])}` : '';
  const authored = Boolean(registry[id] && example?.variants?.[language]?.source === source);
  const frame = model?.frame;
  const recorded = new Map();
  for (const [name, preview] of Object.entries(frame?.locals ?? {}).slice(0, 25)) {
    const array = mathTraceCollection(preview);
    const scalar = traceScalar(preview);
    if (array !== null) recorded.set(name, array);
    else if (scalar !== null && numeric(scalar)) recorded.set(name, scalar);
    else if (/^(?:true|True)$/.test(preview)) recorded.set(name, true);
    else if (/^(?:false|False)$/.test(preview)) recorded.set(name, false);
  }
  const literal = authored ? sourceBindings(source, language) : new Map();
  let usedRecorded = false, usedAuthored = false;
  const get = (names, predicate) => {
    for (const name of names) if (predicate(recorded.get(name))) { usedRecorded = true; return recorded.get(name); }
    for (const name of names) if (predicate(literal.get(name))) { usedAuthored = true; return literal.get(name); }
    return null;
  };
  return { id, authored, frame, model, source, language, recorded, literal,
    number: (...names) => get(names, value => typeof value === 'number'),
    capturedNumber: (...names) => {
      for (const name of names) if (typeof recorded.get(name) === 'number') { usedRecorded = true; return recorded.get(name); }
      return null;
    },
    array: (...names) => get(names, value => isVector(value) || isMatrix(value)),
    vector: (...names) => get(names, isVector),
    matrix: (...names) => get(names, isMatrix),
    value: (...names) => get(names, value => value !== undefined),
    get provenance() { return usedRecorded && usedAuthored ? 'mixed' : usedRecorded ? 'recorded' : 'authored'; },
  };
}

function scene(c, kind, title, formulaText, formulaTex, data, description = '') {
  const provenance = c.provenance;
  const explanations = {
    comparison: 'Equal values line up. Different values sit apart.', arithmetic: 'The marked quantities show how this operation changes a value.',
    vector: 'Each arrow starts at the origin. Its coordinates determine its length and direction.',
    matrix: 'Entries work together through rows, columns and the dimensions they share.',
    function: 'A point pairs an input on the horizontal axis with its output on the vertical axis.',
    network: 'Follow the numbers through this operation. Each output depends on the inputs connected to it.',
    probability: 'Each part contributes to the whole. Its size shows how much it contributes.',
    combinatorics: 'Selecting a group is different from arranging its members in order.',
  };
  return { kind, title, formulaText, formulaTex, data, authored: c.authored, exampleId: c.id,
    provenance, stage: c.frame ? `Recorded state at line ${c.frame.line}` : 'Mathematical rule',
    description: description || explanations[kind] || 'The picture follows the mathematical relationship shown above.',
  };
}

const sampled = (fn, from = -3, to = 3, selected = null) => Array.from(new Set([...Array.from({ length: 49 }, (_, i) => from + (to - from) * i / 48), ...(typeof selected === 'number' && selected >= from && selected <= to ? [selected] : [])])).sort((a, b) => a - b).map(x => {
  return [x, fn(x)];
}).filter(point => point.every(Number.isFinite));
const sum = values => values.reduce((total, value) => total + value, 0);
const dot = (a, b) => a && b && a.length === b.length ? finiteResult(sum(a.map((value, i) => value * b[i]))) : null;
const translated = (c, en, py, zh = en) => c.id.startsWith('py-') ? py : c.id.startsWith('zh-') ? zh : en;
const indexOf = c => Number(c.id.split('-')[1]);

function literalCalls(c, names) {
  const lines = c.source.split('\n');
  const selected = lines[(c.frame?.line ?? 1) - 1] ?? '';
  const find = text => {
    const calls = [];
    for (const name of names) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`\\b${escaped}\\s*\\(`, 'g');
      for (const match of text.matchAll(pattern)) {
        if (/\b(?:function|def|fn)\s*$/.test(text.slice(Math.max(0, match.index - 24), match.index))) continue;
        const tail = text.slice(match.index, match.index + 8192);
        try {
          const node = parseExpressionAt(tail, 0, { ecmaVersion: 'latest' });
          if (node.type !== 'CallExpression') continue;
          const bindings = new Map([...c.literal, ...c.recorded]);
          const args = node.arguments.map(argument => constant(argument, bindings));
          if (args.length && args.every(value => value !== null)) calls.push(args);
        } catch {}
      }
    }
    return calls;
  };
  const current = find(selected);
  return c.frame ? current : find(c.source);
}

function comparison(c) {
  const line = c.model?.sourceLine || c.source.split('\n')[(c.frame?.line ?? 1) - 1] || '';
  const relation = /([+-]?\d+(?:\.\d+)?)\s*(===|!==|==|!=|<=|>=|<|>)\s*([+-]?\d+(?:\.\d+)?)/.exec(line);
  if (relation) {
    const a = Number(relation[1]), b = Number(relation[3]), operator = relation[2];
    const result = ({ '===': a === b, '==': a === b, '!==': a !== b, '!=': a !== b, '<': a < b, '>': a > b, '<=': a <= b, '>=': a >= b })[operator];
    return scene(c, 'comparison', 'Compare two quantities', `${a} ${operator} ${b}`, `${a} ${operator.replaceAll('===', '=').replaceAll('==', '=')} ${b}`, { a, b, equal: a === b, result, operator });
  }
  const k = c.number('k'), j = c.number('j'), x = c.number('x');
  const A = c.value('A'), B = c.value('B');
  if (/\bplus\s*\(/.test(c.source)) {
    const call = literalCalls(c, ['plus'])[0];
    const a = c.number('x') ?? call?.[0] ?? null, b = c.number('y') ?? call?.[1] ?? null;
    return scene(c, 'arithmetic', 'Addition joins two quantities', 'plus(x,y) = x+y', 'f(x,y)=x+y', { operation: 'add', a, b, result: a === null || b === null ? null : a + b });
  }
  if (/orderOfMagnitude|order_of_magnitude/.test(c.source)) {
    const a = k !== null && k > 0 ? Math.trunc(Math.log10(k)) : null, b = j !== null && j > 0 ? Math.trunc(Math.log10(j)) : null;
    return a === null || b === null ? scene(c, 'relation', 'A logarithm counts decimal scales', 'order(n) = trunc(log₁₀ n), n>0', String.raw`\operatorname{order}(n)=\operatorname{trunc}(\log_{10}n)`, { operation: 'scale', values: [], labels: ['n', 'log₁₀ n', 'integer order'] })
      : scene(c, 'comparison', 'Compare decimal scales', 'order(k) > order(j)', String.raw`\operatorname{order}(k)>\operatorname{order}(j)`, { a, b, operator: '>', equal: a === b, result: a > b });
  }
  if (c.source.includes('2 * k * j') || c.source.includes('2*k*j')) return scene(c, 'arithmetic', 'A definition relates its quantities', 'x = 2kj', 'x=2kj', { operation: 'multiply', a: k, b: j === null ? null : 2 * j, result: x });
  const implication = c.id === 'py-46' || ['en-42', 'zh-42'].includes(c.id);
  const operation = implication ? 'implication' : /&&|\band\b/.test(c.source) ? 'and' : /\|\||\bor\b/.test(c.source) ? 'or' : /!|\bnot\b/.test(c.source) ? 'not' : 'equality';
  const formulas = {
    implication: ['A ⇒ B ≡ ¬A ∨ B', String.raw`A\implies B\;\equiv\;\neg A\lor B`],
    and: ['A and B must both hold', String.raw`A\land B`], or: ['A or B (or both) may hold', String.raw`A\lor B`],
    not: ['Not equal: ¬(x=y)', String.raw`\neg(x=y)`], equality: ['Equal values make the same quantity', 'a=b'],
  };
  return scene(c, 'relation', 'A logical relationship', ...formulas[operation], {
    operation,
    values: [A, B].filter(value => typeof value === 'boolean'), labels: ['A', 'B'],
  });
}

function delta(c) {
  const calls = literalCalls(c, ['kroneckerDelta', 'kronecker_delta']);
  const i = c.capturedNumber('i'), j = c.capturedNumber('j');
  const pair = i !== null && j !== null ? [i, j] : calls.find(args => args.length === 2) ?? [null, null];
  const known = pair.every(value => typeof value === 'number');
  return scene(c, 'comparison', 'Kronecker delta tests matching indices', 'δᵢⱼ = 1 when i = j, otherwise 0', String.raw`\delta_{ij}=\begin{cases}1&i=j\\0&i\ne j\end{cases}`,
    { a: pair[0], b: pair[1], equal: known ? pair[0] === pair[1] : null, result: known ? Number(pair[0] === pair[1]) : null, operator: 'δ', cases: calls },
    known ? `The indices ${pair[0]} and ${pair[1]} ${pair[0] === pair[1] ? 'match, so the delta is 1. This is a diagonal entry in an identity matrix.' : 'are different, so the delta is 0. This is outside the diagonal of an identity matrix.'}` : 'Matching indices give 1. Different indices give 0. That is why the identity matrix has ones only on its diagonal.');
}

function arithmetic(c) {
  const n = indexOf(c), power = translated(c, 62, 64, 63), modular = translated(c, 64, 66, 65);
  let operation = 'multiply', a = c.number('s', 'k'), b = c.number('j'), result = c.number('result');
  if ([22, 24].includes(n) && /abs/.test(c.source)) { operation = 'absolute'; a = c.number('x'); }
  else if (n === power) { operation = 'power'; a = c.number('base'); b = c.number('exponent'); }
  else if (n === modular) { operation = 'mod'; a = c.number('a'); b = c.number('modulus'); }
  else if (/floor|ceil|round/.test(c.source)) { operation = /ceil/.test(c.model?.sourceLine ?? '') ? 'ceil' : /round/.test(c.source) ? 'round' : 'floor'; a = c.number('x'); const call = literalCalls(c, [operation, `Math.${operation}`, `math.${operation}`])[0]; if (a === null && call) a = call[0]; }
  else if (/5\s*\*\s*4/.test(c.source)) { a = 5; b = 4; }
  else if (/3\s*\*\s*k\s*\*\s*j/.test(c.source) && b !== null) b *= 3;
  if (a !== null && result === null) result = finiteResult(operation === 'absolute' ? Math.abs(a) : operation === 'floor' ? Math.floor(a) : operation === 'ceil' ? Math.ceil(a) : operation === 'round' ? Math.round(a) : b === null ? NaN : operation === 'power' ? a ** b : operation === 'mod' && b !== 0 ? ((a % b) + b) % b : operation === 'multiply' ? a * b : NaN);
  const formula = operation === 'mod' ? 'a = qm + r, 0 ≤ r < m' : operation === 'power' ? 'bᵉ ↔ log_b(bᵉ) = e' : operation === 'absolute' ? '|x| = distance from zero' : ['floor', 'ceil', 'round'].includes(operation) ? `${operation}(x)` : 'a × b';
  const tex = operation === 'power' ? 'b^e' : operation === 'absolute' ? '|x|' : operation === 'mod' ? String.raw`a\equiv r\pmod m` : operation === 'floor' ? String.raw`\lfloor x\rfloor` : operation === 'ceil' ? String.raw`\lceil x\rceil` : operation === 'round' ? String.raw`\operatorname{round}(x)` : String.raw`a\times b`;
  return scene(c, 'arithmetic', { mod: 'Wrap around the modulus', power: 'Powers and logarithms undo each other', absolute: 'Distance from zero', floor: 'The neighboring integers', ceil: 'The neighboring integers', round: 'The neighboring integers' }[operation] || 'Scale a quantity', formula, tex, { operation, a, b, result });
}

function complex(c) {
  if (indexOf(c) === 5) {
    const x = c.number('x') ?? (c.id.startsWith('py-') ? 2 : 9);
    return scene(c, 'arithmetic', 'A root squares back to its input', 'r² = x', 'r^2=x', { operation: 'root', a: x, b: 2, result: Math.sqrt(x) });
  }
  if (!c.id.startsWith('py-')) return scene(c, 'vector', 'Multiplying by i rotates a complex number', '(3−i)i = 1+3i', '(3-i)i=1+3i', { operation: 'complex', action: 'multiply', a: [3, -1], b: [0, 1], result: [1, 3] }, 'Multiplication by i turns (3,−1) counterclockwise by a quarter turn, giving (1,3).');
  if (indexOf(c) === 7) return scene(c, 'vector', 'Conjugate cube roots meet at one', 'z³ = z̄³ = 1', String.raw`z^3=\bar z^3=1`, { operation: 'complex', action: 'power', a: [-0.5, Math.sqrt(3) / 2], b: [-0.5, -Math.sqrt(3) / 2], result: [1, 0] }, 'The two points mirror each other across the real axis. Cubing either one brings it to 1 on the real axis.');
  const a = [1, 1], magnitude = Math.SQRT2;
  return scene(c, 'vector', 'The principal root halves the complex angle', 'w² = 1+i', 'w^2=1+i', { operation: 'complex', action: 'root', a, result: [Math.sqrt((magnitude + 1) / 2), Math.sqrt((magnitude - 1) / 2)] }, 'The horizontal coordinate is real; the vertical coordinate is imaginary. Squaring the root returns the point (1,1).');
}

function sequence(c) {
  const n = indexOf(c), mean = n === translated(c, 20, 21);
  const product = n === translated(c, 21, 22) || c.id === 'py-23' && /\b(?:prod|product)\b|\bys\b/.test(c.model?.sourceLine ?? '');
  const operation = mean ? 'mean' : product ? 'product' : 'sum';
  let values = c.vector('values', product ? 'ys' : 'xs');
  const i = c.capturedNumber('i', 'k'), j = c.capturedNumber('j');
  if (!values && n === translated(c, 19, 20)) values = [1, 2].flatMap(a => [4, 5, 6].map(b => 3 * a * b));
  if (!values && !/def\s+sum_to_n|function\s+sumToN/.test(c.source)) {
    const count = product ? 6 : 100;
    const odd = n === translated(c, 18, 19) || c.id === 'py-23' && !product;
    values = Array.from({ length: count }, (_, offset) => odd && !product ? 2 * (offset + 1) + 1 : offset + 1);
  }
  const capturedAccumulator = mean ? c.capturedNumber('mean', 'average', 'avg') : product ? c.capturedNumber('product', 'value') : c.capturedNumber('sum', 'total');
  const accumulator = capturedAccumulator ?? (mean && values?.length ? sum(values) / values.length : null);
  let index = i === null ? null : i - 1;
  if (j !== null && i !== null && n === translated(c, 19, 20)) index = (i - 1) * 3 + j - 4;
  const previousPreview = c.model?.previous?.locals;
  const previous = previousPreview ? ['sum', 'total', 'value', 'product'].map(name => traceScalar(previousPreview[name])).find(value => value !== null) ?? null : null;
  return scene(c, 'sequence', mean ? 'Equalize a total across its observations' : product ? 'Multiply indexed terms' : 'Accumulate indexed terms', mean ? 'mean = Σxᵢ / n' : product ? 'Πᵢ xᵢ' : 'Σᵢ xᵢ', mean ? String.raw`\bar x=\frac1n\sum_i x_i` : product ? String.raw`\prod_i x_i` : String.raw`\sum_i x_i`, { operation, values: values ?? [], index, accumulator, accumulatorRecorded: capturedAccumulator !== null, previous }, mean && values?.length ? `The ${values.length} values total ${sum(values)}. Sharing that total equally gives ${sum(values) / values.length} per value.` : 'Each item is one term. The highlighted term follows the loop index; the running accumulator shows progress through the terms.');
}

function vector(c) {
  const n = indexOf(c);
  let operation = [12, 13].includes(n) && !c.id.startsWith('py-') || c.id.startsWith('py-') && [13, 14].includes(n) ? 'dot'
    : [14, 15].includes(n) && !c.id.startsWith('py-') || c.id.startsWith('py-') && [15, 16].includes(n) ? 'cross'
      : /normaliz/.test(c.source) ? 'normalize' : /length|norm/.test(c.source) ? 'norm' : 'scale';
  let a = c.vector('vec', 'v', 'a', 'k'), b = c.vector('b', 'j'), scalar = c.number('s', 'scalar');
  let result = c.vector('result', 'unit');
  if (a && operation === 'dot') result = dot(a, b);
  if (a && operation === 'cross' && a.length === 3 && b?.length === 3) result = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  if (a && ['normalize', 'norm'].includes(operation)) {
    const length = Math.hypot(...a);
    result = operation === 'norm' ? length : length === 0 ? null : a.map(value => value / length);
  }
  if (a && operation === 'scale' && !result) {
    const paired = b?.length === a.length ? a.map((value, i) => value * b[i]) : a;
    if (scalar !== null) result = paired.map(value => value * scalar);
    else if (b) result = paired;
  }
  return scene(c, 'vector', { dot: 'Project, pair and sum', cross: 'Construct the perpendicular direction', normalize: 'Keep direction and make length one', norm: 'Measure distance from the origin', scale: 'Transform the vector components' }[operation], { dot: 'a · b = Σaᵢbᵢ', cross: 'a × b ⟂ a, b', normalize: 'v̂ = v / ‖v‖', norm: '‖v‖ = √Σvᵢ²', scale: 'rᵢ = s aᵢ bᵢ' }[operation], { dot: String.raw`a\cdot b=\sum_i a_ib_i`, cross: String.raw`a\times b`, normalize: String.raw`\hat v=\frac{v}{\lVert v\rVert}`, norm: String.raw`\lVert v\rVert=\sqrt{\sum_i v_i^2}`, scale: 'r_i=sa_ib_i' }[operation], { operation, a: a ?? [], b, scalar, result, index: c.number('i') });
}

function matrix(c) {
  const tensor = indexOf(c) >= translated(c, 53, 55), determinant = indexOf(c) === translated(c, 25, 28) || c.id === 'py-29';
  let a = c.matrix('A', 'a', 'matrix', 'ident_2'), b = c.matrix('B', 'b');
  const flat = c.vector('matrix');
  if (!a && flat?.length === 4) a = [flat.slice(0, 2), flat.slice(2)];
  if (tensor && !a) { const u = c.vector('u'); if (u) a = u.map(value => [value]); }
  if (tensor && !b) { const v = c.vector('v'); if (v) b = [v]; }
  const call = literalCalls(c, ['multiplyMatrices', 'multiply_matrices', 'kroneckerProduct', 'kronecker_product']).find(args => isMatrix(args[0]) && isMatrix(args[1]));
  if (!a && call) [a, b] = call;
  let result = null;
  if (a && determinant && a.length === 2 && a[0].length === 2) result = a[0][0] * a[1][1] - a[0][1] * a[1][0];
  else if (a && b && tensor && a.length * b.length * a[0].length * b[0].length <= MAX_ITEMS) result = a.flatMap(row => b.map(br => row.flatMap(value => br.map(bv => value * bv))));
  else if (a && b && a[0].length === b.length && a.length * b[0].length <= MAX_ITEMS) result = a.map(row => b[0].map((_, j) => sum(row.map((value, k) => value * b[k][j]))));
  return scene(c, 'matrix', tensor ? 'Each entry scales an entire block' : determinant ? 'Area and orientation under a transformation' : 'Pair a row with a column', tensor ? 'A ⊗ B = [aᵢⱼB]' : determinant ? 'det A = ad − bc' : 'Cᵢⱼ = Σₖ AᵢₖBₖⱼ', tensor ? String.raw`A\otimes B=[a_{ij}B]` : determinant ? String.raw`\det A=ad-bc` : String.raw`C_{ij}=\sum_k A_{ik}B_{kj}`, { operation: tensor ? 'tensor' : determinant ? 'determinant' : 'multiply', a: a ?? [], b, result, row: c.number('i'), column: c.number('j') });
}

function sets(c) {
  const n = indexOf(c);
  const intervals = n >= translated(c, 50, 51);
  if (!intervals && n >= translated(c, 30, 35)) return scene(c, 'relation', 'Number classes contain earlier classes', 'ℕ ⊆ ℤ ⊆ ℚ ⊆ ℝ ⊆ ℂ', String.raw`\mathbb N\subseteq\mathbb Z\subseteq\mathbb Q\subseteq\mathbb R\subseteq\mathbb C`, { operation: 'number-sets', values: [], labels: ['ℕ', 'ℤ', 'ℚ', 'ℝ', 'ℂ'] }, 'These are overlapping mathematical domains. The natural-number convention may include or exclude zero; no unexecuted predicate result is asserted.');
  if (intervals) {
    const four = !c.id.startsWith('py-') && n === 50;
    return scene(c, 'sets', 'An endpoint can be included or excluded', four ? '(0,1), (0,1], [0,1), [0,1]' : 'A=[3,5), B=[4,6]', four ? String.raw`(0,1),\;(0,1],\;[0,1),\;[0,1]` : String.raw`A=[3,5),\quad B=[4,6]`, {
      operation: 'interval', a: four ? [0, 1] : [3, 5], b: four ? null : [4, 6],
      intervals: four ? [
        { name: 'A', lo: 0, hi: 1, openLeft: true, openRight: true },
        { name: 'B', lo: 0, hi: 1, openLeft: true, openRight: false },
        { name: 'C', lo: 0, hi: 1, openLeft: false, openRight: true },
        { name: 'D', lo: 0, hi: 1, openLeft: false, openRight: false },
      ] : [{ name: 'A', lo: 3, hi: 5, openLeft: false, openRight: true }, { name: 'B', lo: 4, hi: 6, openLeft: false, openRight: false }],
    }, 'Hollow dots leave an endpoint out. Filled dots include it. Overlapping parts belong to both intervals.');
  }
  const call = literalCalls(c, ['set'])[0];
  const a = c.vector('A', 'a') ?? (isVector(call?.[0]) ? [...new Set(call[0])] : []), b = c.vector('B', 'b') ?? [];
  const line = c.model?.sourceLine ?? '';
  const operation = /intersection|\band\b/.test(line) ? 'intersection' : /difference|\bnot\b/.test(line) ? 'difference' : /union|\bor\b/.test(line) ? 'union' : 'membership';
  const element = /(?:has|indexOf)\s*\(\s*([\d.-]+)/.exec(line)?.[1] ?? /([\d.-]+)\s+in\b/.exec(line)?.[1];
  return scene(c, 'sets', intervals ? 'Endpoints determine what belongs' : 'A membership test selects an element', intervals ? 'A ∩ B; A ∪ B; A ∖ B' : 'x ∈ A', intervals ? String.raw`A\cap B,\quad A\cup B,\quad A\setminus B` : String.raw`x\in A`, { a, b, operation, element: element === undefined ? null : Number(element), result: element === undefined || !a.length ? null : a.includes(Number(element)), intervals });
}

function functionScene(c) {
  const sign = /sgn|signum/.test(c.source), piecewise = /if\s*\(?\s*x\s*>=?\s*1/.test(c.source);
  const x = c.number('x', 'k'), rule = sign ? value => Math.sign(value) : piecewise ? value => value >= 1 ? value - 1 : 0 : value => value * value;
  if (/sqrt\s*\(\s*x\s*\*\s*x\s*\+\s*y\s*\*\s*y|\(\s*x\s*\*\s*x\s*\+\s*y\s*\*\s*y\s*\)\s*\.\s*sqrt\s*\(\s*\)/.test(c.source)) {
    const y = x === null ? null : c.number('y');
    const knownCoordinates = x !== null && y !== null;
    return scene(c, 'vector', 'Two coordinates determine a length', 'ℓ(x,y) = √(x²+y²)', String.raw`\ell(x,y)=\sqrt{x^2+y^2}`, { operation: 'norm', a: knownCoordinates ? [x, y] : [], result: null }, knownCoordinates ? '' : 'The horizontal and vertical sides are |x| and |y|. The diagonal is the length returned by this rule.');
  }
  return scene(c, 'function', sign ? 'The sign selects one of three levels' : piecewise ? 'The input selects its branch' : 'A rule maps each input to its output', sign ? 'sgn(x) ∈ {−1,0,1}' : piecewise ? 'f(x) = x−1 if x≥1; otherwise 0' : 'f(x) = x²', sign ? String.raw`\operatorname{sgn}(x)` : piecewise ? String.raw`f(x)=\begin{cases}x-1&x\ge1\\0&x<1\end{cases}` : 'f(x)=x^2', { operation: 'curve', x, points: sampled(rule, -3, 3, x), result: x === null ? null : rule(x), discontinuities: sign ? [0] : [] });
}

function derivative(c) {
  const finite = indexOf(c) === translated(c, 55, 57);
  let x = c.number('x', 'oldX', 'x_before', 'x0'), other = c.number('newX', 'x_after', 'x1');
  if (x === null && indexOf(c) === translated(c, 57, 59, 58)) x = c.id.startsWith('py-') ? 3 : 2;
  const result = x === null ? null : finite && other !== null && other !== x ? (other * other - x * x) / (other - x) : 2 * x;
  const points = sampled(value => value * value, Math.min(-1, x ?? 0), Math.max(4, x ?? 0, other ?? 0), x);
  if (finite && other !== null && !points.some(point => point[0] === other)) points.push([other, other * other]);
  points.sort((a, b) => a[0] - b[0]);
  return scene(c, 'function', finite ? 'A secant measures a finite change' : 'A tangent measures local change', finite ? 'Δf / Δx = (f(x₁)−f(x₀))/(x₁−x₀)' : 'f(x)=x²; f′(x)=2x', finite ? String.raw`\frac{\Delta f}{\Delta x}=\frac{f(x_1)-f(x_0)}{x_1-x_0}` : String.raw`f(x)=x^2,\quad f\prime(x)=2x`, { operation: 'derivative', x, points, result, slope: result, a: finite ? x : null, b: finite ? other : null });
}

function gradient(c) {
  const weights = c.vector('weights', 'w') ?? [];
  const gradient = weights.length === 2 ? [(weights[0] - 2) / 2, (weights[1] - 4) / 2] : [];
  const learningRate = c.number('learningRate', 'learning_rate', 'eta') ?? 0.5;
  const result = weights.length === 2 ? weights.map((value, i) => value - learningRate * gradient[i]) : [];
  return scene(c, 'network', 'A gradient points toward increasing loss', 'w′ = w − η∇L(w)', String.raw`w\prime=w-\eta\nabla L(w)`, { operation: 'update', inputs: weights, outputs: result, gradient, previous: weights, learningRate }, 'Multiply the gradient by the step size, then move in the opposite direction. Both coordinates use the same old weights.');
}

function integral(c) {
  const indefinite = indexOf(c) === translated(c, 59, 61, 60);
  const cubic = c.id === 'zh-60', C = c.number('C', 'constant') ?? 0;
  const calls = literalCalls(c, ['integrateTrapezoid', 'integrate_trapezoid']);
  // Function-valued arguments are deliberately not interpreted. Bounds of the
  // authored x² trapezoid examples are explicit and retain reversed order.
  const reversed = /(?:,\s*1\s*,\s*0\s*,)/.test(c.model?.sourceLine ?? '');
  const a = c.number('a') ?? (reversed ? 1 : 0), b = c.number('b') ?? (reversed ? 0 : 1);
  const x = c.number('x');
  const fn = indefinite ? cubic ? value => value ** 3 / 3 + C : value => value * value + C : value => value * value;
  return scene(c, 'function', indefinite ? 'A constant shifts the antiderivative' : 'Signed area accumulates between bounds', indefinite ? cubic ? 'F(x)=x³/3+C; F′(x)=x²' : 'F(x)=x²+C; F′(x)=2x' : '∫ₐᵇ x² dx = (b³−a³)/3', indefinite ? cubic ? String.raw`F(x)=\frac{x^3}3+C` : 'F(x)=x^2+C' : String.raw`\int_a^b x^2\,dx=\frac{b^3-a^3}3`, { operation: indefinite ? 'curve' : 'integral', x, points: sampled(fn, -1, 3), a, b, result: indefinite ? x === null ? null : fn(x) : (b ** 3 - a ** 3) / 3 });
}

function probability(c) {
  const n = indexOf(c), bayes = n === translated(c, 69, 71, 70), expectation = n === translated(c, 67, 69, 68), entropy = n === translated(c, 71, 73, 72);
  if (bayes) {
    const prior = c.number('prior'), sensitivity = c.number('truePositive', 'true_positive'), falsePositive = c.number('falsePositive', 'false_positive');
    const values = prior === null || sensitivity === null || falsePositive === null ? [] : [prior * sensitivity, (1 - prior) * falsePositive];
    return scene(c, 'probability', 'Condition on all positive signals', 'P(A|+) = P(+,A) / P(+)', String.raw`P(A\mid+)=\frac{P(+,A)}{P(+)}`, { operation: 'bayes', values, labels: ['True positive', 'False positive'], result: values.length && sum(values) ? values[0] / sum(values) : null });
  }
  const weights = c.vector('probabilities', 'p'), values = c.vector('values', 'outcomes');
  if (entropy) {
    const result = weights && weights.every(value => value >= 0) ? -sum(weights.map(value => value === 0 ? 0 : value * Math.log2(value))) : null;
    return scene(c, 'probability', 'Entropy is probability-weighted surprise', 'H = −Σpᵢ log₂pᵢ', String.raw`H=-\sum_i p_i\log_2p_i`, { operation: 'entropy', values: weights ?? [], weights, labels: weights?.map((_, i) => `${i + 1}`) ?? [], result });
  }
  return scene(c, 'probability', expectation ? 'Weight each outcome before adding' : 'Compare the event with all outcomes', expectation ? 'E[X] = Σxᵢpᵢ' : 'P(A) = favorable / possible', expectation ? String.raw`\mathbb E[X]=\sum_i x_ip_i` : String.raw`P(A)=\frac{|A|}{|\Omega|}`, { operation: expectation ? 'expectation' : 'distribution', values: values ?? [], weights: weights ?? (!expectation && values ? values.map(() => 1 / values.length) : null), labels: values?.map(String) ?? [], result: expectation ? dot(values, weights) : c.number('probability') });
}

function statistics(c) {
  const x = c.vector('x'), y = c.vector('y');
  if (x && y && x.length === y.length) {
    const mx = sum(x) / x.length, my = sum(y) / y.length;
    const covariance = sum(x.map((value, i) => (value - mx) * (y[i] - my))) / x.length;
    const vx = sum(x.map(value => (value - mx) ** 2)) / x.length, vy = sum(y.map(value => (value - my) ** 2)) / y.length;
    return scene(c, 'probability', 'Centered pairs determine correlation', 'ρ = cov(X,Y)/(σₓσᵧ)', String.raw`\rho=\frac{\operatorname{cov}(X,Y)}{\sigma_X\sigma_Y}`, { operation: 'correlation', values: x, points: x.map((value, i) => [value, y[i]]), mean: mx, result: vx && vy ? covariance / Math.sqrt(vx * vy) : null });
  }
  const values = c.vector('values') ?? [], mean = values.length ? sum(values) / values.length : null;
  return scene(c, 'probability', 'Squared distances measure spread', 'Var(X) = mean((x−μ)²)', String.raw`\operatorname{Var}(X)=\frac1n\sum_i(x_i-\mu)^2`, { operation: 'variance', values, mean, result: mean === null ? null : sum(values.map(value => (value - mean) ** 2)) / values.length });
}

function initialTrainingLiterals(c) {
  if (!c.authored || c.id !== 'ml-10') return null;
  const start = /\b(?:makeNetwork|make_network)\s*\(/.exec(c.source)?.index;
  if (start === undefined) return null;
  // Read the authored factory's literal initializer, never execute the factory.
  // The bounded window ends before training; first fields win over gradients.
  const factory = c.source.slice(start, start + 1800), fields = Object.create(null);
  for (const match of factory.matchAll(/["']?\b(W1|W2|b1|b2)\b["']?\s*:\s*/gi)) {
    const name = /^w/i.test(match[1]) ? match[1].toUpperCase() : match[1].toLowerCase();
    if (fields[name] !== undefined) continue;
    const value = expression(factory.slice(match.index + match[0].length), new Map());
    if (isMatrix(value) || isVector(value)) fields[name] = value;
  }
  if (c.language === 'c') {
    const initializer = /\bNetwork\s+net\s*=\s*/.exec(factory);
    if (initializer) {
      const text = factory.slice(initializer.index + initializer[0].length).replaceAll('{', '[').replaceAll('}', ']');
      try {
        const aggregate = parseExpressionAt(text, 0, { ecmaVersion: 'latest' });
        if (aggregate.type === 'ArrayExpression' && aggregate.elements.length === 4) {
          const values = aggregate.elements.map(node => constant(node, new Map()));
          for (const [i, name] of ['W1', 'b1', 'W2', 'b2'].entries()) fields[name] = values[i];
        }
      } catch {}
    }
  }
  if (![fields.W1, fields.W2].every(value => isMatrix(value) && value.length === 2 && value[0].length === 2)
    || ![fields.b1, fields.b2].every(value => isVector(value) && value.length === 2)) return null;
  const dataset = (name, predicate) => {
    const declaration = new RegExp(`\\b${name}\\s*(?:\\[[\\d\\s]+\\]\\s*)*(?::[^=\\n]+)?\\s*=(?!=)`);
    const match = declaration.exec(c.source);
    const value = match ? expression(c.source.slice(match.index + match[0].length, match.index + match[0].length + 8192), new Map()) : null;
    return predicate(value) ? value : null;
  };
  return { net: { W1: fields.W1, b1: fields.b1, W2: fields.W2, b2: fields.b2 },
    X: dataset('X', isMatrix), y: dataset('[yY]', isVector) };
}

function network(c) {
  const n = indexOf(c), inputs = c.vector('x') ?? c.matrix('X')?.[0] ?? [];
  const W1 = c.matrix('W1', 'w1'), b1 = c.vector('b1'), W2 = c.matrix('W2', 'w2'), b2 = c.vector('b2');
  const net = W1 && b1 && W2 && b2 ? { W1, b1, W2, b2 } : null;
  let forward = null;
  if (net && inputs.length === 2) { try { forward = neuralForward(net, inputs); } catch {} }
  if (n === 1) {
    const p = c.number('pTrue', 'p_true');
    return scene(c, 'network', 'The true class probability determines loss', 'ℓ = −log pᵧ', String.raw`\ell=-\log p_y`, { operation: 'loss', inputs: p === null ? [] : [p], outputs: p !== null && p > 0 ? [-Math.log(p)] : [] });
  }
  if (n === 2) {
    const X = c.matrix('X') ?? [], y = c.vector('y');
    return scene(c, 'matrix', 'Rows are examples; columns are features', `X has ${X.length || 'N'} rows and ${X[0]?.length || 'D'} features`, String.raw`X\in\mathbb R^{N\times D}`, { operation: 'shapes', name: 'X', a: X, b: null, result: null, labels: y }, 'Read one example across a row. Read the same feature down a column. Each row has one correct class label.');
  }
  if (n === 3) {
    const outputs = W1 && b1 && inputs.length === W1.length ? b1.map((bias, j) => sum(inputs.map((value, i) => value * W1[i][j])) + bias) : [];
    return scene(c, 'network', 'Each hidden unit adds its weighted inputs', 'aⱼ = Σᵢ xᵢWᵢⱼ + bⱼ', String.raw`a_j=\sum_i x_iW_{ij}+b_j`, { operation: 'affine', inputs, weights: W1, bias: b1, outputs });
  }
  if (n === 4) {
    const a = c.vector('a') ?? [];
    return scene(c, 'network', 'ReLU keeps positive values', 'hᵢ = max(0,aᵢ)', String.raw`h_i=\max(0,a_i)`, { operation: 'relu', inputs: a, outputs: a.map(value => Math.max(0, value)) });
  }
  if (n === 6) {
    const z = c.vector('z') ?? [];
    const e = z.length ? z.map(value => Math.exp(value - Math.max(...z))) : [];
    return scene(c, 'network', 'Normalize relative scores into probabilities', 'pᵢ = exp(zᵢ−m) / Σ exp(zⱼ−m)', String.raw`p_i=\frac{e^{z_i-m}}{\sum_j e^{z_j-m}}`, { operation: 'softmax', inputs: z, outputs: e.map(value => value / sum(e)) });
  }
  if (n === 7) {
    const scores = c.matrix('scores') ?? [], labels = c.vector('y') ?? [];
    const losses = scores.map((row, i) => { const m = Math.max(...row); return labels[i] === undefined ? null : m + Math.log(sum(row.map(value => Math.exp(value - m)))) - row[labels[i]]; }).filter(value => typeof value === 'number');
    return scene(c, 'network', 'Average one loss from each example', 'L = mean(−log pᵧ)', String.raw`L=\frac1N\sum_n-\log p_{n,y_n}`, { operation: 'batch', inputs: losses, outputs: losses.length ? [sum(losses) / losses.length] : [], target: labels });
  }
  if (n === 8 && net && inputs.length === 2) {
    try {
      const back = neuralBackward(net, inputs, c.number('label') ?? 0);
      return scene(c, 'network', 'Send sensitivity backward through active paths', '∂L/∂W = input × gated hidden sensitivity', String.raw`\frac{\partial L}{\partial W_{ij}}=x_i\frac{\partial L}{\partial a_j}`, { operation: 'gradient', inputs, weights: W1, bias: b1, outputs: back.da, gradient: back.gradient.W1, target: c.number('label') ?? 0 });
    } catch {}
  }
  if (n === 10) {
    try {
      const initial = initialTrainingLiterals(c);
      const captured = {
        W1: c.recorded.get('W1') ?? c.recorded.get('w1'), W2: c.recorded.get('W2') ?? c.recorded.get('w2'),
        b1: c.recorded.get('b1'), b2: c.recorded.get('b2'),
      };
      const capturedParameters = [captured.W1, captured.W2].every(isMatrix) && [captured.b1, captured.b2].every(isVector);
      const selectedNet = capturedParameters ? captured : initial?.net;
      const X = isMatrix(c.recorded.get('X')) ? c.recorded.get('X') : initial?.X;
      const capturedLabels = c.recorded.get('y') ?? c.recorded.get('Y');
      const y = isVector(capturedLabels) ? capturedLabels : initial?.y;
      const losses = selectedNet && X && y && X.length === y.length ? X.map((row, i) => neuralSampleLoss(selectedNet, row, y[i])) : [];
      if (losses.length) {
        const result = scene(c, 'network', capturedParameters ? 'A full-batch update uses the mean loss' : 'The starting network has one loss per training row', 'θ′ = θ − η∇L', String.raw`\theta\prime=\theta-\eta\nabla L`, { operation: 'batch', inputs: losses, outputs: [sum(losses) / losses.length], gradient: neuralMeanGradients(selectedNet).W1, learningRate: c.number('learningRate', 'learning_rate') ?? 0.1, initialParameters: !capturedParameters }, capturedParameters ? 'Each bar is the loss for one training row. Their average is the loss used for a full-batch gradient step.' : 'For the starting network, each bar is the loss for one training row. Their average is the loss before training begins.');
        result.provenance = capturedParameters ? 'mixed' : 'authored';
        return result;
      }
    } catch {}
    return scene(c, 'relation', 'A full batch averages its example losses', 'L = (ℓ₁+⋯+ℓₙ)/N', String.raw`L=\frac1N\sum_n\ell_n`, { operation: 'mean-loss', values: [], labels: ['Per-example losses', 'Mean loss'] });
  }
  if (n === 9) {
    const old = c.literal.get('w') ?? c.literal.get('oldWeight') ?? c.literal.get('old_weight') ?? 0.5, gradient = c.number('gradient'), rate = c.number('eta', 'learningRate', 'learning_rate') ?? 0.1;
    return scene(c, 'network', 'Turn sensitivity into a parameter step', 'w′ = w − ηg', String.raw`w\prime=w-\eta g`, { operation: 'update', inputs: [old], outputs: gradient === null ? [] : [old - rate * gradient], gradient: gradient === null ? [] : [gradient], previous: [old], learningRate: rate });
  }
  const second = /W2|w2|b2/.test(c.model?.sourceLine ?? '') && /reduce|sum|\*|matmul/.test(c.model?.sourceLine ?? '');
  return scene(c, 'network', second ? 'Hidden values feed the output layer' : 'Inputs feed the first weighted layer', second ? 'z = hW₂+b₂' : 'a = xW₁+b₁', second ? 'z=hW_2+b_2' : 'a=xW_1+b_1', { operation: 'affine', inputs: second ? forward?.h ?? [] : inputs, weights: second ? W2 : W1, bias: second ? b2 : b1, outputs: second ? forward?.z ?? [] : forward?.a ?? [] });
}

function fallback(c) {
  const arrays = [], scalars = [];
  for (const [name, value] of c.recorded) {
    if (isVector(value) || isMatrix(value)) arrays.push({ name, values: value });
    else if (typeof value === 'number') scalars.push({ name, value });
  }
  return { kind: 'collections', title: 'The recorded mathematical state', formulaTex: '', formulaText: '',
    stage: c.frame ? `Recorded state at line ${c.frame.line}` : 'No recorded values', authored: false, provenance: 'recorded',
    description: 'The bars and cells show the numbers and arrays at this step in your code.',
    data: { arrays, scalars, changed: (c.model?.changes ?? []).filter(change => change.kind === 'changed' || change.kind === 'new').map(change => change.name) },
  };
}

/** Build geometry from one selected state; this function never executes code. */
export function mathTraceScene({ example, model, source, language }) {
  if (typeof source !== 'string' || source.length > 65536 || !model) return null;
  const c = context(example, model, source, language);
  if (!c.authored) return fallback(c);
  switch (registry[c.id].family) {
    case 'comparison': return comparison(c);
    case 'arithmetic': return arithmetic(c);
    case 'complex': return complex(c);
    case 'sequence': return sequence(c);
    case 'vector': return vector(c);
    case 'matrix': return matrix(c);
    case 'sets': return sets(c);
    case 'function': return functionScene(c);
    case 'derivative': return derivative(c);
    case 'delta': return delta(c);
    case 'gradient': return gradient(c);
    case 'integral': return integral(c);
    case 'probability': return probability(c);
    case 'statistics': return statistics(c);
    case 'network': return network(c);
    case 'dirac': return scene(c, 'relation', 'A point selects the test function value', 'δₐ[f] = f(a)', String.raw`\delta_a[f]=f(a)`, { operation: 'dirac', values: [c.number('a') ?? 2], labels: ['a', 'test function f', 'f(a)'] }, 'The distribution acts on a test function. This picture does not give the Dirac delta a finite pointwise height.');
    case 'trig': {
      const degrees = c.number('degrees'), radians = c.number('radians') ?? (degrees === null ? null : degrees * Math.PI / 180);
      return scene(c, 'function', 'The unit circle relates angle and coordinates', '(cos θ, sin θ); cos²θ+sin²θ=1', String.raw`(\cos\theta,\sin\theta),\quad\cos^2\theta+\sin^2\theta=1`, { operation: 'trig', x: radians, points: sampled(Math.sin, 0, Math.PI * 2, radians), result: radians === null ? null : Math.sin(radians) });
    }
    case 'combinatorics': {
      const n = c.number('n'), k = c.number('k');
      const factorial = value => Number.isInteger(value) && value >= 0 && value <= 18 ? Array.from({ length: value }, (_, i) => i + 1).reduce((a, b) => a * b, 1) : null;
      const choose = n !== null && k !== null && k >= 0 && k <= n && factorial(n) !== null ? factorial(n) / factorial(k) / factorial(n - k) : null;
      return scene(c, 'combinatorics', 'Choose a group without ordering it', 'C(n,k) = n! / (k!(n−k)!)', String.raw`\binom nk=\frac{n!}{k!(n-k)!}`, { operation: 'choose', n, k, result: choose });
    }
    case 'light': {
      const normal = c.vector('normal'), light = c.vector('lightDirection', 'light_direction', 'toward_light');
      const a = normal && Math.hypot(...normal) ? normal.map(value => value / Math.hypot(...normal)) : null;
      const b = light && Math.hypot(...light) ? light.map(value => value / Math.hypot(...light)) : null;
      const coefficient = dot(a, b);
      return scene(c, 'vector', 'Only the normal component illuminates the surface', 'L = ρE max(0,n̂·l̂) / π', String.raw`L=\frac{\rho E}{\pi}\max(0,\hat n\cdot\hat l)`, { operation: 'dot', a: a ?? [], b, result: coefficient, scalar: c.number('reflectance') }, 'A tilted beam spreads over more surface. The angle between the light and surface normal determines the cosine factor.');
    }
    default: return fallback(c);
  }
}
