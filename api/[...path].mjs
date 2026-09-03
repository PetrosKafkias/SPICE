import process from 'node:process';

import { createApiHandler } from '../server/api.mjs';

process.env.SPICE_DEMO_FIXTURE ||= 'participation';

const api = await createApiHandler();

export default async function handler(request, response) {
  const handled = await api(request, response);

  if (!handled && !response.headersSent) {
    response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'Not found.' }));
  }
}
