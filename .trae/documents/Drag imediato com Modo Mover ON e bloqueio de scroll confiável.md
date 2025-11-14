## Problema
- Com “Mover” ON, a seleção não está ocorrendo de forma confiável via press‑and‑hold.

## Ajustes Propostos
- Origem imediata:
  - Com “Mover” ON, ao tocar uma célula com produto, selecionar origem imediatamente (sem aguardar 500ms) e destacar visualmente.
  - Manter um hold curto (250ms) apenas se preferir evitar toques acidentais, mas priorizar a seleção imediata.
- Destino simples:
  - Com origem definida, ao soltar (touchend) sobre uma célula vazia, mover imediatamente para o destino atual.
  - Alternativa: permitir hold curto de 250ms como confirmação, se desejar.
- UI/Feedback:
  - Destacar origem selecionada na grid (ring/estilo).
  - Mensagem breve de “Origem selecionada — toque na célula vazia para mover”.
- Comportamento do modo:
  - “Mover” OFF: mantém duplo toque para edição; não seleciona origem.
  - “Mover” ON: desativa modal de movimentação por long‑press e habilita esse novo fluxo.

## Implementação Técnica
- `handleMobileTouchStart`: com “Mover” ON, se `product`, definir `moveSourcePosition` imediatamente e destacar.
- `handleMobileTouchEnd`: com “Mover” ON e origem definida, se a célula destino está vazia, executar `executeMoveProduct()` usando prateleira atual e posição tocada.
- Remover dependências de `isHolding` para seleção/movimento nesse fluxo.
- Garantir condição de destaque na renderização quando `moveSourcePosition` coincide com célula atual.

## Testes
- Origem → navegar → destino vazio (toque) move produto e sincroniza.
- “Mover” OFF: duplo toque abre edição; nenhum movimento por seleção.

## Risco
- Seleção imediata pode pegar toques acidentais; mitigável com janela de cancelamento tocando na origem novamente para desfazer.

Deseja que eu aplique esses ajustes agora?