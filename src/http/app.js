import { URL } from 'node:url';
import { config } from '../config.js';
import { cacheGet, cacheSet } from '../cache.js';
import { buildTtsPayload } from '../normalization/index.js';
import { PROVIDERS, PROVIDER_CATALOG } from '../providers/index.js';
import { currentDateInTimeZone, resolveRequestedDate } from '../core/date.js';
import { resolveProviders, VALID_SOURCES, VALID_MODES, VALID_OUTPUTS } from '../core/routing.js';
import { sendJson } from './respond.js';

export async function loadProvider(name, date) {
  const key = `${name}:${date}`;
  const cached = cacheGet(key);
  if (cached) return { ...cached, cached: true };

  const provider = PROVIDERS[name];
  if (!provider) throw new Error(`Fornecedor desconhecido: ${name}`);
  const fetched = await provider.fetch(date);
  const canonical = provider.canonicalize(fetched.raw);
  const result = {
    provider: name,
    providerUrl: fetched.providerUrl,
    sourceDate: canonical.date,
    celebration: canonical.celebration,
    liturgicalColor: canonical.liturgicalColor,
    canonical,
    sectionCount: canonical.sections.length,
    warnings: canonical.sections.length === 0
      ? ['A fonte não retornou seções litúrgicas reconhecíveis.']
      : []
  };
  cacheSet(key, result, config.cacheTtlSeconds, config.cacheMaxEntries);
  return { ...result, cached: false };
}

export async function handleRequest(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    return sendJson(res, 200, {
      status: 'ok',
      service: 'liturgia-tts-api',
      version: '1.3.0'
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/providers') {
    return sendJson(res, 200, { providers: PROVIDER_CATALOG });
  }

  const liturgyRoute = /^\/api\/v1\/liturgy(?:\/[^/]+)?$/.test(url.pathname);
  if (req.method !== 'GET' || !liturgyRoute) {
    return sendJson(res, 404, { error: 'Rota não encontrada' });
  }

  const pathDate = url.pathname.split('/').filter(Boolean)[3];
  const today = currentDateInTimeZone();
  const date = resolveRequestedDate(pathDate, url.searchParams, today);
  if (!date) return sendJson(res, 400, { error: 'Informe uma data válida no formato YYYY-MM-DD.' });

  const source = url.searchParams.get('source') || 'auto';
  const mode = url.searchParams.get('mode') || 'both';
  const output = url.searchParams.get('output') || 'both';
  const voice = url.searchParams.get('voice') || 'faber';

  if (!VALID_SOURCES.includes(source)) {
    return sendJson(res, 400, { error: 'source deve ser auto, dancrf, cancaonova ou both.' });
  }
  if (!VALID_MODES.includes(mode)) {
    return sendJson(res, 400, { error: 'mode deve ser faithful, editorial ou both.' });
  }
  if (!VALID_OUTPUTS.includes(output)) {
    return sendJson(res, 400, { error: 'output deve ser continuous, sections ou both.' });
  }

  const { providers, routing } = resolveProviders({ source, date, today });
  const settled = await Promise.allSettled(providers.map(name => loadProvider(name, date)));
  const results = {};
  const errors = {};

  settled.forEach((item, index) => {
    const name = providers[index];
    if (item.status === 'fulfilled') {
      const data = item.value;
      const { canonical, ...publicData } = data;
      publicData.tts = buildTtsPayload(canonical, { mode, output, voice });
      results[name] = publicData;
    } else {
      errors[name] = {
        message: item.reason?.message || 'Falha ao consultar fornecedor',
        upstreamStatus: Number.isInteger(item.reason?.status) ? item.reason.status : undefined
      };
    }
  });

  const hasResults = Object.keys(results).length > 0;
  const reportedClientError = Object.values(errors).find(error => error.upstreamStatus >= 400 && error.upstreamStatus < 500);
  const status = hasResults ? 200 : (reportedClientError?.upstreamStatus || 502);
  return sendJson(res, status, {
    date,
    requestedSource: source,
    normalization: { modes: mode, outputs: output, voice },
    routing,
    results,
    errors,
    note: source === 'both' && date === today
      ? 'As fontes são retornadas separadamente. Não há fusão automática de textos divergentes.'
      : undefined
  });
}
