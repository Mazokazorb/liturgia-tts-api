import { config } from '../config.js';

const USER_AGENT = 'LiturgiaTTSAPI/1.5.0 (saint image resolver; contact: project maintainers)';

function normalizeSearchName(name) {
  return String(name || '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isUsableImage(info) {
  const mime = String(info?.mime || '').toLowerCase();
  const width = Number(info?.width || 0);
  const height = Number(info?.height || 0);
  const file = String(info?.descriptionurl || '').toLowerCase();
  return mime.startsWith('image/') && !['image/svg+xml', 'image/gif'].includes(mime)
    && width >= 500 && height >= 500
    && !/(icon|logo|flag|coat.of.arms|symbol)/.test(file);
}

function extValue(metadata, key) {
  const value = metadata?.[key]?.value;
  return typeof value === 'string' ? value.replace(/<[^>]*>/g, '').trim() : '';
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': USER_AGENT },
    signal: AbortSignal.timeout(config.imageLookupTimeoutMs)
  });
  if (!response.ok) throw new Error(`Serviço de imagens respondeu HTTP ${response.status}`);
  return response.json();
}

async function searchWikimediaCommons(saintName) {
  const fullName = normalizeSearchName(saintName);
  const shortName = fullName.split(/\s+e\s+/i)[0].trim();
  const searchTerms = [...new Set([fullName, shortName].filter(Boolean))];
  const url = new URL(config.wikimediaApiUrl);
  const search = searchTerms.map(term => `filetype:bitmap ${term} saint`).join(' OR ');
  url.search = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `filetype:bitmap ${search}`,
    gsrnamespace: '6',
    gsrlimit: '15',
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: '1200',
    format: 'json',
    origin: '*'
  }).toString();

  const data = await fetchJson(url);
  const pages = Object.values(data?.query?.pages || {});
  const candidates = pages
    .map(page => ({ page, info: page.imageinfo?.[0] }))
    .filter(({ page, info }) => isUsableImage(info)
      && !/(icon|logo|flag|coat.of.arms|symbol)/i.test(String(page.title || ''))
      && (info.thumburl || info.url));

  if (!candidates.length) return null;

  const normalizedName = normalizeSearchName(saintName).toLocaleLowerCase('pt-BR');
  candidates.sort((a, b) => {
    const score = ({ page, info }) => {
      const title = String(page.title || '').toLocaleLowerCase('pt-BR');
      let value = Math.min(Number(info.width) * Number(info.height) / 1_000_000, 20);
      if (title.includes(normalizedName)) value += 100;
      if (/painting|portrait|statue|fresco|icon|ícone|pintura|retrato|imagem/i.test(title)) value += 8;
      if (/cropped|detail|thumbnail|thumb/i.test(title)) value -= 12;
      return value;
    };
    return score(b) - score(a);
  });

  const { page, info } = candidates[0];
  const metadata = info.extmetadata || {};
  const license = extValue(metadata, 'LicenseShortName');
  const artist = extValue(metadata, 'Artist');
  const credit = extValue(metadata, 'Credit');
  return {
    url: info.thumburl || info.url,
    originalUrl: info.url,
    pageUrl: info.descriptionurl,
    title: page.title,
    width: Number(info.width),
    height: Number(info.height),
    mime: info.mime,
    provider: 'wikimedia_commons',
    license: license || null,
    artist: artist || null,
    credit: credit || null,
    attribution: [artist, credit, license].filter(Boolean).join(' · ') || null
  };
}

async function searchWikipedia(saintName) {
  const title = normalizeSearchName(saintName).replace(/ /g, '_');
  const url = `${config.wikipediaSummaryBaseUrl}/${encodeURIComponent(title)}`;
  const data = await fetchJson(url);
  const image = data?.thumbnail?.source || data?.originalimage?.source;
  if (!image) return null;
  return {
    url: image,
    originalUrl: data?.originalimage?.source || image,
    pageUrl: data?.content_urls?.desktop?.page || data?.content_urls?.mobile?.page || null,
    title: data?.title || saintName,
    width: data?.thumbnail?.width || null,
    height: data?.thumbnail?.height || null,
    mime: null,
    provider: 'wikipedia',
    license: 'Verificar licença na página de origem',
    artist: null,
    credit: null,
    attribution: 'Imagem obtida da página correspondente da Wikipédia; consulte a página de origem para autoria e licença.'
  };
}

export async function resolveSaintImage(saintName) {
  const attempts = [];
  try {
    const image = await searchWikimediaCommons(saintName);
    if (image) return { ...image, status: 'found', strategy: 'wikimedia_commons' };
    attempts.push('Nenhuma imagem adequada encontrada no Wikimedia Commons.');
  } catch (error) {
    attempts.push(`Wikimedia Commons: ${error.message}`);
  }

  try {
    const image = await searchWikipedia(saintName);
    if (image) return { ...image, status: 'found', strategy: 'wikipedia_fallback', warnings: attempts };
    attempts.push('A página da Wikipédia não disponibilizou miniatura.');
  } catch (error) {
    attempts.push(`Wikipédia: ${error.message}`);
  }

  return {
    url: null,
    originalUrl: null,
    pageUrl: null,
    title: null,
    provider: null,
    status: 'not_found',
    strategy: 'none',
    attribution: null,
    warnings: attempts
  };
}
