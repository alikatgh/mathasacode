import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const siteOrigin = 'https://mathasacode.aulenor.com';
// Pages dashboard Direct Upload limits, checked against Cloudflare's official docs 2026-10-19.
// Keep the artifact compatible with both dashboard ZIP uploads and Wrangler.
export const assetLimits = { files: 1_000, bytesPerFile: 25 * 1024 * 1024 };
const sourceFiles = ['_headers', 'robots.txt', 'sitemap.xml', '404.html'];
const executionNames = new Set(['_worker.js', 'functions']);
const privateNames = /^(?:\.\S*|secrets?(?:[.\-_].*)?|credentials?(?:[.\-_].*)?|wrangler(?:[.\-_].*)?|package(?:-lock)?\.json|(?:AGENTS|SKILL)\.md)$/i;
const privateExtensions = new Set(['.pem', '.key', '.p12', '.pfx', '.sqlite', '.sqlite3', '.db', '.map', '.log']);
const textExtensions = new Set(['.html', '.css', '.js', '.mjs', '.cjs', '.py', '.json', '.txt', '.xml', '.svg', '.md']);
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/,
  /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}\b/,
];

export function validateStaticConfig(config) {
  const allowed = ['name', 'account_id', 'compatibility_date', 'pages_build_output_dir'];
  assert.ok(config && typeof config === 'object' && !Array.isArray(config), 'Expected a static deployment configuration');
  assert.deepEqual(Object.keys(config).filter(key => !allowed.includes(key)), [], 'Static release cannot contain Worker code, bindings, schedules or additional services');
  assert.equal(config.name, 'math-as-code', 'Unexpected Pages project');
  assert.equal(config.account_id, '4c1e57b6972105286a7aeb46b2b89c78', 'Unexpected Cloudflare account');
  assert.match(config.compatibility_date, /^\d{4}-\d{2}-\d{2}$/, 'Set a pinned compatibility date');
  const compatibilityTime = Date.parse(`${config.compatibility_date}T00:00:00Z`);
  assert.ok(Number.isFinite(compatibilityTime) && new Date(compatibilityTime).toISOString().slice(0, 10) === config.compatibility_date, 'Set a valid pinned compatibility date');
  assert.equal(config.pages_build_output_dir, './dist', 'Serve only the built static asset directory');
}

export async function inspectAssets(directory, { limits = assetLimits } = {}) {
  const directoryInfo = await lstat(directory);
  assert.ok(directoryInfo.isDirectory() && !directoryInfo.isSymbolicLink(), 'Static artifact must be a directory and must not follow links');
  const files = [];
  async function visit(relative = '') {
    const entries = await readdir(join(directory, relative), { withFileTypes: true });
    for (const entry of entries) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      assert.ok(!executionNames.has(entry.name.toLowerCase()), `Static release cannot contain Pages server execution paths: ${name}`);
      assert.ok(!privateNames.test(entry.name) && !privateExtensions.has(extname(entry.name).toLowerCase()), `Private or generated release input is not publishable: ${name}`);
      const path = join(directory, name);
      const info = await lstat(path);
      assert.ok(!info.isSymbolicLink(), `Static assets must not follow links outside the artifact: ${name}`);
      if (info.isDirectory()) {
        await visit(name);
      } else {
        assert.ok(info.isFile(), `Unsupported asset type: ${name}`);
        assert.ok(!name.endsWith('.html') || !name.includes('/') || name === 'assets/runners/sandbox.html', `Nested HTML needs an explicit document security policy: ${name}`);
        assert.ok(info.size <= limits.bytesPerFile, `Asset exceeds the Pages Direct Upload per-file limit: ${name}`);
        assert.ok(files.length < limits.files, 'Artifact exceeds the Pages dashboard Direct Upload file-count limit');
        const bytes = await readFile(path);
        if (textExtensions.has(extname(name).toLowerCase()) || entry.name === '_headers') {
          const content = bytes.toString('utf8');
          assert.ok(!secretPatterns.some(pattern => pattern.test(content)), `Possible credential material in public asset: ${name}`);
        }
        files.push({ path: name, bytes: info.size, sha256: createHash('sha256').update(bytes).digest('hex') });
      }
    }
  }
  await visit();
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

export async function verifyRelease(root = projectRoot, { artifactDirectory } = {}) {
  const config = JSON.parse(await readFile(join(root, 'wrangler.jsonc'), 'utf8'));
  validateStaticConfig(config);
  // Wrangler also discovers a functions directory in its working directory,
  // independently of pages_build_output_dir. Reject it even when dist is clean.
  for (const entry of await readdir(root)) {
    assert.ok(!executionNames.has(entry.toLowerCase()), `Static release cannot contain project-root Pages server execution paths: ${entry}`);
  }
  const directory = artifactDirectory ? resolve(artifactDirectory) : join(root, config.pages_build_output_dir);
  const files = await inspectAssets(directory);
  const publicFiles = new Set(files.map(file => file.path));
  assert.ok(publicFiles.has('404.html'), 'A top-level 404.html is required to prevent Pages single-page application fallback');
  for (const name of sourceFiles) {
    assert.equal(await readFile(join(directory, name), 'utf8'), await readFile(join(root, 'site', name), 'utf8'), `Built ${name} is absent or stale`);
  }
  const sitemap = await readFile(join(directory, 'sitemap.xml'), 'utf8');
  const locations = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), match => match[1]);
  assert.ok(locations.length >= 8, 'Sitemap must include the guides and support pages');
  assert.equal(new Set(locations).size, locations.length, 'Sitemap contains duplicate pages');
  for (const location of locations) {
    const url = new URL(location);
    assert.equal(url.origin, siteOrigin, 'Sitemap must use the production origin');
    assert.equal(url.search + url.hash, '', 'Sitemap entries must be canonical page URLs');
    const output = url.pathname === '/' ? 'index.html' : `${url.pathname.slice(1)}.html`;
    assert.ok(publicFiles.has(output), `Missing sitemap page: ${output}`);
  }
  const artifactHash = createHash('sha256').update(JSON.stringify(files)).digest('hex');
  return { files: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0), sha256: artifactHash, target: siteOrigin };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const index = process.argv.indexOf('--artifact');
    if (index >= 0 && !process.argv[index + 1]) throw new Error('--artifact requires a built directory');
    console.log(JSON.stringify(await verifyRelease(projectRoot, { artifactDirectory: index >= 0 ? process.argv[index + 1] : undefined }), null, 2));
  } catch (error) {
    console.error(`Release check failed: ${error.message}`);
    process.exitCode = 1;
  }
}
