import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// Classe para gerenciar autenticação
class AuthService {
  constructor() {
    this.token = this.getToken();
    this.user = this.getUser();
    this.syncPromise = null; // Para evitar múltiplas chamadas simultâneas
    this.lastSyncTime = 0;
    this.SYNC_DEBOUNCE_TIME = 5000; // 5 segundos
  }

  // Login do usuário com Firebase
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      let role = 'student';
      if (userDoc.exists()) {
        const data = userDoc.data();
        role = data.role || 'student';
      }
      
      const mapped = this.mapFirebaseUser(userCredential.user);
      const userWithRole = { ...mapped, role };
      
      // Obter token do Firebase
      const token = await userCredential.user.getIdToken();
      
      // Armazenar localmente
      this.setToken(token);
      this.setUser(userWithRole);
      
      // Sincronizar com backend
      try {
        await this.syncUserWithBackend(token);
      } catch (error) {
        console.warn('Erro ao sincronizar usuário com backend:', error);
        // Não falhar o login por causa disso
      }
      
      return { user: userWithRole, token };
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(this.getFirebaseErrorMessage(error.code));
    }
  }

  // Login com Google (atualizado com fallback para redirect)
  async loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      
      // Configurações específicas para resolver problemas de popup
      provider.setCustomParameters({
        prompt: 'select_account',
        hd: undefined // Remove domain hint restrictions
      });
      
      try {
        // Tentar popup primeiro
        const userCredential = await signInWithPopup(auth, provider);
        return await this.processGoogleUser(userCredential.user);
      } catch (error) {
        // Se popup falhar, usar redirect
        if (error.code === 'auth/popup-blocked' || 
            error.code === 'auth/popup-closed-by-user' ||
            error.message.includes('Cross-Origin-Opener-Policy')) {
          
          // Salvar estado para recuperar após redirect
          localStorage.setItem('authRedirectPending', 'true');
          await signInWithRedirect(auth, provider);
          return null; // O resultado será processado no componente
        } else {
          throw error;
        }
      }
    } catch (error) {
      throw new Error(this.getFirebaseErrorMessage(error.code));
    }
  }

  // Processar usuário do Google (função que estava faltando)
  async processGoogleUser(firebaseUser) {
    try {
      // Obter ou criar documento do usuário no Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      let role = 'student';
      if (userDoc.exists()) {
        const data = userDoc.data();
        role = data.role || 'student';
      }
      // NOTA: Criação de usuário movida para o backend por segurança
      
      // Obter token do Firebase
      const token = await firebaseUser.getIdToken();
      
      // Preparar dados do usuário
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified,
        role: role
      };
      
      // Armazenar localmente
      this.setToken(token);
      this.setUser(userData);
      
      // Chamar backend para criar/atualizar usuário de forma segura
      try {
        await this.syncUserWithBackend(token);
      } catch (error) {
        console.warn('Erro ao sincronizar usuário com backend:', error);
        // Não falhar o login por causa disso
      }
      
      return { user: userData, token };
    } catch (error) {
      console.error('Erro ao processar usuário Google:', error);
      throw error;
    }
  }

  

  // Sincronizar usuário com backend (criação segura)
  async syncUserWithBackend(token = null, force = false) {
    const now = Date.now();
    
    // Verificar debouncing se não for forçado
    if (!force && (now - this.lastSyncTime) < this.SYNC_DEBOUNCE_TIME) {
      console.log('🔄 [AuthService] Sync muito recente, evitando chamada duplicada');
      return true;
    }
    
    // Se já há uma promise em andamento, aguardar ela
    if (this.syncPromise) {
      console.log('⏳ [AuthService] Aguardando sync em andamento');
      try {
        return await this.syncPromise;
      } catch (error) {
        // Se falhar, limpar promise e tentar novamente
        this.syncPromise = null;
      }
    }
    
    try {
      // Se não foi fornecido token, obter um válido
      const authToken = token || await this.getValidToken();
      
      if (!authToken) {
        throw new Error('Nenhum token disponível para sincronização');
      }
      
      console.log('🚀 [AuthService] Iniciando sincronização com backend');
      
      // Criar promise e armazenar para evitar duplicatas
      this.syncPromise = this._performSync(authToken);
      const result = await this.syncPromise;
      
      this.lastSyncTime = now;
      this.syncPromise = null;
      
      return result;
    } catch (error) {
      console.error('❌ [AuthService] Erro ao sincronizar usuário:', error);
      this.syncPromise = null;
      throw error;
    }
  }
  
  async _performSync(authToken) {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/sync-user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      // Se token foi rejeitado, tentar renovar uma vez
      if (response.status === 401) {
        console.log('🔄 [AuthService] Token rejeitado na sincronização, tentando renovar...');
        const refreshed = await this.refreshToken();
        if (refreshed) {
          const newToken = await this.getValidToken();
          if (newToken) {
            const retryResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/sync-user`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${newToken}`,
                'Content-Type': 'application/json'
              },
              credentials: 'include'
            });
            
            if (!retryResponse.ok) {
              throw new Error(`HTTP error! status: ${retryResponse.status}`);
            }
            
            const result = await retryResponse.json();
            console.log('✅ [AuthService] Usuário sincronizado com backend (após renovação):', result);
            return result;
          }
        }
      }
      
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ [AuthService] Usuário sincronizado com backend:', result);
    return result;
  }

  // Lidar com resultado do redirect (função que estava faltando)
  async handleRedirectResult() {
    try {
      const result = await getRedirectResult(auth);
      
      if (result) {
        localStorage.removeItem('authRedirectPending');
        return await this.processGoogleUser(result.user);
      } else {
        return null;
      }
    } catch (error) {
      console.error('Erro ao processar redirect:', error);
      localStorage.removeItem('authRedirectPending');
      throw error;
    }
  }

  // Registro de novo usuário com Firebase
  async register(email, password, displayName) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Atualizar perfil com nome
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }

      // NOTA: Criação de usuário movida para o backend por segurança
      
      // Obter token do Firebase
      const token = await userCredential.user.getIdToken();
      
      // Preparar dados do usuário
      const userData = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: displayName || userCredential.user.displayName,
        photoURL: userCredential.user.photoURL,
        emailVerified: userCredential.user.emailVerified,
        role: 'student'
      };
      
      // Armazenar localmente
      this.setToken(token);
      this.setUser(userData);
      
      // Chamar backend para criar usuário de forma segura
      try {
        await this.syncUserWithBackend(token);
      } catch (error) {
        console.warn('Erro ao sincronizar usuário com backend:', error);
        // Não falhar o registro por causa disso
      }
      
      return { user: userData, token };
    } catch (error) {
      console.error('Registration error:', error);
      throw new Error(this.getFirebaseErrorMessage(error.code));
    }
  }

  // Logout
  async logout() {
    try {
      await signOut(auth);
      
      // Limpar armazenamento local
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('userData');
      sessionStorage.removeItem('refreshToken');
      
      this.token = null;
      this.user = null;
      
      // Redirecionar para login
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // Renovar token do Firebase
  async refreshToken() {
    try {
      const user = auth.currentUser;
      if (!user) {
        return false;
      }
      
      const token = await user.getIdToken(true); // Force refresh
      this.setToken(token);
      
      return true;
    } catch (error) {
      // Token renewal failed
      return false;
    }
  }

  // Recuperação de senha
  async forgotPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return Promise.resolve();
    } catch (error) {
      console.error('Forgot password error:', error);
      throw new Error(this.getFirebaseErrorMessage(error.code));
    }
  }

  // Observar mudanças de autenticação
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  }

  // Função para buscar usuário com role do Firestore
  async getUserWithRole(firebaseUser) {
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
        emailVerified: firebaseUser.emailVerified,
        role
      };
    } catch (error) {
      console.error('Erro ao buscar role do usuário:', error);
      return this.mapFirebaseUser(firebaseUser);
    }
  }

  // Helper function para converter Firebase User para nosso tipo
  mapFirebaseUser(user) {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      role: 'student' // Role padrão
    };
  }

  // Traduzir códigos de erro do Firebase
  getFirebaseErrorMessage(errorCode) {
    const errorMessages = {
      'auth/user-not-found': 'Usuário não encontrado',
      'auth/wrong-password': 'Senha incorreta',
      'auth/email-already-in-use': 'Este email já está em uso',
      'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres',
      'auth/invalid-email': 'Email inválido',
      'auth/user-disabled': 'Usuário desabilitado',
      'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde',
      'auth/network-request-failed': 'Erro de conexão. Verifique sua internet',
      'auth/popup-closed-by-user': 'Login cancelado pelo usuário',
      'auth/cancelled-popup-request': 'Login cancelado',
      'auth/popup-blocked': 'Popup bloqueado pelo navegador'
    };
    
    return errorMessages[errorCode] || 'Erro de autenticação';
  }

  // Verificar se usuário está autenticado
  isAuthenticated() {
    return !!this.getToken();
  }

  // Obter token
  getToken() {
    const localToken = localStorage.getItem('authToken');
    const sessionToken = sessionStorage.getItem('authToken');
    return localToken || sessionToken;
  }

  // Definir token
  setToken(token) {
    localStorage.setItem('authToken', token);
    this.token = token;
  }

  // Obter usuário
  getUser() {
    const userData = localStorage.getItem('userData') || localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  }

  // Definir usuário
  setUser(user) {
    localStorage.setItem('userData', JSON.stringify(user));
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('userId', user.uid);
    this.user = user;
  }

  // Obter refresh token
  getRefreshToken() {
    return localStorage.getItem('refreshToken');
  }

  // Definir refresh token
  setRefreshToken(refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }

  // Verificar se token está próximo do vencimento
  async isTokenExpiringSoon() {
    try {
      const user = auth.currentUser;
      if (!user) return true;
      
      const tokenResult = await user.getIdTokenResult();
      const expirationTime = new Date(tokenResult.expirationTime).getTime();
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;
      
      // Considera que está expirando se restam menos de 5 minutos
      return timeUntilExpiry < 5 * 60 * 1000;
    } catch (error) {
      console.error('Erro ao verificar expiração do token:', error);
      return true;
    }
  }

  // Obter token válido (renova automaticamente se necessário)
  async getValidToken() {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.warn('Usuário não autenticado');
        return null;
      }
      
      // Verificar se o token está expirando
      const isExpiring = await this.isTokenExpiringSoon();
      
      // Forçar renovação se estiver expirando
      const token = await user.getIdToken(isExpiring);
      
      // Atualizar token armazenado
      this.setToken(token);
      
      return token;
    } catch (error) {
      console.error('Erro ao obter token válido:', error);
      return null;
    }
  }

  // Função principal para requisições autenticadas (mantida para compatibilidade)
  async fetchWithAuth(endpoint, options = {}) {
    try {
      // Obter token válido (renova automaticamente se necessário)
      const token = await this.getValidToken();
      
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers
      };
      
      // Adiciona token se disponível
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.warn('Nenhum token disponível para requisição');
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}${endpoint}`, {
        headers,
        credentials: 'include',
        ...options
      });
      
      // Se token expirou, tenta renovar uma vez
      if (response.status === 401 && token) {
        console.log('Token rejeitado, tentando renovar...');
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Tenta novamente com novo token
          const newToken = await this.getValidToken();
          if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`;
            const retryResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}${endpoint}`, {
              headers,
              credentials: 'include',
              ...options
            });
            
            if (!retryResponse.ok) {
              throw new Error(`HTTP error! status: ${retryResponse.status}`);
            }
            
            return await retryResponse.json();
          }
        }
        
        // Se não conseguiu renovar, desloga
        console.error('Falha na renovação do token, fazendo logout...');
        this.logout();
        throw new Error('Token expired and refresh failed');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }
}

// Criar instância única
const authService = new AuthService();

export default authService;