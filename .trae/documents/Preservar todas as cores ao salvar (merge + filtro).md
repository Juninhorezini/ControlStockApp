## Problema
- Ao adicionar/atualizar uma cor, apenas a última permanece; as demais cores somem. A causa é o filtro por quantidade > 0 aplicado diretamente sobre `editingProduct.colors`, que pode não conter todas as cores atuais da posição.

## Solução Técnica
1. **Merge de cores antes de salvar**
- Em `saveProduct`, construir `mergedColors` unindo `oldProduct.colors` com `editingProduct.colors` (priorizando os valores atualizados pela edição), chaveando por `code`.
- Gerar `positiveColors = mergedColors.filter(quantity > 0)` para gravar e mostrar apenas cores válidas.

2. **Persistência**
- Atualizar o estado local com `positiveColors` e chamar `saveProductToFirebase` com o objeto `updatedProduct` que contém todas as cores pós-merge.
- Manter a lógica existente de remover locations antigas e recriar apenas para cores com quantidade > 0.

3. **Sincronização com a planilha**
- Já implementada a sincronização para cores removidas e alterações; manter.

4. **Validação**
- Testar: posição com 2 cores; adicionar uma terceira ou atualizar uma existente; todas as cores com quantidade > 0 devem permanecer.

## Execução
- Editar `src/App.js` dentro de `saveProduct` para aplicar o merge + filtro cuidadosamente, sem alterar a lógica de `saveProductToFirebase` já ajustada para ignorar zeros.

## Confirmação
- Posso aplicar o merge de cores e preservar todas as cores ao salvar, evitando perda das anteriores.