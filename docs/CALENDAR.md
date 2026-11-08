# Calendário litúrgico

O módulo `src/calendar/roman-calendar.js` calcula datas móveis pelo computus gregoriano (algoritmo de Meeus/Jones/Butcher) e fornece uma visão temporal simplificada do Calendário Romano Geral.

## Endpoints

- `GET /api/v1/calendar/today`
- `GET /api/v1/calendar/date/YYYY-MM-DD`
- `GET /api/v1/calendar/year?year=2026`

## Dados retornados

- tempo litúrgico e intervalo estimado;
- cor litúrgica de referência;
- ano litúrgico;
- ciclo dominical A/B/C;
- ciclo ferial I/II;
- data da Páscoa;
- datas móveis principais: Quarta-feira de Cinzas, Ramos, Tríduo, Páscoa, Pentecostes, Santíssima Trindade e Corpus Christi.

## Limites de autoridade

Este módulo calcula o ciclo temporal e não substitui o Diretório Litúrgico oficial da CNBB. Não modela integralmente calendários nacionais, diocesanos, próprios de ordens religiosas, transferências de solenidades, precedências, memórias facultativas ou todas as exceções do Missal Romano. Para uso litúrgico oficial, deve-se integrar uma fonte normativa versionada e identificada.
