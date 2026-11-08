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
  "version": "1.3.0"
}
```

## `GET /api/v1/providers`

Retorna o catálogo de provedores e suas funções.

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
| `502` | Nenhum provedor solicitado conseguiu retornar dados |
| `500` | Erro interno não tratado |

Em `source=both`, uma fonte pode falhar e a outra responder. Nesse caso, a API retorna `200`, os dados disponíveis em `results` e as falhas individuais em `errors`. Se todos os provedores falharem, a API preserva um status HTTP de cliente relevante (por exemplo, `409` para data incompatível com Canção Nova); nos demais casos, retorna `502`.

## Considerações de consumo

- Não assuma que a ordem ou quantidade de seções é idêntica entre provedores.
- Não una respostas de fontes diferentes sem uma política explícita de reconciliação.
- Use `routing.selectedProvider` para registrar a origem efetivamente consultada.
- `voice` é metadado; não dispara uma síntese de áudio nesta versão.
