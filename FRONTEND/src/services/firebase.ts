// medforum/src/services/firebase.ts

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuração do Firebase para o projeto medforum-488ec
const firebaseConfig = {
  apiKey: "AIzaSyDc0PvLzGKFOFm1-wdINKn35U1CqPe2YGc",
  authDomain: "medforum-488ec.firebaseapp.com",
  projectId: "medforum-488ec",
  storageBucket: "medforum-488ec.firebasestorage.app",
  messagingSenderId: "149898653309",
  appId: "1:149898653309:web:395fbebd7b976820590b14",
  measurementId: "G-2V4NYH5WQ8"
};

// Inicializar Firebase apenas se ainda não foi inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Storage será null se não estiver disponível
const storage = null;

export { auth };
export const db = getFirestore(app);
export { storage };
export default app;