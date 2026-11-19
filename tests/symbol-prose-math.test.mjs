import test from 'node:test';
import assert from 'node:assert/strict';
import katex from 'katex';
import { symbolDetails } from '../site/symbol-details.mjs';
import { extraMathPhrases } from '../site/symbol-explanation-math.mjs';
import { explanationTokens, renderExplanation } from '../scripts/symbol-inline-math.mjs';

const explanations = Object.entries(symbolDetails).flatMap(([id, detail]) =>
  Object.entries({
    readAs: detail.readAs,
    intuition: detail.intuition,
    steps: detail.steps,
    pitfalls: detail.pitfalls,
    notes: detail.example.notes,
    caption: detail.diagram.caption,
  }).flatMap(([field, value]) => (Array.isArray(value) ? value : [value])
    .map(text => ({ id, field, text }))),
);

const mathml = plain => katex.renderToString(extraMathPhrases.get(plain), {
  output: 'mathml', strict: 'error', trust: false, throwOnError: true,
});

test('additional mathematical phrases are authored text and valid strict TeX', () => {
  for (const [plain, tex] of extraMathPhrases) {
    assert.ok(explanations.some(({ text }) => text.includes(plain)), `Unauthored phrase: ${plain}`);
    assert.doesNotThrow(() => katex.renderToString(tex, {
      strict: 'error', trust: false, throwOnError: true,
    }), plain);
    assert.doesNotMatch(tex, /\\(?:href|url|html\w*|includegraphics)\b/, plain);
  }
});

test('variable relations, function domains, absolute values and nested fractions have semantic MathML', () => {
  assert.match(mathml('n = 4'), /<mi>n<\/mi><mo>=<\/mo><mn>4<\/mn>/);
  assert.match(mathml('n − 1 = 3'), /<mi>n<\/mi><mo>−<\/mo><mn>1<\/mn><mo>=<\/mo><mn>3<\/mn>/);
  assert.match(mathml('P(B) = 0'), /<mi>P<\/mi>.*<mi>B<\/mi>.*<mo>=<\/mo><mn>0<\/mn>/);
  assert.match(mathml('f: A → B'), /<mi>f<\/mi>.*<mi>A<\/mi><mo>→<\/mo><mi>B<\/mi>/);
  assert.match(mathml('|a − b|'), /<mo[^>]*>∣<\/mo><mi>a<\/mi><mo>−<\/mo><mi>b<\/mi><mo[^>]*>∣<\/mo>/);
  assert.match(mathml('(2 / 6) / (3 / 6)'), /<mfrac><mfrac><mn>2<\/mn><mn>6<\/mn><\/mfrac><mfrac><mn>3<\/mn><mn>6<\/mn><\/mfrac><\/mfrac>/);
  assert.match(mathml('A = [[2, 1], [0, 3]]'), /<mtable\b.*<mtr>.*<mn>2<\/mn>.*<mn>1<\/mn>.*<mtr>.*<mn>0<\/mn>.*<mn>3<\/mn>/);
  assert.match(mathml('xᵀg'), /<msup>.*<mi[^>]*>x<\/mi><mi[^>]*>T<\/mi><\/msup><mi[^>]*>g<\/mi>/);
});

test('the integrated scanner preserves complete authored mathematical phrases', () => {
  for (const [plain, tex] of extraMathPhrases) {
    const tokens = explanationTokens(plain);
    assert.equal(tokens.length, 1, `Split mathematical phrase: ${plain}`);
    assert.equal(tokens[0].text, plain);
    assert.equal(tokens[0].tex, tex, `Missing complete mathematical phrase: ${plain}`);
  }
});

test('every prose field preserves its text and every curated formula stays in one math token', () => {
  for (const { id, field, text } of explanations) {
    const context = `${id}.${field}: ${text}`;
    const tokens = explanationTokens(text);
    assert.equal(tokens.map(token => token.text).join(''), text, context);
    assert.doesNotMatch(renderExplanation(text), /katex-error/, context);

    for (const plain of extraMathPhrases.keys()) {
      let from = 0;
      let index;
      while ((index = text.indexOf(plain, from)) !== -1) {
        const before = text[index - 1] || '';
        const after = text[index + plain.length] || '';
        const bounded = !(/[\p{L}\p{N}_]/u.test(plain[0]) && /[\p{L}\p{N}_]/u.test(before)) &&
          !(/[\p{L}\p{N}_]/u.test(plain.at(-1)) && /[\p{L}\p{N}_]/u.test(after));
        if (bounded) {
          const containing = tokens.find(token => token.index <= index && token.end >= index + plain.length);
          assert.ok(containing?.tex || containing?.code, `Partial formula ${plain} in ${context}`);
        }
        from = index + plain.length;
      }
    }
  }
});

test('sample variance, conditioning and a function domain render as complete inline equations', () => {
  for (const [id, field, phrase] of [
    ['sample-variance', 'steps', 'n = 4'],
    ['sample-variance', 'steps', 'n − 1 = 3'],
    ['conditional-probability', 'pitfalls', 'P(B) = 0'],
    ['function-notation', 'intuition', 'f: A → B'],
    ['absolute-value', 'intuition', '|a − b|'],
  ]) {
    const item = explanations.find(value => value.id === id && value.field === field && value.text.includes(phrase));
    assert.ok(item, `${id}.${field}: ${phrase}`);
    const token = explanationTokens(item.text).find(value => value.text === phrase);
    assert.equal(token?.tex, extraMathPhrases.get(phrase), `${id}.${field}: ${phrase}`);
    assert.match(renderExplanation(phrase), /<math\b/);
  }
});
