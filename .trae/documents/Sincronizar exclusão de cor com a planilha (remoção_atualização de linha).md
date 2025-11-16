## Problema
- Ao remover uma cor de uma localização, o registro sai do Firebase mas a planilha não reflete a remoção/atualização.
- Causa: não há disparo explícito de sincronização por SKU+cor em exclusões; o listener `onChildRemoved` só recalcula totais, e o fluxo de edição tem um bloco vazio para cores removidas.

## Solução Técnica
1. **Fluxo de edição (cores removidas)**
- Implementar a seção “Sincronizar cores removidas”: para cada cor que deixou de existir no produto editado, consultar o Firebase (função existente `fetchLocationsFromFirebase`) e enfileirar `enqueueSheetSync(sku, color, snapshot, lastUpdaterName)`. Se `totalQuantity=0`, o Apps Script apagará a linha.

2. **Listener `onChildRemoved`**
- Ao remover uma `location`, além de atualizar estado e totalizadores, consultar `fetchLocationsFromFirebase` com o `loc.sku`+`loc.color` e enfileirar `enqueueSheetSync` para refletir a remoção/atualização dessa cor na planilha.

3. **Validação**
- Remover uma única cor em uma posição com múltiplas cores:
  - Se ainda existirem outras `locations` com mesma cor → linha da planilha é atualizada com nova quantidade total.
  - Se não existirem → linha é apagada (Apps Script já faz `deleteRow` quando `quantidadeTotal === 0`).

4. **Observabilidade**
- Logs no console para o payload de sync (já existem) e logs de “child removed”.

## Execução
- Atualizar `src/App.js` nos dois pontos descritos (fluxo de edição e listener removed).
- Testar removendo uma cor e verificar a planilha.

## Confirmação
- Posso aplicar estas mudanças agora para que exclusões de cores sincronizem corretamente com a aba "Prateleiras".