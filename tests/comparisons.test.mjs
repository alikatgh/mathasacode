import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Marked } from 'marked';
import { documents, renderDocument } from '../scripts/build.mjs';
import { isEquationParagraph, pairComparisons } from '../scripts/comparisons.mjs';

const formula = '![sum](https://latex.codecogs.com/svg.latex?%5Csum_%7Bi%3D1%7D%5En%20i)';
const flatten = tokens => tokens.flatMap(token => token.type === 'comparison' ? [...flatten(token.notation), ...flatten(token.implementation)] : [token]);

test('pairing preserves every authored token and heading in all guide versions', async () => {
  for (const document of documents.slice(0, 3)) {
    const source = await readFile(new URL(`../${document.source}`, import.meta.url), 'utf8');
    const tokens = new Marked().lexer(source);
    const paired = pairComparisons(tokens);
    assert.deepEqual(flatten(paired), Array.from(tokens), document.source);
    assert.equal(paired.links, tokens.links);
    const result = renderDocument(source, document);
    const original = renderDocument(source, document, { comparisons: false });
    assert.deepEqual(result.headings, original.headings);
    assert.equal(result.formulaCount, original.formulaCount);
    assert.equal((result.html.match(/<pre>/g) || []).length, (original.html.match(/<pre>/g) || []).length);
    assert.ok(result.comparisonCount >= 30);
  }
});

test('equations pair only with code from the same unambiguous example', () => {
  const source = `# Examples\n\n${formula}\n\n<!-- source math -->\n\nIn code:\n\n\`\`\`js\nconst total = 6;\n\`\`\`\n\n## No code\n\n${formula}\n\n## Separate example\n\n\`\`\`js\nconst other = 1;\n\`\`\`\n\n## function notation\n\n${formula}\n\n\`\`\`js\nconst square = x => x*x;\n\`\`\`\n`;
  const tokens = new Marked().lexer(source);
  const paired = pairComparisons(tokens);
  const comparisons = paired.filter(token => token.type === 'comparison');
  assert.equal(comparisons.length, 1);
  assert.ok(isEquationParagraph(comparisons[0].notation[0]));
  assert.equal(comparisons[0].implementation[0].text, 'In code:');
  assert.deepEqual(flatten(paired), Array.from(tokens));
});

test('standalone equations use display limits while inline symbols stay inline', () => {
  const source = `# Example\n\n${formula}\n\nIn code:\n\n\`\`\`python\nsum(range(1, 4))\n\`\`\`\n\nThe symbol ${formula} stays in this sentence.\n`;
  const { html, formulaCount, comparisonCount } = renderDocument(source);
  assert.equal(formulaCount, 2);
  assert.equal(comparisonCount, 1);
  assert.equal((html.match(/class="katex-display"/g) || []).length, 1);
  assert.equal((html.match(/class="formula formula--display"/g) || []).length, 1);
  assert.match(html, /comparison__label">Python/);
});

test('an authored example boundary prevents a misleading adjacent comparison', () => {
  const tokens = new Marked().lexer(`${formula}\n\n<!-- comparison:break -->\n\nA different example:\n\n\`\`\`python\nassert 1 + 1 == 2\n\`\`\`\n`);
  assert.equal(pairComparisons(tokens).filter(token => token.type === 'comparison').length, 0);
  assert.deepEqual(flatten(pairComparisons(tokens)), Array.from(tokens));
});

test('a contiguous group of equations shares its following implementation', () => {
  const tokens = new Marked().lexer(`${formula}\n\n<!-- first equation -->\n\n${formula}\n\nIn code:\n\n\`\`\`js\nconst result = 6;\n\`\`\`\n`);
  const paired = pairComparisons(tokens);
  assert.equal(paired.filter(token => token.type === 'comparison').length, 1);
  assert.equal(paired.find(token => token.type === 'comparison').notation.filter(isEquationParagraph).length, 2);
  assert.deepEqual(flatten(paired), Array.from(tokens));
});
