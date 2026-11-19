import test from 'node:test';
import assert from 'node:assert/strict';
import {
  changeExampleLanguage, exampleLines, readExampleLanguage, saveExampleLanguage,
  languageChangeEvent, languagePreferenceKey, subscribeExampleLanguage,
} from '../site/example-model.mjs';

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

test('footer and example subscribers share valid changes without depending on storage events', () => {
  const browser = new EventTarget();
  const saved = new Map();
  browser.localStorage = { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value) };
  const footer = [];
  const examples = [];
  const unsubscribeFooter = subscribeExampleLanguage(browser, value => footer.push(value));
  const unsubscribeExamples = subscribeExampleLanguage(browser, value => examples.push(value));
  for (const value of ['c', 'rust', 'python', 'javascript']) {
    assert.equal(changeExampleLanguage(browser, value), true);
    assert.equal(readExampleLanguage(browser.localStorage), value, 'reload reads the selected language');
  }
  assert.equal(changeExampleLanguage(browser, 'invalid'), false);
  assert.deepEqual(footer, ['c', 'rust', 'python', 'javascript']);
  assert.deepEqual(examples, footer);
  unsubscribeFooter();
  changeExampleLanguage(browser, 'c');
  assert.equal(footer.length, 4, 'unmounted consumers stop receiving changes');
  assert.equal(examples.at(-1), 'c');
  unsubscribeExamples();
});

test('same-window language changes still work when storage access or writes are blocked', () => {
  for (const blockedAt of ['access', 'write']) {
    const browser = new EventTarget();
    if (blockedAt === 'access') Object.defineProperty(browser, 'localStorage', { get() { throw Error('blocked'); } });
    else browser.localStorage = { setItem() { throw Error('quota'); } };
    const received = [];
    const unsubscribe = subscribeExampleLanguage(browser, value => received.push(value));
    assert.equal(changeExampleLanguage(browser, 'rust'), false);
    assert.deepEqual(received, ['rust']);
    unsubscribe();
  }
});

test('external preference updates reject unrelated keys, removed values and invalid event payloads', () => {
  const browser = new EventTarget();
  const received = [];
  const unsubscribe = subscribeExampleLanguage(browser, value => received.push(value));
  for (const [key, newValue] of [[languagePreferenceKey, 'c'], ['other', 'rust'], [languagePreferenceKey, null], [languagePreferenceKey, 'unknown'], [languagePreferenceKey, 'rust']]) {
    browser.dispatchEvent(Object.assign(new Event('storage'), { key, newValue }));
  }
  browser.dispatchEvent(new CustomEvent(languageChangeEvent, { detail: { language: 'unknown' } }));
  browser.dispatchEvent(new CustomEvent(languageChangeEvent));
  assert.deepEqual(received, ['c', 'rust']);
  unsubscribe();
});
