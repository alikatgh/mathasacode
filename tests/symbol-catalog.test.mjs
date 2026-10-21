import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';
import { Marked } from 'marked';
import GithubSlugger from 'github-slugger';
import katex from 'katex';
import { symbolGroups } from '../site/symbol-catalog.mjs';

const entries = symbolGroups.flatMap(group => group.entries);
const byId = new Map(entries.map(entry => [entry.id, entry]));

const mathOptions = {
  throwOnError: true,
  strict: 'error',
  trust: false,
  output: 'htmlAndMathml',
  maxExpand: 1000,
};

function renderNotation(id, index = 0) {
  return katex.renderToString(byId.get(id).latex[index], mathOptions);
}

function headingIds(markdown) {
  const ids = new Set();
  const slugger = new GithubSlugger();
  const marked = new Marked({ gfm: true });
  marked.use({ renderer: {
    heading({ tokens }) {
      // Match the site's heading renderer: parsed inline text, stripped tags,
      // decoded entities, and one stateful GitHub slugger per document.
      const text = this.parser.parseInline(tokens).replace(/<[^>]*>/g, '')
        .replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"').replaceAll('&#39;', "'");
      ids.add(slugger.slug(text));
      return '';
    },
  } });
  marked.parse(markdown);
  return ids;
}

function run(entry, after = '') {
  return new Script(`${entry.code}\n${after}`, { filename: `symbols/${entry.id}.js` })
    .runInNewContext(Object.create(null), { timeout: 100 });
}

function plain(value) {
  // Values produced in the isolated realm have different object prototypes.
  return JSON.parse(JSON.stringify(value));
}

function assertFinite(value, context) {
  if (typeof value === 'number') assert.ok(Number.isFinite(value), context);
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) assertFinite(item, context);
  }
}

function assertApprox(actual, expected, context) {
  if (typeof expected === 'number') {
    assert.equal(typeof actual, 'number', context);
    assert.ok(Math.abs(actual - expected) <= 1e-10 * Math.max(1, Math.abs(expected)),
      `${context}: expected approximately ${expected}, got ${actual}`);
  } else if (Array.isArray(expected)) {
    assert.ok(Array.isArray(actual), context);
    assert.equal(actual.length, expected.length, context);
    expected.forEach((item, i) => assertApprox(actual[i], item, `${context}[${i}]`));
  } else {
    assert.deepEqual(actual, expected, context);
  }
}

test('catalog entries have unique navigable IDs and complete, concise browse data', () => {
  assert.ok(symbolGroups.length >= 6);
  assert.ok(entries.length >= 60 && entries.length <= 100, `unexpected catalog size: ${entries.length}`);
  const ids = new Set();
  for (const item of [...symbolGroups, ...entries]) {
    assert.match(item.id, /^[a-z][a-z0-9-]*$/);
    assert.ok(!ids.has(item.id), `duplicate catalog id: ${item.id}`);
    ids.add(item.id);
  }
  for (const group of symbolGroups) {
    assert.ok(group.title.trim());
    assert.ok(group.entries.length > 0);
  }
  for (const entry of entries) {
    for (const field of ['symbol', 'name', 'explanation', 'code', 'lesson']) {
      assert.equal(typeof entry[field], 'string', `${entry.id}.${field}`);
      assert.ok(entry[field].trim(), `${entry.id}.${field} is empty`);
    }
    assert.ok(entry.code.split('\n').length <= 3, `${entry.id} needs a concise snippet`);
    assert.doesNotMatch(entry.code, /\b(?:import|require|fetch|process|document|window)\b/,
      `${entry.id} must stand alone with built-in JavaScript`);
    if (entry.keywords) {
      assert.ok(Array.isArray(entry.keywords));
      assert.ok(entry.keywords.every(keyword => typeof keyword === 'string' && keyword.trim()));
    }
  }
});

