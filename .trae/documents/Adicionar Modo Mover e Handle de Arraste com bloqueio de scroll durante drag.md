## Objetivo
- Evitar movimentos acidentais ao separar intenção de "mover" via toggle.
- Iniciar drag apenas pelo "handle" do card, não pelo toque em qualquer área.
- Bloquear scroll nativo quando o drag estiver ativo e liberar apenas via auto‑scroll programático para alcançar áreas fora da tela.

## Implementação
- Estado global: `moveModeEnabled` (boolean) com botão/toggle na UI para ativar/desativar.
- Gating de interações:
  - Mobile: `handleMobileTouchStart/Move/End` só funcionam quando `moveModeEnabled` e o toque começou no handle (`touch.target.dataset.handle === 'move'`).
  - Desktop: `handleDragStart` só ativa se `moveModeEnabled` e o evento partiu do handle (verificar `data-handle`).
- Handle no card:
  - Inserir um elemento pequeno (ex.: ícone com área tocável) dentro da célula do produto com `data-handle="move"` e `onTouchStart/onMouseDown` específicos.
  - Estilo visível apenas quando `moveModeEnabled` (para indicar que o card está "arrastável").
- Bloqueio de scroll durante drag:
  - Ao iniciar drag: aplicar `document.body.style.overflow='hidden'`, `touchAction='none'` e `userSelect='none'` no container de grid.
  - Ao finalizar drag: restaurar estilos.
- Auto‑scroll programático:
  - Horizontal: já existe com `.overflow-x-auto`; manter e ajustar threshold.
  - Vertical: adicionar checagem de proximidade ao topo/rodapé da viewport; usar `window.scrollBy` ou container vertical para rolar gradualmente enquanto o dedo está próximo das bordas.
- Segurança adicional:
  - Enquanto `moveModeEnabled` estiver desativado, não abrir modal de movimentação por long‑press.
  - Manter duplo toque para editar quando `moveModeEnabled` estiver off.

## UI/UX
- Botão toggle "Mover itens": indica estado on/off (ex.: ícone de mão/arrastar).
- Ao ativar: exibir handles nos cards e dicas ("Toque e segure o handle para mover").

## Testes
- Mobile e desktop: não inicia drag sem toggle; com toggle, só pelo handle.
- Durante drag: tela não rola nativamente; auto‑scroll funciona nas bordas.
- Ao soltar: estilos restaurados; sem abertura de modal indevida.

## Riscos e Mitigações
- Bloquear scroll pode impactar navegação: mitigado por auto‑scroll nos eixos e restauração imediata ao fim do drag.
- Precisão do handle: ajustar tamanho/posição conforme feedback.

## Entregáveis
- Novo estado/toggle na UI.
- Handle de arraste por item.
- Gating nos handlers mobile/desktop.
- Bloqueio de scroll durante drag e auto‑scroll vertical/horizontal.