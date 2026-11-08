# Guia de desenvolvimento

## Ambiente

- Node.js 22.9+.
- Git.
- Editor com suporte a JavaScript moderno (ES Modules).

O projeto utiliza APIs nativas do Node.js: `fetch`, `AbortSignal.timeout`, `node:http`, `node:test` e carregamento de `.env` por `--env-file-if-exists`.

## Comandos

```bash
npm test
npm run check
npm run dev
npm start
```

## Convenções

- Utilize ES Modules (`import`/`export`).
- Prefira funções pequenas e puras para regras de domínio.
- Não introduza dependências para tarefas cobertas adequadamente pela biblioteca padrão.
- Mantenha nomes de campos do modelo canônico estáveis.
- Não registre corpos integrais de leituras em logs de produção.
- Propague erros upstream com contexto suficiente, sem expor segredos ou cabeçalhos sensíveis.
- Toda nova regra de normalização deve vir acompanhada de testes positivos e negativos.

## Adicionando um provedor

1. Crie `src/providers/nome-do-provedor.js`.
2. Implemente uma função assíncrona que consulta o upstream com timeout.
3. Implemente um canonicalizador em `src/normalization/`.
4. Registre ambos em `src/providers/index.js`.
5. Atualize o catálogo público de provedores.
6. Defina a elegibilidade do provedor em `src/core/routing.js`, se necessário.
7. Documente limites, atribuição e formato upstream em `docs/PROVIDERS.md`.
8. Adicione fixtures representativas e testes automatizados.

Não faça scraping novo sem verificar os termos de uso, permissões e estabilidade da fonte.

## Alterando a normalização

- Preserve `raw` para diagnóstico interno, sem expô-lo indiscriminadamente na resposta pública.
- Mantenha `reference` separado de `text`.
- Mantenha `opening`, `refrain` e `closing` quando presentes.
- Não converta números do corpo de forma global.
- Compare `faithful` e `editorial` em testes com textos que contenham abreviações, citações, versículos, pontuação e símbolos litúrgicos.

## Testes de integração

Os testes unitários não dependem da internet. Para validar um upstream, execute uma consulta manual e registre o resultado esperado como fixture estática, respeitando os direitos do conteúdo. Não torne a suíte principal dependente da disponibilidade de terceiros.

## Pull requests

Inclua contexto, motivação, comportamento anterior/novo, testes executados, impacto no contrato HTTP e eventuais mudanças documentais. Alterações no formato de resposta devem ser tratadas como mudanças de contrato e documentadas antes do merge.
