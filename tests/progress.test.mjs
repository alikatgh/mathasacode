import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgressStore, PROGRESS_KEY } from '../site/progress.mjs';

function memoryStorage() {
  const values = new Map();
  return {
    values,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
}

test('interleaved tab completions both survive a reload', () => {
  const storage = memoryStorage();
  const first = createProgressStore(['equals', 'summation'], () => storage);
  const second = createProgressStore(['equals', 'summation'], () => storage);
  const write = storage.setItem;
  let interleaved = false;
  storage.setItem = (key, value) => {
    if (!interleaved && key.endsWith(':equals')) {
      interleaved = true;
      second.complete('summation');
    }
    write(key, value);
  };
  first.complete('equals');
  const reloaded = createProgressStore(['equals', 'summation'], () => storage).read();
  assert.equal(reloaded.available, true);
  assert.deepEqual([...reloaded.completed].sort(), ['equals', 'summation']);
  first.complete('equals');
  assert.equal(storage.values.size, 2);
});

test('legacy progress is preserved; corrupt or unknown data does not break practice', () => {
  const storage = memoryStorage();
  storage.setItem(PROGRESS_KEY, JSON.stringify(['equals', 'unknown', 7]));
  const store = createProgressStore(['equals', 'summation'], () => storage);
  assert.deepEqual([...store.read().completed], ['equals']);
  store.complete('summation');
  assert.deepEqual([...store.read().completed].sort(), ['equals', 'summation']);
  storage.setItem(PROGRESS_KEY, '{bad JSON');
  assert.deepEqual([...store.read().completed], ['summation']);
  assert.throws(() => store.complete('unknown'), /Unknown/);
  assert.equal(store.isProgressKey(PROGRESS_KEY + ':summation'), true);
  assert.equal(store.isProgressKey('unrelated-data'), false);
});

test('blocked and full storage report unsaved progress while keeping the current completion usable', () => {
  const blocked = createProgressStore(['equals'], () => { throw new Error('storage unavailable'); });
  assert.equal(blocked.read().available, false);
  const current = blocked.complete('equals');
  assert.equal(current.available, false);
  assert.ok(current.completed.has('equals'));
  const storage = memoryStorage();
  storage.setItem = () => { throw new Error('quota exceeded'); };
  const full = createProgressStore(['equals'], () => storage).complete('equals');
  assert.equal(full.available, false);
  assert.ok(full.completed.has('equals'));
});

test('storage recovery retries failed topic writes before reporting saved progress', () => {
  const storage = memoryStorage();
  const write = storage.setItem;
  let full = true;
  storage.setItem = (key, value) => { if (full) throw new Error('quota exceeded'); write(key, value); };
  const store = createProgressStore(['equals', 'summation'], () => storage);
  assert.equal(store.complete('equals').available, false);
  assert.equal(store.read().available, false);
  full = false;
  const recovered = store.complete('summation');
  assert.equal(recovered.available, true);
  assert.deepEqual([...recovered.completed].sort(), ['equals', 'summation']);
  const reloaded = createProgressStore(['equals', 'summation'], () => storage).read();
  assert.deepEqual([...reloaded.completed].sort(), ['equals', 'summation']);
});
