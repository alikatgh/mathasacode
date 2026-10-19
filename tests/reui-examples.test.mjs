import test from 'node:test';
import assert from 'node:assert/strict';
import { exampleLines, readExampleLanguage, saveExampleLanguage, languagePreferenceKey } from '../site/example-model.mjs';

test('prehighlighted lines cannot replace or omit any original source content', () => {
  const source = '  const answer = "<42>";\n\treturn answer;\n';
  const lines = source.split('\n').map((text, index) => ({ number: index + 1, text, tokens: [{ content: text, color: '#123456' }] }));
  assert.equal(exampleLines(source, lines), lines);
  for (const invalid of [lines.slice(0, -1), [{ ...lines[0], text: 'changed' }, ...lines.slice(1)], [{ ...lines[0], tokens: [{ content: 'changed' }] }, ...lines.slice(1)], null]) {
    const fallback = exampleLines(source, invalid);
    assert.equal(fallback.map(line => line.tokens.map(token => token.content).join('')).join('\n'), source);
    assert.equal(fallback.length, 3, 'the final empty line must survive');
  }
});

test('language preference survives unavailable storage without accepting other languages', () => {
  let stored;
  const storage = { getItem: key => key === languagePreferenceKey ? stored : null, setItem: (key, value) => { assert.equal(key, languagePreferenceKey); stored = value; } };
  assert.equal(readExampleLanguage(storage, 'python'), 'python');
  assert.equal(saveExampleLanguage(storage, 'rust'), true);
  assert.equal(readExampleLanguage(storage, 'python'), 'rust');
  assert.equal(saveExampleLanguage(storage, 'html'), false);
  const unavailable = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(readExampleLanguage(unavailable, 'c'), 'c');
  assert.equal(saveExampleLanguage(unavailable, 'c'), false);
});
