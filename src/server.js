import http from 'node:http';
import { config } from './config.js';
import { handleRequest } from './http/app.js';
import { sendJson } from './http/respond.js';

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch(error => {
    console.error('[liturgia-tts-api] request_error', error);
    if (!res.headersSent) {
      sendJson(res, 500, { error: 'Erro interno' });
    }
  });
});

server.listen(config.port, config.host, () => {
  console.log(`Liturgia TTS API em http://${config.host}:${config.port}`);
});

function shutdown(signal) {
  console.log(`[liturgia-tts-api] ${signal}: encerrando servidor...`);
  server.close(error => {
    if (error) {
      console.error('[liturgia-tts-api] shutdown_error', error);
      process.exitCode = 1;
    }
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
