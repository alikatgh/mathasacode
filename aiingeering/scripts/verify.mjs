import { readFileSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(join(root, 'import-manifest.json'), 'utf8'));
const catalog = JSON.parse(readFileSync(join(root, 'dist/catalog.json'), 'utf8'));
let checked = 0;
for (const file of manifest.files) {
  for (const base of ['content', 'dist/content']) {
    const path = join(root, base, file.path);
    if (!lstatSync(path).isFile()) throw new Error(`Not regular: ${base}/${file.path}`);
    const data = readFileSync(path);
    if (data.length !== file.bytes || createHash('sha256').update(data).digest('hex') !== file.sha256) throw new Error(`Snapshot mismatch: ${base}/${file.path}`);
  }
  checked++;
}
const required = manifest.files.filter(file => file.path.endsWith('.md'));
const listed = new Set(catalog.entries.map(entry => entry.path));
for (const file of required) if (!listed.has(file.path)) throw new Error(`Unreachable document: ${file.path}`);
for (const entry of catalog.entries.filter(entry => entry.renderedPath)) JSON.parse(readFileSync(join(root, 'dist', entry.renderedPath), 'utf8'));
for (const [name, expected] of Object.entries({ phaseLessons: 542, certificationLessons: 67, phaseQuizzes: 392, certificationQuizzes: 67, assessments: 12, projects: 78, manuals: 6, cheatsheets: 154, files: 9364 })) if (catalog.counts[name] !== expected) throw new Error(`${name}: expected ${expected}, got ${catalog.counts[name]}`);
console.log(JSON.stringify({ passed: true, checkedSourceAndBuildFiles: checked, catalogDocuments: listed.size, counts: catalog.counts, revision: manifest.source.revision }));
