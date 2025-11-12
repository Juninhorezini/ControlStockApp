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

// IMPORTANT: Replace with your actual Cloud Function URL after deployment
const CLOUD_FUNCTION_URL = process.env.REACT_APP_CLOUD_FUNCTION_URL || 'YOUR_CLOUD_FUNCTION_URL_HERE';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // Fetch user role from Realtime Database
        const userRef = ref(database, `users/${currentUser.uid}`);
        get(userRef).then((snapshot) => {
          const userData = snapshot.val();
          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName || 'Usuario',
            photoURL: currentUser.photoURL,
            role: userData ? userData.role : 'user' // Default to 'user' if role not found
          });
        }).catch((err) => {
          console.error("Error fetching user role:", err);
          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName || 'Usuario',
            photoURL: currentUser.photoURL,
            role: 'user' // Fallback to 'user' on error
          });
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
