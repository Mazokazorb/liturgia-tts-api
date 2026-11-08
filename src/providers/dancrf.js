import { config } from '../config.js';
import { parseIsoDate } from '../utils.js';

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { accept: 'application/json', ...(options.headers || {}) },
    signal: AbortSignal.timeout(config.upstreamTimeoutMs)
  });
  if (!response.ok) {
    const error = new Error(`Dancrf respondeu HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export async function getDancrfLiturgy(isoDate) {
  const { day, month, year } = parseIsoDate(isoDate);
  const url = new URL(config.dancrfBaseUrl.endsWith('/') ? config.dancrfBaseUrl : `${config.dancrfBaseUrl}/`);
  url.searchParams.set('dia', String(day).padStart(2, '0'));
  url.searchParams.set('mes', String(month).padStart(2, '0'));
  url.searchParams.set('ano', String(year));
  const raw = await fetchJson(url);
  return { provider: 'dancrf', providerUrl: url.toString(), raw };
}
