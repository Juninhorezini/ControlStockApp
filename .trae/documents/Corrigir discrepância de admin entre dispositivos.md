## Diagnóstico

* A verificação de permissões usa `localStorage` por dispositivo (`securitySettings.adminUsers`) e ignora `user.role` do contexto.

* `isAdmin()` depende de `securitySettings.adminUsers` e de `FIXED_ADMIN_IDS`, causando divergência entre aparelhos.

* Leituras de `role` do DB existem, mas não são usadas nas permissões da UI.

## Objetivo

* Unificar a fonte de verdade das permissões: usar `user.role` (ex.: `'admin'`) vindo do Firebase/servidor.

* Eliminar dependências de `localStorage` para controle de admin.

## Mudanças Técnicas

* Atualizar `src/App.js` para que `isAdmin()` use `AuthContext.user.role === 'admin'` em vez de `securitySettings.adminUsers`.

* Remover ou isolar `FIXED_ADMIN_IDS` e lógica de autopromoção local.

* Propagar `canEditStructure`, `canDeleteShelves`, `canManageUsers` para usar apenas `isAdmin()` revisado.

* Garantir que `AuthContext` popula `user.role` de forma confiável após login (`src/contexts/AuthContext.js`).

## Alternativa (se lista de admins for necessária)

* Migrar `securitySettings.adminUsers` para Firebase (ex.: `settings/adminUsers`) com leitura na inicialização, substituindo `localStorage`.

## Migração de Dados

* Se houver admins apenas no `localStorage`, oferecer utilitário para subir essa lista ao DB uma vez.

## Testes

* Cenários: login em dois dispositivos distintos; conta com `role: 'admin'` vê UI de admin em ambos.

* Verificar regressões nas áreas que dependem de `isAdmin()` (menus, modais e ações).

## Riscos e Mitigações

* Possível perda de acesso admin em aparelhos que dependiam de `localStorage`; mitigado pela migração/uso do `role` centralizado.

* IDs fixos inválidos: remover para evitar falsos negativos/positivos.

