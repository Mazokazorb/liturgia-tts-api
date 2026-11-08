import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSubtitleCues, formatTimestamp, toSrt, toVtt } from '../src/audio/subtitles.js';
import { splitTextIntoSegments } from '../src/audio/engine.js';

test('divide texto em frases e respeita o limite de caracteres', () => {
  const segments = splitTextIntoSegments('Primeira frase. Segunda frase, com continuação. ' + 'palavra '.repeat(60), 60);
  assert.ok(segments.length >= 4);
  assert.ok(segments.every(segment => segment.length <= 60));
  assert.equal(segments[0], 'Primeira frase.');
  assert.equal(segments[1], 'Segunda frase, com continuação.');
});

test('calcula cues com duração real e pausas explícitas', () => {
  const cues = buildSubtitleCues(['Primeira frase.', 'Segunda frase.'], [2.25, 1.5], 500);
  assert.deepEqual(cues.map(({ start, end }) => [start, end]), [[0, 2.25], [2.75, 4.25]]);
});

test('serializa SRT e WebVTT com timestamps corretos', () => {
  const cues = buildSubtitleCues(['Olá.', 'Tudo bem?'], [1.234, 2], 250);
  assert.match(toSrt(cues), /00:00:00,000 --> 00:00:01,234/);
  assert.match(toVtt(cues), /^WEBVTT/);
  assert.match(toVtt(cues), /00:00:01\.484 --> 00:00:03\.484/);
  assert.equal(formatTimestamp(3661.007), '01:01:01,007');
});

test('rejeita duração de segmento inválida', () => {
  assert.throws(() => buildSubtitleCues(['Frase.'], [0]), /Duração inválida/);
});
