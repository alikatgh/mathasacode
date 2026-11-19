import test from 'node:test';
import assert from 'node:assert/strict';
import { symbolDetails } from '../site/symbol-details.mjs';
import { mathPhrases, explanationTokens, renderExplanation } from '../scripts/symbol-inline-math.mjs';
import katex from 'katex';

test('authored mathematical phrases have valid strict TeX with semantic math structures', () => {
  for(const tex of mathPhrases.values()) assert.doesNotThrow(()=>katex.renderToString(tex,{strict:'error',trust:false,throwOnError:true}));
  assert.match(renderExplanation('√25 = 5'), /<msqrt>/);
  assert.match(renderExplanation('Δf/Δx = 5'), /<mfrac>/);
  assert.match(renderExplanation('f′(x) = 2x'), /<msup>/);
});

test('all explanation text is preserved exactly by tokenization and renders without math errors', () => {
  let spans=0;
  for(const detail of Object.values(symbolDetails)) {
    for(const text of [detail.intuition,detail.readAs,...detail.steps,...detail.pitfalls,...detail.example.notes,detail.diagram.caption]) {
      const tokens=explanationTokens(text);
      assert.equal(tokens.map(token=>token.text).join(''),text);
      spans+=tokens.filter(token=>token.tex).length;
      assert.doesNotMatch(renderExplanation(text),/katex-error/);
      assert.ok(tokens.every(token=>token.tex || token.code || !/[√²³⁻₂ᵢ⊥ₒ∂∫∈∉∋∖∘≯≮≤≥∇Δφσρℕ×]/u.test(token.text)),text);
    }
  }
  assert.ok(spans>200);
});

test('code references stay code and untrusted markup or TeX remains inert text', () => {
  const html=renderExplanation('Math.sqrt(-1) returns NaN; 3² = 9. <img src=x onerror="bad()"> \\href{javascript:bad()}{click}');
  assert.match(html, /<code class="symbol-detail__inline-code">Math.sqrt\(-1\)<\/code>/);
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img\b|href="javascript:|onerror="/);
  assert.match(html, /<msup>/);
  assert.equal(explanationTokens('An example of x² is here.').map(token=>token.text).join(''),'An example of x² is here.');
});
