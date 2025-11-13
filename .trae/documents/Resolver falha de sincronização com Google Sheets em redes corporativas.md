## Diagnóstico
- Sync atual usa JSONP (`<script src=...>`) para `sheetsUrl`: `src/App.js:696-714` e `src/App.js:818-838`.
- Há um caminho alternativo com `fetch` POST (form-urlencoded) em `src/hooks/useFirebase.js:94-128`, mas não está sendo usado.
- Problema na empresa indica bloqueio de `script.google.com` ou política que impede scripts externos, além de possíveis inconsistências do `sheetsUrl` salvo em `localStorage`.

## Objetivo
- Manter sync client-side (sem Cloud Functions) e torná-lo mais robusto em redes corporativas.

## Mudanças Técnicas
1. Substituir JSONP por POST padrão
- Criar função de sync que primeiro tenta `fetch(sheetsUrl, { method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: URLSearchParams(...) })` e lê JSON.
- Se falhar por CORS, trocar automaticamente para fallback JSONP.
- Adicionar terceiro fallback com `navigator.sendBeacon(sheetsUrl, body)` para redes com bloqueio agressivo; não lê resposta, apenas envia.

2. Detecção de bloqueio e feedback
- Em JSONP, adicionar `script.onerror = () => setSyncStatus('Rede bloqueou script.google.com');` para sinalizar bloqueio real ao usuário.
- Exibir toasts claros: enviado, concluído, bloqueado/CORS.

3. Centralizar `sheetsUrl`
- Carregar `sheetsUrl` de `process.env.REACT_APP_SPREADSHEET_WEB_APP_URL` e/ou de `Firebase /settings/sheetsUrl` na inicialização, removendo dependência de `localStorage`.
- Manter uma tela para atualizar `settings/sheetsUrl` (persistente para todos os dispositivos).

4. Ajustes no Apps Script (se necessário)
- Garantir headers CORS na resposta JSON (ContentService): `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Headers: *` para suportar o POST direto.
- Confirmar que o Web App está em “Qualquer pessoa” (já está) e que lida com GET/POST.

## Testes
- Testar em casa e na rede da empresa: POST direto deve funcionar; se não, JSONP ou `sendBeacon` entram como fallback.
- Verificar que erros aparecem na UI e que não há perda de dados.

## Riscos e Mitigações
- Algumas redes bloqueiam tanto `script.google.com` quanto `fetch` POST; mitigado com `sendBeacon` e feedback explícito.
- Dependência de CORS no Apps Script: mitigar ajustando headers no script.

## Próximo Passo
- Implementar a nova função de sync com a cadeia POST → JSONP → Beacon, adicionar `onerror` no JSONP, centralizar `sheetsUrl`, e validar em ambas as redes.