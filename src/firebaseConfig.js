// Firebase Configuration - COM AUTENTICAÇÃO
import { initializeApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  onValue, 
  set, 
  update, 
  remove, 
  runTransaction, 
  push, 
  get, 
  onChildAdded, 
  onChildChanged, 
  onChildRemoved 
} from 'firebase/database';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyAJYlIedpzXb0zUOd75caRZcSdXHPfymjQ",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "controlstockapp-538ba.firebaseapp.com",
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL || "https://controlstockapp-538ba-default-rtdb.firebaseio.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "controlstockapp-538ba",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "controlstockapp-538ba.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "262890644963",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:262890644963:web:8be72918d199896246acd6"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

export {
  database,
  auth,
  ref,
  onValue,
  set,
  update,
  remove,
  runTransaction,
  push,
  get,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
};
