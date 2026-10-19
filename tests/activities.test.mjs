import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { documents, renderDocument, projectRoot } from '../scripts/build.mjs';
import { join } from 'node:path';
import { activities } from '../dist/assets/activities.mjs';

const defaults = activity => Object.fromEntries(activity.fields.map(field => [field.key, field.value]));
const find = id => { const activity = activities.find(item => item.id === id); assert.ok(activity, `missing ${id}`); return activity; };
const calculate = (id, values = {}) => { const activity = find(id); return activity.calculate({ ...defaults(activity), ...values }); };

test('every core topic has an activity on all three guides and each quiz has a valid localized answer', async () => {
  assert.equal(activities.length, 25);
  assert.equal(new Set(activities.map(activity => activity.id)).size, 25);
  for (const activity of activities) {
    assert.equal(new Set(activity.fields.map(field => field.key)).size, activity.fields.length);
    for (const lang of ['en', 'zh']) {
      for (const text of [activity.title, activity.description, activity.quiz.prompt, activity.quiz.explanation, ...activity.fields.map(field => field.label), ...activity.quiz.options.map(option => option.text)]) assert.ok(text[lang], `${activity.id} missing ${lang}`);
    }
    assert.equal(activity.quiz.options.filter(option => option.id === activity.quiz.answer).length, 1);
    assert.equal(new Set(activity.quiz.options.map(option => option.id)).size, activity.quiz.options.length);
  }
  for (const document of documents.slice(0, 3)) {
    const { headings } = renderDocument(await readFile(join(projectRoot, document.source), 'utf8'), document);
    const ids = new Set(headings.map(heading => heading.id));
    const matched = activities.filter(activity => activity.headingIds[document.lang].some(id => ids.has(id)));
    assert.equal(matched.length, document.source === 'PYTHON-README.md' ? 25 : 24, document.source);
    for (const activity of activities.filter(activity => activity.id !== 'set-builder')) assert.ok(matched.includes(activity), `${document.source}: ${activity.id}`);
  }
});

test('defaults and every selectable operation produce finite readable output', () => {
  for (const activity of activities) {
    const values = defaults(activity);
    const check = result => {
      assert.equal(typeof result.expression, 'string');
      assert.equal(typeof result.result, 'string');
      assert.ok(result.result.length > 0 && result.result.length < 200000);
      assert.doesNotMatch(result.result, /\b(?:NaN|Infinity|undefined)\b/);
    };
    check(activity.calculate(values));
    for (const field of activity.fields.filter(field => field.type === 'select')) {
      for (const option of field.options) check(activity.calculate({ ...values, [field.key]: option.value }));
    }
  }
});

test('live calculations match known mathematics and endpoint conventions', () => {
  assert.equal(calculate('summation').result, '5050');
  assert.equal(calculate('products').result, '720');
  assert.equal(calculate('square-root-complex', { x: '-16' }).result, '4i');
  assert.equal(calculate('dot-cross').result, '0');
  assert.equal(calculate('matrix-multiplication').result, '[[58, 64], [139, 154]]');
  assert.equal(calculate('intervals', { x: '1', closure: '[)' }).result, 'false');
  assert.equal(calculate('intervals', { x: '0', closure: '[)' }).result, 'true');
  assert.equal(calculate('logic', { A: 'false', B: 'false', operation: 'implies' }).result, 'true');
  assert.equal(calculate('membership', { set: '[]' }).result, 'false');
  assert.match(calculate('integrals').result, /0\.3333335/);
  assert.equal(calculate('lambertian', { normal: '[0,0,1]', light: '[0,0,-1]' }).result, '0 W/(m² sr)');
});

test('playgrounds reject oversized work, malformed arrays and non-finite data before computation', () => {
  for (const values of [{ lower: '', upper: '100' }, { lower: '0', upper: '10000' }, { lower: '3', upper: '2' }]) assert.throws(() => calculate('summation', values));
  for (const n of ['1e20', '10001', '0', '-1', '1.5']) assert.throws(() => calculate('integrals', { n }));
  for (const a of ['[[1],[2,3]]', '[[null]]', 'not JSON', '['.repeat(4001), JSON.stringify(Array.from({ length: 21 }, () => [1]))]) assert.throws(() => calculate('matrix-multiplication', { a }));
  assert.throws(() => calculate('unit-vector', { vector: '[0,0,0]' }));
  assert.throws(() => calculate('derivatives', { h: '0' }));
  assert.throws(() => calculate('lambertian', { reflectance: '2' }));
});

test('inactive controls can be empty in every selectable mode', () => {
  for (const activity of activities) {
    for (const field of activity.fields.filter(field => field.type === 'select')) {
      for (const option of field.options) {
        const values = { ...defaults(activity), [field.key]: option.value };
        for (const conditional of activity.fields) if (conditional.activeWhen && !conditional.activeWhen(values)) values[conditional.key] = '';
        assert.equal(typeof activity.calculate(values).result, 'string', `${activity.id}: ${option.value}`);
      }
    }
  }
  const integral = find('integrals');
  assert.equal(integral.fields.find(field => field.key === 'C').activeWhen({ mode: 'definite' }), false);
  assert.equal(integral.fields.find(field => field.key === 'n').activeWhen({ mode: 'indefinite' }), false);
  assert.match(calculate('integrals', { C: '' }).result, /0\.3333335/);
});
