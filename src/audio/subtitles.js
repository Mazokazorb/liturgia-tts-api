export function formatTimestamp(seconds, separator = ',') {
  const safe = Math.max(0, seconds);
  const milliseconds = Math.round(safe * 1000);
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const secs = Math.floor((milliseconds % 60_000) / 1000);
  const millis = milliseconds % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}${separator}${String(millis).padStart(3, '0')}`;
}

export function buildSubtitleCues(segments, durations, pauseMs = 350) {
  let cursor = 0;
  return segments.map((text, index) => {
    const start = cursor;
    const duration = Number(durations[index]);
    if (!Number.isFinite(duration) || duration <= 0) throw new TypeError(`Duração inválida para o segmento ${index + 1}.`);
    const end = start + duration;
    cursor = end + (index < segments.length - 1 ? pauseMs / 1000 : 0);
    return { index: index + 1, start, end, text };
  });
}

export function toSrt(cues) {
  return cues.map(cue => `${cue.index}\n${formatTimestamp(cue.start)} --> ${formatTimestamp(cue.end)}\n${cue.text}`).join('\n\n') + '\n';
}

export function toVtt(cues) {
  return `WEBVTT\n\n${cues.map(cue => `${formatTimestamp(cue.start, '.')} --> ${formatTimestamp(cue.end, '.')}\n${cue.text}`).join('\n\n')}\n`;
}
