import { parseIsoDate } from '../utils.js';

const DAY_MS = 86_400_000;
const iso = date => date.toISOString().slice(0, 10);
const utcDate = value => new Date(`${value}T00:00:00.000Z`);
const addDays = (value, days) => new Date(utcDate(value).getTime() + days * DAY_MS);
const weekday = value => utcDate(value).getUTCDay();

/** Meeus/Jones/Butcher Gregorian computus. */
export function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function firstSundayOnOrAfter(value) {
  return iso(addDays(value, (7 - weekday(value)) % 7));
}

function adventStart(year) {
  // First Sunday on or after 27 November (27 Nov–3 Dec).
  return firstSundayOnOrAfter(`${year}-11-27`);
}

function nextSunday(value) {
  return iso(addDays(value, 7 - weekday(value)));
}

function baptismDateAfterEpiphany(epiphanyDate) {
  // When Epiphany is transferred to Sunday 7 or 8 January, the Baptism is Monday.
  const day = Number(epiphanyDate.slice(8, 10));
  return day >= 7 ? iso(addDays(epiphanyDate, 1)) : nextSunday(epiphanyDate);
}

function dateBetween(date, start, end) {
  return date >= start && date <= end;
}

function dateLabel(value) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'UTC' }).format(utcDate(value));
}

/**
 * Approximation of the General Roman Calendar's temporal cycle.
 * Local proper calendars (Brazilian national, diocesan and religious orders)
 * can add or transfer celebrations and must be layered separately.
 */
export function getLiturgicalCalendar(date) {
  if (!parseIsoDate(date)) throw new TypeError('Data inválida. Use YYYY-MM-DD.');
  const year = Number(date.slice(0, 4));
  if (year < 1583 || year > 9998) throw new TypeError('O calendário gregoriano é suportado entre 1583 e 9998.');
  const adventThisYear = adventStart(year);
  const liturgicalYear = date >= adventThisYear ? year + 1 : year;
  // The temporal cycle belongs to the liturgical year, not necessarily the civil year.
  const easter = easterSunday(liturgicalYear);
  const ashWednesday = iso(addDays(easter, -46));
  const palmSunday = iso(addDays(easter, -7));
  const holyThursday = iso(addDays(easter, -3));
  const goodFriday = iso(addDays(easter, -2));
  const holySaturday = iso(addDays(easter, -1));
  const pentecost = iso(addDays(easter, 49));
  const trinitySunday = iso(addDays(easter, 56));
  const corpusChristi = iso(addDays(easter, 60));
  // Brazil transfers Epiphany to the Sunday between 2 and 8 January.
  const epiphanySunday = firstSundayOnOrAfter(`${liturgicalYear}-01-02`);
  const baptismOfLord = baptismDateAfterEpiphany(epiphanySunday);
  const sundayCycle = ['C', 'A', 'B'][liturgicalYear % 3];
  const weekdayCycle = liturgicalYear % 2 === 0 ? 'II' : 'I';

  let season;
  let color;
  let seasonStart;
  let seasonEnd;
  let note;

  if (date >= adventThisYear && date <= `${year}-12-24`) {
    season = 'Advento'; color = 'roxo'; seasonStart = adventThisYear; seasonEnd = `${year}-12-24`;
  } else if (date >= `${year}-12-25`) {
    season = 'Natal'; color = 'branco'; seasonStart = `${year}-12-25`; seasonEnd = baptismOfLord;
  } else {
    if (date <= baptismOfLord) {
      season = 'Natal'; color = 'branco'; seasonStart = `${year - 1}-12-25`; seasonEnd = baptismOfLord;
    } else if (dateBetween(date, ashWednesday, iso(addDays(easter, -4)))) {
      season = 'Quaresma'; color = 'roxo'; seasonStart = ashWednesday; seasonEnd = iso(addDays(easter, -4));
    } else if (dateBetween(date, holyThursday, holySaturday)) {
      season = 'Tríduo Pascal'; color = date === goodFriday ? 'vermelho' : date === holySaturday ? null : 'branco'; seasonStart = holyThursday; seasonEnd = holySaturday;
      note = 'O Tríduo Pascal possui celebrações próprias; a cor indicada é apenas uma referência geral.';
    } else if (dateBetween(date, easter, pentecost)) {
      season = 'Tempo Pascal'; color = 'branco'; seasonStart = easter; seasonEnd = pentecost;
    } else if (date > pentecost && date < adventThisYear) {
      season = 'Tempo Comum'; color = 'verde'; seasonStart = iso(addDays(pentecost, 1)); seasonEnd = iso(addDays(adventThisYear, -1));
    } else {
      season = 'Tempo Comum'; color = 'verde'; seasonStart = iso(addDays(baptismOfLord, 1)); seasonEnd = iso(addDays(ashWednesday, -1));
    }
  }

  const movableCelebrations = {
    'Epifania do Senhor': epiphanySunday,
    'Batismo do Senhor': baptismOfLord,
    'Quarta-feira de Cinzas': ashWednesday,
    'Domingo de Ramos': palmSunday,
    'Quinta-feira Santa': holyThursday,
    'Sexta-feira da Paixão': goodFriday,
    'Sábado Santo': holySaturday,
    'Domingo de Páscoa': easter,
    'Pentecostes': pentecost,
    'Santíssima Trindade': trinitySunday,
    'Corpus Christi': corpusChristi
  };
  if (date === palmSunday || date === pentecost) color = 'vermelho';
  if (date === trinitySunday || date === corpusChristi) color = 'branco';

  const celebrations = Object.entries(movableCelebrations)
    .filter(([, value]) => value === date)
    .map(([name, value]) => ({ name, date: value }));

  return {
    date,
    dateLabel: dateLabel(date),
    season,
    liturgicalColor: color,
    seasonInterval: { start: seasonStart, end: seasonEnd },
    liturgicalYear,
    sundayCycle,
    weekdayCycle,
    easter,
    movableCelebrations,
    celebrations,
    calendar: 'Calendário Romano Geral (cálculo temporal simplificado)',
    limitations: [
      'Não substitui o Diretório Litúrgico oficial da CNBB nem o calendário próprio de uma diocese, país ou ordem religiosa.',
      'Memórias, festas, solenidades transferidas e precedências locais não são integralmente calculadas nesta versão.'
    ],
    ...(note ? { note } : {})
  };
}

export function getLiturgicalYear(year) {
  if (!Number.isInteger(year) || year < 1583 || year > 9998) throw new TypeError('Ano inválido.');
  const start = adventStart(year - 1);
  const end = iso(addDays(adventStart(year), -1));
  const dates = [];
  for (let cursor = start; cursor <= end; cursor = iso(addDays(cursor, 1))) {
    const item = getLiturgicalCalendar(cursor);
    if (item.celebrations.length) dates.push(...item.celebrations);
  }
  return {
    liturgicalYear: year,
    start,
    end,
    sundayCycle: ['C', 'A', 'B'][year % 3],
    weekdayCycle: year % 2 === 0 ? 'II' : 'I',
    movableCelebrations: dates
  };
}
