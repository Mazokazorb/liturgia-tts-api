import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile, copyFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { config } from '../config.js';
import { buildSubtitleCues, toSrt, toVtt } from './subtitles.js';

function run(command, args, { input, timeoutMs = 120_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stderr = '';
    let stdout = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.on('error', error => {
      clearTimeout(timer);
      if (error.code === 'ENOENT') { error.status = 503; error.message = `${path.basename(command)} não encontrado. Instale a dependência ou ajuste a variável de ambiente correspondente.`; }
      reject(error);
    });
    child.on('close', code => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`${path.basename(command)} encerrou com código ${code}: ${stderr.slice(-1800)}`));
    });
    if (input !== undefined) child.stdin.end(input);
    else child.stdin.end();
  });
}

export function splitTextIntoSegments(text, maxChars = 240) {
  const normalized = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  const sentences = normalized.match(/[^.!?]+[.!?]+[”’"')\]]*|[^.!?]+$/gu) || [normalized];
  const segments = [];
  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;
    if (sentence.length <= maxChars) { segments.push(sentence); continue; }
    const clauses = sentence.split(/(?<=[,;:])\s+/u);
    let current = '';
    for (const clause of clauses) {
      if (!current) current = clause;
      else if (`${current} ${clause}`.length <= maxChars) current += ` ${clause}`;
      else { segments.push(current.trim()); current = clause; }
    }
    if (current) {
      if (current.length <= maxChars) segments.push(current.trim());
      else {
        let part = '';
        for (const word of current.split(/\s+/u)) {
          if (!part) part = word;
          else if (`${part} ${word}`.length <= maxChars) part += ` ${word}`;
          else { segments.push(part); part = word; }
        }
        if (part) segments.push(part);
      }
    }
  }
  return segments;
}

async function probeDuration(file) {
  const output = await run(config.ffprobeBin, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file]);
  const duration = Number(output.trim());
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`Não foi possível determinar a duração de ${path.basename(file)}.`);
  return duration;
}

function safeVoice(value) {
  const voice = String(value || config.piperVoice).trim();
  if (!/^[a-zA-Z0-9._-]{1,80}$/.test(voice)) throw new TypeError('Identificador de voz inválido.');
  if (voice !== config.piperVoice) throw new TypeError(`Esta instalação está configurada apenas para a voz ${config.piperVoice}. Configure outro modelo para trocar a voz.`);
  return voice;
}

export function audioEngineStatus() {
  return {
    enabled: Boolean(config.piperModelPath && existsSync(config.piperModelPath)),
    provider: 'piper',
    voice: config.piperVoice,
    modelConfigured: Boolean(config.piperModelPath && existsSync(config.piperModelPath)),
    runtime: 'external-cli',
    formats: ['wav', 'mp3'],
    subtitles: ['srt', 'vtt'],
    synchronization: 'sentence-level-duration-measured',
    note: config.piperModelPath ? undefined : 'Configure PIPER_MODEL_PATH e instale Piper + FFmpeg para habilitar síntese.'
  };
}

