## Problema
- Importação falha ao gravar em `firebase:/locations` por IDs com caracteres inválidos (ex.: `loc_1_1_7_102 ret.` contém `.`), pois Firebase não permite `.` `#` `$` `[` `]` em paths.

## Solução Técnica
1. **Criar util de sanitização**
- Função `sanitizeKeySegment(str)` que:
  - Substitui `[.#$[]]` por `_`.
  - Converte espaços em `_` e faz `trim()`.
  - Garante string não vazia.

2. **Aplicar sanitização nos pontos de escrita**
- `applyBackupToFirebase`: gerar `locationId = loc_{shelfId}_{row}_{col}_{sanitize(color.code)}`.
- `saveLocationToFirebase` e `saveProductToFirebase`: usar a mesma sanitização ao compor `locationId`.
- Não alterar os valores armazenados de `color`/`sku` no payload (mantém dados originais); apenas sanitizar o ID.

3. **Relatório de importação**
- Durante Dry-Run, detectar e contabilizar segmentos sanitizados (ex.: cores com `.` ou espaço) e exibir um resumo com total de ajustes.
- Opcional: listar primeiros exemplos mapeados (ex.: `"102 ret." -> "102_ret_"`).

4. **Validação e segurança**
- Garantir que `shelfId`, `row`, `col` sejam números válidos; fallback para `0` se necessário.
- Pausas leves por lote para evitar sobrecarga de escrita.

5. **Verificação pós-import**
- Recalcular totalizadores e confirmar que dispositivos recebem as mudanças via listeners do Firebase.

## Execução
- Implementar `sanitizeKeySegment` e aplicar nas três funções de escrita.
- Adicionar contagem de sanitizações no resumo do Dry-Run.
- Testar com o seu `.json` que contém `"102 ret."` (deve passar).

## Confirmação
- Posso aplicar estes ajustes agora para concluir a importação sem erros e manter compatibilidade com o restante do app.