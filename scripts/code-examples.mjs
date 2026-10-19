import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Marked } from 'marked';
import { foundations } from '../site/snippets/foundations.mjs';
import { advanced, chineseOverrides } from '../site/snippets/advanced.mjs';
import { pythonGuide } from '../site/snippets/python-guide.mjs';
import { moreMath } from '../site/snippets/more-math.mjs';
import { machineLearning } from '../site/snippets/machine-learning.mjs';

const fingerprints = JSON.parse(readFileSync(new URL('./snippet-fingerprints.json', import.meta.url), 'utf8'));
const english = { ...foundations, ...advanced, ...moreMath };
export const codeLanguages = ['javascript', 'python', 'c', 'rust'];
export const languageLabels = { javascript: 'JavaScript', python: 'Python', c: 'C', rust: 'Rust' };

export function getCodeExample(text, source) {
  const hashes = fingerprints[source];
  if (!hashes) return null;
  const index = hashes.indexOf(createHash('sha256').update(text).digest('hex')) + 1;
  if (!index) return null;
  let translations;
  let nativeLanguage = 'javascript';
  if (source === 'PYTHON-README.md') {
    nativeLanguage = 'python';
    const entry = pythonGuide[index];
    if (entry?.english) {
      const original = fingerprints['README.md'][entry.english - 1];
      translations = { ...english[entry.english], javascript: englishSources.get(original) };
    } else translations = entry;
  } else if (source === 'README-zh.md') {
    // Chinese has an additional Dirac example after its Kronecker example.
    translations = chineseOverrides[index] || english[index >= 58 ? index - 1 : index];
  } else if (source === 'docs/ml-deep-learning.md') translations = machineLearning[index];
  else translations = english[index];
  const variants = { ...translations, [nativeLanguage]: text };
  for (const language of codeLanguages) {
    if (typeof variants[language] !== 'string' || !variants[language].trim()) {
      throw new Error(`Missing ${language} translation for ${source} example ${index}`);
    }
  }
  return { id: `${source === 'PYTHON-README.md' ? 'py' : source === 'README-zh.md' ? 'zh' : source === 'docs/ml-deep-learning.md' ? 'ml' : 'en'}-${index}`, nativeLanguage, variants };
}

// The English source text is supplied by the build, rather than duplicated in a
// translation file. Fingerprints keep edits from silently reusing stale examples.
const englishSources = new Map(new Marked().lexer(readFileSync(new URL('../README.md', import.meta.url), 'utf8'))
  .filter(token => token.type === 'code')
  .map(token => [createHash('sha256').update(token.text).digest('hex'), token.text]));
