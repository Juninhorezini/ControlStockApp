## Diagnóstico
- A seleção do destino não dispara porque a lógica de `touchmove` retorna cedo com `draggedProduct` ausente e pode impedir o processamento de hold/cancelamento (está `if (!isMobile || !draggedProduct) return;`).
- Em `touchend`, ainda existe o caminho antigo (executa imediatamente se `moveSourcePosition && !product`), que conflita com o novo fluxo baseado em hold.

## Correções
1. Permitir processamento no Modo Mover
- Em `handleMobileTouchMove`, remover a verificação `|| !draggedProduct` para que o Modo Mover (sem drag) funcione e o cancelamento do hold de destino ocorra com scroll.
- Manter cancelamento do hold de destino quando `distance > 8` ou `velocity > 1.0`.

2. Confirmar destino apenas com hold concluído
- Em `handleMobileTouchEnd`, substituir a lógica antiga por:
  - Se `moveModeEnabled` e `isDestHolding === true` e `destinationCandidate` coincide com a célula vazia, chamar `executeMoveProduct()`; caso contrário, limpar estados e não mover.

3. Estados e feedback
- Garantir estados: `isDestHolding`, `destHoldTimeout`, `destinationCandidate` com cleanup no `resetDragStates`.
- No grid, manter destaque verde (`ring-2 ring-green-500 bg-green-50`) na célula candidata enquanto o hold está em andamento.

4. Tempos de hold
- Origem: 500ms
- Destino: 700ms (ajustável após teste)

## Testes
- Modo Mover ON: selecionar origem por toque; rolar; segurar célula vazia por ~700ms; movimenta e sincroniza.
- Toques de scroll não selecionam destino; hold cancelado ao mover o dedo.
- Modo Mover OFF: duplo toque para editar continua.

## Entrega
- Atualizações nos handlers (`touchstart/move/end`), limpeza de estados e visual do candidato. Vou aplicar essas correções agora.