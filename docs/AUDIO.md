# Motor de áudio e legendas

## Arquitetura

O módulo `src/audio` executa Piper por processo externo. O texto é dividido em segmentos de frase; cada segmento é sintetizado separadamente. A API mede a duração de cada WAV com FFprobe, concatena os segmentos com pausas controladas via FFmpeg e gera SRT/WebVTT usando as durações efetivamente medidas.

A sincronização desta versão é **por frase**, não por palavra. Piper não fornece alinhamento temporal lexical confiável no modo CLI padrão. Não se deve inferir sincronização palavra a palavra a partir do tamanho do texto.

## Dependências

- Piper CLI (`piper`)
- Modelo Piper ONNX e respectivo JSON de configuração
- FFmpeg e FFprobe
- Node.js 22.9+

O projeto não redistribui modelos de voz. Baixe um modelo compatível com a licença aplicável e configure os caminhos localmente.

## Configuração

Copie `.env.example` para `.env` e configure:

```dotenv
PIPER_BIN=piper
PIPER_MODEL_PATH=./models/pt_BR-faber-medium.onnx
PIPER_CONFIG_PATH=./models/pt_BR-faber-medium.onnx.json
PIPER_VOICE=faber
FFMPEG_BIN=ffmpeg
FFPROBE_BIN=ffprobe
AUDIO_OUTPUT_DIR=./var/audio
AUDIO_SAMPLE_RATE=22050
AUDIO_PAUSE_MS=350
AUDIO_SEGMENT_MAX_CHARS=240
AUDIO_MAX_CHARACTERS=20000
AUDIO_SYNTHESIS_TIMEOUT_MS=600000
```

`PIPER_VOICE` é um identificador de configuração, não troca sozinho o modelo ONNX. Para usar outra voz, configure outro modelo e ajuste `PIPER_VOICE`.

## Endpoints

- `GET /api/v1/audio/status`: configuração e disponibilidade declarada do motor.
- `GET /api/v1/audio/saint-of-the-day?format=wav&mode=editorial&voice=faber`: sintetiza o santo do dia.
- `GET /api/v1/audio/liturgy?date=YYYY-MM-DD&format=mp3`: sintetiza a liturgia.
- `GET /media/{sha256}.wav`: arquivo de áudio.
- `GET /media/{sha256}.mp3`: áudio comprimido.
- `GET /media/{sha256}.srt`: legenda SubRip.
- `GET /media/{sha256}.vtt`: legenda WebVTT.

Os endpoints de áudio retornam JSON com URLs, duração, quantidade de segmentos e metadados de sincronização. O arquivo de áudio é servido separadamente.

## Exemplo

```bash
curl "http://localhost:3000/api/v1/audio/saint-of-the-day?format=mp3" 
curl "http://localhost:3000/api/v1/audio/liturgy?date=2026-11-08&format=wav"
```

## Cache e segurança

Os nomes de arquivo são hashes SHA-256 do texto, voz, modelo, formato e pausa. Isso permite cache determinístico e URLs imutáveis. O texto possui limite configurável de caracteres e cada segmento tem limite configurável. O diretório `var/audio` contém artefatos gerados e não deve ser versionado.

## Limitações

- A sincronização é por frase/segmento, não por palavra.
- A qualidade e pronúncia dependem do modelo de voz escolhido.
- O serviço não redistribui modelos Piper.
- A geração requer Piper, FFmpeg e FFprobe instalados e acessíveis no PATH (ou configurados por variável de ambiente).
