import { config } from '../config.js';

const TYPES = {
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  srt: 'application/x-subrip; charset=utf-8',
  vtt: 'text/vtt; charset=utf-8',
};

export function sendMedia(res, filename, media) {
  const extension = filename.split('.').at(-1);
  res.writeHead(200, {
    'content-type': TYPES[extension] || 'application/octet-stream',
    'content-length': media.data.length,
    'content-disposition': `inline; filename="${filename}"`,
    'cache-control': 'public, max-age=31536000, immutable',
    'access-control-allow-origin': config.corsOrigin
  });
  res.end(media.data);
}
