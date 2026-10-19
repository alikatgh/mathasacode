import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const contentTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.cjs': 'text/plain; charset=utf-8', '.py': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.wasm': 'application/wasm', '.gz': 'application/octet-stream', '.bin': 'application/octet-stream',
};
const sourceDirectories = new Set(['scripts', 'site', 'tests', 'docs', 'node_modules']);
const privateNames = /^(?:\.\S*|secrets?(?:[.\-_].*)?|credentials?(?:[.\-_].*)?|wrangler(?:[.\-_].*)?|package(?:-lock)?\.json|server\.js|(?:AGENTS|SKILL)\.md|_headers|_redirects)$/i;
const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Interpret the path patterns used by the production file. A missing or invalid
// file fails startup, so local runtime checks cannot silently lose its policy.
const headerRules = [];
for (const line of (await readFile(new URL('../site/_headers', import.meta.url), 'utf8')).split(/\r?\n/)) {
  if (!line.trim() || line.trimStart().startsWith('#')) continue;
  if (!/^\s/.test(line)) {
    if (!line.startsWith('/')) throw new Error(`Unsupported static header route: ${line}`);
    const expression = line.split(/(\*|:[A-Za-z]\w*)/).map(part => part === '*' ? '.*' : part.startsWith(':') ? '[^/]+' : escapePattern(part)).join('');
    headerRules.push({ pattern: line, match: new RegExp(`^${expression}$`), headers: [] });
  } else {
    const header = line.trim().match(/^([A-Za-z0-9-]+):\s*(.*)$/);
    if (!headerRules.length || !header) throw new Error('Invalid static header rule');
    headerRules.at(-1).headers.push([header[1].toLowerCase(), header[2]]);
  }
}

function applyHeaders(response, pathname) {
  const headers = new Map();
  for (const rule of headerRules) {
    if (pathname === undefined ? rule.pattern !== '/*' : !rule.match.test(pathname)) continue;
    for (const [name, value] of rule.headers) headers.set(name, headers.has(name) ? `${headers.get(name)}, ${value}` : value);
  }
  for (const [name, value] of headers) response.setHeader(name, value);
}

function publicPath(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  return !pathname.includes('\0') && !pathname.includes('\\') &&
    !segments.some(segment => privateNames.test(segment)) &&
    !sourceDirectories.has(segments[0]?.toLowerCase());
}

export function createSiteServer(directory = join(projectRoot, 'dist')) {
  const root = resolve(directory);
  if (root === resolve(projectRoot) || [...sourceDirectories].some(name => root === resolve(projectRoot, name) || root.startsWith(resolve(projectRoot, name) + sep))) {
    throw new Error('Serve a built static directory, not project sources');
  }
  const actualRoot = realpath(root);
  async function localFile(pathname) {
    if (!publicPath(pathname)) return null;
    if (pathname.endsWith('.html') && pathname.slice(1).includes('/') && pathname !== '/assets/runners/sandbox.html') return null;
    const filename = resolve(root, `.${pathname}`);
    if (!filename.startsWith(root + sep) || !contentTypes[extname(filename).toLowerCase()]) return null;
    try {
      const actual = await realpath(filename);
      const canonicalRoot = await actualRoot;
      // An internal link could otherwise expose a hidden/private target while
      // still passing the outside-root check.
      if (!actual.startsWith(canonicalRoot + sep) || actual !== resolve(canonicalRoot, `.${pathname}`)) return null;
      const file = await stat(actual);
      return file.isFile() ? { filename: actual, file, type: contentTypes[extname(filename).toLowerCase()] } : null;
    } catch (error) {
      if (['ENOENT', 'ENOTDIR'].includes(error.code)) return null;
      throw error;
    }
  }
  return createServer(async (request, response) => {
    applyHeaders(response);
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed');
      return;
    }
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      const pathname = decodeURIComponent(url.pathname);
      // Check before URL normalization as well, which can erase dot segments.
      const originalPath = decodeURIComponent(request.url.split(/[?#]/, 1)[0]);
      if (!publicPath(originalPath) || !publicPath(pathname)) {
        response.writeHead(404).end('Not found');
        return;
      }
      applyHeaders(response, pathname);
      let asset = await localFile(pathname === '/' ? '/index.html' : pathname);
      let canonical;
      if (asset && pathname.endsWith('/index.html')) {
        canonical = pathname.slice(0, -'index.html'.length);
      } else if (asset && pathname.endsWith('.html')) {
        canonical = pathname.slice(0, -'.html'.length);
      } else if (!asset && pathname !== '/') {
        const withoutSlash = pathname.replace(/\/$/, '');
        asset = await localFile(`${withoutSlash}.html`);
        if (asset && pathname.endsWith('/')) canonical = withoutSlash;
        if (!asset) {
          asset = await localFile(`${withoutSlash}/index.html`);
          if (asset && !pathname.endsWith('/')) canonical = `${pathname}/`;
        }
      }
      if (!asset) {
        response.writeHead(404).end('Not found');
        return;
      }
      if (canonical && canonical !== pathname) {
        const location = encodeURI(canonical).replaceAll('?', '%3F').replaceAll('#', '%23') + url.search;
        response.writeHead(307, { Location: location }).end();
        return;
      }
      const body = request.method === 'HEAD' ? undefined : await readFile(asset.filename);
      response.writeHead(200, { 'Content-Type': asset.type, 'Content-Length': body?.length ?? asset.file.size });
      response.end(body);
    } catch (error) {
      response.writeHead(error instanceof URIError ? 400 : error.code === 'ENOENT' ? 404 : 500).end('Request could not be served');
    }
  });
}

export async function startSite() {
  const index = process.argv.indexOf('--port');
  const port = index >= 0 ? Number(process.argv[index + 1]) : 8000;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new RangeError('Port must be an integer from 1 to 65535');
  const { buildSite } = await import('./build.mjs');
  await buildSite();
  const server = createSiteServer();
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`math-as-code is running at http://127.0.0.1:${port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await startSite();
