## Objetivo

* Reproduzir o comportamento original: ao iniciar o drag com movimento para baixo, travar o scroll nativo e usar apenas auto‑scroll programático nas bordas.

## Mudanças

1. Início do drag independente do eixo

* Em `handleMobileTouchMove`, quando `isHolding && distance > 20`, iniciar drag mesmo com movimento vertical predominante (remover a exigência de eixo horizontal).

* No início do drag, aplicar `touchAction='none'` e `overscrollBehavior='contain'` no container `.shelf-scroll-container`.

1. Listeners não‑passivos no container

* Adicionar `useEffect` que anexa listeners `touchmove` e `wheel` com `{ passive: false }` diretamente no container `.shelf-scroll-container` e chama `preventDefault()` quando `isDragging` estiver ativo.

* Manter os listeners globais atuais como fallback.

1. Auto‑scroll

* Manter auto‑scroll horizontal e vertical programático nas bordas com `checkAutoScroll` e `checkVerticalAutoScroll`.

1. Reset

* No `resetDragStates`, remover os listeners e restaurar `touchAction`/`overscrollBehavior` do container.

## Testes

* Com “Mover” ON e handle, iniciar drag com movimento para baixo: página não rola; auto‑scroll só nas bordas.

* Com “Mover” OFF, duplo clique abre edição.

## Riscos

* Listeners precisam apontar para o container correto; usaremos `id` do container da prateleira atual e guardaremos referência para cleanup.

