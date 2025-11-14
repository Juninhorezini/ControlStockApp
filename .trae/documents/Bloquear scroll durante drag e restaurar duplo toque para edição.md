## Problemas
- Durante drag o scroll nativo ainda ocorre fora das bordas, atrapalhando o movimento.
- Com “Mover” OFF, o duplo toque para editar não abre.

## Correções Propostas
1. Capturar sempre o toque inicial
- Em `handleMobileTouchStart`, registrar `touchStart` SEMPRE.
- Só preparar drag (definir `draggedProduct` e `holdTimeout`) quando `moveModeEnabled` estiver ON e o toque ocorrer no handle (`data-handle="move"`).
- Mantém duplo toque funcional quando “Mover” está OFF ou toque fora do handle.

2. Bloqueio rigoroso de scroll durante drag
- Ao iniciar drag, além de `touchAction='none'` e `userSelect='none'`, aplicar:
  - `document.body.style.overflow='hidden'`
  - `document.body.style.overscrollBehavior='contain'`
  - `document.documentElement.style.overscrollBehavior='contain'`
  - No container: `style.overscrollBehavior='contain'`
- Restaurar todos esses estilos no `resetDragStates`.

3. Auto‑scroll consistente
- Manter auto‑scroll horizontal existente.
- Usar auto‑scroll vertical programático nas bordas (já adicionado) para alcançar áreas fora da tela sem liberar scroll nativo.

## Testes
- Mobile: com “Mover” OFF, duplo toque abre edição; com “Mover” ON, só handle inicia drag.
- Durante drag: página não rola; auto‑scroll ativa nas bordas.

## Risco
- “overflow: hidden” pode afetar alguns layouts; mitigação: restaurar no reset e usar `overscroll-behavior` para conter sem quebrar layout.

## Próximo
- Implementar as alterações nos handlers e estilos temporários.