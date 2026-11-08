# Como contribuir

Obrigado por considerar uma contribuição para a Liturgia TTS API.

## Antes de começar

1. Leia `README.md` e `docs/ARCHITECTURE.md`.
2. Confira se a alteração já foi discutida em uma issue.
3. Para mudanças de fonte externa, consulte `docs/PROVIDERS.md` e verifique termos de uso e direitos de reprodução.

## Fluxo recomendado

1. Crie uma branch descritiva a partir da branch principal.
2. Faça uma alteração focada, evitando refatorações não relacionadas.
3. Adicione ou atualize testes em `test/`.
4. Execute `npm run check`.
5. Atualize a documentação e o `CHANGELOG.md` quando houver mudança funcional.
6. Abra um pull request com descrição do problema, solução e validação.

## Critérios de aceite

- A suíte automatizada passa.
- A resposta HTTP permanece compatível ou a quebra está explicitamente documentada.
- Regras de roteamento consideram o fuso `America/Sao_Paulo`.
- A normalização não altera semanticamente o conteúdo bíblico.
- Nenhum segredo, token ou arquivo `.env` é incluído no commit.
- Alterações de provedores incluem tratamento de timeout e erros upstream.

## Estilo

Use JavaScript moderno, ES Modules, nomes explícitos e funções coesas. Evite dependências externas sem justificativa técnica. Comentários devem explicar decisões ou restrições, não repetir o código.
