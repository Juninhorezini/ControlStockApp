# Instruções de Deployment e Configuração

## 1. Configuração do Backend (Firebase Cloud Functions)

### Passo 1: Instalar Firebase CLI
```bash
npm install -g firebase-tools
```

### Passo 2: Login no Firebase
```bash
firebase login
```

### Passo 3: Inicializar Functions (se ainda não foi feito)
```bash
cd functions
npm install
```

### Passo 4: Deploy das Cloud Functions
```bash
firebase deploy --only functions
```

Após o deploy, você receberá uma URL como:
```
https://us-central1-controlstockapp-538ba.cloudfunctions.net/api
```

## 2. Configuração do Frontend

### Passo 1: Criar arquivo .env
Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

### Passo 2: Atualizar variáveis de ambiente
Edite o arquivo `.env` e adicione:
1. Suas credenciais Firebase (já estão no firebaseConfig.js)
2. A URL da Cloud Function que você recebeu após o deploy

```
REACT_APP_CLOUD_FUNCTION_URL=https://us-central1-controlstockapp-538ba.cloudfunctions.net
```

### Passo 3: Atualizar firebaseConfig.js (opcional)
Se quiser usar variáveis de ambiente para as credenciais Firebase:

```javascript
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};
```

## 3. Regras de Segurança do Firebase Realtime Database

Atualize as regras no Firebase Console:

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

## 4. Testando a Implementação

### Testar criação de usuário:
1. Faça login como admin
2. Acesse a página de administração
3. Crie um novo usuário
4. Verifique no Firebase Console se o usuário foi criado no Auth e Database

### Testar atualização de role:
1. Selecione um usuário
2. Altere a role entre 'user' e 'admin'
3. Verifique se a mudança foi refletida no Database

### Testar deleção de usuário:
1. Selecione um usuário para deletar
2. Confirme a deleção
3. Verifique se foi removido do Auth e Database

## 5. Endpoints Disponíveis

Após o deploy, você terá os seguintes endpoints:

- `POST /api/createUser` - Criar novo usuário
- `DELETE /api/deleteUser/:uid` - Deletar usuário completamente
- `PATCH /api/updateUserRole` - Atualizar role do usuário
- `GET /api/listUsers` - Listar todos os usuários
- `GET /api/_health` - Health check

## 6. Solução de Problemas

### Erro de CORS:
Se encontrar erro de CORS, adicione nas Cloud Functions:
```javascript
const cors = require('cors')({ origin: true });
app.use(cors);
```

### Erro 403 Forbidden:
Verifique se o usuário atual tem role 'admin' no database.

### Erro de autenticação:
Certifique-se de que está passando o ID token correto no header Authorization.

## 7. Próximos Passos

- [ ] Deploy das Cloud Functions
- [ ] Configurar variáveis de ambiente
- [ ] Atualizar regras de segurança
- [ ] Testar todas as funcionalidades
- [ ] Adicionar rate limiting (opcional)
- [ ] Configurar monitoring e logs (opcional)
