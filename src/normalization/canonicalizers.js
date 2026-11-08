import { cleanText } from '../utils.js';

function pickReadingItems(raw, key) {
  const value = raw?.leituras?.[key];
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return [value];
  return [];
}

export function canonicalizeDancrf(raw) {
  const sections = [];
  const add = (type, label, items) => {
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      sections.push({
        type,
        label,
        title: cleanText(item.titulo || item.tipo || label),
        reference: cleanText(item.referencia || ''),
        text: cleanText(item.texto || ''),
        refrain: cleanText(item.refrao || '')
      });
    }
  };
  add('first_reading', 'Primeira leitura', pickReadingItems(raw, 'primeiraLeitura'));
  add('psalm', 'Salmo responsorial', pickReadingItems(raw, 'salmo'));
  add('second_reading', 'Segunda leitura', pickReadingItems(raw, 'segundaLeitura'));
  add('gospel', 'Evangelho', pickReadingItems(raw, 'evangelho'));
  const prayers = raw?.oracoes || {};
  for (const [key, label] of [['coleta','Oração da coleta'],['oferendas','Oração sobre as oferendas'],['comunhao','Oração depois da comunhão']]) {
    if (prayers[key]) sections.push({ type: 'prayer', label, title: label, reference: '', text: cleanText(prayers[key]), refrain: '' });
  }
  for (const [key, label] of [['entrada','Antífona de entrada'],['comunhao','Antífona da comunhão']]) {
    if (raw?.antifonas?.[key]) sections.push({ type: 'antiphon', label, title: label, reference: '', text: cleanText(raw.antifonas[key]), refrain: '' });
  }
  for (const extra of prayers.extras || []) {
    sections.push({ type: 'extra', label: cleanText(extra.titulo || 'Texto adicional'), title: cleanText(extra.titulo || 'Texto adicional'), reference: '', text: cleanText(extra.texto || ''), refrain: '' });
  }
  return {
    date: raw?.data || null,
    celebration: cleanText(raw?.liturgia || ''),
    liturgicalColor: cleanText(raw?.cor || ''),
    sections,
    raw
  };
}

function extractCanNovaReference(...values) {
  // O salmo usa notação própria, por exemplo: Sl 104(105),2-3.4-5.
  for (const value of values) {
    const text = cleanText(value);
    const psalm = text.match(/\bSl\.?\s*\d+(?:\(\d+\))?[^\n]*/i);
    if (psalm) return psalm[0].replace(/\s*\(R\..*$/i, '').trim();
  }
  for (const value of values) {
    const match = cleanText(value).match(/\(([^()]{2,60})\)/);
    if (match && /\d/.test(match[1])) return match[1].trim();
  }
  return '';
}

function canNovaSection(type, label, item) {
  if (!item || typeof item !== 'object') return null;
  const psalmLines = Array.isArray(item.content_psalm)
    ? item.content_psalm.map(cleanText).filter(Boolean)
    : [];
  const body = type === 'psalm'
    ? psalmLines.join('\n\n')
    : cleanText(item.text || '');
  const rawHead = cleanText(item.head || item.title || '');
  const title = type === 'first_reading'
    ? (rawHead.replace(/\s*\([^)]*\)/, '').trim() || label)
    : label;
  const openingParts = type === 'gospel'
    ? [item.head, item.head_response]
    : [item.head_response];
  const opening = openingParts.map(cleanText).filter(Boolean).join(' ');
  const closing = [item.footer, item.footer_response]
    .map(cleanText).filter(Boolean).join(' ');
  return {
    type,
    label,
    title,
    reference: extractCanNovaReference(item.head, item.response, item.all_html),
    opening,
    text: body,
    refrain: '',
    closing
  };
}

export function canonicalizeCancaoNova(raw) {
  const today = raw?.today || {};
  const readings = today.readings || {};
  const sections = [];
  const groups = [
    ['first_reading', 'Primeira leitura', readings.first_reading],
    ['psalm', 'Salmo responsorial', readings.psalm],
    ['second_reading', 'Segunda leitura', readings.second_reading],
    ['gospel', 'Evangelho', readings.gospel]
  ];

  for (const [type, label, item] of groups) {
    const section = canNovaSection(type, label, item);
    if (section && (section.text || section.opening || section.closing)) sections.push(section);
  }

  return {
    date: today.date || null,
    celebration: cleanText(today.entry_title || ''),
    liturgicalColor: cleanText(today.color || ''),
    source: cleanText(raw?.source || 'Canção Nova'),
    sections,
    raw
  };
}

