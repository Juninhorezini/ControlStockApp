## Objetivo
- Importar um backup `.json` do app original para o app atual, persistindo dados no Firebase e garantindo que todos os dispositivos sincronizem automaticamente.

## Diagnóstico Atual
- Export/Import de backup existem em `src/App.js`:
  - `exportBackup` (src/App.js:1071) exporta `shelves`, `products`, `securitySettings`, `userNames`.
  - `importBackup` (src/App.js:1098) apenas atualiza estados locais via `setShelves`, `setProducts`, etc.; não grava no Firebase.
- O app usa o Firebase como fonte da verdade:
  - `locations` alimenta o estado `products` (carga inicial e listeners) em `src/App.js:1449-1476`.
  - `shelves` vêm de `onValue` em `src/App.js:1433-1444`.
- Conclusão: Restaurar apenas estados locais não propaga para outros dispositivos; é necessário gravar no Firebase.

## Plano Técnico
1. **Validação de Backup**
- Ler e validar `version`, `timestamp`, `data` e campos obrigatórios.
- Gerar um sumário: contagem de `shelves`, `products` (por local e por cor), e possíveis lacunas.

2. **Modo Dry-Run (Simulação)**
- Mostrar ao usuário o impacto: itens a criar/atualizar/remover.
- Não escrever nada; apenas relatório.

3. **Mapeamento de Estruturas**
- `shelves` → `firebase:/shelves` como objeto indexado por `id`.
- `products` (chaves `shelfId-row-col`) → `firebase:/locations` como registros por cor:
  - Estrutura sugerida do registro: `{ shelf: { id, corridor?, name? }, position: { row, col }, sku, color, unit, quantity, metadata: { updated_at, updated_by } }`.
- Deduplicação por chave composta: `shelfId-row-col-color`.

4. **Estratégia Merge vs Replace**
- `Replace` (padrão seguro): backup substitui completamente `shelves` e `locations` após gerar backup prévio do estado atual.
- `Merge`: mantém existentes; atualiza onde há colisão e insere novos.

5. **Aplicação de Escrita no Firebase**
- Batches com limitação (ex.: 200 writes por lote) e pequenos `delays` para evitar sobrecarga.
- Popular `metadata.updated_by = 'Importação'` e `updated_at = now` para não gerar histórico indevido.
- Opcional: pausar temporariamente triggers de sincronização com planilha (se necessário) ou ajustar condição de envio.

6. **Sincronização com Dispositivos**
- Clientes conectados receberão atualizações via `onChildAdded/Changed/Removed` automaticamente.
- Após o batch, disparar cálculo de totais (`sendSummaryTotalsDebounced`) para atualizar os totalizadores do App/Planilha.

7. **Rollback e Segurança**
- Exportar backup do estado atual antes de importar (botão já existente).
- Em caso de falhas, reverter aplicando o backup pré-importado.

8. **Observabilidade**
- Logs de progresso (quantos registros processados, tempo total).
- Relatório final com contagens aplicadas e eventuais erros.

## Validações
- Consistência: totais de SKU/cores/quantidade iguais entre backup e dados gravados.
- Integridade: verificar que `products` renderizam corretamente no grid.
- Planilha: checar que totalizadores col B/C batem após sincronização.

## Riscos & Mitigações
- **Schema diferente do app original**: adicionar mapeamentos flexíveis e avisos.
- **Carga grande**: aplicar batch + throttle.
- **Duplicidade**: chaves compostas para identificar registros e normalizar.

## Execução
1. Implementar importação com Dry-Run + escolha Merge/Replace.
2. Testar com backup pequeno.
3. Executar importação completa.
4. Validar totais e sincronização em dispositivos.

## Confirmação
- Posso implementar o importador com validação, dry-run e escrita em batch no Firebase, mantendo a opção de rollback. Confirma que seguimos com este plano?