async function synthesizeInternal({ text, voice = config.piperVoice, title = 'liturgia', format = 'wav', pauseMs = config.audioPauseMs }) {
  if (!config.piperModelPath) {
    const error = new Error('Motor Piper desabilitado. Configure PIPER_MODEL_PATH e instale o executável Piper.');
    error.status = 503;
    throw error;
  }
  if (!['wav', 'mp3'].includes(format)) throw new TypeError('Formato de áudio deve ser wav ou mp3.');
  const spoken = String(text ?? '').trim();
  if (!spoken) throw new TypeError('Texto para síntese não pode ser vazio.');
  if (spoken.length > config.audioMaxCharacters) throw new RangeError(`Texto excede o limite de ${config.audioMaxCharacters} caracteres.`);
  const selectedVoice = safeVoice(voice);
  const segments = splitTextIntoSegments(spoken, config.audioSegmentMaxChars);
  if (!segments.length) throw new TypeError('Nenhum segmento de texto foi gerado.');

  const hash = createHash('sha256').update(JSON.stringify({ spoken, selectedVoice, model: config.piperModelPath, format, pauseMs, title })).digest('hex');
  await mkdir(config.audioOutputDir, { recursive: true });
  const baseName = `${hash}`;
  const audioPath = path.join(config.audioOutputDir, `${baseName}.${format}`);
  const wavPath = path.join(config.audioOutputDir, `${baseName}.wav`);
  const srtPath = path.join(config.audioOutputDir, `${baseName}.srt`);
  const vttPath = path.join(config.audioOutputDir, `${baseName}.vtt`);
  const metaPath = path.join(config.audioOutputDir, `${baseName}.json`);
  try {
    const existing = JSON.parse(await readFile(metaPath, 'utf8'));
    await stat(audioPath);
    await stat(srtPath);
    await stat(vttPath);
    return { ...existing, cached: true };
  } catch { /* cache miss or incomplete artifact */ }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'liturgia-audio-'));
  try {
    const chunkFiles = [];
    const durations = [];
    for (let index = 0; index < segments.length; index += 1) {
      const chunkPath = path.join(tempDir, `segment-${String(index).padStart(4, '0')}.wav`);
      const args = ['--model', config.piperModelPath, '--output_file', chunkPath];
      if (config.piperConfigPath) args.push('--config', config.piperConfigPath);
      await run(config.piperBin, args, { input: segments[index], timeoutMs: config.audioSynthesisTimeoutMs });
      durations.push(await probeDuration(chunkPath));
      chunkFiles.push(chunkPath);
    }

    const silencePath = path.join(tempDir, 'silence.wav');
    await run(config.ffmpegBin, ['-y', '-f', 'lavfi', '-i', `anullsrc=r=${config.audioSampleRate}:cl=mono`, '-t', String(pauseMs / 1000), '-c:a', 'pcm_s16le', silencePath]);
    const ffmpegArgs = ['-y'];
    const filterParts = [];
    let inputIndex = 0;
    const concatInputs = [];
    for (let index = 0; index < chunkFiles.length; index += 1) {
      ffmpegArgs.push('-i', chunkFiles[index]);
      filterParts.push(`[${inputIndex}:a]aresample=${config.audioSampleRate},aformat=channel_layouts=mono[s${index}]`);
      concatInputs.push(`[s${index}]`);
      inputIndex += 1;
      if (index < chunkFiles.length - 1 && pauseMs > 0) {
        ffmpegArgs.push('-i', silencePath);
        filterParts.push(`[${inputIndex}:a]anull[p${index}]`);
        concatInputs.push(`[p${index}]`);
        inputIndex += 1;
      }
    }
    filterParts.push(`${concatInputs.join('')}concat=n=${concatInputs.length}:v=0:a=1[outa]`);
    ffmpegArgs.push('-filter_complex', filterParts.join(';'), '-map', '[outa]', '-c:a', 'pcm_s16le', '-ar', String(config.audioSampleRate), '-ac', '1', wavPath);
    await run(config.ffmpegBin, ffmpegArgs, { timeoutMs: config.audioSynthesisTimeoutMs });
    if (format === 'mp3') {
      await run(config.ffmpegBin, ['-y', '-i', wavPath, '-codec:a', 'libmp3lame', '-q:a', '3', audioPath], { timeoutMs: config.audioSynthesisTimeoutMs });
    } else if (audioPath !== wavPath) {
      await copyFile(wavPath, audioPath);
    }

    const cues = buildSubtitleCues(segments, durations, pauseMs);
    await writeFile(srtPath, toSrt(cues), 'utf8');
    await writeFile(vttPath, toVtt(cues), 'utf8');
    const durationSeconds = await probeDuration(wavPath);
    const result = {
      id: baseName,
      title,
      voice: selectedVoice,
      format,
      audioUrl: `/media/${baseName}.${format}`,
      wavUrl: `/media/${baseName}.wav`,
      subtitles: {
        synchronization: 'sentence',
        cueCount: cues.length,
        srtUrl: `/media/${baseName}.srt`,
        vttUrl: `/media/${baseName}.vtt`
      },
      durationSeconds: Number(durationSeconds.toFixed(3)),
      segmentCount: segments.length,
      sampleRate: config.audioSampleRate,
      cached: false
    };
    await writeFile(metaPath, JSON.stringify(result, null, 2));
    return result;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}


const inFlight = new Map();

/** Coalesces concurrent identical synthesis requests within one process. */
export async function synthesizeWithSubtitles(options = {}) {
  const normalized = {
    text: String(options.text ?? '').trim(),
    voice: options.voice ?? config.piperVoice,
    title: options.title ?? 'liturgia',
    format: options.format ?? 'wav',
    pauseMs: options.pauseMs ?? config.audioPauseMs
  };
  const key = createHash('sha256').update(JSON.stringify({
    spoken: normalized.text,
    selectedVoice: normalized.voice,
    model: config.piperModelPath,
    format: normalized.format,
    pauseMs: normalized.pauseMs,
    title: normalized.title
  })).digest('hex');
  const pending = inFlight.get(key);
  if (pending) return { ...(await pending), cached: true };
  const task = synthesizeInternal(normalized);
  inFlight.set(key, task);
  try { return await task; }
  finally { inFlight.delete(key); }
}

export async function readMediaFile(filename) {
  if (!/^[a-f0-9]{64}\.(wav|mp3|srt|vtt)$/.test(filename)) return null;
  const fullPath = path.join(config.audioOutputDir, filename);
  try { return { data: await readFile(fullPath), path: fullPath }; }
  catch { return null; }
}
