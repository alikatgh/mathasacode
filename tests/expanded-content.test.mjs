import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Marked } from 'marked';
import { documents, renderDocument } from '../scripts/build.mjs';
import { getCodeExample } from '../scripts/code-examples.mjs';
import { executeJavaScript } from '../site/runners/javascript.mjs';
import { expandedMathIndex, assertExpandedOutput } from './expanded-examples.mjs';

const sources = await Promise.all(documents.filter(document => document.guide).map(async document => ({
  document, text: await readFile(new URL(`../${document.source}`, import.meta.url), 'utf8'),
})));
const examples = sources.flatMap(({ document, text }) => new Marked().lexer(text)
  .filter(token => token.type === 'code').map(token => getCodeExample(token.text, document.source)))
  .filter(example => expandedMathIndex(example.id) >= 0 || example.id.startsWith('ml-'));

test('all 40 added examples execute in the real isolated JavaScript engine', async () => {
  const wasm = await readFile(new URL('../node_modules/@jitl/quickjs-wasmfile-release-sync/dist/emscripten-module.wasm', import.meta.url));
  const assets = { 'quickjs.wasm': wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) };
  assert.equal(examples.length, 40);
  for (const example of examples) {
    let output = '';
    await executeJavaScript(example.variants.javascript, assets, text => { output += text; });
    assertExpandedOutput(example.id, output);
  }
});

test('the distinct ML path teaches its prerequisites before the complete training program', () => {
  const { document, text } = sources.find(({ document }) => document.source === 'docs/ml-deep-learning.md');
  assert.equal(document.guide, true);
  const result = renderDocument(text, document);
  assert.deepEqual(result.headings.filter(heading => heading.depth === 2).map(heading => heading.id), [
    'the-final-boss', 'data-and-shapes', 'weighted-sums-and-bias', 'nonlinearity',
    'a-network-is-composition', 'from-scores-to-probabilities', 'measuring-the-mistake',
    'backpropagation', 'gradient-descent', 'train-the-tiny-network',
  ]);
  assert.equal(result.codeCount, 10);
  assert.equal(result.switcherCount, 10);
  assert.ok(result.comparisonCount >= 8, 'formulas stay beside their implementations');
  assert.match(result.html, /backpropagation/);
  assert.ok(!result.html.includes('katex-error'));
});

test('the final boss backpropagation agrees with numerical derivatives for every parameter', async () => {
  const example = examples.find(example => example.id === 'ml-10');
  const wasm = await readFile(new URL('../node_modules/@jitl/quickjs-wasmfile-release-sync/dist/emscripten-module.wasm', import.meta.url));
  const checks = `
const numericalProbe = makeNetwork();
const beforeProbe = JSON.stringify(numericalProbe);
const analyticProbe = gradients(numericalProbe);
if (JSON.stringify(numericalProbe) !== beforeProbe) throw new Error('Computing gradients mutated the old weights');
let checkedParameters = 0;
for (const key of ['W1', 'b1', 'W2', 'b2']) {
  const matrix = Array.isArray(numericalProbe[key][0]);
  for (let row = 0; row < numericalProbe[key].length; row++) {
    const values = matrix ? numericalProbe[key][row] : numericalProbe[key];
    const count = matrix ? values.length : 1;
    for (let column = 0; column < count; column++) {
      const index = matrix ? column : row;
      const original = values[index];
      const step = 0.00001;
      values[index] = original + step;
      const above = meanLoss(numericalProbe);
      values[index] = original - step;
      const below = meanLoss(numericalProbe);
      values[index] = original;
      const numerical = (above - below) / (2 * step);
      const analytic = matrix ? analyticProbe[key][row][column] : analyticProbe[key][row];
      if (!Number.isFinite(analytic) || Math.abs(analytic - numerical) > 0.0000001) {
        throw new Error(key + '[' + row + ',' + column + '] gradient disagrees: ' + analytic + ' vs ' + numerical);
      }
      checkedParameters++;
    }
  }
}
if (checkedParameters !== 12) throw new Error('Did not check all twelve parameters');
const oldLossProbe = meanLoss(numericalProbe);
trainStep(numericalProbe, 0.1);
if (!(meanLoss(numericalProbe) < oldLossProbe)) throw new Error('A small full-batch step did not reduce the loss');
console.log('All 12 gradients verified');
`;
  let output = '';
  await executeJavaScript(example.variants.javascript + '\n' + checks,
    { 'quickjs.wasm': wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) }, text => { output += text; });
  assert.match(output, /All 12 gradients verified/);
});
