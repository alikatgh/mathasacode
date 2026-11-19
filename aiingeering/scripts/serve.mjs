import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
const root = resolve(import.meta.dirname, '../dist');
const port = Number(process.env.PORT || 8026);
const types = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.md': 'text/plain', '.txt': 'text/plain', '.py': 'text/plain', '.ts': 'text/plain', '.rs': 'text/plain', '.jl': 'text/plain' };
export const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const path = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!path.startsWith(root + sep) || pathname.split('/').some(p => p.startsWith('.'))) { res.writeHead(403).end(); return; }
    if (!(await stat(path)).isFile()) throw new Error('Not a file');
    // Imported source files are downloads, never an executable legacy website.
    const importedHTML = pathname.startsWith('/content/') && /\.html?$/i.test(path);
    const data = await readFile(path);
    const compress = /(?:^|[,\s])gzip(?:[,\s;]|$)/.test(req.headers['accept-encoding'] || '') && /\.(json|mjs|js|css)$/.test(path) && data.length > 1024;
    res.writeHead(200, { 'Content-Type': importedHTML ? 'text/plain' : types[extname(path)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', ...(compress ? { 'Content-Encoding': 'gzip', 'Vary': 'Accept-Encoding' } : {}), ...(importedHTML ? { 'Content-Disposition': 'attachment' } : {}) });
    res.end(compress ? gzipSync(data) : data);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('File not found in this curriculum snapshot.'); }
});
server.listen(port, '127.0.0.1', () => console.log(`AI Engineering: http://127.0.0.1:${server.address().port}`));
