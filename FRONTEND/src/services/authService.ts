import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { User } from 'firebase/auth';

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: string;
};

export const login = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
  let role = 'student';
  if (userDoc.exists()) {
    const data = userDoc.data();
    if (data.role) role = data.role;
  }
  const mapped = mapFirebaseUser(userCredential.user);
  return { ...mapped, role };
};

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  let role = 'student';
  const userRef = doc(db, 'users', userCredential.user.uid);
  const userDoc = await getDoc(userRef);
  if (userDoc.exists()) {
    const data = userDoc.data();
    if (data.role) role = data.role;
  }
  // NOTA: Criação de usuário movida para o backend por segurança
  // O backend será responsável por criar/atualizar usuários via middleware de autenticação
  
  const mapped = mapFirebaseUser(userCredential.user);
  return { ...mapped, role };
};

export const register = async (email: string, password: string, name: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Update profile with name
  await updateProfile(userCredential.user, {
    displayName: name
  });
  
  // NOTA: Criação de usuário no Firestore movida para o backend por segurança
  // O backend será responsável por criar usuários via middleware de autenticação
  // quando o usuário fizer a primeira requisição autenticada
  
  return mapFirebaseUser(userCredential.user);
};

export const logout = async () => {
  await signOut(auth);
};

export const forgotPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

// Helper function to convert Firebase User to our AuthUser type
export const mapFirebaseUser = (user: User): AuthUser => {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role: 'student' // Default role
  };
};

// Function to get user with role from Firestore
export const getUserWithRole = async (firebaseUser: User): Promise<AuthUser> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    let role = 'student';
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data.role) {
        role = data.role;
      }
    }
    
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      role
    };
  } catch (error) {
    console.error('Erro ao buscar role do usuário:', error);
    return mapFirebaseUser(firebaseUser);
  }
};