import { mkdir, readFile, writeFile, cp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { prepareClangHost } from './clang-host.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/** Reproducible static runtime assets. No network fetches or user-code execution at build time. */
export async function buildRunnerAssets(outputDirectory) {
  const output = join(outputDirectory, 'assets', 'runners');
  await mkdir(output, { recursive: true });
  const lock = JSON.parse(await readFile(join(root, 'site/runners/runtime-lock.json'), 'utf8'));
  const manifest = { version: 1, languages: { javascript: [], python: [], c: [] } };
  async function asset(language, name, bytes, gzip = true) {
    const buffer = gzip ? gzipSync(bytes, { level: 9 }) : Buffer.from(bytes);
    if (buffer.length > 25 * 1024 * 1024) throw new Error(`Static runtime asset exceeds the 25 MiB host limit: ${name}`);
    const filename = `${language}-${name}.${sha256(buffer).slice(0, 16)}${gzip ? '.gz' : ''}`;
    await writeFile(join(output, filename), buffer);
    manifest.languages[language].push({ name, path: `/assets/runners/${filename}`, bytes: buffer.length, sha256: sha256(buffer), gzip });
  }
  for (const file of lock.files) {
    if (file.retainedUnused) continue;
    let bytes = await readFile(join(root, 'site/runners/vendor', file.path));
    if (sha256(bytes) !== file.sha256) throw new Error(`Pinned runtime integrity mismatch: ${file.path}`);
    if (file.path === 'clang/shared.js') bytes = Buffer.from(prepareClangHost(bytes.toString('utf8')) + '\nself.MACClangAPI = API;\n');
    await asset(file.language, file.name, bytes);
  }
  const wasm = await readFile(join(root, 'node_modules/@jitl/quickjs-wasmfile-release-sync/dist/emscripten-module.wasm'));
  await asset('javascript', 'quickjs.wasm', wasm);
  const modules = await build({ entryPoints: [join(root, 'site/runners/guest-modules.cjs')], bundle: true,
    write: false, minify: true, format: 'iife', globalName: 'MACModules', platform: 'browser', target: 'es2020', legalComments: 'eof' });
  await asset('javascript', 'guest-modules.js', modules.outputFiles[0].contents);
  await asset('python', 'notation.py', await readFile(join(root, 'examples/notation.py')));
  const worker = await build({ entryPoints: [join(root, 'site/runners/worker.mjs')], write: false,
    bundle: true, minify: true, format: 'iife', platform: 'browser', target: 'es2022', legalComments: 'eof',
    // QuickJS's Emscripten wrapper calculates a directory before using the supplied
    // wasm bytes. A valid inert URL avoids import.meta.url in a classic Blob worker.
    define: { 'import.meta.url': '"https://runtime.invalid/worker.js"' } });
  const workerBytes = worker.outputFiles[0].contents;
  if (workerBytes.length > 2 * 1024 * 1024) throw new Error('The browser worker exceeds the 2 MiB limit.');
  const workerHash = sha256(workerBytes);
  const workerName = `worker.${workerHash.slice(0, 16)}.js`;
  await writeFile(join(output, workerName), workerBytes);
  manifest.worker = { path: `/assets/runners/${workerName}`, bytes: workerBytes.length, sha256: workerHash };
  await cp(join(root, 'site/runners/sandbox.html'), join(output, 'sandbox.html'));
  await cp(join(root, 'site/runners/THIRD-PARTY.md'), join(output, 'THIRD-PARTY.md'));
  await cp(join(root, 'site/runners/LICENSES'), join(output, 'LICENSES'), { recursive: true });
  for (const [language, files] of Object.entries(manifest.languages)) {
    if (files.reduce((bytes, file) => bytes + file.bytes, 0) > 32 * 1024 * 1024) throw new Error(`${language} runtime downloads exceed the 32 MiB limit.`);
  }
  await writeFile(join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}
