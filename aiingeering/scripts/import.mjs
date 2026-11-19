import { execFileSync } from 'node:child_process';
import { constants, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join, dirname } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = resolve(process.argv[2] || join(root, '../../../ai_course/ai-engineering-from-scratch'));
const output = join(root, 'content');
if (existsSync(join(root, 'import-manifest.json'))) throw new Error('Snapshot already exists. Import into a new directory to preserve existing files.');
const git = args => execFileSync('git', ['-C', source, ...args], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
if (git(['status', '--porcelain', '--untracked-files=no']).trim()) throw new Error('Source tracked work is dirty; pin a clean source revision before import.');
const paths = git(['ls-files', '-z']).split('\0').filter(Boolean);
const files = [], excluded = [];
for (const path of paths) {
  if (path.split('/').some(part => part.startsWith('.')) || /(?:^|\/)(?:secrets\.[^/]*|[^/]+\.(?:pem|key))$/i.test(path)) {
    excluded.push({ path, reason: 'Repository-private metadata or credential filename; not published' });
    continue;
  }
  const from = join(source, path), to = join(output, path);
  if (!lstatSync(from).isFile()) throw new Error(`Not a regular source file: ${path}`);
  const bytes = readFileSync(from);
  files.push({ path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to, constants.COPYFILE_FICLONE);
}
const revision = git(['rev-parse', 'HEAD']).trim();
// The original source uses CommonJS and has no root package. Preserve its module boundary.
writeFileSync(join(output, 'package.json'), '{"private":true,"type":"commonjs"}\n');
const manifest = { version: 1, source: { url: 'https://github.com/rohitg00/ai-engineering-from-scratch', revision }, importedAt: new Date().toISOString(), files, excluded, bytes: files.reduce((sum, file) => sum + file.bytes, 0) };
writeFileSync(join(root, 'import-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ revision, files: files.length, bytes: manifest.bytes, excluded: excluded.length }));
