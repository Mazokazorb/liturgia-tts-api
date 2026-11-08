// Fachada pública da camada de normalização.
export { normalizeReference, numberToWords } from './bible-references.js';
export { normalizeSpokenText } from './spoken-text.js';
export { canonicalizeDancrf, canonicalizeCancaoNova } from './canonicalizers.js';
export { buildTtsPayload } from './tts-payload.js';
