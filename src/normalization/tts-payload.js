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
