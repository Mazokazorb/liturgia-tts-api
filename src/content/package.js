import { buildTtsPayload, buildSaintTtsPayload } from '../normalization/index.js';
import { getLiturgicalCalendar } from '../calendar/roman-calendar.js';
import { fetchSaintOfDay } from '../providers/saint-of-day.js';
import { resolveSaintImage } from '../images/saint-image.js';
import { loadProvider } from '../providers/load-provider.js';
import { PROVIDERS } from '../providers/index.js';
import { resolveProviders } from '../core/routing.js';
import { currentDateInTimeZone } from '../core/date.js';
import { synthesizeWithSubtitles } from '../audio/engine.js';

export async function buildContentPackage({ date, include = ['calendar', 'liturgy', 'saint', 'image'], source = 'auto', mode = 'editorial', voice = 'faber', audioFormat = 'wav' }) {
  const today = currentDateInTimeZone();
  const packageData = { date, generatedAt: new Date().toISOString(), modules: {} };
  const requested = new Set(include);
  if (requested.has('calendar')) packageData.modules.calendar = getLiturgicalCalendar(date);

  let liturgyText = '';
  if (requested.has('liturgy')) {
    const { providers, routing } = resolveProviders({ source, date, today });
    const settled = await Promise.allSettled(providers.map(name => loadProvider(name, date)));
    const results = {};
    const errors = {};
    settled.forEach((item, index) => {
      const providerName = providers[index];
      if (item.status === 'fulfilled') {
        const { canonical, ...publicData } = item.value;
        publicData.tts = buildTtsPayload(canonical, { mode, output: 'both', voice });
        results[providerName] = publicData;
        const selected = mode === 'both' ? 'editorial' : mode;
        liturgyText ||= publicData.tts.continuous?.[selected] || publicData.tts.continuous?.editorial || '';
      } else errors[providerName] = { message: item.reason?.message || 'Falha no provedor' };
    });
    packageData.modules.liturgy = { routing, results, errors };
  }

  let saintText = '';
  if (requested.has('saint') || requested.has('image')) {
    const fetched = await fetchSaintOfDay(date);
    const saint = fetched.canonical;
    const normalized = buildSaintTtsPayload(saint, { mode, voice });
    packageData.modules.saint = {
      date: saint.date,
      requestedDate: date,
      isCurrentDate: saint.date === date,
      title: saint.title,
      biography: normalized.biography,
      prayer: normalized.prayer,
      otherSaints: normalized.otherSaints,
      tts: { voice, mode, spokenText: normalized.spokenText },
      source: { name: saint.source, url: fetched.providerUrl },
      warnings: saint.date && saint.date !== date
        ? [`A fonte retornou ${saint.date}, mas o pacote foi solicitado para ${date}.`]
        : []
    };
    saintText = normalized.spokenText;
    if (requested.has('image')) packageData.modules.saint.image = await resolveSaintImage(saint.title);
  }

  if (requested.has('audio')) {
    const audio = {};
    if (liturgyText) audio.liturgy = await synthesizeWithSubtitles({ text: liturgyText, voice, title: `liturgia-${date}`, format: audioFormat });
    if (saintText) audio.saint = await synthesizeWithSubtitles({ text: saintText, voice, title: `santo-${date}`, format: audioFormat });
    packageData.modules.audio = audio;
  }
  return packageData;
}
