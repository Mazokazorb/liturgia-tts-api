const entries = new Map();

function removeExpired(now = Date.now()) {
  for (const [key, item] of entries) {
    if (item.expiresAt <= now) entries.delete(key);
  }
}

export function cacheGet(key) {
  const item = entries.get(key);
  if (!item) return null;
  if (item.expiresAt <= Date.now()) {
    entries.delete(key);
    return null;
  }

  // Atualiza a ordem de inserção para aproximar o comportamento de LRU.
  entries.delete(key);
  entries.set(key, item);
  return item.value;
}

export function cacheSet(key, value, ttlSeconds, maxEntries = 512) {
  const now = Date.now();
  removeExpired(now);
  entries.delete(key);

  while (entries.size >= maxEntries) {
    const oldestKey = entries.keys().next().value;
    if (oldestKey === undefined) break;
    entries.delete(oldestKey);
  }

  entries.set(key, { value, expiresAt: now + ttlSeconds * 1000 });
}

export function cacheClear() {
  entries.clear();
}

export function cacheSize() {
  return entries.size;
}
