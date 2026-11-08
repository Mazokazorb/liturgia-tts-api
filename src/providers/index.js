import { getDancrfLiturgy } from './dancrf.js';
import { getCancaoNovaLiturgy } from './cancaonova.js';
import { canonicalizeDancrf, canonicalizeCancaoNova } from '../normalization/index.js';
import { fetchSaintOfDay } from './saint-of-day.js';

export const PROVIDERS = Object.freeze({
  dancrf: { fetch: getDancrfLiturgy, canonicalize: canonicalizeDancrf },
  cancaonova: { fetch: getCancaoNovaLiturgy, canonicalize: canonicalizeCancaoNova },
  saintOfDay: { fetch: fetchSaintOfDay }
});

export const PROVIDER_CATALOG = Object.freeze([
  {
    id: 'dancrf',
    status: 'integrated',
    role: 'historical_and_specific_dates',
    source: 'Dancrf liturgia-diaria v2',
    url: 'https://github.com/Dancrf/liturgia-diaria'
  },
  {
    id: 'cancaonova',
    status: 'integrated',
    role: 'current_day',
    source: 'API comunitária com extração da Canção Nova',
    url: 'https://api-liturgia-diaria.vercel.app/cn',
    note: 'O endpoint /cn retorna somente a liturgia corrente.'
  },
  {
    id: 'saint-of-day',
    status: 'integrated',
    role: 'daily_saint_and_image',
    source: 'API comunitária Canção Nova + Wikimedia Commons / Wikipédia',
    url: 'https://api-liturgia-diaria.vercel.app/santo-do-dia',
    note: 'A imagem é resolvida separadamente; a fonte upstream pode retornar um ícone genérico.'
  },
  {
    id: 'auto',
    status: 'integrated',
    role: 'automatic_routing',
    note: 'Canção Nova para hoje no fuso America/Sao_Paulo; Dancrf para outras datas.'
  }
]);
