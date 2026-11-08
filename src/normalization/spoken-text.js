import { cleanText } from '../utils.js';
import { numberToWords } from './bible-references.js';

export function normalizeSpokenText(value, mode = 'faithful') {
  let text = cleanText(value);
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

