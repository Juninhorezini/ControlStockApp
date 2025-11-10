import React, { createContext, useState, useEffect } from 'react';
import {
  auth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  database,
  ref,
  get,
  set
} from '../firebaseConfig';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || 'Usuario',
          photoURL: currentUser.photoURL
        });
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

  const updateUserRole = async (uid, newRole) => {
    try {
      if (!['admin', 'user'].includes(newRole)) {
        throw new Error('Role inválido');
      }
      const profilesRef = ref(database, `users/${uid}`);
      const userSnap = await get(profilesRef);
      if (!userSnap.exists()) {
        throw new Error('Usuário não encontrado');
      }
      const userData = userSnap.val();
      await set(profilesRef, { ...userData, role: newRole });
      return true;
    } catch (err) {
      const msg = err.message || 'Erro ao atualizar role';
      setError(msg);
      throw new Error(msg);
    }
  };

  const deleteUser = async (uid) => {
    try {
      // Nota: deletar de /users/{uid} não deleta a conta Firebase Auth
      // Para deletar completamente, seria necessário usar Firebase Admin SDK no backend
      const profilesRef = ref(database, `users/${uid}`);
      const userSnap = await get(profilesRef);
      if (!userSnap.exists()) {
        throw new Error('Usuário não encontrado');
      }
      const userData = userSnap.val();
      // Delete the user profile
      await set(profilesRef, null);
      // Delete username mapping
      if (userData.username) {
        const usernameRef = ref(database, `usernames/${userData.username}`);
        await set(usernameRef, null);
      }
      return true;
    } catch (err) {
      const msg = err.message || 'Erro ao deletar usuário';
      setError(msg);
      throw new Error(msg);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (err) {
      const msg = getErrorMessage(err.code);
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

  const getErrorMessage = (code) => {
    const errors = {
      'auth/email-already-in-use': 'Email já registrado',
      'auth/weak-password': 'Senha com no mínimo 6 caracteres',
      'auth/user-not-found': 'Email não encontrado',
      'auth/wrong-password': 'Senha incorreta',
      'auth/invalid-email': 'Email inválido',
      'auth/too-many-requests': 'Muitas tentativas'
    };
    return errors[code] || 'Erro de autenticação';
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, register, registerWithRole, login, logout, updateUserRole, deleteUser, setError }}>
      {children}
    </AuthContext.Provider>
  );
}
