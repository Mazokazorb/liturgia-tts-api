# Changelog

Mudanças relevantes do projeto são registradas neste arquivo.

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
