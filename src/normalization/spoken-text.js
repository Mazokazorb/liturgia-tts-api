import { cleanText } from '../utils.js';
import { numberToWords } from './bible-references.js';

function decodeHtmlEntities(value) {
  const named = { amp: '&', apos: "'", quot: '"', nbsp: ' ', lt: '<', gt: '>', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
  return String(value).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code) => {
    if (code[0] === '#') {
      const hex = code[1]?.toLowerCase() === 'x';
      const point = Number.parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    }
    return named[code.toLowerCase()] ?? entity;
  });
}

function stripMarkup(value) {
  return decodeHtmlEntities(String(value ?? '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|blockquote|br)\s*>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' '));
}

export function normalizeSpokenText(value, mode = 'faithful') {
  let text = cleanText(stripMarkup(value));
  text = text.replace(/✠/g, ',');
  text = text.replace(/\s+,/g, ',').replace(/,{2,}/g, ',');
  text = text.replace(/\s+([.!?;:])/g, '$1');
  text = text.replace(/([.!?])(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/g, '$1 ');
  text = text.replace(/\b1ª\s*Leitura\b/gi, 'Primeira Leitura');
  text = text.replace(/\b2ª\s*Leitura\b/gi, 'Segunda Leitura');
  text = text.replace(/\b1º\s/gi, 'Primeiro ');
  text = text.replace(/\b2º\s/gi, 'Segundo ');
  text = text.replace(/\bSl\.?\s*(\d+)/gi, (_, n) => `Salmo ${numberToWords(n)}`);
  if (mode === 'editorial') {
    text = text.replace(/\s*—\s*/g, '. ');
    text = text.replace(/\s*\n\s*/g, '\n\n');
    text = text.replace(/\n{3,}/g, '\n\n');
  }
  return text.trim();
}

