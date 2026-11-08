# Regras de normalização textual

## Objetivo

Preparar conteúdo litúrgico para motores TTS sem confundir tratamento de apresentação com alteração editorial do texto-fonte.

## Modos

### `faithful`

Aplica normalização tipográfica, remoção de símbolos sem representação oral direta, expansão de abreviações em referências e composição do texto falado. Não tem como objetivo parafrasear o corpo da leitura.

### `editorial`

Aplica os ajustes do modo fiel e regras adicionais de segmentação e pontuação para favorecer prosódia e inteligibilidade. Não deve introduzir, remover ou reinterpretar conteúdo doutrinário ou bíblico.

### `both`

Gera as duas variantes em paralelo, mantendo os campos separados. O consumidor pode selecionar qual versão enviar ao motor TTS.

## Estrutura por seção

Cada seção canônica pode conter:

- `title`: título da seção;
- `reference`: referência bíblica expandida para pronúncia;
- `opening`: introdução ou fórmula de proclamação;
- `text`: corpo textual;
- `refrain`: refrão, quando aplicável;
- `closing`: resposta ou fórmula de encerramento;
- `spokenText`: concatenação ordenada dos campos pronunciáveis.

A API mantém também a seção canônica original, para permitir auditoria e evolução das regras sem perder a informação recebida.

## Pausas

`pauseAfterMs` fornece uma sugestão de intervalo após a seção. Os valores são heurísticos e não representam rubrica litúrgica oficial. O cliente de áudio pode ajustar a duração conforme voz, velocidade e desenho de produção.

## Referências bíblicas e números

As abreviações conhecidas são expandidas para nomes de livros e os números de referências são convertidos por extenso dentro do escopo reconhecido. A tabela numérica atual cobre zero a cem; valores fora desse intervalo permanecem em representação numérica.

Não converta indiscriminadamente todos os números do corpo da leitura. Eles podem indicar versículos, capítulos, datas, quantidades ou parte integrante da tradução. Uma regra segura exige contexto sintático e corpus de testes.

## Critérios para novas regras

1. Preservar o texto-fonte.
2. Evitar substituições globais ambíguas.
3. Diferenciar referência bíblica de corpo textual.
4. Cobrir acentos, abreviações, pontuação e casos-limite em testes.
5. Comparar a saída falada com a fonte original por revisão humana.


## Conteúdo hagiográfico (santo do dia)

O endpoint `/api/v1/saint-of-the-day` reutiliza `normalizeSpokenText` e não mantém um segundo conjunto de regras. `biography` e `prayer` preservam `original` e fornecem `tts`; quando `mode=both`, `versions.faithful` e `versions.editorial` permitem comparar as duas estratégias. O campo simples `tts` seleciona `faithful` quando esse modo foi solicitado e `editorial` nos modos `editorial` ou `both`.

O normalizador remove blocos `script`/`style`, tags HTML e decodifica entidades HTML comuns e numéricas antes da preparação oral. O conteúdo original permanece intacto para exibição e auditoria. `otherSaints` recebe o mesmo tratamento e `tts.spokenText` agrega título, biografia, oração e nomes adicionais em uma sequência pronta para o sintetizador.

Parâmetros do endpoint:

- `format=both` (padrão): retorna `original` e `tts`.
- `format=original`: retorna somente a fonte original, sem o objeto agregado `tts`.
- `format=tts`: retorna somente o texto normalizado.
- `mode=faithful|editorial|both`: seleciona a estratégia textual.
- `voice=faber`: identifica a voz pretendida; não invoca Piper nem produz WAV/MP3.

A normalização é uma transformação textual determinística, não uma revisão teológica ou histórica. Nomes próprios, termos hagiográficos e formulações doutrinárias devem ser conferidos em revisão humana antes de publicação em áudio.
