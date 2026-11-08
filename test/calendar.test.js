import test from 'node:test';
import assert from 'node:assert/strict';
import { easterSunday, getLiturgicalCalendar, getLiturgicalYear } from '../src/calendar/roman-calendar.js';

test('computus gregoriano calcula datas de Páscoa conhecidas', () => {
  assert.equal(easterSunday(2024), '2024-03-31');
  assert.equal(easterSunday(2025), '2025-04-20');
  assert.equal(easterSunday(2026), '2026-04-05');
  assert.equal(easterSunday(2027), '2027-03-28');
});

test('calcula Quaresma, Tríduo e Tempo Pascal sem classificar a Páscoa como Tríduo', () => {
  assert.equal(getLiturgicalCalendar('2026-02-18').season, 'Quaresma');
  assert.equal(getLiturgicalCalendar('2026-04-02').season, 'Tríduo Pascal');
  assert.equal(getLiturgicalCalendar('2026-04-03').liturgicalColor, 'vermelho');
  assert.equal(getLiturgicalCalendar('2026-04-04').liturgicalColor, null);
  assert.equal(getLiturgicalCalendar('2026-04-05').season, 'Tempo Pascal');
  assert.equal(getLiturgicalCalendar('2026-05-24').celebrations[0].name, 'Pentecostes');
});

test('calcula Advento, ciclos dominical e ferial', () => {
  const item = getLiturgicalCalendar('2026-11-08');
  assert.equal(item.season, 'Tempo Comum');
  assert.equal(item.sundayCycle, 'A');
  assert.equal(item.weekdayCycle, 'II');
  assert.equal(item.liturgicalYear, 2026);
  assert.equal(getLiturgicalCalendar('2026-11-29').season, 'Advento');
  const christmas = getLiturgicalCalendar('2026-12-25');
  assert.equal(christmas.liturgicalYear, 2027);
  assert.equal(christmas.easter, '2027-03-28');
  assert.equal(christmas.seasonInterval.end, '2027-01-10');
  assert.equal(getLiturgicalCalendar('2026-01-04').seasonInterval.end, '2026-01-11');
  assert.equal(getLiturgicalCalendar('2026-01-12').season, 'Tempo Comum');
  assert.equal(getLiturgicalCalendar('2024-01-08').celebrations.find(item => item.name === 'Batismo do Senhor')?.date, '2024-01-08');
  assert.ok(getLiturgicalCalendar('2026-01-04').celebrations.some(item => item.name === 'Epifania do Senhor'));
  assert.ok(getLiturgicalCalendar('2026-01-11').celebrations.some(item => item.name === 'Batismo do Senhor'));
  assert.equal(getLiturgicalCalendar('2026-03-29').liturgicalColor, 'vermelho');
  assert.equal(getLiturgicalCalendar('2026-05-24').liturgicalColor, 'vermelho');
});

test('calendário anual retorna intervalo litúrgico e solenidades móveis', () => {
  const year = getLiturgicalYear(2026);
  assert.equal(year.start, '2025-11-30');
  assert.equal(year.end, '2026-11-28');
  assert.ok(year.movableCelebrations.some(item => item.name === 'Corpus Christi' && item.date === '2026-06-04'));
});

test('rejeita datas inexistentes e anos fora do intervalo gregoriano', () => {
  assert.throws(() => getLiturgicalCalendar('2026-02-30'), /Data inválida/);
  assert.throws(() => getLiturgicalYear(1200), /Ano inválido/);
  assert.throws(() => getLiturgicalCalendar('1200-05-01'), /calendário gregoriano/);
});
