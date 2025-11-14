## Problema
- O drag-and-drop móvel dispara com facilidade ao tentar rolar lateral/vertical, e o long-press abre o modal indevidamente.

## Objetivos
- Reduzir sensibilidade do DnD em mobile.
- Priorizar scroll natural; só iniciar drag com intenção clara.
- Evitar que long-press abra modal quando houve movimento.

## Ajustes Técnicos
1. Aumentar o tempo de long-press
- Alterar o timer de hold de 400ms para ~650ms: `src/App.js:2417-2423`.

2. Cancelar hold ao detectar movimento antes do hold
- Em `handleMobileTouchMove`, se `!isHolding` e `distance > 8px` antes do tempo de hold, cancelar `holdTimeout` e permitir scroll: `src/App.js:2475-2511`.

3. Aumentar o limiar para iniciar drag e exigir direção predominante
- Mudar `distance > 10` para `distance > 20` para iniciar drag: `src/App.js:2494-2496`.
- Somente iniciar drag se `Math.abs(deltaX) >= Math.abs(deltaY) * 1.5` (movimento predominante horizontal), caso contrário tratar como scroll.

4. Lock de eixo e prevenção de modal indevido
- Se `Math.abs(deltaY) > Math.abs(deltaX) * 1.2`, cancelar drag (scroll vertical).
- Abrir modal de movimento apenas se long-press terminou e `distance < 6px`: `src/App.js:2558-2561`.

5. TouchAction direcionado
- Em vez de bloquear `document.body`, aplicar `container.style.touchAction = 'pan-y'` durante interação para favorecer rolagem vertical; só usar `'none'` quando drag iniciar: `src/App.js:2498-2502`.

6. Feedback
- Vibração apenas quando drag realmente inicia; remover vibração no hold.

## Opções adicionais (se desejar)
- Ativar “Modo Mover” via toggle: só permite drag quando ativo.
- Adicionar um “handle” de arraste no card; somente o handle inicia drag.

## Testes
- Arrastar lateral e vertical sem iniciar drag.
- Long-press sem movimento: abre modal; com movimento: não abre.
- Drag inicia apenas após 650ms de hold + 20px de deslocamento horizontal predominante.

## Riscos
- Limiar muito alto pode tornar drag difícil; ajustar após teste (ex.: 600–700ms e 16–24px).

## Próximo passo
- Implementar os ajustes nas funções `handleMobileTouchStart`, `handleMobileTouchMove`, `handleMobileTouchEnd` e nos estilos aplicados durante a interação, sem alterar o DnD desktop.