## Problema
- Ao salvar uma cor com quantidade 0 sem excluir manualmente, ela permanece na localização tanto no App quanto no Firebase.

## Solução Técnica
1. **Filtro na UI ao salvar**
- Ajustar `saveProduct` para considerar apenas cores com `quantity > 0`.
- Se todas as cores ficarem com 0, remover o produto da posição e apagar locations no Firebase.

2. **Escrita no Firebase**
- Alterar `saveProductToFirebase` para pular gravação de qualquer cor com `quantity <= 0`.
- Continuar removendo locations antigas antes de salvar as novas.

3. **Sincronização Planilha**
- Já implementado: remover/atualizar linha via `enqueueSheetSync` com snapshot do Firebase.

4. **Validação**
- Testar salvar cor com quantidade 0: não deve reaparecer no App; Firebase não deve ter location com `quantity: 0`.

## Execução
- Editar `src/App.js` nas funções `saveProduct` e `saveProductToFirebase` conforme descrito.

## Confirmação
- Posso aplicar essas alterações agora para que cores com quantidade 0 sejam removidas automaticamente do App e do Firebase ao salvar.