FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

# FFmpeg/FFprobe fazem a montagem do áudio e a medição das durações.
# Piper é instalado como runtime; os modelos de voz são montados em /models.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg libespeak-ng1 python3 python3-venv \
  && python3 -m venv /opt/piper \
  && /opt/piper/bin/pip install --no-cache-dir piper-tts \
  && ln -s /opt/piper/bin/piper /usr/local/bin/piper \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
COPY src ./src
RUN mkdir -p /app/var/audio /models && chown -R node:node /app/var /models

ENV PIPER_BIN=piper \
    FFMPEG_BIN=ffmpeg \
    FFPROBE_BIN=ffprobe \
    PIPER_MODEL_PATH=/models/pt_BR-faber-medium.onnx \
    PIPER_CONFIG_PATH=/models/pt_BR-faber-medium.onnx.json \
    AUDIO_OUTPUT_DIR=/app/var/audio

VOLUME ["/models", "/app/var/audio"]
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "start"]
