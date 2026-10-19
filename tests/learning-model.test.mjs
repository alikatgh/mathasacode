import test from 'node:test';
import assert from 'node:assert/strict';
import { createLearningModel, evaluateLearningActivity } from '../site/learning-model.mjs';
import { createProgressStore, PROGRESS_KEY } from '../site/progress.mjs';

function calculationFixture() {
  let runs = 0;
  const activity = {
    fields: [
      { key: 'mode', type: 'select', label: { en: 'Mode', zh: '模式' } },
      { key: 'x', type: 'number', min: 0, max: 10, step: 0.5, label: { en: 'x', zh: '数值' } },
      { key: 'note', type: 'text', label: { en: 'Note', zh: '备注' }, activeWhen: values => values.mode === 'named' },
    ],
    calculate(values) { runs++; return { expression: 'x', result: String(Number(values.x) * 2) }; },
  };
  return { activity, runs: () => runs, values: { mode: 'plain', x: '2.5', note: '' } };
}

test('calculator ignores inactive fields and rejects invalid active data before computing', () => {
  const { activity, values, runs } = calculationFixture();
  const valid = evaluateLearningActivity(activity, values);
  assert.equal(valid.result, '5');
  assert.equal(valid.activeKeys.has('note'), false);
  assert.equal(runs(), 1);
  for (const [value, message] of [['', /Enter a value/], ['Infinity', /finite/], ['-1', /at least/], ['11', /at most/], ['2.25', /step/], ['1'.repeat(4001), /4000/]]) {
    const invalid = evaluateLearningActivity(activity, { ...values, x: value });
    assert.match(invalid.error, message, value.slice(0, 20));
    assert.equal(invalid.invalidKey, 'x');
  }
  assert.equal(runs(), 1, 'invalid values never reach the operation');
  const badInput = evaluateLearningActivity(activity, { ...values, x: '' }, 'en', { badInputs: new Set(['x']) });
  assert.match(badInput.error, /finite/);
  const required = evaluateLearningActivity(activity, { ...values, mode: 'named' }, 'zh');
  assert.match(required.error, /备注/);
  assert.equal(required.invalidKey, 'note');
});

test('text limits apply to active fields and calculation failures cannot display non-finite output', () => {
  const { activity, values } = calculationFixture();
  assert.equal(evaluateLearningActivity(activity, { ...values, note: 'x'.repeat(4001) }).error, '');
  assert.equal(evaluateLearningActivity(activity, { ...values, mode: 'named', note: 'x'.repeat(4000) }).error, '');
  assert.match(evaluateLearningActivity(activity, { ...values, mode: 'named', note: 'x'.repeat(4001) }).error, /4000/);
  for (const result of [Infinity, NaN, undefined, '[[Infinity]]']) {
    const invalid = evaluateLearningActivity({ ...activity, calculate: () => ({ result }) }, values);
    assert.match(invalid.error, /finite/);
    assert.equal(invalid.result, undefined);
  }
  const failure = evaluateLearningActivity({ ...activity, calculate: () => { throw new Error('Vectors must match.'); } }, values);
  assert.equal(failure.error, 'Check the inputs: Vectors must match.');
});

function memoryStorage() {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
const entries = () => ['equals', 'summation'].map(id => ({ activity: { id }, panel: { dataset: {} } }));

test('learning snapshots count only matched practices and remain stable until progress changes', () => {
  const storage = memoryStorage();
  storage.setItem(PROGRESS_KEY, JSON.stringify(['other-guide-topic', 'equals']));
  const matched = entries();
  const model = createLearningModel({ entries: matched, store: createProgressStore(['equals', 'summation', 'other-guide-topic'], () => storage) });
  const initial = model.getSnapshot();
  assert.equal(initial.done, 1);
  assert.equal(initial.total, 2);
  assert.equal(initial.completed.has('other-guide-topic'), true, 'existing progress for other guides is retained');
  assert.equal(model.getSnapshot(), initial);
  assert.equal(matched[0].panel.dataset.complete, 'true');
  let notifications = 0;
  const unsubscribe = model.subscribe(() => notifications++);
  assert.equal(model.complete('equals'), initial, 'an already completed topic does not rerender subscribers');
  const completed = model.complete('summation');
  assert.notEqual(completed, initial);
  assert.equal(completed.done, 2);
  assert.equal(initial.completed.has('summation'), false, 'published snapshots are not mutated by later completions');
  assert.equal(matched[1].panel.dataset.complete, 'true');
  assert.equal(notifications, 1);
  unsubscribe();
  model.complete('summation');
  assert.equal(notifications, 1);
});

test('cross-tab storage merges and failed writes preserve current progress and truthful availability', () => {
  const storage = memoryStorage();
  const eventTarget = new EventTarget();
  const store = createProgressStore(['equals', 'summation'], () => storage);
  const model = createLearningModel({ entries: entries(), store, eventTarget });
  model.complete('equals');
  const anotherTab = createProgressStore(['equals', 'summation'], () => storage);
  anotherTab.complete('summation');
  const event = new Event('storage');
  Object.defineProperty(event, 'key', { value: `${PROGRESS_KEY}:summation` });
  eventTarget.dispatchEvent(event);
  const merged = model.getSnapshot();
  assert.equal(merged.done, 2);
  assert.equal(merged.available, true);
  eventTarget.dispatchEvent(event);
  assert.equal(model.getSnapshot(), merged, 'duplicate storage events preserve snapshot identity');

  const write = storage.setItem;
  storage.setItem = () => { throw new Error('Quota exceeded'); };
  const unsaved = model.complete('equals');
  assert.equal(unsaved.done, 2);
  assert.equal(unsaved.available, false);
  storage.setItem = write;
  assert.equal(model.complete('summation').available, true);
  assert.throws(() => model.complete('unknown'), /Unknown practice topic/);
  model.destroy();
});
