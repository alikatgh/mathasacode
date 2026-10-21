import test from 'node:test';
import assert from 'node:assert/strict';
import { symbolGroups } from '../site/symbol-catalog.mjs';
import {
  symbolSheetStateKey, symbolSheetStateLimit, symbolSheetQueryLimit,
  validateSymbolSheetState, readSymbolSheetState, writeSymbolSheetState, forgetSymbolSheetState,
} from '../site/symbol-sheet-state.mjs';

const state = overrides => ({ version: 1, query: '∑ average', view: 'mixed', openDetails: ['summation'], ...overrides });

test('saved reference state retains bounded catalog IDs and anchor-relative position', () => {
  assert.deepEqual(validateSymbolSheetState(state({
    openDetails: ['summation', 'unknown', 'summation', null, {}],
    position: { anchor: 'symbol-summation', offset: 412.5, arbitrary: true }, arbitrary: true,
  })), state({ position: { anchor: 'symbol-summation', offset: 412.5 } }));
  assert.deepEqual(validateSymbolSheetState(state({ position: { anchor: 'symbols-arithmetic', offset: -120 } })),
    state({ position: { anchor: 'symbols-arithmetic', offset: -120 } }));
  for (const position of [
    { anchor: 'unrecognized', offset: 5 }, { anchor: 'symbol-summation', offset: Infinity },
    { anchor: 'symbol-summation', offset: 20001 }, { anchor: 'symbol-summation', offset: '23' },
  ]) assert.deepEqual(validateSymbolSheetState(state({ position })), state());
});

test('malformed or oversized saved state is ignored before it can affect browsing', () => {
  const entryCount = symbolGroups.reduce((sum, group) => sum + group.entries.length, 0);
  for (const value of [null, {}, [], state({ version: 2 }), state({ query: 12 }),
    state({ query: 'x'.repeat(symbolSheetQueryLimit + 1) }), state({ view: 'anything' }),
    state({ openDetails: 'summation' }), state({ openDetails: Array(entryCount + 1).fill('summation') }),
  ]) assert.equal(validateSymbolSheetState(value), null);
  for (const raw of ['{bad JSON', 'null', JSON.stringify(state({ version: 90 })), ' '.repeat(symbolSheetStateLimit + 1)]) {
    assert.equal(readSymbolSheetState({ localStorage: { getItem: () => raw } }), null);
  }
});

test('missing, blocked, corrupt and full browser storage remain optional', () => {
  const blocked = {};
  Object.defineProperty(blocked, 'localStorage', { get() { throw new Error('blocked'); } });
  const full = { localStorage: {
    getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('blocked'); },
  } };
  for (const browser of [undefined, {}, blocked, full]) {
    assert.equal(readSymbolSheetState(browser), null);
    assert.equal(writeSymbolSheetState(browser, state()), false);
    assert.doesNotThrow(() => forgetSymbolSheetState(browser));
  }
});

test('saving and forgetting use only the reference key', () => {
  const values = new Map([['unrelated', 'keep']]);
  const browser = { localStorage: {
    getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key),
  } };
  assert.equal(writeSymbolSheetState(browser, state()), true);
  assert.deepEqual(readSymbolSheetState(browser), state());
  assert.ok(values.has(symbolSheetStateKey));
  forgetSymbolSheetState(browser);
  assert.equal(readSymbolSheetState(browser), null);
  assert.equal(values.get('unrelated'), 'keep');
});
