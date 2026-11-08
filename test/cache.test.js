import test from 'node:test';
import assert from 'node:assert/strict';
import { cacheClear, cacheGet, cacheSet, cacheSize } from '../src/cache.js';

test('cache respeita limite de entradas e remove a mais antiga', () => {
  cacheClear();
  cacheSet('a', 1, 60, 2);
  cacheSet('b', 2, 60, 2);
  cacheSet('c', 3, 60, 2);
  assert.equal(cacheGet('a'), null);
  assert.equal(cacheGet('b'), 2);
  assert.equal(cacheGet('c'), 3);
  assert.equal(cacheSize(), 2);
  cacheClear();
});

test('cache renova posição de acesso para política aproximada de LRU', () => {
  cacheClear();
  cacheSet('a', 1, 60, 2);
  cacheSet('b', 2, 60, 2);
  assert.equal(cacheGet('a'), 1);
  cacheSet('c', 3, 60, 2);
  assert.equal(cacheGet('a'), 1);
  assert.equal(cacheGet('b'), null);
  cacheClear();
});
