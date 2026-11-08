import { config } from '../config.js';
import { cleanText } from '../utils.js';

const MONTHS = Object.freeze({
  jan: 1, janeiro: 1, fev: 2, fevereiro: 2, mar: 3, marco: 3, março: 3,
  abr: 4, abril: 4, mai: 5, maio: 5, jun: 6, junho: 6,
  jul: 7, julho: 7, ago: 8, agosto: 8, set: 9, setembro: 9,
  out: 10, outubro: 10, nov: 11, novembro: 11, dez: 12, dezembro: 12
});

function parseSourceDate(today) {
  const explicit = cleanText(today?.date || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(explicit)) return explicit;
  const day = Number(today?.day);
  const year = Number(today?.year);
  const monthText = cleanText(today?.month || '').toLocaleLowerCase('pt-BR').replace('.', '');
  const month = MONTHS[monthText];
  if (!Number.isInteger(day) || day < 1 || day > 31 || !Number.isInteger(year) || !month) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function canonicalizeSaintOfDay(raw, requestedDate) {
  const today = raw?.today && typeof raw.today === 'object' ? raw.today : raw;
  if (!today || typeof today !== 'object') {
    const error = new Error('A fonte não retornou o objeto today esperado.');
    error.status = 502;
    throw error;
  }

  const title = cleanText(today.title || today.saint || today.name || '');
  const biography = cleanText(today.full_text || today.description || today.text || '');
  if (!title || !biography) {
    const error = new Error('A resposta do santo do dia não contém título e biografia reconhecíveis.');
    error.status = 502;
    throw error;
  }

  const sourceDate = parseSourceDate(today);
  const otherSaints = Array.isArray(today.outros_santos)
    ? today.outros_santos.map(cleanText).filter(Boolean)
    : [];

  return {
    date: sourceDate,
    requestedDate,
    isCurrentDate: sourceDate ? sourceDate === requestedDate : null,
    title,
    biography,
    prayer: cleanText(today.prayer || today.oracao || ''),
    otherSaints,
    upstreamImage: cleanText(today.image || '') || null,
    source: cleanText(raw?.source || 'Canção Nova'),
    sourceUrl: config.saintOfDayUrl
  };
}

export async function fetchSaintOfDay(requestedDate) {
  const response = await fetch(config.saintOfDayUrl, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(config.upstreamTimeoutMs)
  });
  if (!response.ok) {
    const error = new Error(`Fonte do santo do dia respondeu HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  const raw = await response.json();
  return {
    providerUrl: config.saintOfDayUrl,
    canonical: canonicalizeSaintOfDay(raw, requestedDate)
  };
}
