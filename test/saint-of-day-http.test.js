import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { handleRequest } from '../src/http/app.js';

async function withServer(run) {
  const server = createServer(handleRequest);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

test('endpoint retorna original e TTS para biografia e oração', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    source: 'Canção Nova',
    today: {
      day: '08', month: 'Nov', year: '2026',
      title: 'São Exemplo',
      full_text: '<p>São Exemplo&nbsp;foi um <b>bispo</b>.</p>',
      prayer: '<p>Senhor, ajudai-nos.</p>',
      outros_santos: ['Santa Exemplo']
    }
  }), { status: 200, headers: { 'content-type': 'application/json' } });

  try {
    await withServer(async base => {
      const response = await originalFetch(`${base}/api/v1/saint-of-the-day?image=none&mode=both&refresh=true`);
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.biography.original, '<p>São Exemplo&nbsp;foi um <b>bispo</b>.</p>');
      assert.equal(body.biography.tts, 'São Exemplo foi um bispo.');
      assert.equal(body.biography.versions.faithful, 'São Exemplo foi um bispo.');
      assert.equal(body.prayer.original, '<p>Senhor, ajudai-nos.</p>');
      assert.equal(body.prayer.tts, 'Senhor, ajudai-nos.');
      assert.equal(body.otherSaints[0].original, 'Santa Exemplo');
      assert.equal(body.otherSaints[0].tts, 'Santa Exemplo');
      assert.match(body.tts.spokenText, /São Exemplo/);
      assert.equal(body.normalization.format, 'both');
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('format=tts omite original e format=original omite TTS', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    today: { day: '08', month: 'Nov', year: '2026', title: 'São Exemplo', full_text: 'Biografia.' }
  }), { status: 200, headers: { 'content-type': 'application/json' } });

  try {
    await withServer(async base => {
      const ttsResponse = await originalFetch(`${base}/api/v1/saint-of-the-day?image=none&format=tts&refresh=true`);
      const tts = await ttsResponse.json();
      assert.equal(tts.biography.tts, 'Biografia.');
      assert.equal('original' in tts.biography, false);

      const originalResponse = await originalFetch(`${base}/api/v1/saint-of-the-day?image=none&format=original&refresh=true`);
      const original = await originalResponse.json();
      assert.equal(original.biography.original, 'Biografia.');
      assert.equal('tts' in original.biography, false);
      assert.equal('tts' in original, false);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('endpoint rejeita parâmetros format e mode inválidos com HTTP 400', async () => {
  await withServer(async base => {
    const format = await fetch(`${base}/api/v1/saint-of-the-day?format=audio&image=none`);
    assert.equal(format.status, 400);
    assert.match((await format.json()).error, /format/);

    const mode = await fetch(`${base}/api/v1/saint-of-the-day?mode=creative&image=none`);
    assert.equal(mode.status, 400);
    assert.match((await mode.json()).error, /mode/);
  });
});

test('calendário expõe Páscoa e ciclos litúrgicos por data', async () => {
  await withServer(async base => {
    const response = await fetch(`${base}/api/v1/calendar/date/2026-04-05`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.season, 'Tempo Pascal');
    assert.equal(body.celebrations[0].name, 'Domingo de Páscoa');
    assert.equal(body.sundayCycle, 'A');
  });
});

test('pacote multimídia reúne calendário e santo sem exigir síntese de áudio', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    today: { day: '08', month: 'Nov', year: '2026', title: 'São Exemplo', full_text: 'Biografia de teste.' }
  }), { status: 200, headers: { 'content-type': 'application/json' } });
  try {
    await withServer(async base => {
      const response = await originalFetch(`${base}/api/v1/content/today?include=calendar,saint`);
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.ok(body.modules.calendar);
      assert.equal(body.modules.saint.title, 'São Exemplo');
      assert.match(body.modules.saint.tts.spokenText, /Biografia de teste/);
      assert.equal('audio' in body.modules, false);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('status informa quando o motor Piper não está configurado', async () => {
  await withServer(async base => {
    const response = await fetch(`${base}/api/v1/audio/status`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.provider, 'piper');
    assert.equal(body.enabled, false);
  });
});


test('endpoint de áudio informa indisponibilidade quando não há modelo Piper', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    today: { day: '08', month: 'Nov', year: '2026', title: 'São Exemplo', full_text: 'Biografia de teste.' }
  }), { status: 200, headers: { 'content-type': 'application/json' } });
  try {
    await withServer(async base => {
      const response = await originalFetch(`${base}/api/v1/audio/saint-of-the-day?date=2026-11-08`);
      assert.equal(response.status, 503);
      assert.match((await response.json()).details, /PIPER_MODEL_PATH/);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('pacote multimídia rejeita combinações inválidas de módulos e formatos', async () => {
  await withServer(async base => {
    const audioOnly = await fetch(`${base}/api/v1/content/today?include=calendar,audio`);
    assert.equal(audioOnly.status, 400);
    const format = await fetch(`${base}/api/v1/content/today?include=calendar&audioFormat=flac`);
    assert.equal(format.status, 400);
    const date = await fetch(`${base}/api/v1/content/2026-02-30/package?include=calendar`);
    assert.equal(date.status, 400);
    const unavailableAudio = await fetch(`${base}/api/v1/content/today?include=calendar,saint,audio`);
    assert.equal(unavailableAudio.status, 503);
  });
});
