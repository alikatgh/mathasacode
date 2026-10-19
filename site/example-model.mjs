export const exampleLanguages = Object.freeze(['javascript', 'python', 'c', 'rust']);
export const exampleLanguageLabels = Object.freeze({ javascript: 'JavaScript', python: 'Python', c: 'C', rust: 'Rust', text: 'Text' });
export const languagePreferenceKey = 'math-as-code-language-v1';

export function readExampleLanguage(storage, fallback = 'javascript') {
  try {
    const value = storage?.getItem(languagePreferenceKey);
    return exampleLanguages.includes(value) ? value : fallback;
  } catch { return fallback; }
}

export function saveExampleLanguage(storage, language) {
  if (!exampleLanguages.includes(language)) return false;
  try { storage?.setItem(languagePreferenceKey, language); return Boolean(storage); }
  catch { return false; }
}

/** Tokens are presentation only. The preserved source remains the authority. */
export function exampleLines(source, supplied) {
  const textLines = source.split('\n');
  const valid = Array.isArray(supplied) && supplied.length === textLines.length
    && supplied.every((line, index) => line && line.number === index + 1
      && line.text === textLines[index] && Array.isArray(line.tokens)
      && line.tokens.every(token => token && typeof token.content === 'string')
      && line.tokens.map(token => token.content).join('') === textLines[index]);
  return valid ? supplied : textLines.map((text, index) => ({
    number: index + 1, text, tokens: [{ content: text }],
  }));
}

export function detectExampleLanguage(code) {
  const language = Array.from(code.classList || []).find(value => /^(?:language|lang)-/.test(value))
    ?.replace(/^(?:language|lang)-/, '').toLowerCase();
  if (['js', 'javascript', 'jsx', 'mjs'].includes(language)) return 'javascript';
  if (['py', 'python', 'python3'].includes(language)) return 'python';
  if (['c', 'cpp', 'c++'].includes(language)) return 'c';
  if (['rs', 'rust'].includes(language)) return 'rust';
  return language || 'text';
}
