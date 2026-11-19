import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { normalizeQuiz, answerIsCorrect, gradeQuiz } from '../site/quiz.mjs';

test('multiple answers require the exact set, reject partial and duplicate choices', () => {
  const question = { correct: [1, 3] };
  assert.equal(answerIsCorrect(question, [3, 1]), true);
  for (const selected of [[], [1], [1, 1], [1, 2], [1, 2, 3]]) assert.equal(answerIsCorrect(question, selected), false);
});
test('malformed assessments remain readable source instead of crashing the quiz', () => {
  for (const value of [null, [null], { questions: [null] }, { questions: [{ question: 'Q', options: ['A'], correct: [] }] }, { questions: [{ question: 'Q', options: ['A'], correct: 3 }] }]) assert.equal(normalizeQuiz(value), null);
});
test('every stored quiz and assessment grades correct answers and detects an omission', () => {
  const root = resolve(import.meta.dirname, '..');
  const manifest = JSON.parse(readFileSync(join(root, 'import-manifest.json'), 'utf8'));
  const files = manifest.files.filter(file => /^(?:phases|certifications)\//.test(file.path) && (file.path.endsWith('/quiz.json') || /\/assessments\/.*\.json$/.test(file.path)));
  assert.equal(files.length, 471);
  for (const file of files) {
    const quiz = normalizeQuiz(JSON.parse(readFileSync(join(root, 'content', file.path), 'utf8')));
    assert.ok(quiz, file.path);
    const answers = Object.fromEntries(quiz.questions.map((question, i) => [i, Array.isArray(question.correct) ? question.correct : [question.correct]]));
    assert.deepEqual(gradeQuiz(quiz, answers), { score: quiz.questions.length, total: quiz.questions.length }, file.path);
    delete answers[0];
    assert.equal(gradeQuiz(quiz, answers).score, quiz.questions.length - 1, file.path);
  }
});
