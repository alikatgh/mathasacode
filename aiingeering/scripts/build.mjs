import { build } from 'esbuild';
import { constants, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { createCatalog } from './catalog.mjs';
import { buildExplainers, semanticProse } from './explainers.mjs';

const root = resolve(import.meta.dirname, '..');
const content = join(root, 'content');
const out = join(root, 'dist');
const require = createRequire(import.meta.url);
const manifest = JSON.parse(readFileSync(join(root, 'import-manifest.json'), 'utf8'));
const catalog = createCatalog(root, manifest);
const paths = new Set(manifest.files.map(file => file.path));
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const route = (path, hash = '') => `?path=${encodeURIComponent(path)}${hash}`;
mkdirSync(join(out, 'assets'), { recursive: true });
mkdirSync(join(out, 'rendered'), { recursive: true });
const copy = (from, to) => { mkdirSync(dirname(to), { recursive: true }); copyFileSync(from, to, constants.COPYFILE_FICLONE); };
for (const file of manifest.files) copy(join(content, file.path), join(out, 'content', file.path));
const sourceBuild = require(join(content, 'site/build.js'));
const figures = sourceBuild.buildFigureProviderManifest(content, join(content, 'site'));
const projectProviders = manifest.files.map(file => file.path).filter(path => /^site\/figures\/projects\/.*\.js$/.test(path)).map(path => path.slice(5));
figures.providerOrder.push(...projectProviders.sort((a, b) => (a.endsWith('/runtime.js') ? -1 : b.endsWith('/runtime.js') ? 1 : a.localeCompare(b))));
const providerSources = new Map(figures.providerOrder.map(path => [path, readFileSync(join(content, 'site', path), 'utf8')]));
for (const entry of catalog.entries.filter(entry => entry.path.startsWith('projects/'))) {
  const text = readFileSync(join(content, entry.path), 'utf8');
  for (const match of text.matchAll(/```figure\s*\n([\s\S]*?)```/g)) {
    const id = match[1].trim().split(/\s/)[0];
    const providers = figures.providerOrder.filter(provider => providerSources.get(provider).includes(`'${id}'`) || providerSources.get(provider).includes(`"${id}"`));
    if (!providers.length) throw new Error(`No project figure provider for ${id} in ${entry.path}`);
    const runtime = 'figures/projects/runtime.js';
    figures.providersByFigure[id] = [...new Set([...(projectProviders.includes(runtime) ? [runtime] : []), ...providers])];
  }
}
// The provider order determines override precedence; prefix paths without reordering.
catalog.figures = figures;
const prefix = value => `./content/site/${value}`;
writeFileSync(join(out, 'assets/figure-manifest.js'), [
  `window.AIFS_FIGURE_PROVIDER_ORDER=${JSON.stringify(figures.providerOrder.map(prefix))};`,
  `window.AIFS_FIGURE_PROVIDER_VERSIONS=${JSON.stringify(Object.fromEntries(Object.entries(figures.providerVersions).map(([path, version]) => [prefix(path), version])))};`,
  `window.AIFS_FIGURE_PROVIDERS=${JSON.stringify(Object.fromEntries(Object.entries(figures.providersByFigure).map(([id, providers]) => [id, providers.map(prefix)])))};`
].join('\n'));
function rendered(path, html, extra = {}) {
  const entry = catalog.entries.find(entry => entry.path === path);
  if (!entry) throw new Error(`Rendered document absent from catalog: ${path}`);
  const filename = `${createHash('sha256').update(path).digest('hex').slice(0, 20)}.json`;
  entry.renderedPath = `./rendered/${filename}`;
  writeFileSync(join(out, 'rendered', filename), JSON.stringify({ html, ...extra }));
}
for (const page of buildExplainers(content)) rendered(page.path, page.html, { simulation: page.simulation });
for (const name of ['about', 'contact', 'how-to-learn']) {
  const path = `site/${name}.html`;
  rendered(path, semanticProse(readFileSync(join(content, path), 'utf8'), content));
}
const manuals = require(join(content, 'site/build-manuals.js'));
for (const file of manifest.files.filter(file => /^manuals\/[^/]+\/manual\.json$/.test(file.path))) {
  const manual = manuals.loadManual(dirname(join(content, file.path)));
  const anchors = new Map();
  for (const doc of manual.documents) {
    anchors.set(doc.anchor, doc.label);
    for (const match of doc.html.matchAll(/\bid="([^"]+)"/g)) anchors.set(match[1], doc.label);
  }
  for (const part of manual.parts) if (part.sections[0]) anchors.set(part.anchor, part.sections[0].label);
  if (manual.reference?.sections[0]) anchors.set('p-r', manual.reference.sections[0].label);
  for (const doc of manual.documents) {
    const html = `<h1 id="${doc.anchor}">${escape(doc.title)}</h1>${doc.thesisHtml ? `<p class="manual-thesis">${doc.thesisHtml}</p>` : ''}${doc.html}`.replace(/href="#([^"]+)"/g, (all, id) => anchors.has(id) && anchors.get(id) !== doc.label ? `href="${escape(route(anchors.get(id), `#${id}`))}"` : all);
    rendered(doc.label, html);
  }
}
const sheets = require(join(content, 'site/build-cheatsheets.js')).buildCheatsheets({ root: content, siteDir: join(content, 'site'), edition: '2026-10-26' });
for (const page of sheets.pages.filter(page => page.file !== 'index.html')) {
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/.exec(page.html)?.[1];
  if (!main) throw new Error(`Cheatsheet missing content: ${page.file}`);
  rendered(`cheatsheets/${page.file.replace(/\.html$/, '.md')}`, main.replace(/href="\/cheatsheets\/([a-z0-9-]+)(?:\.html)?(#[^"]*)?"/g, (all, id, hash) => paths.has(`cheatsheets/${id}.md`) ? `href="${escape(route(`cheatsheets/${id}.md`, hash || ''))}"` : all));
}
const wireCatalog = { ...catalog, files: catalog.files.map(({ path, bytes }) => ({ path, bytes })), groups: catalog.groups.map(group => ({ ...group, entries: group.entries.map(entry => entry.path) })) };
writeFileSync(join(out, 'catalog.json'), JSON.stringify(wireCatalog));
writeFileSync(join(out, 'import-manifest.json'), JSON.stringify(manifest));
await build({ entryPoints: [join(root, 'site/app.jsx')], outfile: join(out, 'assets/app.mjs'), bundle: true, minify: true, format: 'esm', target: ['es2022'], jsx: 'automatic', loader: { '.css': 'empty' }, define: { 'process.env.NODE_ENV': '"production"' }, legalComments: 'linked' });
const tailwind = join(dirname(require.resolve('@tailwindcss/cli/package.json')), 'dist/index.mjs');
execFileSync(process.execPath, [tailwind, '-i', join(root, 'site/app.css'), '-o', join(out, 'assets/app.css'), '--minify'], { cwd: root, stdio: 'inherit', timeout: 60000 });
copy(join(root, 'vendor/mermaid.min.js'), join(out, 'assets/mermaid.min.js'));
copy(join(root, 'vendor/MERMAID-LICENSE'), join(out, 'MERMAID-LICENSE.txt'));
copy(join(content, 'LICENSE'), join(out, 'LICENSE.txt'));
copy(join(root, '../LICENSE.md'), join(out, 'MATHASCODE-LICENSE.txt'));
copy(join(root, '../site/styles/SHADCN-LICENSE.md'), join(out, 'SHADCN-LICENSE.txt'));
const katexRoot = dirname(require.resolve('katex/package.json'));
copy(join(katexRoot, 'dist/katex.min.css'), join(out, 'assets/katex.min.css'));
const { readdirSync } = await import('node:fs');
for (const font of readdirSync(join(katexRoot, 'dist/fonts'))) copy(join(katexRoot, 'dist/fonts', font), join(out, 'assets/fonts', font));
writeFileSync(join(out, 'index.html'), `<!doctype html><html lang="en" class="style-vega"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>AI Engineering · Math as Code</title><meta name="description" content="${catalog.counts.phaseLessons} lessons from raw mathematics to production systems, plus certifications, projects, manuals and practical references."><link rel="stylesheet" href="./assets/app.css"><link rel="stylesheet" href="./assets/katex.min.css"><script type="module" src="./assets/app.mjs"></script></head><body data-reader="true" class="app-ready style-vega"><div id="app"></div><noscript><main><h1>AI Engineering</h1><p>Enable JavaScript for the interactive reader, or <a href="./content/README.md">download the full course overview</a>.</p></main></noscript></body></html>`);
writeFileSync(join(out, '_headers'), `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'\n/content/*.html\n  Content-Type: text/plain\n  Content-Disposition: attachment\n`);
writeFileSync(join(out, 'build-report.json'), JSON.stringify({ source: manifest.source, counts: catalog.counts, renderedDocuments: catalog.entries.filter(entry => entry.renderedPath).length, figureIds: Object.keys(figures.providersByFigure).length, sourceGaps: { phaseLessonsWithoutQuiz: catalog.counts.phaseLessons - catalog.counts.phaseQuizzes }, network: 'All curriculum and diagram runtime files are served locally. External reference links remain external.' }, null, 2));
console.log(JSON.stringify({ output: out, counts: catalog.counts, rendered: catalog.entries.filter(entry => entry.renderedPath).length, figures: Object.keys(figures.providersByFigure).length }));
