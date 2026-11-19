import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const label = value => value.replace(/^\d+-/, '').replace(/[-_]/g, ' ').replace(/^./, c => c.toUpperCase());
export function createCatalog(root, manifest) {
  const paths = new Set(manifest.files.map(file => file.path));
  const groups = new Map();
  const entries = [];
  for (const file of manifest.files) {
    const path = file.path;
    if (!/\.md$/i.test(path) && !/^(?:certifications\/[^/]+\/(?:tracks|assessments)|learning-paths|research|practice\/problems)\/.*\.json$/.test(path) && !/\/(?:project|manual|program)\.json$/.test(path) && !/^site\/(?:inside-a-decompiler|inside-an-ai-agent|inside-an-llm-serving-gpu|about|contact|how-to-learn)\.html$/.test(path)) continue;
    let group = path.split('/')[0], kind = group;
    const phase = /^phases\/([^/]+)\/([^/]+)\/docs\/([^/]+)\.md$/.exec(path);
    const certification = /^certifications\/([^/]+)\/lessons\/([^/]+)\/docs\/([^/]+)\.md$/.exec(path);
    const manual = /^manuals\/([^/]+)\//.exec(path);
    if (phase) { group = `phases/${phase[1]}`; kind = 'lesson'; }
    else if (certification) { group = `certifications/${certification[1]}`; kind = 'certification'; }
    else if (path.startsWith('phases/')) { group = 'resources/lesson-artifacts'; kind = 'reference'; }
    else if (manual) group = `manuals/${manual[1]}`;
    else if (/^certifications\/[^/]+\//.test(path)) group = path.split('/').slice(0, 2).join('/');
    else if (!path.includes('/')) group = 'course';
    const text = readFileSync(join(root, 'content', path), 'utf8');
    let title = /^#\s+(.+)$/m.exec(text)?.[1] || /^title:\s*(.+)$/m.exec(text)?.[1] || label(path.split('/').at(-1).replace(/\.[^.]+$/, ''));
    if (path.endsWith('.json')) { try { const value = JSON.parse(text); title = value.title || value.name || title; } catch {} }
    if (path.endsWith('.html')) title = /<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(text)?.[1].replace(/<[^>]*>/g, '') || title;
    const entry = { path, title, kind, group, search: text.replace(/[`#*<>]/g, ' ').slice(0, 600).toLowerCase() };
    if (phase || certification) {
      entry.lessonRoot = path.replace(/\/docs\/[^/]+$/, '');
      entry.language = (phase || certification)[3];
      if (paths.has(`${entry.lessonRoot}/quiz.json`)) entry.quizPath = `${entry.lessonRoot}/quiz.json`;
    } else if (/^projects\/[^/]+\//.test(path)) entry.lessonRoot = path.split('/').slice(0, 2).join('/');
    entries.push(entry);
    if (!groups.has(group)) groups.set(group, { id: group, kind: group.split('/')[0], title: group === 'course' ? 'About the course' : group.startsWith('phases/') ? `Phase ${group.split('/')[1].slice(0, 2)} · ${label(group.split('/')[1])}` : label(group.split('/').at(-1)), entries: [] });
    groups.get(group).entries.push(entry);
  }
  const count = regex => manifest.files.filter(file => regex.test(file.path)).length;
  const counts = {
    phaseLessons: count(/^phases\/[^/]+\/[^/]+\/docs\/en\.md$/),
    certificationLessons: count(/^certifications\/[^/]+\/lessons\/[^/]+\/docs\/en\.md$/),
    phaseQuizzes: count(/^phases\/[^/]+\/[^/]+\/quiz\.json$/),
    certificationQuizzes: count(/^certifications\/[^/]+\/lessons\/[^/]+\/quiz\.json$/),
    assessments: count(/^certifications\/[^/]+\/assessments\/.*\.json$/),
    projects: count(/^projects\/(?!_template\/)[^/]+\/project\.json$/),
    manuals: count(/^manuals\/[^/]+\/manual\.json$/),
    cheatsheets: count(/^cheatsheets\/(?!AUTHORING\.md|README\.md)[^/]+\.md$/),
    files: manifest.files.length,
    documents: entries.length,
    bytes: manifest.bytes
  };
  const order = ['phases', 'certifications', 'projects', 'manuals', 'practice', 'cheatsheets', 'learning-paths', 'glossary', 'research', 'skills', 'i18n', 'resources', 'course'];
  const rank = group => { const index = order.indexOf(group.id.split('/')[0]); return index < 0 ? 99 : index; };
  const programDisclaimers = Object.fromEntries(['claude', 'mcpa'].map(id => [id, JSON.parse(readFileSync(join(root, 'content', 'certifications', id, 'program.json'), 'utf8')).disclaimer]));
  return { source: manifest.source, counts, entries, groups: [...groups.values()].sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id)), files: manifest.files, programDisclaimers };
}
