import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeReference, normalizeSpokenText, canonicalizeDancrf, canonicalizeCancaoNova, buildTtsPayload } from '../src/normalize.js';

test('expande abreviações bíblicas comuns em referências', () => {
  assert.match(normalizeReference('Mt 5, 1-12'), /Mateus/);
  assert.match(normalizeReference('Mt 5, 1-12'), /capítulo cinco/);
});

test('limpa símbolos de cruz sem remover o texto', () => {
  assert.equal(normalizeSpokenText('Evangelho de Jesus Cristo ✠ segundo Lucas'), 'Evangelho de Jesus Cristo, segundo Lucas');
});

test('mapeia leituras Dancrf e gera os dois modos', () => {
  const canonical = canonicalizeDancrf({
    data: '08/11/2026', liturgia: 'Domingo', cor: 'Verde',
    leituras: { evangelho: [{ referencia: 'Mt 5, 1-12', titulo: 'Evangelho', texto: 'Naquele tempo, Jesus falou.' }] }
  });
  const payload = buildTtsPayload(canonical, { mode: 'both', output: 'both' });
  assert.equal(payload.modes.length, 2);
  assert.ok(payload.continuous.faithful.includes('Naquele tempo'));
  assert.ok(payload.sections[0].versions.editorial);
});


test('mapeia resposta Canção Nova /cn e preserva introduções e respostas', () => {
  const canonical = canonicalizeCancaoNova({
    source: 'Canção Nova',
    today: {
      date: '08/11/2026',
      color: 'Verde',
      entry_title: '32º Domingo do Tempo Comum',
      readings: {
        first_reading: {
          head: 'Primeira Leitura (1Rs 17,10-16)',
          text: 'Leitura do Primeiro Livro dos Reis. Naqueles dias, Elias partiu.',
          footer: 'Palavra do Senhor.',
          footer_response: 'Graças a Deus.'
        },
        psalm: {
          response: 'Responsório Sl 146(147),1-2.3-4.5-6',
          content_psalm: ['- Louvai o Senhor, porque ele é bom!', '- O Senhor reconstruiu Jerusalém.']
        },
        gospel: {
          head: '- Aleluia, Aleluia!',
          head_response: 'Proclamação do Evangelho de Jesus Cristo segundo Marcos.',
          text: 'Naquele tempo, Jesus ensinava seus discípulos.',
          footer: 'Palavra da Salvação.',
          footer_response: 'Glória a vós, Senhor.',
          all_html: '<strong>Evangelho (Mc 12,38-44)</strong>'
        }
      }
    }
  });

  assert.equal(canonical.date, '08/11/2026');
  assert.equal(canonical.sections.length, 3);
  assert.equal(canonical.sections[0].reference, '1Rs 17,10-16');
  assert.equal(canonical.sections[1].reference, 'Sl 146(147),1-2.3-4.5-6');
  assert.equal(canonical.sections[2].reference, 'Mc 12,38-44');

  const payload = buildTtsPayload(canonical, { mode: 'both', output: 'both' });
  assert.ok(payload.continuous.faithful.includes('Palavra do Senhor'));
  assert.ok(payload.continuous.faithful.includes('Proclamação do Evangelho'));
  assert.ok(payload.sections[1].versions.faithful.text.includes('Louvai o Senhor'));
});
