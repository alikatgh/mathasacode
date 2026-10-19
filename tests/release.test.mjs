import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { assetLimits, inspectAssets, siteOrigin, validateStaticConfig, verifyRelease } from '../scripts/verify-release.mjs';

const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
const staticConfig = {
  name: 'math-as-code',
  account_id: '4c1e57b6972105286a7aeb46b2b89c78',
  compatibility_date: '2026-10-19',
  workers_dev: false,
  preview_urls: false,
  assets: { directory: './dist', html_handling: 'auto-trailing-slash', not_found_handling: '404-page' },
  routes: [{ pattern: new URL(siteOrigin).hostname, custom_domain: true }],
};

test('Workers release configuration allows only its pinned static target', () => {
  assert.deepEqual(config, staticConfig);
  assert.doesNotThrow(() => validateStaticConfig(config));
  for (const extra of [
    { main: 'server.js' }, { kv_namespaces: [] }, { triggers: { crons: ['* * * * *'] } },
    { observability: { enabled: true } }, { pages_build_output_dir: './dist' },
    { env: { production: { vars: {} } } }, { unknown_option: true },
  ]) {
    assert.throws(() => validateStaticConfig({ ...config, ...extra }), /Static release cannot contain/);
  }
  assert.throws(() => validateStaticConfig({ ...config, name: 'another-project' }), /Unexpected Worker project/);
  assert.throws(() => validateStaticConfig({ ...config, account_id: '0'.repeat(32) }), /Unexpected Cloudflare account/);
  for (const compatibility_date of ['latest', '2026-02-30', '2026-99-01', '2026-10-20']) {
    assert.throws(() => validateStaticConfig({ ...config, compatibility_date }), /pinned compatibility date/);
  }
  for (const key of Object.keys(staticConfig)) {
    const missing = { ...config };
    delete missing[key];
    assert.throws(() => validateStaticConfig(missing));
  }
  assert.deepEqual(assetLimits, { files: 1000, bytesPerFile: 25 * 1024 * 1024 });
});

test('Workers release disables secondary hosts and rejects asset execution options', () => {
  for (const key of ['workers_dev', 'preview_urls']) {
    for (const value of [true, 'false', null]) {
      assert.throws(() => validateStaticConfig({ ...config, [key]: value }), /must be disabled/);
    }
  }
  for (const assets of [
    null, [], {}, { ...staticConfig.assets, directory: './' },
    { ...staticConfig.assets, html_handling: 'none' },
    { ...staticConfig.assets, not_found_handling: 'single-page-application' },
    { ...staticConfig.assets, run_worker_first: false },
    { ...staticConfig.assets, run_worker_first: true },
    { ...staticConfig.assets, binding: 'ASSETS' },
  ]) {
    assert.throws(() => validateStaticConfig({ ...config, assets }), /Serve only/);
  }
});

test('Workers release pins one custom domain without route overrides', () => {
  for (const routes of [
    null, [], [{ pattern: 'other.aulenor.com', custom_domain: true }],
    [{ pattern: `${new URL(siteOrigin).hostname}/*`, custom_domain: true }],
    [{ pattern: new URL(siteOrigin).hostname, custom_domain: false }],
    [{ ...staticConfig.routes[0], zone_name: 'aulenor.com' }],
    [...staticConfig.routes, { pattern: 'other.aulenor.com', custom_domain: true }],
  ]) {
    assert.throws(() => validateStaticConfig({ ...config, routes }), /production custom domain/);
  }
});

test('artifact inspection rejects Pages execution paths at any depth', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'math-as-code-pages-execution-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, 'assets'));
  for (const name of ['_worker.js', 'assets/_worker.js', 'assets/FUNCTIONS']) {
    await writeFile(join(directory, name), 'export default {};');
    await assert.rejects(inspectAssets(directory), /Pages server execution paths/);
    await rm(join(directory, name));
  }
  await mkdir(join(directory, 'functions'));
  await assert.rejects(inspectAssets(directory), /Pages server execution paths/);
});

