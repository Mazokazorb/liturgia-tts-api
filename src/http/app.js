import { URL } from 'node:url';
import { config } from '../config.js';
import { cacheGet, cacheSet } from '../cache.js';
import { buildTtsPayload, buildSaintTtsPayload } from '../normalization/index.js';
import { PROVIDER_CATALOG } from '../providers/index.js';
import { currentDateInTimeZone, resolveRequestedDate } from '../core/date.js';
import { resolveProviders, VALID_SOURCES, VALID_MODES, VALID_OUTPUTS } from '../core/routing.js';
import { sendJson } from './respond.js';
import { sendMedia } from './media.js';
import { getLiturgicalCalendar, getLiturgicalYear } from '../calendar/roman-calendar.js';
import { audioEngineStatus, readMediaFile, synthesizeWithSubtitles } from '../audio/engine.js';
import { buildContentPackage } from '../content/package.js';
import { loadProvider } from '../providers/load-provider.js';
import { fetchSaintOfDay } from '../providers/saint-of-day.js';
import { resolveSaintImage } from '../images/saint-image.js';

export async function handleRequest(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    return sendJson(res, 200, {
      status: 'ok',
      service: 'liturgia-tts-api',
      version: '1.6.0',
      audio: audioEngineStatus()
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/providers') {
    return sendJson(res, 200, { providers: PROVIDER_CATALOG });
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/calendar/today') {
    return sendJson(res, 200, getLiturgicalCalendar(currentDateInTimeZone()));
  }

  const calendarDateMatch = url.pathname.match(/^\/api\/v1\/calendar\/date\/(\d{4}-\d{2}-\d{2})$/);
  if (req.method === 'GET' && calendarDateMatch) {
    try { return sendJson(res, 200, getLiturgicalCalendar(calendarDateMatch[1])); }
    catch (error) { return sendJson(res, 400, { error: error.message }); }
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/calendar/year') {
    const year = Number(url.searchParams.get('year'));
    try { return sendJson(res, 200, getLiturgicalYear(year)); }
    catch (error) { return sendJson(res, 400, { error: error.message }); }
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/audio/status') {
    return sendJson(res, 200, audioEngineStatus());
  }

  const mediaMatch = url.pathname.match(/^\/media\/([a-f0-9]{64}\.(?:wav|mp3|srt|vtt))$/);
  if (req.method === 'GET' && mediaMatch) {
    const media = await readMediaFile(mediaMatch[1]);
    if (!media) return sendJson(res, 404, { error: 'Arquivo de mídia não encontrado.' });
    return sendMedia(res, mediaMatch[1], media);
  }

  if (req.method === 'GET' && (url.pathname === '/api/v1/audio/saint-of-the-day' || url.pathname === '/api/v1/audio/liturgy')) {
    const voice = url.searchParams.get('voice') || config.piperVoice;
    const format = url.searchParams.get('format') || 'wav';
    const mode = url.searchParams.get('mode') || 'editorial';
    const date = resolveRequestedDate(url.searchParams.get('date'), url.searchParams, currentDateInTimeZone());
    if (!date) return sendJson(res, 400, { error: 'Data inválida. Use YYYY-MM-DD.' });
    if (!['wav', 'mp3'].includes(format)) return sendJson(res, 400, { error: 'format deve ser wav ou mp3.' });
    if (!['faithful', 'editorial', 'both'].includes(mode)) return sendJson(res, 400, { error: 'mode deve ser faithful, editorial ou both.' });
    if (voice !== config.piperVoice) return sendJson(res, 400, { error: `Esta instalação está configurada para a voz ${config.piperVoice}.` });
    if (!audioEngineStatus().enabled) return sendJson(res, 503, { error: 'Motor de áudio não configurado.', details: audioEngineStatus().note });
    try {
      let spokenText;
      if (url.pathname.endsWith('saint-of-the-day')) {
        const fetched = await fetchSaintOfDay(date);
        spokenText = buildSaintTtsPayload(fetched.canonical, { mode, voice }).spokenText;
      } else {
        const source = url.searchParams.get('source') || 'auto';
        if (!VALID_SOURCES.includes(source)) return sendJson(res, 400, { error: 'source inválida.' });
        const { providers } = resolveProviders({ source, date, today: currentDateInTimeZone() });
        const settled = await Promise.allSettled(providers.map(name => loadProvider(name, date)));
        const result = settled.find(item => item.status === 'fulfilled');
        if (!result) throw new Error('Nenhum provedor litúrgico retornou conteúdo.');
        const normalized = buildTtsPayload(result.value.canonical, { mode, output: 'continuous', voice });
        const selected = mode === 'faithful' ? 'faithful' : 'editorial';
        spokenText = normalized.continuous?.[selected] || '';
      }
      const audio = await synthesizeWithSubtitles({ text: spokenText, voice, format, title: url.pathname.endsWith('saint-of-the-day') ? 'santo-do-dia' : 'liturgia' });
      return sendJson(res, 200, audio);
    } catch (error) {
      return sendJson(res, error.status || 502, { error: 'Não foi possível gerar áudio.', details: error.message });
    }
  }

  if (req.method === 'GET' && (url.pathname === '/api/v1/content/today' || /^\/api\/v1\/content\/\d{4}-\d{2}-\d{2}\/package$/.test(url.pathname))) {
    const pathDate = url.pathname.match(/content\/(\d{4}-\d{2}-\d{2})\/package$/)?.[1];
    const date = resolveRequestedDate(pathDate, url.searchParams, currentDateInTimeZone());
    if (!date) return sendJson(res, 400, { error: 'Data inválida. Use YYYY-MM-DD.' });
    const include = (url.searchParams.get('include') || 'calendar,liturgy,saint,image').split(',').map(item => item.trim()).filter(Boolean);
    const allowed = ['calendar', 'liturgy', 'saint', 'image', 'audio'];
    if (include.some(item => !allowed.includes(item))) return sendJson(res, 400, { error: `include aceita: ${allowed.join(', ')}.` });
    if (include.includes('audio') && !include.includes('liturgy') && !include.includes('saint')) return sendJson(res, 400, { error: 'include=audio requer também liturgy e/ou saint.' });
    const source = url.searchParams.get('source') || 'auto';
    if (!VALID_SOURCES.includes(source)) return sendJson(res, 400, { error: 'source inválida.' });
    const mode = url.searchParams.get('mode') || 'editorial';
    if (!['faithful', 'editorial', 'both'].includes(mode)) return sendJson(res, 400, { error: 'mode inválido.' });
    const audioFormat = url.searchParams.get('audioFormat') || 'wav';
    if (!['wav', 'mp3'].includes(audioFormat)) return sendJson(res, 400, { error: 'audioFormat deve ser wav ou mp3.' });
    const packageVoice = url.searchParams.get('voice') || config.piperVoice;
    if (packageVoice !== config.piperVoice) return sendJson(res, 400, { error: `Esta instalação está configurada para a voz ${config.piperVoice}.` });
    if (include.includes('audio') && !audioEngineStatus().enabled) return sendJson(res, 503, { error: 'Motor de áudio não configurado.', details: audioEngineStatus().note });
    try {
      const content = await buildContentPackage({ date, include, source, mode, voice: packageVoice, audioFormat });
      return sendJson(res, 200, content);
    } catch (error) {
      return sendJson(res, error.status || 502, { error: 'Não foi possível montar o pacote multimídia.', details: error.message });
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/saint-of-the-day') {
    const today = currentDateInTimeZone();
    const includeImage = url.searchParams.get('image') !== 'none';
    const refresh = url.searchParams.get('refresh') === 'true';
    const format = url.searchParams.get('format') || 'both';
    const mode = url.searchParams.get('mode') || 'both';
    const voice = url.searchParams.get('voice') || 'faber';

    if (!['original', 'tts', 'both'].includes(format)) {
      return sendJson(res, 400, { error: 'format deve ser original, tts ou both.' });
    }
    if (!['faithful', 'editorial', 'both'].includes(mode)) {
      return sendJson(res, 400, { error: 'mode deve ser faithful, editorial ou both.' });
    }
    if (!voice.trim() || voice.length > 80) {
      return sendJson(res, 400, { error: 'voice deve conter entre 1 e 80 caracteres.' });
    }

    const key = `saint-of-day:${today}`;
    let result = refresh ? null : cacheGet(key);
    const cached = Boolean(result);

    try {
      if (!result) {
        const fetched = await fetchSaintOfDay(today);
        result = { ...fetched.canonical, providerUrl: fetched.providerUrl };
        cacheSet(key, result, 21600, config.cacheMaxEntries);
      }

      const normalized = buildSaintTtsPayload(result, { mode, voice });
      const selectFormat = field => {
        if (format === 'original') return { original: field.original };
        if (format === 'tts') return { tts: field.tts, ...(field.versions ? { versions: field.versions } : {}) };
        return field;
      };

      let image = { status: 'skipped', url: null, provider: null, attribution: null };
      if (includeImage) {
        const imageKey = `saint-image:${result.title.toLocaleLowerCase('pt-BR')}`;
        image = refresh ? null : cacheGet(imageKey);
        if (!image) {
          image = await resolveSaintImage(result.title);
          cacheSet(imageKey, image, 604800, config.cacheMaxEntries);
        }
      }

      const warnings = [];
      if (result.isCurrentDate === false) {
        warnings.push(`A fonte retornou ${result.date || 'uma data diferente'} para a solicitação de hoje (${today}). O conteúdo foi preservado, mas pode estar desatualizado.`);
      }
      if (includeImage && image.status !== 'found') {
        warnings.push('Não foi possível localizar uma imagem adequada; consulte image.warnings para detalhes.');
      }

      return sendJson(res, 200, {
        date: result.date,
        requestedDate: today,
        isCurrentDate: result.isCurrentDate,
        title: result.title,
        biography: selectFormat(normalized.biography),
        prayer: selectFormat(normalized.prayer),
        otherSaints: format === 'tts'
          ? normalized.otherSaints.map(item => item.tts)
          : format === 'original'
            ? normalized.otherSaints.map(item => item.original)
            : normalized.otherSaints.map(item => ({ original: item.original, tts: item.tts, ...(item.versions ? { versions: item.versions } : {}) })),
        ...(format !== 'original' ? {
          tts: {
            voice: normalized.voice,
            mode: normalized.mode,
            selectedMode: normalized.selectedMode,
            spokenText: normalized.spokenText
          }
        } : {}),
        normalization: { format, mode, voice },
        source: { name: result.source, url: result.providerUrl },
        image,
        cached,
        warnings
      });
    } catch (error) {
      return sendJson(res, Number.isInteger(error.status) ? error.status : 502, {
        error: 'Não foi possível consultar o santo do dia.',
        details: error.message
      });
    }
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
