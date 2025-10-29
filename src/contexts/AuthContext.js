import React, { createContext, useState, useEffect } from 'react';
import {
  auth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
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

  const register = async (email, password, displayName) => {
    try {
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, {
        displayName: displayName || email.split('@')[0]
      });
      return userCredential.user;
    } catch (err) {
      const msg = getErrorMessage(err.code);
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
    <AuthContext.Provider value={{ user, loading, error, register, login, logout, setError }}>
      {children}
    </AuthContext.Provider>
  );
}
