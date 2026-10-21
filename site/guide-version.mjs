import { exampleLanguages } from './example-model.mjs';
import { sectionForPath } from './navigation-model.mjs';

export function guideVersionValue(pathname, language) {
  const path = pathname.replace(/\/+$/, '').replace(/\.html$/, '');
  if (path === '/README-zh') return 'zh';
  if (['reference', 'ml'].includes(sectionForPath(pathname)) && exampleLanguages.includes(language)) return language;
  return 'javascript';
}

/** A null path changes code in place; other paths retain the authored guide routes. */
export function guideVersionTarget(pathname, value) {
  if (value === 'zh') return { path: '/README-zh.html', language: null };
  if (!exampleLanguages.includes(value)) return null;
  const path = pathname.replace(/\/+$/, '').replace(/\.html$/, '');
  if (sectionForPath(pathname) === 'ml') return { path: null, language: value };
  if (value === 'python') return { path: path === '/PYTHON-README' ? null : '/PYTHON-README.html', language: value };
  return { path: ['', '/index'].includes(path) ? null : '/', language: value };
}
