import { normalizeReference } from './bible-references.js';
import { normalizeSpokenText } from './spoken-text.js';

export function buildTtsPayload(canonical, { mode = 'both', output = 'both', voice = 'faber' } = {}) {
  const modes = mode === 'both' ? ['faithful', 'editorial'] : [mode];
  const normalizedSections = canonical.sections.map((section, index) => {
    const versions = {};
    for (const currentMode of modes) {
      const title = normalizeSpokenText(section.title, currentMode);
      const reference = normalizeReference(section.reference);
      const opening = normalizeSpokenText(section.opening || '', currentMode);
      const body = normalizeSpokenText(section.text, currentMode);
      const refrain = normalizeSpokenText(section.refrain, currentMode);
      const closing = normalizeSpokenText(section.closing || '', currentMode);
      versions[currentMode] = {
        title,
        reference,
        opening,
        text: body,
        refrain,
        closing,
        spokenText: [title, reference, opening, body, refrain ? `Refrão: ${refrain}` : '', closing].filter(Boolean).join('. ')
      };
    }
    return { index, type: section.type, label: section.label, pauseAfterMs: pauseFor(section.type), versions };
  });

  const result = { voice, modes, sections: normalizedSections };
  if (output === 'continuous' || output === 'both') {
    result.continuous = {};
    for (const currentMode of modes) {
      result.continuous[currentMode] = normalizedSections
        .map(section => section.versions[currentMode].spokenText)
        .filter(Boolean).join('\n\n');
    }
  }
  if (output === 'sections') result.continuous = undefined;
  if (output === 'continuous') result.sections = undefined;
  return result;
}

function pauseFor(type) {
  if (type === 'gospel') return 1600;
  if (type === 'psalm') return 1100;
  if (type === 'first_reading' || type === 'second_reading') return 1300;
  return 900;
}


/**
 * Constrói a representação original/TTS de um conteúdo hagiográfico.
 * `both` mantém as duas estratégias de normalização e usa editorial como
 * seleção padrão para o campo simples `tts`.
 */
export function buildSaintTtsPayload(canonical, { mode = 'both', voice = 'faber' } = {}) {
  const modes = mode === 'both' ? ['faithful', 'editorial'] : [mode];
  const selectedMode = mode === 'faithful' ? 'faithful' : 'editorial';
  const normalizeField = value => {
    const versions = Object.fromEntries(modes.map(currentMode => [
      currentMode,
      normalizeSpokenText(value || '', currentMode)
    ]));
    return {
      original: value || '',
      tts: versions[selectedMode] ?? normalizeSpokenText(value || '', selectedMode),
      ...(mode === 'both' ? { versions } : {})
    };
  };

  const biography = normalizeField(canonical.biography);
  const prayer = normalizeField(canonical.prayer);
  const otherSaints = (canonical.otherSaints || []).map(value => normalizeField(value));
  const title = normalizeSpokenText(canonical.title, selectedMode);
  const spokenText = [
    title,
    biography.tts,
    prayer.tts ? `Oração. ${prayer.tts}` : '',
    otherSaints.length ? `Outros santos. ${otherSaints.map(item => item.tts).filter(Boolean).join('. ')}` : ''
  ].filter(Boolean).join('. ').replace(/(?:\.\s*){2,}/g, '. ').trim();

  return {
    voice,
    mode,
    selectedMode,
    biography,
    prayer,
    otherSaints,
    spokenText
  };
}
