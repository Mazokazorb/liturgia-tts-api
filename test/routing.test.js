import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveProviders } from '../src/core/routing.js';
import { currentDateInTimeZone, resolveRequestedDate } from '../src/core/date.js';

test('roteia a data corrente para Canção Nova em modo automático', () => {
  const result = resolveProviders({ source: 'auto', date: '2026-11-08', today: '2026-11-08' });
  assert.deepEqual(result.providers, ['cancaonova']);
  assert.equal(result.routing.strategy, 'automatic');
});

test('roteia datas diferentes da corrente para Dancrf', () => {
  const result = resolveProviders({ source: 'auto', date: '2026-11-07', today: '2026-11-08' });
  assert.deepEqual(result.providers, ['dancrf']);
});

test('modo both não consulta Canção Nova para datas históricas', () => {
  const result = resolveProviders({ source: 'both', date: '2026-11-07', today: '2026-11-08' });
  assert.deepEqual(result.providers, ['dancrf']);
  assert.equal(result.routing.strategy, 'both_requested_historical_fallback');
});

test('modo both consulta as duas fontes para hoje', () => {
  const result = resolveProviders({ source: 'both', date: '2026-11-08', today: '2026-11-08' });
  assert.deepEqual(result.providers, ['cancaonova', 'dancrf']);
});

test('resolve data por rota, query string e data corrente', () => {
  const params = new URLSearchParams('date=2026-11-06');
  assert.equal(resolveRequestedDate(undefined, params, '2026-11-08'), '2026-11-06');
  assert.equal(resolveRequestedDate('today', new URLSearchParams(), '2026-11-08'), '2026-11-08');
  assert.equal(resolveRequestedDate('2026-11-07', new URLSearchParams(), '2026-11-08'), '2026-11-07');
  assert.equal(resolveRequestedDate('2026-02-30', new URLSearchParams(), '2026-11-08'), null);
});

test('data corrente respeita o fuso America/Sao_Paulo', () => {
  const now = new Date('2026-11-08T02:30:00.000Z');
  assert.equal(currentDateInTimeZone('America/Sao_Paulo', now), '2026-11-07');
});
