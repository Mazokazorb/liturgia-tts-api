# Catálogo de provedores

## Dancrf — liturgia-diaria v2

- **Identificador interno:** `dancrf`
- **Função:** consultas por datas específicas.
- **Endpoint-base:** `https://liturgia.up.railway.app/v2/`
- **Parâmetros:** `dia`, `mes`, `ano`.
- **Projeto/documentação:** https://github.com/Dancrf/liturgia-diaria
- **Limites:** disponibilidade, cobertura de datas e contrato dependem do mantenedor upstream.

O adaptador converte a data ISO recebida pelo serviço em parâmetros numéricos e retorna a resposta JSON original ao canonicalizador Dancrf.

## Canção Nova — API comunitária

- **Identificador interno:** `cancaonova`
- **Função:** liturgia corrente.
- **Endpoint utilizado:** `https://api-liturgia-diaria.vercel.app/cn`
- **Projeto:** https://github.com/JosueSantos/api_liturgia_diaria
- **Limite estrutural:** `/cn` retorna a liturgia corrente e não aceita data histórica como parâmetro.
- **Natureza:** serviço comunitário de terceiros; não é API oficial operada pela Canção Nova.

O adaptador valida `today.date` e compara a data retornada com a solicitada. Se não houver correspondência, gera conflito (`409`) em vez de entregar conteúdo de outra data.

## Regras para adicionar fontes

- Registre URL, mantenedor, licença/termos e limitações conhecidas.
- Informe se o endpoint suporta data, intervalo ou somente conteúdo corrente.
- Use timeout e tratamento de status HTTP.
- Não dependa de HTML quando existir campo textual estruturado.
- Preserve a resposta original para canonicalização e diagnóstico interno.
- Não combine automaticamente fontes com textos divergentes.
