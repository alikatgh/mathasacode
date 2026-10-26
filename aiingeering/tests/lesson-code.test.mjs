import test from 'node:test';
import assert from 'node:assert/strict';
import {
  codeSourceLimits, detectLessonLanguage, isEnhanceableSource, languageForFile,
  lessonLanguageLabel, normalizeLessonLanguage, readLessonCode,
} from '../site/lesson-code-model.mjs';

function authoredPre(source, { className = 'language-python', preClass = '', excluded = false, hasCode = true } = {}) {
  const code = { textContent: source, className };
  return { className: preClass, textContent: source, closest: () => excluded ? {} : null,
    querySelector: () => hasCode ? code : null };
}

test('snapshots source exactly, including annotation comments, indentation, Unicode, and final newlines', () => {
  for (const source of ['    return "λ 🐍"\n', '\tvalue = 3 # [!code ++]\n\n', '\r\n  x = 1\r\n', '', 'a < b && b > c']) {
    const pre = authoredPre(source);
    assert.equal(readLessonCode(pre).source, source);
    assert.equal(pre.textContent, source);
  }
});

test('normalizes supported aliases without inferring code or changing unknown languages', () => {
  for (const [alias, canonical] of Object.entries({ py: 'python', ' PYTHON3 ': 'python', js: 'javascript', ts: 'typescript', rs: 'rust', jl: 'julia', console: 'bash', shell: 'bash', zsh: 'bash', yml: 'yaml', plaintext: 'text', 'language-JL': 'julia' })) {
    assert.equal(normalizeLessonLanguage(alias), canonical);
  }
  assert.equal(normalizeLessonLanguage('made-up-language'), 'made-up-language');
  assert.equal(normalizeLessonLanguage('__proto__'), '__proto__');
  assert.equal(lessonLanguageLabel('constructor'), 'constructor');
  assert.equal(normalizeLessonLanguage(), 'text');
  assert.equal(lessonLanguageLabel('ts'), 'TypeScript');
  assert.equal(lessonLanguageLabel('made-up-language'), 'made-up-language');
});

test('detects authored language classes and file extensions', () => {
  assert.equal(detectLessonLanguage('hljs language-rs'), 'rust');
  assert.equal(detectLessonLanguage('', 'example lang-jl'), 'julia');
  assert.equal(detectLessonLanguage('hljs'), 'text');
  assert.equal(languageForFile('phases/code/main.py'), 'python');
  assert.equal(languageForFile('main.JL'), 'julia');
  assert.equal(languageForFile('Dockerfile'), 'docker');
  assert.equal(languageForFile('LICENSE'), 'text');
});

test('caps enhancement by UTF-8 bytes and line count, including Unicode and CRLF', () => {
  assert.equal(isEnhanceableSource('x'.repeat(codeSourceLimits.bytes)), true);
  assert.equal(isEnhanceableSource('x'.repeat(codeSourceLimits.bytes + 1)), false);
  assert.equal(isEnhanceableSource('🐍'.repeat(codeSourceLimits.bytes / 4)), true);
  assert.equal(isEnhanceableSource('🐍'.repeat(codeSourceLimits.bytes / 4 + 1)), false);
  assert.equal(isEnhanceableSource('x\n'.repeat(1999) + 'x'), true);
  assert.equal(isEnhanceableSource('x\n'.repeat(2000) + 'x'), false);
  assert.equal(isEnhanceableSource('x\r\n'.repeat(2000) + 'x'), false);
});

test('leaves authored diagrams, non-code pre blocks, and oversized sources untouched', () => {
  assert.equal(readLessonCode(authoredPre('graph TD; A-->B', { excluded: true })), null);
  assert.equal(readLessonCode(authoredPre('a', { hasCode: false })), null);
  assert.equal(readLessonCode(authoredPre('a'.repeat(65537))), null);
  assert.equal(readLessonCode(authoredPre('plain', { className: 'language-unavailable' })).language, 'unavailable');
});
