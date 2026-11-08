import { config } from '../config.js';
import { cacheGet, cacheSet } from '../cache.js';
import { PROVIDERS } from './index.js';

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
    warnings: canonical.sections.length === 0 ? ['A fonte não retornou seções litúrgicas reconhecíveis.'] : []
  };
  cacheSet(key, result, config.cacheTtlSeconds, config.cacheMaxEntries);
  return { ...result, cached: false };
}
