import { config } from '../config.js';
import { parseIsoDate, toBrazilianDate } from '../utils.js';

function isoFromBrazilianDate(value) {
  const match = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

export async function getCancaoNovaLiturgy(requestedIsoDate) {
  if (!parseIsoDate(requestedIsoDate)) {
    throw new Error('Data inválida. Use YYYY-MM-DD.');
  }

  // O endpoint /cn não aceita uma data: ele retorna a liturgia corrente.
  const url = config.cancaoNovaUrl;
  const response = await fetch(url, {
    method: 'GET',
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(config.upstreamTimeoutMs)
  });

  if (!response.ok) {
    const error = new Error(`Canção Nova respondeu HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const raw = await response.json();
  const today = raw?.today;
  if (!today || typeof today !== 'object') {
    const error = new Error('A resposta da API Canção Nova não contém o objeto today esperado.');
    error.status = 502;
    throw error;
  }

  const sourceDate = isoFromBrazilianDate(today.date);
  if (!sourceDate) {
    const error = new Error('A API Canção Nova não informou today.date em DD/MM/AAAA.');
    error.status = 502;
    throw error;
  }

  if (sourceDate !== requestedIsoDate) {
    const error = new Error(
      `O endpoint /cn fornece somente a liturgia corrente (${toBrazilianDate(sourceDate)}); não fornece a data solicitada (${toBrazilianDate(requestedIsoDate)}).`
    );
    error.status = 409;
    error.sourceDate = sourceDate;
    throw error;
  }

  return {
    provider: 'cancaonova',
    providerUrl: url,
    raw
  };
}
