# Arquitetura e decisões técnicas

## Objetivo

Manter separadas as responsabilidades de transporte HTTP, seleção de fontes, integração upstream, canonicalização litúrgica e preparação de texto para TTS. O desenho privilegia módulos pequenos e contratos explícitos, evitando acoplamento entre o formato de uma API externa e o formato consumido pelo cliente.

## Fluxo de dados

```text
Requisição HTTP
  → validação da rota e dos parâmetros
  → resolução da data civil em America/Sao_Paulo
  → seleção do(s) provedor(es)
  → cache por provedor + data
  → fetch do JSON upstream
  → canonicalização para o modelo interno
  → construção do payload TTS
  → serialização JSON
```

## Camadas

### `http/`

Responsável pelo protocolo HTTP, parsing de URL, validação de parâmetros e serialização da resposta. Não deve conter regras específicas de leitura bíblica nem detalhes de contratos upstream.

### `core/`

Contém regras transversais e independentes de transporte. `date.js` resolve datas no fuso de referência; `routing.js` determina provedores elegíveis conforme data e preferência do cliente.

### `providers/`

Cada adaptador conhece exclusivamente o contrato de um serviço externo. O catálogo em `providers/index.js` conecta a função de busca ao canonicalizador correspondente. Um adaptador deve devolver `{ provider, providerUrl, raw }` e propagar erros com mensagens operacionais úteis.

### `normalization/`

Transforma respostas heterogêneas em um modelo canônico e cria variantes para leitura oral. Os módulos são separados por responsabilidade: `bible-references.js` expande referências e números; `spoken-text.js` trata a superfície textual oral; `canonicalizers.js` mapeia contratos upstream; `tts-payload.js` monta a estrutura final. `index.js` expõe a fachada pública da camada.

### `cache.js`

Implementa cache em memória com TTL, limite de entradas e política aproximada de LRU. A chave atual combina identificador do provedor e data. O cache não é distribuído e não persiste após reinício.

## Modelo canônico

Cada provedor deve produzir um objeto com, no mínimo:

```js
{
  date: 'DD/MM/YYYY ou valor equivalente da fonte',
  celebration: 'Nome da celebração',
  liturgicalColor: 'Cor litúrgica',
  sections: [
    {
      type: 'first_reading | psalm | second_reading | gospel | prayer | antiphon | extra',
      label: 'Rótulo legível',
      title: 'Título da seção',
      reference: 'Referência original',
      opening: 'Introdução opcional',
      text: 'Corpo textual',
      refrain: 'Refrão opcional',
      closing: 'Conclusão opcional'
    }
  ],
  raw: {} // resposta original, para diagnóstico interno
}
```

Preserve o conteúdo original sempre que possível. Não descarte introduções, respostas litúrgicas ou fórmulas de encerramento apenas porque não fazem parte do corpo principal da leitura.

## Decisões relevantes

1. **Fontes não são fundidas automaticamente.** Diferenças de tradução, pontuação, seleção textual ou atualização podem gerar conteúdo divergente.
2. **Canção Nova `/cn` é corrente.** O roteador evita consultá-la para datas históricas ou futuras.
3. **A data é civil e explicitamente zonada.** Não use o fuso local do servidor para decidir o provedor.
4. **Texto fiel e texto editorial são representações distintas.** A variante editorial não deve parafrasear ou alterar conteúdo bíblico.
5. **Normalização de números é conservadora.** Alterações automáticas dentro do corpo podem corromper numeração de versículos, capítulos ou quantidades.
6. **Falhas parciais são preservadas.** Em consultas a múltiplas fontes, uma falha não elimina o resultado válido da outra.

## Extensibilidade

Novas fontes devem implementar um adaptador, um canonicalizador e um teste de contrato. Integrações de áudio devem consumir o payload TTS sem acoplar Piper à camada HTTP ou aos provedores litúrgicos.
