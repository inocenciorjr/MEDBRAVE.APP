// Configuração do Firebase
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

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

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar serviços
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Configurar provedor do Google
googleProvider.setCustomParameters({
  prompt: 'select_account'
});



export default app;