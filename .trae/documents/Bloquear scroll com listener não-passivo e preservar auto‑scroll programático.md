## Problema
- Mesmo com Modo Mover ON, o scroll nativo ainda ocorre durante o drag.
- Precisamos bloquear gestos de scroll durante o drag sem impedir o auto‑scroll programático.

## Correção
1. Listener global não‑passivo
- Adicionar `document.addEventListener('touchmove', handler, { passive: false })` e `document.addEventListener('wheel', handler, { passive: false })` para chamar `e.preventDefault()` quando `isDragging` estiver ativo.
- Isso bloqueia o scroll nativo disparado pelo gesto, mas não bloqueia `window.scrollBy` ou scroll programático.

2. Remover `overflow='hidden'` no início do drag
- Evitar `document.body.style.overflow='hidden'`, que impede o auto‑scroll programático vertical.
- Manter `touchAction='none'` e `overscrollBehavior='contain'` no container para reduzir elasticidade.

3. Aplicação
- Atualizar `handleMobileTouchMove` (no início do drag) para não setar `overflow='hidden'`.
- Adicionar o `useEffect` que registra/remover os listeners com dependência `isDragging`.

## Testes
- Com Modo Mover ON, ao arrastar, a página não rola; auto‑scroll ativa nas bordas.
- Com Modo Mover OFF, duplo toque abre edição normalmente.

## Risco
- Listeners globais precisam ser removidos corretamente; será feito no cleanup do `useEffect`.