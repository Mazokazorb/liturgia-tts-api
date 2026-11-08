function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = Object.freeze({
  port: positiveInteger(process.env.PORT, 3000),
  host: process.env.HOST || '0.0.0.0',
  cacheTtlSeconds: positiveInteger(process.env.CACHE_TTL_SECONDS, 21600),
  cacheMaxEntries: positiveInteger(process.env.CACHE_MAX_ENTRIES, 512),
  upstreamTimeoutMs: positiveInteger(process.env.UPSTREAM_TIMEOUT_MS, 12000),
  dancrfBaseUrl: process.env.DANCRF_BASE_URL || 'https://liturgia.up.railway.app/v2',
  cancaoNovaUrl: process.env.CANCAONOVA_URL || 'https://api-liturgia-diaria.vercel.app/cn',
  saintOfDayUrl: process.env.SAINT_OF_DAY_URL || 'https://api-liturgia-diaria.vercel.app/santo-do-dia',
  wikimediaApiUrl: process.env.WIKIMEDIA_API_URL || 'https://commons.wikimedia.org/w/api.php',
  wikipediaSummaryBaseUrl: process.env.WIKIPEDIA_SUMMARY_BASE_URL || 'https://pt.wikipedia.org/api/rest_v1/page/summary',
  imageLookupTimeoutMs: positiveInteger(process.env.IMAGE_LOOKUP_TIMEOUT_MS, 9000),
  corsOrigin: process.env.CORS_ORIGIN || '*'
});
