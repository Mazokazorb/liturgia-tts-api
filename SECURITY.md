# Política de segurança

## Escopo

Este projeto é uma API HTTP que consulta serviços externos e devolve dados litúrgicos normalizados.

## Reportar vulnerabilidades

Não publique detalhes exploráveis em issues públicas. Até que um canal privado de contato seja configurado pelo mantenedor do repositório, solicite um contato privado ao proprietário do projeto antes de compartilhar detalhes técnicos sensíveis.

## Recomendações de implantação

- Restrinja `CORS_ORIGIN` aos domínios consumidores em produção.
- Adicione rate limiting antes de expor o serviço publicamente.
- Use proxy reverso com TLS.
- Não exponha detalhes internos de exceções em ambientes públicos.
- Defina limites de requisição e monitore latência/falhas dos upstreams.
- Não versione `.env`, tokens, credenciais ou dados pessoais.
- Avalie autenticação caso a API seja consumida por clientes privados.

A configuração padrão é voltada a desenvolvimento e não representa, isoladamente, um hardening completo para produção.
