const aliases = {
  py: 'python', python3: 'python', js: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', rs: 'rust', jl: 'julia', sh: 'bash', shell: 'bash', shellscript: 'bash',
  console: 'bash', terminal: 'bash', zsh: 'bash', jsonc: 'json', jsonl: 'json', yml: 'yaml',
  md: 'markdown', mdx: 'markdown', htm: 'html', 'c++': 'cpp', 'c#': 'csharp', cs: 'csharp',
  dockerfile: 'docker', plaintext: 'text', plain: 'text', txt: 'text',
};
const labels = {
  python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript', rust: 'Rust', julia: 'Julia',
  bash: 'Shell', json: 'JSON', yaml: 'YAML', html: 'HTML', css: 'CSS', sql: 'SQL',
  jsx: 'JSX', tsx: 'TSX', cpp: 'C++', csharp: 'C#', markdown: 'Markdown', text: 'Text',
};

export const codeSourceLimits = Object.freeze({ bytes: 65536, lines: 2000 });

export function normalizeLessonLanguage(language = '') {
  const name = String(language).trim().toLowerCase().replace(/^language-/, '');
  return Object.hasOwn(aliases, name) ? aliases[name] : name || 'text';
}

export function lessonLanguageLabel(language) {
  const normalized = normalizeLessonLanguage(language);
  return Object.hasOwn(labels, normalized) ? labels[normalized] : normalized;
}

export function languageForFile(path = '') {
  const name = String(path).split('/').at(-1).toLowerCase();
  return normalizeLessonLanguage(name === 'dockerfile' ? name : name.includes('.') ? name.split('.').at(-1) : 'text');
}

export function detectLessonLanguage(...classNames) {
  const match = classNames.join(' ').match(/(?:^|\s)(?:language|lang)-([^\s]+)/i);
  return normalizeLessonLanguage(match?.[1]);
}

export function isEnhanceableSource(source) {
  return typeof source === 'string'
    && source.length <= codeSourceLimits.bytes
    && new TextEncoder().encode(source).length <= codeSourceLimits.bytes
    && source.split(/\r\n|\r|\n/).length <= codeSourceLimits.lines;
}

/** Snapshot authored text; never trim, strip comments, or rewrite the source DOM. */
export function readLessonCode(pre) {
  if (pre.closest('.curriculum-diagram, .lesson-figure, .engineering-code-host, [data-slot="code-block"]')) return null;
  const code = pre.querySelector(':scope > code');
  if (!code || !isEnhanceableSource(code.textContent)) return null;
  return { source: code.textContent, language: detectLessonLanguage(code.className, pre.className) };
}
