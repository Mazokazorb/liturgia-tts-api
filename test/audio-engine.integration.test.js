import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, chmod, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'liturgia-audio-test-'));
const fakePiper = path.join(tempRoot, 'fake-piper');
const outputDir = path.join(tempRoot, 'audio');
await mkdir(outputDir, { recursive: true });
const fakeModel = path.join(tempRoot, 'fake-faber.onnx');
await writeFile(fakeModel, 'mock-model');
await writeFile(fakePiper, `#!/bin/sh\nOUT=''\nwhile [ "$#" -gt 0 ]; do\n  if [ "$1" = "--output_file" ]; then OUT="$2"; shift 2; else shift; fi\ndone\ncat >/dev/null\nffmpeg -hide_banner -loglevel error -y -f lavfi -i anullsrc=r=22050:cl=mono -t 0.28 -c:a pcm_s16le "$OUT"\n`);
await chmod(fakePiper, 0o755);
process.env.PIPER_MODEL_PATH = fakeModel;
process.env.PIPER_VOICE = 'faber-test';
process.env.PIPER_BIN = fakePiper;
process.env.AUDIO_OUTPUT_DIR = outputDir;
process.env.FFMPEG_BIN = 'ffmpeg';
process.env.FFPROBE_BIN = 'ffprobe';

const { synthesizeWithSubtitles, readMediaFile, audioEngineStatus } = await import('../src/audio/engine.js');

test('pipeline de áudio gera WAV, SRT e VTT com sincronização por segmento', async () => {
  try {
    assert.equal(audioEngineStatus().enabled, true);
    const result = await synthesizeWithSubtitles({ text: 'Primeira frase. Segunda frase.', voice: 'faber-test', format: 'wav', pauseMs: 250 });
    assert.equal(result.segmentCount, 2);
    assert.equal(result.subtitles.cueCount, 2);
    assert.ok(result.durationSeconds >= 0.75);
    const wav = await readMediaFile(`${result.id}.wav`);
    const srt = await readMediaFile(`${result.id}.srt`);
    const vtt = await readMediaFile(`${result.id}.vtt`);
    assert.ok(wav.data.length > 44);
    assert.match(srt.data.toString('utf8'), /00:00:00,000 --> 00:00:00,2[78][0-9]/);
    assert.match(srt.data.toString('utf8'), /00:00:00,5[23][0-9] -->/);
    assert.match(srt.data.toString('utf8'), /Primeira frase\./);
    assert.match(vtt.data.toString('utf8'), /^WEBVTT/);
    const cached = await synthesizeWithSubtitles({ text: 'Primeira frase. Segunda frase.', voice: 'faber-test', format: 'wav', pauseMs: 250 });
    assert.equal(cached.cached, true);
    const mp3 = await synthesizeWithSubtitles({ text: 'Uma frase para MP3.', voice: 'faber-test', format: 'mp3', pauseMs: 250 });
    assert.match(mp3.audioUrl, /\.mp3$/);
    assert.ok((await readMediaFile(`${mp3.id}.mp3`)).data.length > 100);
    assert.equal(await readMediaFile('../outside.wav'), null);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
