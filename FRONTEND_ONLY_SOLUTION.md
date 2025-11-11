# 🚨 Solução Frontend-Only (Sem Cloud Functions)

Este projeto está configurado para funcionar **sem Firebase Cloud Functions**, permitindo uso no **plano gratuito (Spark)**.

---

## ✅ Funcionalidades Que Funcionam

- ✅ **Registro de usuários** - Criação de novas contas
- ✅ **Login/Logout** - Autenticação completa
- ✅ **Sistema de roles** - Admin e User
- ✅ **Atualizar role** - Mudar usuário de 'user' para 'admin' (ou vice-versa)
- ✅ **Gerenciamento de estoque** - Todas as funcionalidades do app
- ✅ **Auditoria** - Registro de atividades

---

## ⚠️ Limitações Importantes

### 1. Deleção de Usuários (Parcial)

- ✅ **Funciona**: Remove o usuário do **Realtime Database**
- ⬇ **Não funciona**: Não deleta do **Firebase Authentication**
- ⚠️ **Impacto**: O usuário deletado **ainda pode fazer login**, mas não aparece gerenciamento

**Como deletar completamente:**
1. Vá no [Firebase Console](https://console.firebase.google.com)
2. Authentication → Users
3. Encontre o usuário e clique em **Delete User**

### 2. Listagem de Usuários

- ✅ **Funciona**: Lista usuários do **Realtime Database**
- ❌ **Não mostra**: Usuários que estão só no Authentication (sem perfil no DB)

### 3. Proteção Contra Criação de Contas Falsas

- ⚠️ **Sem backend**: Qualquer pessoa pode criar uma conta com role "admin" modificando o código do frontend
- ✅ **Solução atual**: Todos usuários novos são criados como "user" por padrão
- ✅ **Upgrade manual**: Admin precisa mudar o role manualmente no app

---

## 🚀 Como Usar

### 1. Iniciar o App

```bash
npm install
npm start
```

### 2. Criar Primeiro Admin

**Primeiro acesso**:
1. Crie uma conta no app
2. Vá no [Firebase Console](https://console.firebase.google.com)
3. Realtime Database → `users/<seu_uid>`
4. Mude o campo `role` de `\"user\"` para `\"admin\"`
5. Faça logout e login novamente

### 3. Gerenciar Usuários

Depois de ser admin:
1. Clique no botão **Gerenciamento de Usuários**
2. Você pode:
   - ✅ Criar novos usuários
   - ✅ Alterar roles (user → admin)
   - ⚠️ Remover usuários do DB (ainda podem fazer login)

---

## 🚁 Atualizar para Solução Completa (Com Backend)

Se no futuro você quiser deleção completa de usuários, existem 3 opções:

### Opção 1: Upgrade para Firebase Blaze (Recomendado)

- 💰 **Custo**: Grátis até 2 milhões de chamadas/por mês
- 🚀 **Vantagem**: Solução profissional e escalável

```bash
# No terminal:
firebase deploy --only functions
```

Os arquivos de Cloud Functions já estão no repositório em `functions/index.js`.

### Opção 2: Backend Gratuito (Vercel, Render)

- 💰 **Custo**: 100% grátis
- 🚀 **Vantagem**: Não precisa de cartão de crédito
- 🤠 **Esforço**: Médio (30 minutos de setup)

Veja instruções no `DEPLOYMENT.md`.

### Opção 3: Manter Assim (Sem Backend)

- 💰 **Custo**: Grátis
- ✅ **Funciona**: 95% das funcionalidades
- ⚠️ **Limitação**: Deleção narráo completa

---

## 🛡ḏ Regras de Segurança do Firebase

Para proteger seus dados, configure as regras no **Firebase Console**:

1. Vá em **Realtime Database** → **Rules**
2. Cole estas regras:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && (auth.uid === $uid || root.child('users').child(auth.uid).child('role').val() === 'admin')",
        ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'"
      }
    },
    "usernames": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'"
    },
    "audit_log": {
      ".read": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'",
      ".write": "auth != null"
    }
  }
}
```

---

## 🔓Contato

Se tiver dúvidas ou problemas, veja o `DEPLOYMENT.md` ou abra uma issue no GitHub.
