import { config } from '../config.js';

export function sendJson(res, status, payload) {
  const body = status === 204 ? '' : JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'access-control-allow-origin': config.corsOrigin,
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type'
  });
  res.end(body);
}
