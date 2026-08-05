import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApiHandler } from './api.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const host = process.env.SPICE_DEV_HOST || '127.0.0.1';
const appPort = Number(process.env.SPICE_DEV_PORT || 5173);
const apiPort = Number(process.env.SPICE_API_PORT || 5174);
const api = await createApiHandler();

const apiServer = createServer(async (request, response) => {
  const handled = await api(request, response);
  if (!handled && !response.headersSent) {
    response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'Not found.' }));
  }
});

await new Promise((resolveListen) => apiServer.listen(apiPort, host, resolveListen));

const viteEntry = resolve(projectRoot, 'node_modules/vite/bin/vite.js');
const viteProcess = spawn(process.execPath, [viteEntry, '--host', host, '--port', String(appPort)], {
  cwd: projectRoot,
  stdio: 'inherit',
  windowsHide: true,
});

console.log(`SPICE API running at http://${host}:${apiPort}`);
console.log(`SPICE application starting at http://${host}:${appPort}`);

let shuttingDown = false;
viteProcess.on('exit', (code) => {
  if (!shuttingDown) {
    console.error(`Vite exited with code ${code ?? 1}`);
    shutdown(code ?? 1);
  }
});

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  viteProcess.kill();
  apiServer.close(() => {
    api.db.close();
    process.exit(exitCode);
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