test('every row has individually renderable strict KaTeX notation alternatives', () => {
  for (const entry of entries) {
    assert.ok(Array.isArray(entry.latex) && entry.latex.length > 0, `${entry.id} needs TeX notation`);
    for (const fragment of entry.latex) {
      assert.equal(typeof fragment, 'string', `${entry.id} has a non-string TeX fragment`);
      assert.ok(fragment.trim(), `${entry.id} has an empty TeX fragment`);
      assert.doesNotMatch(fragment, /[\u0000-\u001f]/, `${entry.id} has an incorrectly escaped TeX command`);
      assert.doesNotMatch(fragment, /\\(?:quad|qquad)\b/,
        `${entry.id} must leave alternatives separate for wrapping`);
      const rendered = katex.renderToString(fragment, mathOptions);
      assert.match(rendered, /class="katex-mathml"/);
      assert.match(rendered, /class="katex-html"/);
      assert.doesNotMatch(rendered, /class="katex-error"/);
    }
  }
  assert.equal(byId.get('ordered-comparison').latex.length, 6);
  assert.equal(byId.get('function-notation').latex.length, 3);
  assert.equal(byId.get('interval-endpoints').latex.length, 4);
});

test('representative formulas use mathematical structures rather than Unicode text approximations', () => {
  assert.match(byId.get('summation').latex[0], /\\sum_\{i=1\}\^\{n\}/);
  assert.match(renderNotation('summation'), /<msubsup><mo>∑<\/mo>/);
  assert.match(byId.get('sequence-product').latex[0], /\\prod_\{i=1\}\^\{n\}/);
  assert.match(renderNotation('square-root'), /<msqrt>/);
  assert.match(byId.get('euclidean-norm').latex[0], /\\lVert\\mathbf\{v\}\\rVert/);
  assert.match(renderNotation('power'), /<msup>/);
  assert.match(renderNotation('vector-component', 1), /<msub>/);
  assert.match(byId.get('unit-vector').latex[0], /\\hat\{\\mathbf\{v\}\}/);
  assert.match(renderNotation('real-numbers'), /mathvariant="double-struck"/);
  assert.match(byId.get('binomial-coefficient').latex[0], /\\binom\{n\}\{k\}/);
  assert.match(renderNotation('binomial-coefficient'), /<mfrac linethickness="0px">/);
  assert.match(byId.get('derivative').latex[1], /\\frac\{df\}\{dx\}/);
  assert.match(renderNotation('derivative', 1), /<mfrac>/);
  assert.match(byId.get('partial-derivative').latex[0], /\\frac\{\\partial f\}\{\\partial x\}/);
  assert.match(byId.get('definite-integral').latex[0], /\\int_a\^b/);
  assert.match(byId.get('conditional-probability').latex[0], /\\operatorname\{P\}\(A\\mid B\)/);
  assert.match(byId.get('bayes-theorem').latex[0], /\\frac\{/);
  assert.match(byId.get('ml-relu').latex[0], /\\operatorname\{ReLU\}/);
  assert.match(byId.get('ml-softmax').latex[1], /\\operatorname\{softmax\}\(\\mathbf\{z\}\)_k/);
  assert.match(byId.get('ml-cross-entropy').latex[0], /\\ell_i=-\\log p_\{i,y_i\}/);
  assert.match(byId.get('ml-cross-entropy').latex[1], /\\frac\{1\}\{N\}\\sum_\{i=0\}\^\{N-1\}/);
  assert.match(byId.get('ml-learning-update').latex[1], /\\theta\\leftarrow\\theta-\\eta\\nabla_\{\\theta\}L/);
});

test('all lesson links resolve to actual headings in the two public guides', async () => {
  const sources = {
    '/': await readFile(new URL('../README.md', import.meta.url), 'utf8'),
    '/machine-learning.html': await readFile(new URL('../docs/ml-deep-learning.md', import.meta.url), 'utf8'),
  };
  const anchors = new Map(Object.entries(sources).map(([path, markdown]) => [path, headingIds(markdown)]));
  for (const entry of entries) {
    assert.match(entry.lesson, /^\/(?:machine-learning\.html)?#[a-z0-9][a-z0-9-]*$/,
      `${entry.id} requires an absolute local lesson href`);
    const [path, anchor] = entry.lesson.split('#');
    assert.ok(anchors.get(path)?.has(anchor), `${entry.id} links to a missing heading: ${entry.lesson}`);
  }
});

test('each standalone example compiles, executes and matches its advertised result', () => {
  for (const entry of entries) {
    const expectedComment = entry.code.match(/\/\/ (=>|≈) (.+)\s*$/);
    assert.ok(expectedComment, `${entry.id} needs an executable result comment`);
    const expected = JSON.parse(expectedComment[2]);
    const result = run(entry);
    assert.notEqual(result, undefined, `${entry.id} should produce an inspectable value`);
    assertFinite(result, `${entry.id} produced a non-finite number`);
    const actual = plain(result);
    if (expectedComment[1] === '≈') assertApprox(actual, expected, entry.id);
    else assert.deepEqual(actual, expected, entry.id);
  }
});

test('the actual guides’ symbol families have a catalog entry, including overloaded notation', () => {
  const required = [
    'arithmetic-operations', 'scalar-multiplication', 'equality', 'not-equal', 'approximately-equal',
    'definition', 'square-root', 'imaginary-unit', 'power', 'logarithm-exponential',
    'trigonometry', 'modulo', 'factorial', 'binomial-coefficient',
    'vector-component', 'matrix-shape', 'vector-scaling', 'hadamard-product', 'dot-product',
    'cross-product', 'summation', 'arithmetic-mean', 'sequence-product', 'absolute-value',
    'euclidean-norm', 'determinant', 'unit-vector', 'matrix-product', 'transpose',
    'vector-tensor-product', 'kronecker-product', 'set-builder', 'set-membership',
    'real-numbers', 'rational-numbers', 'integers', 'natural-numbers', 'complex-numbers',
    'ordered-comparison', 'much-less-greater', 'logical-and', 'logical-or', 'logical-not',
    'implication', 'logical-equivalence', 'quantifiers', 'interval-endpoints', 'cartesian-power',
    'intersection', 'union', 'set-difference', 'cardinality', 'function-notation',
    'piecewise-function', 'sign-function', 'prime-related-value', 'rounding', 'finite-change',
    'kronecker-delta', 'dirac-delta', 'limit', 'derivative', 'partial-derivative', 'gradient',
    'indefinite-integral', 'definite-integral', 'infinity', 'graphics-directions', 'graphics-radiance',
    'event-probability', 'expected-value', 'population-variance', 'sample-variance',
    'standard-deviation', 'conditional-probability', 'bayes-theorem', 'covariance',
    'correlation', 'entropy', 'ml-data', 'ml-weights-bias', 'ml-parameters', 'ml-learning-update',
    'ml-relu', 'function-composition', 'ml-softmax', 'ml-cross-entropy', 'ml-indicator-one-hot',
    'ml-backpropagation',
  ];
  for (const id of required) assert.ok(byId.has(id), `missing symbol family: ${id}`);
  const searchTerms = id => {
    const entry = byId.get(id);
    return [entry.symbol, entry.name, ...(entry.keywords || [])].join(' ');
  };
  for (const glyph of ['∑', 'Σ', 'sigma']) assert.ok(searchTerms('summation').includes(glyph));
  for (const glyph of ['∏', 'Π', 'Pi']) assert.ok(searchTerms('sequence-product').includes(glyph));
  for (const glyph of ['∈', '∋', '∉', '∌']) assert.ok(searchTerms('set-membership').includes(glyph));
  for (const glyph of ['∀', '∃']) assert.ok(searchTerms('quantifiers').includes(glyph));
  for (const glyph of ['∘', '⊙', '●']) assert.ok(searchTerms('hadamard-product').includes(glyph));
});

test('critical interpretation examples keep their distinguishing behavior', () => {
  assert.deepEqual(plain(run(byId.get('modulo'), '[-11, -1, 0, 4, 6].map(x => mod(x, 5));')), [4, 4, 0, 4, 1]);
  assert.deepEqual(plain(run(byId.get('implication'),
    '[implies(false, false), implies(false, true), implies(true, false), implies(true, true)];')),
  [true, true, false, true]);
  assert.deepEqual(plain(run(byId.get('interval-endpoints'))), [false, true, true, false]);
  assert.deepEqual(plain(run(byId.get('ml-learning-update'), 'theta;')), [0, 0], 'gradient update preserves its old parameter vector');
  assert.ok(run(byId.get('sample-variance')) > run(byId.get('population-variance')),
    'sample and population variance use different denominators');
  assert.match(byId.get('dirac-delta').explanation, /distribution/);
  assert.match(byId.get('real-numbers').explanation, /finite-precision/);
  assert.match(byId.get('rational-numbers').explanation, /repeating decimals/);
  assert.match(byId.get('ml-relu').explanation, /undefined at zero/);
});
