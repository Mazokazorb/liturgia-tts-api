# Changelog

## [1.6.0] - 2026-11-08

### Added
- Motor de síntese Piper desacoplado, com execução por processo local e modelo ONNX configurável.
- Segmentação textual por frase, síntese de cada segmento e medição de duração via FFprobe.
- Montagem WAV via FFmpeg, conversão opcional MP3 e pausas configuráveis entre segmentos.
- Geração de legendas SRT e WebVTT sincronizadas por duração real de cada segmento sintetizado.
- Cache determinístico SHA-256 para áudio e legendas, com entrega por `/media/{hash}.{ext}`.
- Calendário Romano Geral simplificado: computus gregoriano, tempos litúrgicos, cores de referência, ciclos dominicais/feriais e datas móveis.
- Endpoints `/api/v1/calendar/*`, `/api/v1/audio/*` e `/api/v1/content/*`.
- Pacote multimídia que agrega calendário, liturgia, santo, imagem e áudio opcional.
- Dockerfile com Piper, FFmpeg e FFprobe; modelos de voz permanecem montados externamente em `/models`.
- Testes de calendário, legendas, pipeline de áudio com Piper simulado e integração HTTP dos novos endpoints.

### Changed
- Versão do pacote e do endpoint `/health` atualizada para 1.6.0.
- Configuração de áudio isolada por variáveis de ambiente; a API textual continua operando sem o runtime de áudio.

### Limitations
- Legendas sincronizadas por frase, não por palavra; Piper CLI não fornece alinhamento lexical temporal confiável.
- O calendário é temporal e simplificado; não substitui o Diretório Litúrgico da CNBB nem calendários próprios locais.
- O modelo Faber não é distribuído no repositório ou na imagem Docker.
- A suíte valida a montagem do pipeline com um Piper simulado; a qualidade acústica real depende da instalação do modelo escolhido.

## [1.5.0] - 2026-11-08

### Added
- Normalização TTS de biografia, oração e nomes de outros santos usando o motor compartilhado da camada `normalization`.
- Campos `original`, `tts` e, no modo `both`, `versions.faithful` / `versions.editorial`.
- Campo agregado `tts.spokenText` com título, biografia, oração e outros santos.
- Parâmetros `format=original|tts|both`, `mode=faithful|editorial|both` e `voice` no endpoint de santo do dia.
- Testes unitários e HTTP de integração para formatos, modos, HTML, entidades e validação de parâmetros.

### Changed
- Normalizador de fala remove blocos `script`/`style`, tags HTML e decodifica entidades HTML comuns e numéricas.
- Endpoint `/health` e pacote reportam versão 1.5.0.

### Notes
- `voice` é metadado de seleção; esta versão prepara texto, mas ainda não executa Piper nem gera WAV/MP3.


Mudanças relevantes do projeto são registradas neste arquivo.

## [1.4.0] - 2026-11-08

### Added
- Endpoint `GET /api/v1/saint-of-the-day` para consultar santo, biografia, oração e outros santos do dia.
- Canonicalizador próprio para o contrato `/santo-do-dia` da API comunitária Canção Nova.
- Motor de resolução de imagens com busca prioritária no Wikimedia Commons e fallback para miniatura da Wikipédia.
- Metadados de autoria, licença, crédito, página de origem, dimensões e estratégia de resolução da imagem.
- Detecção de divergência entre a data solicitada e a data informada pela fonte upstream.
- Opções `?image=none` e `?refresh=true` para controlar resolução de imagem e cache.
- Testes para canonicalização, interpretação de mês e detecção de conteúdo desatualizado.

### Changed
- Versão do serviço e pacote atualizada para 1.4.0.
- Catálogo de provedores e documentação ampliados para a funcionalidade de santos.

### Notes
- O campo `image` original da fonte não é tratado como imagem confiável: pode apontar para ícones genéricos.
- A resolução de imagem não garante que a representação seja historicamente autêntica; o consumidor deve exibir crédito e licença quando disponíveis.

## [1.3.0] - 2026-11-08

### Added
- Organização por camadas `core`, `http`, `providers` e `normalization`.
- Catálogo central de provedores.
- Cache limitado por quantidade de entradas e política aproximada de LRU.
- Resolução de data e roteamento isolados em módulos testáveis.
- Documentação técnica de API, arquitetura, desenvolvimento, normalização e provedores.
- Guia de contribuição e política inicial de segurança.
- Pipeline GitHub Actions para Node.js 22 e 24.
- Testes unitários para roteamento e fuso horário.

### Changed
- Inicialização HTTP separada da implementação de rotas.
- Scripts npm com carregamento opcional de `.env` pelo Node.js.
- Versão do serviço e metadados atualizados para 1.3.0.

### Maintained
- Roteamento automático Canção Nova (hoje) / Dancrf (datas específicas).
- Modos `faithful`, `editorial` e `both`.
- Saídas `continuous`, `sections` e `both`.

## [1.2.0]

- Roteamento automático por data e suporte a seleção explícita de fontes.
- Consulta dupla para a data corrente e fallback Dancrf para datas não correntes.

## [1.1.0]

- Integração do endpoint comunitário Canção Nova `/cn`.
- Validação da data retornada pelo provedor corrente.

## [1.0.0]

- Primeira versão da API de normalização litúrgica para TTS.
