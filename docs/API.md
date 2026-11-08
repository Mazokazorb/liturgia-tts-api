# Referência da API HTTP

Base local: `http://localhost:3000`  
Formato: JSON UTF-8  
Versão: `/api/v1`

## `GET /health`

Retorna o estado do processo. Não verifica a disponibilidade dos provedores externos.

Resposta `200`:

```json
{
  "status": "ok",
  "service": "liturgia-tts-api",
  "version": "1.5.0"
}
```

## `GET /api/v1/providers`

Retorna o catálogo de provedores e suas funções.

## `GET /api/v1/saint-of-the-day`

Consulta a fonte comunitária `/santo-do-dia`, canonicaliza os campos do santo, prepara biografia e oração para TTS usando o mesmo motor textual da liturgia e tenta obter uma imagem representativa. A imagem não é copiada para o servidor: a resposta contém uma URL pública e metadados de origem. A normalização TTS não gera arquivo de áudio; ela entrega texto pronto para um sintetizador como Piper.

### Parâmetros

| Parâmetro | Valores | Padrão | Descrição |
|---|---|---|---|
| `image` | `auto`, `none` | `auto` | `auto` tenta resolver imagem; `none` retorna apenas conteúdo textual |
| `refresh` | `true`, `false` | `false` | `true` ignora o cache de dados e imagem |
| `format` | `original`, `tts`, `both` | `both` | Seleciona texto original, texto normalizado ou ambos |
| `mode` | `faithful`, `editorial`, `both` | `both` | Variante de normalização; em `both`, `tts` usa `editorial` como seleção padrão e `versions` expõe as duas variantes |
| `voice` | string (1–80 caracteres) | `faber` | Identificador de voz para consumo posterior; não executa síntese de áudio |

### Exemplo

```bash
curl "http://localhost:3000/api/v1/saint-of-the-day"
curl "http://localhost:3000/api/v1/saint-of-the-day?image=none"
curl "http://localhost:3000/api/v1/saint-of-the-day?format=tts&mode=editorial&image=none"
curl "http://localhost:3000/api/v1/saint-of-the-day?format=original&image=none"
```

### Estrutura de resposta

```json
{
  "date": "2026-11-08",
  "requestedDate": "2026-11-08",
  "isCurrentDate": true,
  "title": "Santo do dia",
  "biography": {
    "original": "<p>Texto biográfico...</p>",
    "tts": "Texto biográfico...",
    "versions": { "faithful": "Texto biográfico...", "editorial": "Texto biográfico..." }
  },
  "prayer": {
    "original": "Oração opcional...",
    "tts": "Oração opcional...",
    "versions": { "faithful": "Oração opcional...", "editorial": "Oração opcional..." }
  },
  "otherSaints": [{ "original": "São Exemplo", "tts": "São Exemplo", "versions": { "faithful": "São Exemplo", "editorial": "São Exemplo" } }],
  "tts": { "voice": "faber", "mode": "both", "selectedMode": "editorial", "spokenText": "Santo do dia. Texto biográfico..." },
  "normalization": { "format": "both", "mode": "both", "voice": "faber" },
  "source": { "name": "Canção Nova", "url": "https://api-liturgia-diaria.vercel.app/santo-do-dia" },
  "image": {
    "status": "found",
    "url": "https://upload.wikimedia.org/...",
    "pageUrl": "https://commons.wikimedia.org/wiki/File:...",
    "provider": "wikimedia_commons",
    "license": "CC BY-SA ...",
    "artist": "Autor identificado",
    "attribution": "Autor · crédito · licença"
  },
  "cached": false,
  "warnings": []
}
```

Os valores acima são ilustrativos. Com `format=original`, cada campo textual contém apenas `original` e o objeto agregado `tts` é omitido. Com `format=tts`, os campos contêm apenas `tts` (e `versions` quando `mode=both`). `image.status` pode ser `found`, `not_found` ou `skipped`. A busca prioriza Wikimedia Commons; a Wikipédia é fallback. A URL `image.url` é uma miniatura adequada para exibição, enquanto `image.originalUrl` aponta para o arquivo original quando fornecido. `image.pageUrl` deve ser mantida como referência de autoria/licença.

`isCurrentDate: false` indica que a fonte devolveu uma data diferente da data solicitada no fuso `America/Sao_Paulo`. A API mantém o conteúdo para diagnóstico, mas inclui um aviso em `warnings`; clientes podem optar por não exibi-lo como conteúdo corrente.

