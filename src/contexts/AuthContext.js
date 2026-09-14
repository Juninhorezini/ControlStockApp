import React, { createContext, useState, useEffect } from 'react';
import {
  auth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  database,
  ref,
  get,
  set
} from '../firebaseConfig';

export const AuthContext = createContext();

// IMPORTANT: Replace with your actual Cloud Function URL after deployment
const CLOUD_FUNCTION_URL = process.env.REACT_APP_CLOUD_FUNCTION_URL || 'YOUR_CLOUD_FUNCTION_URL_HERE';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Set user immediately from Auth object so UI unlocks without waiting for database
        const defaultName = currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Usuario');
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: defaultName,
          photoURL: currentUser.photoURL,
          role: 'user'
        });

        // Asynchronously fetch extra role & profile from Realtime Database
        try {
          const userRef = ref(database, `users/${currentUser.uid}`);
          const snapshot = await get(userRef);
          if (snapshot && snapshot.exists()) {
            const userData = snapshot.val();
            setUser({
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: userData.displayName || userData.username || currentUser.displayName || defaultName,
              photoURL: currentUser.photoURL,
              role: userData.role || 'user'
            });
          }
        } catch (err) {
          console.warn("Could not fetch user role from database:", err);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const register = async (email, password, username) => {
    try {
      setError(null);

      const normalized = (username || '').trim();
      const usernameToUse = normalized || email.split('@')[0];

      // Check uniqueness in Realtime Database under /usernames/{username} (case-sensitive)
      const usernameRef = ref(database, `usernames/${usernameToUse}`);
      const usernameSnap = await get(usernameRef);
      if (usernameSnap && usernameSnap.exists()) {
        const msg = 'Nome de usuário já existe';
        setError(msg);
        throw new Error(msg);
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Set Firebase Auth displayName to username
      await updateProfile(userCredential.user, {
        displayName: usernameToUse
      });

      // Save profile in Realtime Database
      const profilesRef = ref(database, `users/${userCredential.user.uid}`);
      await set(profilesRef, {
        username: usernameToUse,
        displayName: usernameToUse,
        email: email,
        role: 'user'
      });

      // Save reverse mapping username -> uid
      await set(usernameRef, userCredential.user.uid);

      return userCredential.user;
    } catch (err) {
      const msg = err.message || getErrorMessage(err.code);
      setError(msg);
      throw new Error(msg);
    }
  };

  const registerWithRole = async (email, password, username, role = 'user') => {
    try {
      setError(null);

      const normalized = (username || '').trim();
      const usernameToUse = normalized || email.split('@')[0];

      // Validate role
      if (!['admin', 'user'].includes(role)) {
        throw new Error('Role inválido');
      }

      // Check uniqueness in Realtime Database under /usernames/{username}
      const usernameRef = ref(database, `usernames/${usernameToUse}`);
      const usernameSnap = await get(usernameRef);
      if (usernameSnap && usernameSnap.exists()) {
        const msg = 'Nome de usuário já existe';
        setError(msg);
        throw new Error(msg);
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Set Firebase Auth displayName to username
      await updateProfile(userCredential.user, {
        displayName: usernameToUse
      });

      // Save profile in Realtime Database with role
      const profilesRef = ref(database, `users/${userCredential.user.uid}`);
      await set(profilesRef, {
        username: usernameToUse,
        displayName: usernameToUse,
        email: email,
        role: role,
        createdAt: new Date().toISOString()
      });

      // Save reverse mapping username -> uid
      await set(usernameRef, userCredential.user.uid);

      return userCredential.user;
    } catch (err) {
      const msg = err.message || getErrorMessage(err.code);
      setError(msg);
      throw new Error(msg);
    }
  };

  // NEW: Update user role via backend
  const updateUserRole = async (uid, newRole) => {
    try {
      if (!['admin', 'user'].includes(newRole)) {
        throw new Error('Role inválido');
      }

      // Get current user's ID token for authentication
      const idToken = await auth.currentUser.getIdToken();

      const response = await fetch(`${CLOUD_FUNCTION_URL}/api/updateUserRole`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uid, newRole })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar role');
      }

      return true;
    } catch (err) {
      const msg = err.message || 'Erro ao atualizar role';
      setError(msg);
      throw new Error(msg);
    }
  };

  // NEW: Delete user via backend (Auth + DB)
  const deleteUser = async (uid) => {
    try {
      // Get current user's ID token for authentication
      const idToken = await auth.currentUser.getIdToken();

      const response = await fetch(`${CLOUD_FUNCTION_URL}/api/deleteUser/${uid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao deletar usuário');
      }

      return true;
    } catch (err) {
      const msg = err.message || 'Erro ao deletar usuário';
      setError(msg);
      throw new Error(msg);
    }
  };

  const getErrorMessage = (code, rawMessage = '') => {
    const errors = {
      'auth/invalid-credential': 'Email ou senha incorretos. Verifique suas credenciais.',
      'auth/invalid-login-credentials': 'Email ou senha incorretos. Verifique suas credenciais.',
      'auth/user-not-found': 'Nenhuma conta encontrada com este email no Firebase.',
      'auth/wrong-password': 'Senha incorreta. Verifique a senha digitada.',
      'auth/invalid-email': 'Formato de endereço de email inválido.',
      'auth/email-already-in-use': 'Este email já está cadastrado no sistema.',
      'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
      'auth/user-disabled': 'Esta conta foi desativada pelo administrador.',
      'auth/too-many-requests': 'Muitas tentativas bloqueadas temporariamente por segurança. Aguarde alguns minutos ou redefina a senha.',
      'auth/network-request-failed': 'Falha na conexão com os servidores do Firebase. Verifique sua conexão.',
      'auth/operation-not-allowed': 'O provedor de autenticação por Email/Senha não está habilitado no Firebase Console (Authentication > Sign-in method).',
      'auth/unauthorized-domain': 'Domínio web não autorizado no Firebase. Adicione o domínio atual em Authentication > Settings > Authorized domains no Firebase Console.',
      'auth/api-key-not-valid': 'Chave de API do Firebase inválida, expirada ou restrições ainda propagando no Google Cloud (aguarde 1-2 minutos e tente novamente).',
      'auth/missing-password': 'Por favor, informe a senha.',
      'auth/missing-email': 'Por favor, informe o email ou usuário.',
      'auth/internal-error': 'Erro interno no serviço de autenticação do Firebase. Tente novamente.',
      'auth/popup-closed-by-user': 'Janela de login fechada antes da conclusão.'
    };

    if (code) {
      if (errors[code]) {
        return errors[code];
      }
      for (const [key, msg] of Object.entries(errors)) {
        if (code.includes(key) || key.includes(code)) {
          return msg;
        }
      }
      if (code.includes('api-key-not-valid') || code.includes('invalid-api-key')) {
        return 'Chave de API do Firebase inválida ou expirada. Configure a Web API Key válida nas variáveis de ambiente do projeto (REACT_APP_FIREBASE_API_KEY).';
      }
    }

    if (code) {
      const cleanMsg = (rawMessage || '').replace(/^Firebase:\s*/i, '').replace(/\(auth\/[^)]+\)\.?/i, '').trim();
      return `Erro Firebase [${code}]: ${cleanMsg || 'Falha na operação de autenticação'}`;
    }

    if (rawMessage) {
      return rawMessage;
    }

    return 'Não foi possível completar a autenticação. Verifique os dados informados.';
  };

  const resetPassword = async (emailOrUsername) => {
    try {
      setError(null);
      const identifier = (emailOrUsername || '').trim();
      let emailToUse = identifier;

      if (!identifier) {
        throw new Error('Informe o email para recuperação de senha');
      }

      if (!identifier.includes('@')) {
        try {
          const usernameRef = ref(database, `usernames/${identifier}`);
          const usernameSnap = await get(usernameRef);
          if (usernameSnap && usernameSnap.exists()) {
            const uid = usernameSnap.val();
            const userRef = ref(database, `users/${uid}`);
            const userSnap = await get(userRef);
            if (userSnap && userSnap.exists() && userSnap.val().email) {
              emailToUse = userSnap.val().email;
            }
          }
        } catch (e) {
          console.warn('Erro ao resolver username no reset:', e);
        }
      }

      if (!emailToUse.includes('@')) {
        throw new Error('Não foi possível identificar o email associado. Digite seu endereço de email completo.');
      }

      await sendPasswordResetEmail(auth, emailToUse);
      return emailToUse;
    } catch (err) {
      const msg = getErrorMessage(err.code, err.message);
      setError(msg);
      throw new Error(msg);
    }
  };

  const login = async (emailOrUsername, password) => {
    try {
      setError(null);
      const identifier = (emailOrUsername || '').trim();
      let emailToUse = identifier;

      if (!identifier) {
        throw new Error('Informe o email ou nome de usuário');
      }

      if (!password) {
        throw new Error('Informe a senha');
      }

      // Se não contiver '@', tentar resolver pelo username registrado no banco
      if (!identifier.includes('@')) {
        try {
          const usernameRef = ref(database, `usernames/${identifier}`);
          const usernameSnap = await get(usernameRef);
          if (usernameSnap && usernameSnap.exists()) {
            const uid = usernameSnap.val();
            const userRef = ref(database, `users/${uid}`);
            const userSnap = await get(userRef);
            if (userSnap && userSnap.exists() && userSnap.val().email) {
              emailToUse = userSnap.val().email;
            }
          } else {
            // Tentar buscar em users diretamente
            const usersRef = ref(database, 'users');
            const usersSnap = await get(usersRef);
            if (usersSnap && usersSnap.exists()) {
              const allUsers = usersSnap.val();
              const found = Object.values(allUsers).find(
                u => (u.username && u.username.toLowerCase() === identifier.toLowerCase()) ||
                     (u.displayName && u.displayName.toLowerCase() === identifier.toLowerCase())
              );
              if (found && found.email) {
                emailToUse = found.email;
              }
            }
          }
        } catch (dbErr) {
          console.warn('Erro ao resolver username:', dbErr);
        }
      }

      const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password);
      // Immediately set user in state
      if (userCredential && userCredential.user) {
        const u = userCredential.user;
        setUser({
          uid: u.uid,
          email: u.email,
          displayName: u.displayName || (u.email ? u.email.split('@')[0] : 'Usuario'),
          photoURL: u.photoURL,
          role: 'user'
        });
      }
      return userCredential.user;
    } catch (err) {
      const msg = getErrorMessage(err.code, err.message);
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
      setUser(null);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, register, registerWithRole, login, logout, resetPassword, updateUserRole, deleteUser, setError }}>
      {children}
    </AuthContext.Provider>
  );
}
