import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalizeSaintOfDay } from '../src/providers/saint-of-day.js';

test('normaliza o santo do dia e interpreta mês abreviado em português', () => {
  const result = canonicalizeSaintOfDay({
    source: 'Canção Nova',
    today: {
      day: '21', month: 'Out', year: '2026',
      title: 'Santa Úrsula e as onze companheiras mártires',
      full_text: '  Biografia da santa.  ',
      image: 'https://example.org/icon.svg',
      outros_santos: ['', 'São Pedro']
    }
  }, '2026-10-21');

  assert.equal(result.date, '2026-10-21');
  assert.equal(result.isCurrentDate, true);
  assert.equal(result.title, 'Santa Úrsula e as onze companheiras mártires');
  assert.equal(result.biography, 'Biografia da santa.');
  assert.deepEqual(result.otherSaints, ['São Pedro']);
  assert.equal(result.upstreamImage, 'https://example.org/icon.svg');
});

test('sinaliza quando a fonte devolve conteúdo de outra data', () => {
  const result = canonicalizeSaintOfDay({
    today: { day: '21', month: 'Out', year: '2026', title: 'Santa Úrsula', full_text: 'Biografia.' }
  }, '2026-11-08');
  assert.equal(result.isCurrentDate, false);
});

test('rejeita resposta sem título ou biografia', () => {
  assert.throws(() => canonicalizeSaintOfDay({ today: { title: 'Santo sem texto' } }, '2026-11-08'), /título e biografia/);
});

import { buildSaintTtsPayload } from '../src/normalization/index.js';

test('prepara biografia, oração e outros santos para TTS sem perder o original', () => {
  const canonical = {
    title: 'São João',
    biography: '<p>São João&nbsp;viveu no século <strong>IV</strong>.</p><p>Foi bispo &amp; pastor.</p>',
    prayer: 'Senhor, dai-nos sabedoria.',
    otherSaints: ['Santa Maria']
  };
  const result = buildSaintTtsPayload(canonical, { mode: 'both', voice: 'faber' });

  assert.equal(result.biography.original, canonical.biography);
  assert.equal(result.biography.tts, 'São João viveu no século IV. Foi bispo & pastor.');
  assert.equal(result.biography.versions.faithful, result.biography.versions.editorial);
  assert.equal(result.prayer.original, canonical.prayer);
  assert.equal(result.prayer.tts, 'Senhor, dai-nos sabedoria.');
  assert.equal(result.otherSaints[0].tts, 'Santa Maria');
  assert.match(result.spokenText, /São João/);
  assert.match(result.spokenText, /Foi bispo & pastor/);
  assert.match(result.spokenText, /Oração/);
});

test('modo faithful/editorial seleciona a versão correspondente', () => {
  const canonical = { title: 'São João', biography: 'São João — bispo.', prayer: '', otherSaints: [] };
  const faithful = buildSaintTtsPayload(canonical, { mode: 'faithful' });
  const editorial = buildSaintTtsPayload(canonical, { mode: 'editorial' });
  assert.equal(faithful.selectedMode, 'faithful');
  assert.equal(editorial.selectedMode, 'editorial');
  assert.equal(faithful.biography.tts, 'São João — bispo.');
  assert.equal(editorial.biography.tts, 'São João. bispo.');
  assert.equal('versions' in faithful.biography, false);
});

test('normalizador remove scripts e converte entidades HTML sem perder conteúdo textual', async () => {
  const { normalizeSpokenText } = await import('../src/normalization/spoken-text.js');
  assert.equal(
    normalizeSpokenText('<p>Vida&nbsp;de fé &amp; esperança.</p><script>alert(1)</script>'),
    'Vida de fé & esperança.'
  );
});
