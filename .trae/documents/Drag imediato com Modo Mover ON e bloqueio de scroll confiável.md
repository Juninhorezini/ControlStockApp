## Objetivo
- Com “Mover” ON, substituir o drag contínuo por seleção: press-and-hold na origem → navegar livremente → press-and-hold no destino vazio para concluir a movimentação.

## Mudanças no Código
- Mobile
  - `handleMobileTouchStart`: sempre registra `touchStart`. Com “Mover” ON:
    - Se tocar e segurar uma célula com produto e não houver origem selecionada, define `moveSourcePosition` ao concluir o hold.
    - Se tocar e segurar uma célula vazia e já houver origem, prepara confirmação de destino.
  - `handleMobileTouchMove`: com “Mover” ON, não inicia drag nem bloqueia scroll; mantém a navegação.
  - `handleMobileTouchEnd`: com “Mover” ON:
    - Se foi hold em célula com produto e não havia origem, confirma a seleção de origem.
    - Se foi hold em célula vazia e já há origem, chama `moveProductFromSource` para mover e sincronizar.
- Nova função
  - `moveProductFromSource(targetRow, targetCol)`: usa `moveSourcePosition` para mover o produto, atualiza estado, salva no Firebase (destino e remoção da origem) e sincroniza Sheets, reusando lógica de `moveProduct`.
- UI
  - Destacar a origem selecionada na grid.
  - Desativar modal de movimentação por long‑press quando “Mover” estiver ON.
  - Manter duplo toque para editar quando “Mover” estiver OFF.

## Testes
- Selecionar origem por hold; rolar/alterar prateleira; selecionar destino vazio por hold; produto move e sincroniza.
- Com “Mover” OFF, duplo toque abre edição e não há seleção.

## Riscos
- Overlap com lógicas anteriores de drag/modal. Mitigação: gating estrito por `moveModeEnabled` e limpeza de estados no `resetDragStates`.