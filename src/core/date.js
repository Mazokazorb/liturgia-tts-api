import { parseIsoDate } from '../utils.js';

export const DEFAULT_TIME_ZONE = 'America/Sao_Paulo';

/** Retorna a data civil atual no fuso litúrgico adotado pelo serviço. */
export function currentDateInTimeZone(timeZone = DEFAULT_TIME_ZONE, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function resolveRequestedDate(pathDate, searchParams, today = currentDateInTimeZone()) {
  const candidate = (!pathDate || pathDate === 'today')
    ? (searchParams.get('date') || today)
    : pathDate;
  return parseIsoDate(candidate) ? candidate : null;
}
