import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApiHandler } from './api.mjs';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const distRoot = resolve(projectRoot, 'dist');
const host = process.env.SPICE_HOST || '127.0.0.1';
const port = Number(process.env.SPICE_PORT || 4173);
const api = await createApiHandler();

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function sendStatic(response, filePath) {
  response.writeHead(200, {
    'Content-Type': mimeTypes[extname(filePath).toLowerCase()] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
  });
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  if (request.url?.startsWith('/api/')) {
    await api(request, response);
    return;
  }

  const pathname = decodeURIComponent(new URL(request.url || '/', 'http://spice.local').pathname);
  const candidate = resolve(distRoot, `.${pathname}`);
  const insideDist = candidate === distRoot || candidate.startsWith(`${distRoot}${sep}`);
  if (insideDist && existsSync(candidate) && statSync(candidate).isFile()) {
    sendStatic(response, candidate);
    return;
  }

  const indexPath = resolve(distRoot, 'index.html');
  if (existsSync(indexPath)) {
    sendStatic(response, indexPath);
    return;
  }

  response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end('The production bundle is missing. Run the build command first.');
});

server.listen(port, host, () => {
  console.log(`SPICE is running at http://${host}:${port}`);
});

function shutdown() {
  server.close(() => {
    api.db.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