test('artifact inspection rejects a symlink as its root and enforces the file-count boundary', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'math-as-code-pages-root-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, 'site'));
  await writeFile(join(directory, 'site', 'index.html'), '<!doctype html>');
  await writeFile(join(directory, 'site', 'app.js'), 'console.log("fixture");');
  const limits = { files: 2, bytesPerFile: 1024 };
  assert.equal((await inspectAssets(join(directory, 'site'), { limits })).length, 2);
  await writeFile(join(directory, 'site', 'third.txt'), 'fixture');
  await assert.rejects(inspectAssets(join(directory, 'site'), { limits }), /file-count limit/);
  await symlink(join(directory, 'site'), join(directory, 'linked-site'));
  await assert.rejects(inspectAssets(join(directory, 'linked-site')), /must not follow links/);
});

test('release gate rejects project-root functions even when the artifact is static', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'math-as-code-pages-functions-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(join(directory, 'wrangler.jsonc'), JSON.stringify(config));
  for (const name of ['functions', '_worker.js']) {
    await mkdir(join(directory, name));
    await assert.rejects(verifyRelease(directory), /project-root Pages server execution paths/);
    await rm(join(directory, name), { recursive: true });
  }
});

test('release gate requires the built 404 policy and unchanged source metadata', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'math-as-code-pages-release-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(join(directory, 'wrangler.jsonc'), JSON.stringify(config));
  await mkdir(join(directory, 'site'));
  await mkdir(join(directory, 'dist'));
  const pages = ['/', '/about', '/help', '/guide', '/learn', '/practice', '/reference', '/notation'];
  const metadata = {
    '_headers': '/*\n  X-Content-Type-Options: nosniff\n',
    'robots.txt': `User-agent: *\nAllow: /\nSitemap: ${siteOrigin}/sitemap.xml\n`,
    'sitemap.xml': `<urlset>${pages.map(page => `<url><loc>${siteOrigin}${page}</loc></url>`).join('')}</urlset>`,
    '404.html': '<!doctype html><title>Not found</title>',
  };
  for (const page of pages) {
    const filename = page === '/' ? 'index.html' : `${page.slice(1)}.html`;
    await writeFile(join(directory, 'dist', filename), '<!doctype html><title>Guide</title>');
  }
  for (const [filename, content] of Object.entries(metadata)) {
    await writeFile(join(directory, 'site', filename), content);
    if (filename !== '404.html') await writeFile(join(directory, 'dist', filename), content);
  }
  await assert.rejects(verifyRelease(directory), /top-level 404.html is required/);
  await writeFile(join(directory, 'dist', '404.html'), metadata['404.html']);
  assert.equal((await verifyRelease(directory)).files, 12);
  for (const filename of ['404.html', '_headers', 'sitemap.xml']) {
    await writeFile(join(directory, 'dist', filename), 'stale fixture');
    await assert.rejects(verifyRelease(directory), new RegExp(`Built ${filename.replaceAll('.', '\\.')} is absent or stale`));
    await writeFile(join(directory, 'dist', filename), metadata[filename]);
  }
});

test('artifact inspection rejects private paths, symlinks, credentials and provider limit overruns', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'math-as-code-release-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(join(directory, 'index.html'), '<!doctype html><title>Guide</title>');
  assert.equal((await inspectAssets(directory)).length, 1);
  await assert.rejects(inspectAssets(directory, { limits: { files: 0, bytesPerFile: 1024 } }), /file-count limit/);
  await assert.rejects(inspectAssets(directory, { limits: { files: 10, bytesPerFile: 1 } }), /per-file limit/);
  for (const name of ['.env', 'secrets.json', 'client.key', 'app.mjs.map']) {
    await writeFile(join(directory, name), 'fixture');
    await assert.rejects(inspectAssets(directory), /not publishable/);
    await rm(join(directory, name));
  }
  await mkdir(join(directory, 'assets'));
  await writeFile(join(directory, 'assets', 'unexpected.html'), '<!doctype html>');
  await assert.rejects(inspectAssets(directory), /Nested HTML needs/);
  await rm(join(directory, 'assets', 'unexpected.html'));
  await symlink(join(directory, 'index.html'), join(directory, 'assets', 'linked.html'));
  await assert.rejects(inspectAssets(directory), /must not follow links/);
  await rm(join(directory, 'assets', 'linked.html'));
  // A synthetic value tests the scanner; it is not a credential.
  await writeFile(join(directory, 'assets', 'sample.js'), `const key = "ghp_${'x'.repeat(36)}";`);
  await assert.rejects(inspectAssets(directory), /Possible credential material/);
});
