<div align="center">

# ✝ Liturgia TTS API

**Uma API modular para consultar conteúdo litúrgico, calcular o calendário romano e gerar áudio com legendas sincronizadas.**

[![Node.js](https://img.shields.io/badge/Node.js-22.9%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/tests-node--test-2ea44f)](.github/workflows/ci.yml)
[![API](https://img.shields.io/badge/API-REST%20%2F%20JSON-2563eb)](docs/API.md)
[![Version](https://img.shields.io/badge/version-1.6.0-7c3aed)](CHANGELOG.md)

*Canção Nova e Dancrf · calendário litúrgico · Piper TTS · áudio e legendas sincronizadas*

</div>

---

## Visão geral

A **Liturgia TTS API** funciona como uma camada de integração entre provedores de dados litúrgicos e mecanismos de síntese de voz. Ela consulta as fontes disponíveis, converte respostas heterogêneas para um modelo canônico e produz roteiros textuais em formatos adequados à leitura contínua ou segmentada.

O projeto foi desenhado para ser extensível: novos provedores, regras de normalização e mecanismos de saída podem ser adicionados sem concentrar toda a lógica no servidor HTTP.

> **Áudio opcional:** o motor Piper é executado localmente quando um modelo ONNX está configurado. Sem modelo, os endpoints de texto e calendário continuam funcionais; os endpoints de síntese retornam `503` com instruções de configuração.

## ✨ Recursos

| Recurso | Implementação |
|---|---|
| Roteamento automático | Canção Nova para hoje; Dancrf para outras datas |
| Consulta histórica | Dancrf v2, conforme disponibilidade do serviço upstream |
| Comparação de fontes | `source=both`, com resultados separados |
| Normalização | `faithful`, `editorial` ou `both` |
| Formato de saída | `continuous`, `sections` ou `both` |
| Preparação TTS | Texto falado, referências expandidas e pausas por seção |
| Santo do dia | Biografia, oração e lista de outros santos via API comunitária |
| Normalização hagiográfica | Campos `original` / `tts`, modos `faithful` / `editorial` e roteiro contínuo |
| Imagem do santo | Busca Wikimedia Commons, fallback Wikipédia e metadados de atribuição/licença |
| Calendário litúrgico | Tempos, cores, ciclos A/B/C e I/II, Páscoa e principais datas móveis |
| Síntese de voz | Piper CLI, WAV/MP3, segmentação por frase e cache SHA-256 |
| Legendas sincronizadas | SRT e WebVTT com tempos medidos por segmento de áudio |
| Pacote multimídia | Agrega calendário, liturgia, santo, imagem e áudio em uma resposta |
| Integridade temporal | Detecção de resposta upstream referente a uma data diferente da solicitada |
| Cache | Memória do processo, TTL e limite de entradas configuráveis |
| Runtime | Node.js nativo; Piper e FFmpeg são dependências opcionais do módulo de áudio |
| Testes | `node:test`, sem framework adicional |

## ⚡ Início rápido

### Requisitos

- Node.js **22.9.0 ou superior**.
- npm compatível com a versão do Node.js.
- Acesso à internet para consultar os provedores externos.

### Instalação

```bash
git clone https://github.com/Mazokazorb/liturgia-tts-api.git
cd liturgia-tts-api
cp .env.example .env
npm test
npm start
```

A API ficará disponível em `http://localhost:3000`.

> O projeto não possui dependências npm de runtime. Para gerar áudio, instale Piper, FFmpeg e FFprobe e configure um modelo ONNX compatível; consulte [docs/AUDIO.md](docs/AUDIO.md).

### Primeira consulta

```bash
# Liturgia do dia: roteamento automático
curl "http://localhost:3000/api/v1/liturgy/today"

# Data específica: Dancrf automaticamente
curl "http://localhost:3000/api/v1/liturgy/2026-11-01"

# Duas fontes para a data corrente
curl "http://localhost:3000/api/v1/liturgy/today?source=both"

# Calendário litúrgico
curl "http://localhost:3000/api/v1/calendar/today"

# Santo do dia em áudio (requer Piper + modelo configurado)
curl "http://localhost:3000/api/v1/audio/saint-of-the-day?format=mp3"

# Pacote multimídia com áudio, imagem e legendas
curl "http://localhost:3000/api/v1/content/today?include=calendar,liturgy,saint,image,audio&audioFormat=mp3"
```

## 🧭 Roteamento de provedores

O parâmetro `source=auto` é o padrão. A data é calculada no fuso `America/Sao_Paulo`.

| Solicitação | Provedor consultado | Motivo |
|---|---|---|
| Hoje + `auto` | Canção Nova | O endpoint comunitário `/cn` fornece somente a liturgia corrente |
| Outra data + `auto` | Dancrf | A API Dancrf recebe dia, mês e ano |
| Hoje + `both` | Canção Nova e Dancrf | As respostas são mantidas separadas |
| Outra data + `both` | Dancrf | Evita uma chamada inválida à rota `/cn` |
| Qualquer data + `dancrf` | Dancrf | Seleção explícita do cliente |
| Hoje + `cancaonova` | Canção Nova | Seleção explícita do cliente |
| Data diferente de hoje + `cancaonova` | HTTP 409 | O provedor não oferece consulta histórica nessa rota |

A estratégia aplicada é retornada em `routing`, permitindo que o consumidor identifique qual fonte foi efetivamente selecionada.

## 🧱 Arquitetura

```text
Cliente HTTP
    │
    ▼
src/server.js ── Inicialização e encerramento gracioso
    │
    ▼
src/http/app.js ── Rotas, validação e composição da resposta
    │
    ├── src/core/date.js ── Resolução de datas e fuso horário
    ├── src/core/routing.js ── Estratégia de seleção de provedores
    ├── src/providers/ ── Integrações externas e catálogo
    │       ├── cancaonova.js
    │       ├── dancrf.js
    │       ├── saint-of-day.js
    │       └── index.js
    ├── images/
    │   └── saint-image.js
    ├── src/normalization/ ── Modelo canônico e roteiro TTS
    ├── src/cache.js ── Cache em memória
    └── src/http/respond.js ── Resposta JSON e CORS
```

### Mapa de diretórios

```text
.
├── .github/
│   ├── ISSUE_TEMPLATE/
│   └── workflows/ci.yml
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   ├── NORMALIZATION.md
│   └── PROVIDERS.md
├── src/
│   ├── core/
│   │   ├── date.js
│   │   └── routing.js
│   ├── http/
│   │   ├── app.js
│   │   └── respond.js
│   ├── normalization/
│   │   ├── bible-references.js
│   │   ├── canonicalizers.js
│   │   ├── spoken-text.js
│   │   ├── tts-payload.js
│   │   └── index.js
│   ├── images/
│   │   └── saint-image.js
│   ├── providers/
│   │   ├── cancaonova.js
│   │   ├── dancrf.js
│   │   ├── saint-of-day.js
│   │   └── index.js
│   ├── cache.js
│   ├── config.js
│   ├── normalize.js
│   ├── server.js
│   └── utils.js
├── test/
│   ├── cache.test.js
│   ├── normalize.test.js
│   └── routing.test.js
├── .editorconfig
├── .env.example
├── .gitattributes
├── .gitignore
├── CHANGELOG.md
├── CONTRIBUTING.md
├── Dockerfile
├── package.json
├── README.md
└── SECURITY.md
```

Para entender responsabilidades e dependências entre módulos, consulte [Arquitetura](docs/ARCHITECTURE.md). Para implementar um provedor novo, consulte [Guia de provedores](docs/PROVIDERS.md). As regras textuais estão em [Normalização](docs/NORMALIZATION.md), e as orientações para contribuir estão em [CONTRIBUTING.md](CONTRIBUTING.md).

## 🔌 API em uma página

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/health` | Verificação de saúde |
| `GET` | `/api/v1/providers` | Catálogo de fontes integradas |
| `GET` | `/api/v1/liturgy/today` | Liturgia corrente |
| `GET` | `/api/v1/liturgy/YYYY-MM-DD` | Consulta por data |
| `GET` | `/api/v1/liturgy?date=YYYY-MM-DD` | Consulta por query string |
| `GET` | `/api/v1/saint-of-the-day` | Santo do dia, biografia, oração e imagem resolvida |

Parâmetros completos, exemplos de resposta e códigos HTTP estão em [docs/API.md](docs/API.md).

### Santo do dia e resolução de imagem

```bash
# Santo do dia com tentativa automática de imagem
curl "http://localhost:3000/api/v1/saint-of-the-day"

# Somente dados textuais, sem consultar serviços de imagem
curl "http://localhost:3000/api/v1/saint-of-the-day?image=none"

# Ignorar cache e repetir a consulta upstream e a busca de imagem
curl "http://localhost:3000/api/v1/saint-of-the-day?refresh=true"

# Somente texto pronto para TTS, com normalização editorial
curl "http://localhost:3000/api/v1/saint-of-the-day?format=tts&mode=editorial&image=none"

# Texto original para exibição/auditoria
curl "http://localhost:3000/api/v1/saint-of-the-day?format=original&image=none"
```

O resolvedor pesquisa primeiro no Wikimedia Commons, selecionando arquivos raster com dimensões mínimas e descartando formatos vetoriais, GIFs e nomes com indícios de ícone/logotipo. Se não houver resultado utilizável, tenta a miniatura da página correspondente na Wikipédia. A resposta inclui `image.url`, `image.pageUrl`, `image.provider`, `image.license`, `image.artist` e `image.attribution`, quando disponíveis. O cliente deve preservar a atribuição e conferir os termos da licença antes de redistribuir a imagem.

A API também compara a data devolvida pela fonte com a data corrente em `America/Sao_Paulo`. Se houver divergência, mantém o conteúdo para inspeção, mas retorna `isCurrentDate: false` e um aviso em `warnings`; assim, uma resposta antiga não é apresentada silenciosamente como atual.

## 🎙️ Modos de normalização

- **`faithful`** — aplica limpeza tipográfica e expansão de referências, sem paráfrase do corpo das leituras.
- **`editorial`** — ajusta segmentação e pontuação para leitura oral, sem reescrever o conteúdo bíblico.
- **`both`** — entrega as duas representações para comparação ou seleção posterior.

No endpoint de santo, `biography` e `prayer` preservam `original` e `tts`; em `mode=both`, também incluem `versions.faithful` e `versions.editorial`. O campo agregado `tts.spokenText` combina título, biografia, oração e outros santos. O campo `spokenText` é uma composição textual destinada à etapa de TTS. O texto canônico original permanece separado do texto preparado para fala.

## ⚙️ Configuração

As variáveis podem ser definidas no arquivo `.env` (copiado de `.env.example`) ou diretamente no ambiente de execução.

| Variável | Padrão | Função |
|---|---|---|
| `PORT` | `3000` | Porta HTTP |
| `HOST` | `0.0.0.0` | Interface de bind |
| `CACHE_TTL_SECONDS` | `21600` | Tempo de vida do cache |
| `CACHE_MAX_ENTRIES` | `512` | Limite de entradas do cache por processo |
| `UPSTREAM_TIMEOUT_MS` | `12000` | Timeout das chamadas externas |
| `DANCRF_BASE_URL` | URL pública v2 | Endpoint-base Dancrf |
| `CANCAONOVA_URL` | URL comunitária `/cn` | Endpoint corrente Canção Nova |
| `SAINT_OF_DAY_URL` | URL comunitária `/santo-do-dia` | Endpoint do santo do dia |
| `WIKIMEDIA_API_URL` | `https://commons.wikimedia.org/w/api.php` | API de busca do Wikimedia Commons |
| `WIKIPEDIA_SUMMARY_BASE_URL` | `https://pt.wikipedia.org/api/rest_v1/page/summary` | Fallback de miniatura da Wikipédia |
| `IMAGE_LOOKUP_TIMEOUT_MS` | `9000` | Timeout de cada consulta de imagem |
| `CORS_ORIGIN` | `*` | Origem permitida pelo CORS |

O carregamento opcional de `.env` é feito pelo recurso nativo `--env-file-if-exists` do Node.js. Não coloque credenciais ou segredos no repositório.

## 🧪 Testes e qualidade

```bash
npm test       # suíte automatizada
npm run check  # verificação sintática + testes
npm run dev    # reinício automático durante desenvolvimento
```

Os testes cobrem normalização, provedores, roteamento, calendário, geração de legendas e pipeline de áudio. O pipeline de áudio é exercitado com um sintetizador simulado e FFmpeg real; isso valida montagem, medição, cache e serialização, mas não substitui uma prova acústica com o modelo Piper Faber real. Os provedores externos também não são chamados na suíte.

O GitHub Actions executa a suíte em Node.js 22 e 24 a cada push e pull request.

## 🚀 Deploy

### Render ou Railway

- Runtime: Node.js 22.9+.
- Build command: `npm install` (não há dependências externas; pode ser omitido se a plataforma permitir).
- Start command: `npm start`.
- Health check: `/health`.
- Porta: utilizar a variável `PORT` fornecida pela plataforma.

### Docker

```bash
docker build -t liturgia-tts-api .
docker run --rm -p 3000:3000 \
  -v "$PWD/models:/models:ro" \
  -v "$PWD/var/audio:/app/var/audio" \
  liturgia-tts-api
```

Para configurações específicas, injete as variáveis de ambiente no container. O `.env` local não é copiado para a imagem.

## ⚠️ Limitações conhecidas

1. As fontes Canção Nova dependem de uma API comunitária de terceiros, não de um serviço oficial operado pela Canção Nova.
2. A rota `/cn` fornece apenas a liturgia corrente; consultas por data são encaminhadas à Dancrf.
3. O endpoint de santo do dia pode devolver uma data divergente; a API sinaliza a inconsistência, mas não corrige o conteúdo upstream.
4. A imagem é uma correspondência automatizada por nome, não uma validação iconográfica ou histórica.
5. A licença e a autoria podem não estar disponíveis em todos os resultados; o consumidor deve consultar a página de origem.
6. A disponibilidade e o contrato das APIs externas podem mudar sem aviso.
7. O cache é volátil, local ao processo e não compartilhado entre instâncias; possui TTL e limite máximo de entradas.
8. O motor de áudio requer Piper, modelo ONNX, FFmpeg e FFprobe instalados; a imagem Docker instala o runtime Piper, mas o modelo de voz deve ser montado em `/models`.
9. A sincronização das legendas é por frase/segmento, não por palavra. O alinhamento lexical exige um alinhador forçado ou timestamps fonéticos.
10. O calendário calcula o ciclo temporal do Calendário Romano Geral, mas não substitui o Diretório Litúrgico oficial da CNBB nem calendários próprios locais.
11. A conversão de números no corpo das leituras não é indiscriminada, para evitar alteração semântica de versículos e passagens.
12. A suíte automatizada não valida disponibilidade real dos provedores externos nem a qualidade acústica de uma voz real.

## 🗺️ Próximos incrementos sugeridos

- Alinhamento forçado palavra a palavra para legendas (por exemplo, com timestamps fonéticos).
- Cache persistente e estratégia de invalidação por provedor/data.
- Contratos versionados e fixtures de respostas reais anonimizadas.
- Observabilidade com logs estruturados, métricas e tracing.
- Rate limiting e políticas de proteção para exposição pública.
- OpenAPI/Swagger para documentação interativa.

Consulte também [docs/CALENDAR.md](docs/CALENDAR.md), [docs/AUDIO.md](docs/AUDIO.md) e [docs/API.md](docs/API.md) para contratos e limitações.

## 📚 Fontes de dados

- [Dancrf — liturgia-diaria](https://github.com/Dancrf/liturgia-diaria) · [Documentação v2](https://github.com/Dancrf/liturgia-diaria/blob/main/docs/v2/README.md)
- [API comunitária Canção Nova — endpoint `/cn`](https://github.com/JosueSantos/api_liturgia_diaria)

## ⚖️ Direitos autorais e responsabilidade

Este software é uma camada técnica de integração. Seu código não concede licença para reproduzir, redistribuir ou comercializar textos litúrgicos, traduções bíblicas, gravações ou áudios derivados. Verifique os direitos, termos de uso, atribuição e permissões aplicáveis a cada conteúdo e provedor antes de publicar ou redistribuir resultados.

## 🤝 Contribuição

Contribuições são bem-vindas. Leia [CONTRIBUTING.md](CONTRIBUTING.md), [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) e [SECURITY.md](SECURITY.md) antes de abrir um pull request.

---

<div align="center">

**Feito para transformar dados litúrgicos em uma experiência de escuta consistente.**

</div>
