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
  apiKey: "AIzaSyAJYlIedpzXb0zUOd75caRZcSdXHPfymjQ",
  authDomain: "controlstockapp-538ba.firebaseapp.com",
  databaseURL: "https://controlstockapp-538ba-default-rtdb.firebaseio.com",
  projectId: "controlstockapp-538ba",
  storageBucket: "controlstockapp-538ba.firebasestorage.app",
  messagingSenderId: "262890644963",
  appId: "1:262890644963:web:8be72918d199896246acd6"
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
