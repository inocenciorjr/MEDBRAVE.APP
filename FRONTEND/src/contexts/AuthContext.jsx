import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import authService from '../services/authService';

// Tipagem do contexto de autenticação
export const AuthContext = createContext(undefined);

// Provider do contexto de autenticação
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verifica se o usuário está logado ao carregar a aplicação
  useEffect(() => {
    // Tenta restaurar usuário do localStorage primeiro
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('authToken');
    
    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setLoading(false); // Para de carregar se há usuário no cache
      } catch (error) {
        console.error('Erro ao recuperar usuário do localStorage:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
      }
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const mappedUser = await authService.getUserWithRole(firebaseUser);
          setUser(mappedUser);
          localStorage.setItem('user', JSON.stringify(mappedUser));
          localStorage.setItem('userId', mappedUser.uid);
          
          // Obter e salvar o token do Firebase
          try {
            const token = await firebaseUser.getIdToken();
            if (token) {
              localStorage.setItem('authToken', token);
            }
          } catch (tokenError) {
            console.error('Erro ao obter token:', tokenError);
          }
        } catch (error) {
          console.error('Erro ao carregar usuário com role:', error);
          const fallbackUser = authService.mapFirebaseUser(firebaseUser);
          setUser(fallbackUser);
          localStorage.setItem('user', JSON.stringify(fallbackUser));
          localStorage.setItem('userId', fallbackUser.uid);
          
          // Tentar obter token mesmo com fallback
          try {
            const token = await firebaseUser.getIdToken();
            if (token) {
              localStorage.setItem('authToken', token);
            }
          } catch (tokenError) {
            console.error('Erro ao obter token no fallback:', tokenError);
          }
        }
      } else {
        // Limpa dados se não há usuário no Firebase
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('userId');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        sessionStorage.removeItem('authToken');
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Login com e-mail e senha
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      const result = await authService.login(email, password);
      setUser(result.user);
      localStorage.setItem('user', JSON.stringify(result.user));
      localStorage.setItem('userId', result.user.uid);
      // Garantir que o token seja salvo
      if (result.token) {
        localStorage.setItem('authToken', result.token);
      }
    } catch (err) {
      const errorMessage = getAuthErrorMessage(err.message);
      setError(errorMessage);
      console.error('Erro ao fazer login:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Login com Google
  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await authService.loginWithGoogle();
      setUser(result.user);
      localStorage.setItem('user', JSON.stringify(result.user));
      localStorage.setItem('userId', result.user.uid);
      // Garantir que o token seja salvo
      if (result.token) {
        localStorage.setItem('authToken', result.token);
      }
    } catch (err) {
      const errorMessage = getAuthErrorMessage(err.message);
      setError(errorMessage);
      console.error('Erro ao fazer login com Google:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Registro de novo usuário
  const register = async (email, password, name) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await authService.register(email, password, name);
      setUser(result.user);
      localStorage.setItem('user', JSON.stringify(result.user));
      localStorage.setItem('userId', result.user.uid);
      // Garantir que o token seja salvo
      if (result.token) {
        localStorage.setItem('authToken', result.token);
      }
    } catch (err) {
      const errorMessage = getAuthErrorMessage(err.message);
      setError(errorMessage);
      console.error('Erro ao registrar:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      setLoading(true);
      
      await authService.logout();
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      sessionStorage.removeItem('authToken');
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    } finally {
      setLoading(false);
    }
  };

  // Recuperação de senha
  const forgotPassword = async (email) => {
    try {
      setLoading(true);
      setError(null);
      
      await authService.forgotPassword(email);
      
      return Promise.resolve();
    } catch (err) {
      const errorMessage = getAuthErrorMessage(err.message);
      setError(errorMessage);
      console.error('Erro ao recuperar senha:', err);
      return Promise.reject(err);
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar dados do usuário
  const updateUser = (userData) => {
    authService.setUser(userData);
    setUser(userData);
  };

  // Função para obter mensagens de erro mais amigáveis
  const getAuthErrorMessage = (errorMessage) => {
    // Se já é uma mensagem tratada pelo authService, usa ela
    if (errorMessage && !errorMessage.includes('auth/')) {
      return errorMessage;
    }
    
    // Caso contrário, trata códigos de erro
    const errorCode = errorMessage?.replace('Error: ', '') || '';
    
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'E-mail inválido. Por favor, verifique e tente novamente.';
      case 'auth/user-disabled':
        return 'Esta conta foi desativada. Entre em contato com o suporte.';
      case 'auth/user-not-found':
        return 'Usuário não encontrado. Verifique seu e-mail ou registre-se.';
      case 'auth/wrong-password':
        return 'Senha incorreta. Por favor, tente novamente.';
      case 'auth/email-already-in-use':
        return 'Este e-mail já está em uso por outra conta.';
      case 'auth/weak-password':
        return 'Senha muito fraca. Use pelo menos 6 caracteres.';
      case 'auth/operation-not-allowed':
        return 'Operação não permitida. Entre em contato com o suporte.';
      case 'auth/account-exists-with-different-credential':
        return 'Uma conta já existe com o mesmo e-mail mas com credenciais diferentes.';
      case 'auth/popup-closed-by-user':
        return 'O processo de login foi interrompido. Tente novamente.';
      case 'auth/network-request-failed':
        return 'Erro de conexão. Verifique sua internet e tente novamente.';
      case 'auth/too-many-requests':
        return 'Muitas tentativas de login. Tente novamente mais tarde.';
      default:
        return errorMessage || 'Ocorreu um erro. Por favor, tente novamente.';
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    loginWithGoogle,
    register,
    logout,
    forgotPassword,
    updateUser,
    // Adicionar token ao contexto
    token: localStorage.getItem('authToken'),
    // Verificar se usuário está autenticado
    isAuthenticated: !!user,
    // Expor o authService para uso direto quando necessário
    authService
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook para usar o contexto de autenticação
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;