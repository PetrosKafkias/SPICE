import { createServer } from 'node:http';
import { createApiHandler } from './api.mjs';

const host = process.env.SPICE_DEV_HOST || '127.0.0.1';
const port = Number(process.env.SPICE_API_PORT || 5174);
const api = await createApiHandler();

const server = createServer(async (request, response) => {
  const handled = await api(request, response);
  if (!handled && !response.headersSent) {
    response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'Not found.' }));
  }
});

server.listen(port, host, () => console.log(`SPICE API running at http://${host}:${port}`));

function shutdown() {
  server.close(() => {
    api.db.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
