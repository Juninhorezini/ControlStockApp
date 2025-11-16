## Causa
- O erro ocorre porque foi usado `await` dentro do callback de `onChildRemoved` que não é `async`.
- Linha apontada pelo build: `await new Promise(resolve => setTimeout(resolve, 600));` dentro do listener.

## Correção
1. Alterar o bloco de sincronização em `onChildRemoved` para executar dentro de uma IIFE assíncrona:
   - Padrão: `(async () => { ...await... })();` em vez de usar `await` diretamente.
2. Manter o disparo de `sendSummaryTotalsDebounced()` ao final, preferencialmente dentro de `finally` da IIFE para garantir execução.
3. Revisar rapidamente outros pontos semelhantes e manter consistência (já usamos IIFE em `onChildChanged`).

## Validação
- Rodar `npm run build` para confirmar que o build passa.
- Testar remoção de uma cor para verificar que a planilha é atualizada e que os totalizadores são recalculados.

## Execução
- Aplicar patch em `src/App.js` apenas no bloco do listener de remoção, adotando a IIFE assíncrona.
- Nenhuma alteração de lógica adicional além da correção de escopo do `await`.