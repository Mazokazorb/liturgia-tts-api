import { cleanText } from '../utils.js';

const BOOKS = [
  [/\bGn\b/gi, 'Gênesis'], [/\bEx\b/gi, 'Êxodo'], [/\bLv\b/gi, 'Levítico'], [/\bNm\b/gi, 'Números'],
  [/\bDt\b/gi, 'Deuteronômio'], [/\bJs\b/gi, 'Josué'], [/\bJz\b/gi, 'Juízes'], [/\bRt\b/gi, 'Rute'],
  [/\b1Sm\b/gi, 'Primeiro Samuel'], [/\b2Sm\b/gi, 'Segundo Samuel'], [/\b1Rs\b/gi, 'Primeiro Reis'], [/\b2Rs\b/gi, 'Segundo Reis'],
  [/\bSl\b/gi, 'Salmo'], [/\bPr\b/gi, 'Provérbios'], [/\bEcl\b/gi, 'Eclesiastes'], [/\bCt\b/gi, 'Cântico dos Cânticos'],
  [/\bIs\b/gi, 'Isaías'], [/\bJr\b/gi, 'Jeremias'], [/\bLm\b/gi, 'Lamentações'], [/\bEz\b/gi, 'Ezequiel'],
  [/\bDn\b/gi, 'Daniel'], [/\bOs\b/gi, 'Oseias'], [/\bJl\b/gi, 'Joel'], [/\bAm\b/gi, 'Amós'], [/\bJn\b/gi, 'Jonas'],
  [/\bMq\b/gi, 'Miqueias'], [/\bNa\b/gi, 'Naum'], [/\bHab\b/gi, 'Habacuc'], [/\bSf\b/gi, 'Sofonias'],
  [/\bAg\b/gi, 'Ageu'], [/\bZc\b/gi, 'Zacarias'], [/\bMl\b/gi, 'Malaquias'], [/\bMt\b/gi, 'Mateus'],
  [/\bMc\b/gi, 'Marcos'], [/\bLc\b/gi, 'Lucas'], [/\bJo\b/gi, 'João'], [/\bAt\b/gi, 'Atos dos Apóstolos'],
  [/\bRm\b/gi, 'Romanos'], [/\b1Cor\b/gi, 'Primeira Coríntios'], [/\b2Cor\b/gi, 'Segunda Coríntios'],
  [/\bGl\b/gi, 'Gálatas'], [/\bEf\b/gi, 'Efésios'], [/\bFl\b/gi, 'Filipenses'], [/\bCl\b/gi, 'Colossenses'],
  [/\b1Ts\b/gi, 'Primeira Tessalonicenses'], [/\b2Ts\b/gi, 'Segunda Tessalonicenses'], [/\b1Tm\b/gi, 'Primeira Timóteo'],
  [/\b2Tm\b/gi, 'Segunda Timóteo'], [/\bTt\b/gi, 'Tito'], [/\bFm\b/gi, 'Filêmon'], [/\bHb\b/gi, 'Hebreus'],
  [/\bTg\b/gi, 'Tiago'], [/\b1Pd\b/gi, 'Primeira Pedro'], [/\b2Pd\b/gi, 'Segunda Pedro'], [/\b1Jo\b/gi, 'Primeira João'],
  [/\b2Jo\b/gi, 'Segunda João'], [/\b3Jo\b/gi, 'Terceira João'], [/\bJd\b/gi, 'Judas'], [/\bAp\b/gi, 'Apocalipse']
];

const NUMBERS = new Map(Object.entries({
  '0':'zero','1':'um','2':'dois','3':'três','4':'quatro','5':'cinco','6':'seis','7':'sete','8':'oito','9':'nove','10':'dez',
  '11':'onze','12':'doze','13':'treze','14':'quatorze','15':'quinze','16':'dezesseis','17':'dezessete','18':'dezoito','19':'dezenove','20':'vinte',
  '21':'vinte e um','22':'vinte e dois','23':'vinte e três','24':'vinte e quatro','25':'vinte e cinco','26':'vinte e seis','27':'vinte e sete','28':'vinte e oito','29':'vinte e nove','30':'trinta','31':'trinta e um','32':'trinta e dois','33':'trinta e três','34':'trinta e quatro','35':'trinta e cinco','36':'trinta e seis','37':'trinta e sete','38':'trinta e oito','39':'trinta e nove','40':'quarenta','41':'quarenta e um','42':'quarenta e dois','43':'quarenta e três','44':'quarenta e quatro','45':'quarenta e cinco','46':'quarenta e seis','47':'quarenta e sete','48':'quarenta e oito','49':'quarenta e nove','50':'cinquenta','51':'cinquenta e um','52':'cinquenta e dois','53':'cinquenta e três','54':'cinquenta e quatro','55':'cinquenta e cinco','56':'cinquenta e seis','57':'cinquenta e sete','58':'cinquenta e oito','59':'cinquenta e nove','60':'sessenta','61':'sessenta e um','62':'sessenta e dois','63':'sessenta e três','64':'sessenta e quatro','65':'sessenta e cinco','66':'sessenta e seis','67':'sessenta e sete','68':'sessenta e oito','69':'sessenta e nove','70':'setenta','71':'setenta e um','72':'setenta e dois','73':'setenta e três','74':'setenta e quatro','75':'setenta e cinco','76':'setenta e seis','77':'setenta e sete','78':'setenta e oito','79':'setenta e nove','80':'oitenta','81':'oitenta e um','82':'oitenta e dois','83':'oitenta e três','84':'oitenta e quatro','85':'oitenta e cinco','86':'oitenta e seis','87':'oitenta e sete','88':'oitenta e oito','89':'oitenta e nove','90':'noventa','91':'noventa e um','92':'noventa e dois','93':'noventa e três','94':'noventa e quatro','95':'noventa e cinco','96':'noventa e seis','97':'noventa e sete','98':'noventa e oito','99':'noventa e nove','100':'cem'
}));

export function normalizeReference(reference = '') {
  let result = cleanText(reference);
  for (const [pattern, replacement] of BOOKS) result = result.replace(pattern, replacement);
  result = result.replace(/\bcap\.?\s*(\d+)/gi, (_, n) => `capítulo ${numberToWords(n)}`);
  result = result.replace(/(\d+)\s*,\s*(\d+)\s*[-–]\s*(\d+)/g, (_, chapter, start, end) => `capítulo ${numberToWords(chapter)}, versículos ${numberToWords(start)} ao ${numberToWords(end)}`);
  result = result.replace(/(\d+)\s*,\s*(\d+)/g, (_, chapter, verse) => `capítulo ${numberToWords(chapter)}, versículo ${numberToWords(verse)}`);
  result = result.replace(/\b(\d+)\s*[-–]\s*(\d+)\b/g, (_, start, end) => `versículos ${numberToWords(start)} ao ${numberToWords(end)}`);
  result = result.replace(/\b(\d+)\b/g, (_, n) => numberToWords(n));
  return result.replace(/\s+/g, ' ').trim();
}

export function numberToWords(value) {
  return NUMBERS.get(String(value)) || String(value);
}