## `GET /api/v1/liturgy/today`

Consulta a data corrente em `America/Sao_Paulo`.

## `GET /api/v1/liturgy/YYYY-MM-DD`

Consulta uma data explícita. Datas inexistentes ou fora do formato ISO 8601 retornam `400`.

## `GET /api/v1/liturgy?date=YYYY-MM-DD`

Forma equivalente à rota por segmento, útil para clientes que preferem query string.

## Parâmetros

| Parâmetro | Valores | Padrão | Descrição |
|---|---|---|---|
| `date` | `YYYY-MM-DD` | Hoje no fuso de São Paulo | Data litúrgica solicitada; usado quando a rota não contém data |
| `source` | `auto`, `dancrf`, `cancaonova`, `both` | `auto` | Provedor ou estratégia de consulta |
| `mode` | `faithful`, `editorial`, `both` | `both` | Variante de normalização |
| `output` | `continuous`, `sections`, `both` | `both` | Organização do roteiro |
| `voice` | string | `faber` | Identificador de perfil de voz a ser consumido por etapa posterior |

## Exemplos

```bash
# Hoje, seleção automática
curl "http://localhost:3000/api/v1/liturgy/today"

# Data histórica, somente texto fiel e saída por seção
curl "http://localhost:3000/api/v1/liturgy/2026-11-01?mode=faithful&output=sections"

# Duas fontes para hoje
curl "http://localhost:3000/api/v1/liturgy/today?source=both"

# Consulta via query string
curl "http://localhost:3000/api/v1/liturgy?date=2026-11-01&source=dancrf"
```

## Estrutura da resposta de liturgia

A resposta contém:

- `date`: data solicitada;
- `requestedSource`: valor informado em `source`;
- `normalization`: modo, saída e identificador de voz solicitados;
- `routing`: estratégia de roteamento, fonte selecionada e justificativa;
- `results`: dados normalizados de cada fonte que respondeu;
- `errors`: falhas individuais de provedores;
- `note`: observação opcional sobre comparação de fontes.

Cada entrada em `results` inclui metadados do provedor, `sectionCount`, `warnings` e `tts`. O campo `tts` contém `voice`, `modes`, `sections` e, conforme `output`, `continuous`.

### Exemplo reduzido de `tts`

```json
{
  "voice": "faber",
  "modes": ["faithful", "editorial"],
  "sections": [
    {
      "index": 0,
      "type": "first_reading",
      "label": "Primeira leitura",
      "pauseAfterMs": 1300,
      "versions": {
        "faithful": {
          "title": "Primeira leitura",
          "reference": "Primeiro Reis, capítulo dezessete, versículos dez ao dezesseis",
          "opening": "",
          "text": "Leitura do Primeiro Livro dos Reis...",
          "refrain": "",
          "closing": "Palavra do Senhor. Graças a Deus.",
          "spokenText": "Primeira leitura. Primeiro Reis..."
        }
      }
    }
  ],
  "continuous": {
    "faithful": "Primeira leitura...",
    "editorial": "Primeira leitura..."
  }
}
```

O exemplo é ilustrativo e reduzido; a quantidade de seções e os campos disponíveis dependem do provedor e do dia litúrgico.

## Códigos HTTP

| Código | Significado |
|---|---|
| `200` | Pelo menos um provedor retornou dados |
| `204` | Preflight CORS (`OPTIONS`) |
| `400` | Data ou parâmetro inválido |
| `404` | Rota ou método não reconhecido |
| `409` | Canção Nova foi solicitada para uma data que não é a corrente |
| `502` | Nenhum provedor solicitado conseguiu retornar dados ou a fonte de santos falhou |
| `500` | Erro interno não tratado |

Em `source=both`, uma fonte pode falhar e a outra responder. Nesse caso, a API retorna `200`, os dados disponíveis em `results` e as falhas individuais em `errors`. Se todos os provedores falharem, a API preserva um status HTTP de cliente relevante (por exemplo, `409` para data incompatível com Canção Nova); nos demais casos, retorna `502`.

## Considerações de consumo

- Não assuma que a ordem ou quantidade de seções é idêntica entre provedores.
- Não una respostas de fontes diferentes sem uma política explícita de reconciliação.
- Use `routing.selectedProvider` para registrar a origem efetivamente consultada.
- `voice` é metadado; não dispara uma síntese de áudio nesta versão.
