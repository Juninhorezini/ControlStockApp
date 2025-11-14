## Problema
- Com “Mover” ON, ao rolar até o destino o toque de scroll é interpretado como seleção de destino.
- Deseja maior tempo de press na seleção e melhor destaque visual na célula de destino.

## Objetivos
- Selecionar destino somente com press-and-hold mais longo, ignorando toques usados para scroll.
- Melhorar feedback visual: origem destacada claramente e destino com indicador de “candidato/confirmado”.

## Mudanças Técnicas
1. Times de hold separados
- `HOLD_SOURCE_MS = 500` para origem (ou o valor atual se preferir).
- `HOLD_DEST_MS = 650–800` para destino (mais longo para evitar acidentais).

2. Estados adicionais
- `destHoldTimeout`, `isDestHolding` e `destinationCandidate` (row/col/key) para gerenciar hold em célula vazia.

3. Lógica de seleção de destino
- `handleMobileTouchStart` (Mover ON, célula vazia e origem definida): iniciar `destHoldTimeout` e setar `destinationCandidate`.
- `handleMobileTouchMove`: se `distance > 8` ou `velocity > 1.0`, cancelar `destHoldTimeout` e `isDestHolding = false` (trata como scroll), limpar `destinationCandidate`.
- `handleMobileTouchEnd`: executar `executeMoveProduct()` somente se `isDestHolding === true` e `destinationCandidate` coincide com a célula tocada; caso contrário, ignorar.

4. Feedback visual
- Origem: manter destaque atual.
- Destino candidato (hold em andamento): aplicar classe (ex.: `ring-2 ring-green-500 bg-green-50`) na célula sob hold.
- Dica na UI: “Origem selecionada — mantenha pressionado uma célula vazia para mover”.

5. Segurança
- Reset limpa `destHoldTimeout`, `isDestHolding` e `destinationCandidate`.
- Modo Mover OFF não usa essa lógica; duplo toque para editar permanece.

## Arquivos/Trechos
- `src/App.js`
  - `handleMobileTouchStart` (~2412): iniciar hold destino e candidato.
  - `handleMobileTouchMove` (~2550): cancelar destino em scroll; manter navegação.
  - `handleMobileTouchEnd` (~2628): confirmar destino apenas se hold concluído.
  - Renderização do grid (~2848): aplicar estilo do candidato de destino.
  - Reset de estados (~2388): limpar estados de hold e candidato.

## Testes
- Origem por toque, rolar até destino, manter pressionado célula vazia: move.
- Ao rolar sem segurar, nenhum movimento é disparado.
- Duplo toque para editar funciona com Mover OFF.

## Ajustáveis
- Ajustar `HOLD_DEST_MS` após testes (ex.: 650–800ms).
