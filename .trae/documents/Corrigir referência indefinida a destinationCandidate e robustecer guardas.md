## Problema
- Erro em runtime: `destinationCandidate is not defined` ao ativar Modo Mover, vindo de `src/App.js:2896` na expressão de classe.

## Correções
1. Declarar estados faltantes
- Adicionar estados no topo do componente:
  - `const [isDestHolding, setIsDestHolding] = useState(false)`
  - `const [destHoldTimeout, setDestHoldTimeout] = useState(null)`
  - `const [destinationCandidate, setDestinationCandidate] = useState(null)`

2. Robustecer guardas no render
- Na expressão de classe que usa `destinationCandidate`, proteger com verificações e `currentShelf?.id`:
  - Só aplicar destaque se: `moveModeEnabled && !product && destinationCandidate && destinationCandidate.shelfId === (currentShelf?.id) && destinationCandidate.row === row && destinationCandidate.col === col`

3. Cleanup correto
- Garantir limpeza de `destHoldTimeout`, `isDestHolding` e `destinationCandidate` em `resetDragStates`.

4. Verificação rápida
- Rodar para garantir que clicar “Mover” não dispara erro e que destaque aparece quando em hold do destino.

## Entrega
- Atualizar `src/App.js` com estados e guardas; sem alterar demais a lógica atual.
