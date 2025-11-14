## Objetivo
- Impedir scroll nativo durante drag em qualquer direção, preservando auto‑scroll programático nas bordas.

## Mudanças Técnicas
- Início do drag: manter gatilho com deslocamento > 20px, qualquer direção.
- Listeners não‑passivos com captura:
  - Adicionar em `document` e no container da prateleira (`#shelf-container-{id}`) `touchstart`, `touchmove` e `wheel` com `{ passive: false, capture: true }` e `preventDefault()` quando `isDragging` for true.
- Remover dependência de `overflow: hidden` no `body` (já removida) e confiar nos listeners para travar o scroll nativo.
- Reset: garantir remoção dos listeners e restauração de estilos.

## Testes
- Com “Mover” ON, iniciar drag por qualquer direção: página não rola; auto‑scroll ativa nas bordas.
- Com “Mover” OFF, duplo toque abre edição.

## Riscos
- Listeners em captura precisam cleanup rigoroso; será implementado no `useEffect` de cleanup.