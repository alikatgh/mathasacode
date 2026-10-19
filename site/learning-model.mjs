import { createProgressStore } from './progress.mjs';

export const learningText = {
  en: {
    overview: 'Practice as you read', introduction: 'Read a section, change the inputs, then check your understanding.',
    progress: (done, total) => `${done} of ${total} topics complete`, saved: 'Progress is saved only in this browser.',
    unsaved: 'This browser cannot save progress. You can still practice during this visit.',
    start: 'Start practicing', next: 'Continue practicing', review: 'Review a topic',
    practice: title => `Try it: ${title}`, complete: 'Completed', read: 'Read the explanation', skip: 'Skip practice',
    result: 'Result', unavailable: 'Check the inputs', quiz: 'Check your understanding', check: 'Check answer',
    choose: 'Choose an answer first.', correct: 'Correct. This topic is marked complete.',
    incorrect: 'Not quite. Change your answer and try again.', inputError: 'Check the inputs: ',
    required: label => `Enter a value for ${label}.`, number: label => `Enter a finite number for ${label}.`,
    minimum: (label, minimum) => `${label} must be at least ${minimum}.`,
    maximum: (label, maximum) => `${label} must be at most ${maximum}.`,
    step: (label, step) => `Use the specified step of ${step} for ${label}.`,
    long: label => `Keep ${label} to 4000 characters or fewer.`,
  },
  zh: {
    overview: '边读边练', introduction: '读完一节后，改变输入观察结果，再检查理解。',
    progress: (done, total) => `已完成 ${done} / ${total} 个主题`, saved: '进度仅保存在当前浏览器中。',
    unsaved: '当前浏览器无法保存进度；本次打开的页面仍可正常练习。',
    start: '开始练习', next: '继续练习', review: '复习一个主题',
    practice: title => `动手试试：${title}`, complete: '已完成', read: '回看说明', skip: '跳过练习',
    result: '结果', unavailable: '请检查输入', quiz: '检查理解', check: '检查答案',
    choose: '请先选择一个答案。', correct: '回答正确。此主题已标记为完成。',
    incorrect: '还不正确，可以修改答案后再试。', inputError: '请检查输入：',
    required: label => `请填写“${label}”。`, number: label => `“${label}”需要一个有限数值。`,
    minimum: (label, minimum) => `“${label}”不能小于 ${minimum}。`,
    maximum: (label, maximum) => `“${label}”不能大于 ${maximum}。`,
    step: (label, step) => `“${label}”请使用指定的步长 ${step}。`,
    long: label => `“${label}”最多可输入 4000 个字符。`,
  },
};

export const localizeLearning = (value, language = 'en') => typeof value === 'string'
  ? value : (value?.[language] ?? value?.en ?? '');

/** Validate only active fields before running the activity's fixed operation. */
export function evaluateLearningActivity(activity, values, language = 'en', { badInputs = new Set() } = {}) {
  const text = learningText[language] ?? learningText.en;
  const activeKeys = new Set();
  try {
    for (const field of activity.fields) {
      if (!field.activeWhen || field.activeWhen(values)) activeKeys.add(field.key);
    }
    for (const field of activity.fields) {
      if (!activeKeys.has(field.key)) continue;
      const label = localizeLearning(field.label, language);
      const value = String(values[field.key] ?? '');
      let error = '';
      if (field.type === 'number' && badInputs.has(field.key)) error = text.number(label);
      else if (!value.trim()) error = text.required(label);
      else if (value.length > 4000) error = text.long(label);
      else if (field.type === 'number') {
        const number = Number(value);
        if (!Number.isFinite(number)) error = text.number(label);
        else if (field.min !== undefined && number < Number(field.min)) error = text.minimum(label, field.min);
        else if (field.max !== undefined && number > Number(field.max)) error = text.maximum(label, field.max);
        else if (field.step !== undefined && field.step !== 'any') {
          const step = Number(field.step);
          const quotient = (number - Number(field.min ?? 0)) / step;
          if (step > 0 && Math.abs(quotient - Math.round(quotient)) > 1e-7) error = text.step(label, field.step);
        }
      }
      if (error) return { activeKeys, error, invalidKey: field.key };
    }
    const calculated = activity.calculate(values);
    const result = String(calculated.result);
    if (!result || /\b(?:NaN|Infinity|undefined)\b/.test(result)) throw new Error(text.number(text.result));
    return {
      activeKeys, error: '', expression: String(calculated.expression ?? ''), result,
      explanation: localizeLearning(calculated.explanation, language),
    };
  } catch (failure) {
    return { activeKeys, error: text.inputError + (failure instanceof Error ? failure.message : String(failure)) };
  }
}

/** A stable external store shared by the shell and every persistent portal. */
export function createLearningModel({ entries = [], overview = null, language = 'en', catalogIds,
  store = createProgressStore(catalogIds ?? entries.map(entry => entry.activity.id)), eventTarget } = {}) {
  const subscribers = new Set();
  const initial = store.read();
  let snapshot = Object.freeze({
    done: entries.filter(entry => initial.completed.has(entry.activity.id)).length,
    total: entries.length, completed: new Set(initial.completed), available: initial.available,
  });
  const updatePanels = () => {
    for (const entry of entries) if (entry.panel) entry.panel.dataset.complete = String(snapshot.completed.has(entry.activity.id));
  };
  const merge = state => {
    const completed = new Set([...snapshot.completed, ...state.completed]);
    if (completed.size === snapshot.completed.size && state.available === snapshot.available) return snapshot;
    snapshot = Object.freeze({
      done: entries.filter(entry => completed.has(entry.activity.id)).length,
      total: entries.length, completed, available: state.available,
    });
    updatePanels();
    for (const subscriber of subscribers) subscriber();
    return snapshot;
  };
  const onStorage = event => { if (store.isProgressKey(event.key)) merge(store.read()); };
  eventTarget?.addEventListener('storage', onStorage);
  updatePanels();
  return {
    entries, overview, language,
    getSnapshot: () => snapshot,
    subscribe(listener) { subscribers.add(listener); return () => subscribers.delete(listener); },
    complete: id => merge(store.complete(id)),
    destroy() { eventTarget?.removeEventListener('storage', onStorage); subscribers.clear(); },
  };
}
