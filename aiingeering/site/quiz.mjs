export function normalizeQuiz(value) {
  const questions = Array.isArray(value) ? value : value?.questions;
  if (!Array.isArray(questions) || !questions.length) return null;
  const normalized = questions.map(question => {
    if (!question || typeof question !== 'object') return null;
    const options = question.options || question.choices;
    const original = question.correct ?? question.answer;
    const correct = typeof original === 'string' && Array.isArray(options) ? options.indexOf(original) : original;
    const indices = Array.isArray(correct) ? correct : [correct];
    if (!Array.isArray(options) || !options.every(option => typeof option === 'string') || !indices.length || new Set(indices).size !== indices.length || !indices.every(index => Number.isInteger(index) && index >= 0 && index < options.length)) return null;
    return { ...question, question: question.question || question.q || question.prompt, options, correct };
  });
  if (normalized.some(question => !question || typeof question.question !== 'string')) return null;
  return { ...(Array.isArray(value) ? {} : value), questions: normalized };
}

export function answerIsCorrect(question, selected = []) {
  const expected = Array.isArray(question.correct) ? question.correct : [question.correct];
  return Array.isArray(selected) && new Set(selected).size === selected.length && selected.length === expected.length && selected.every(value => expected.includes(value));
}

export function gradeQuiz(quiz, answers) {
  return { score: quiz.questions.filter((question, index) => answerIsCorrect(question, answers[index])).length, total: quiz.questions.length };
}
