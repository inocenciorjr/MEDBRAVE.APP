/**
 * Tipos TypeScript para o sistema de autenticação
 * 
 * Este arquivo centraliza todas as definições de tipos relacionadas à autenticação,
 * incluindo modelos de usuário, estado de autenticação, credenciais e estatísticas.
 */

/**
 * Representa um usuário autenticado no sistema
 */
export interface User {
  /** ID único do usuário no Supabase */
  uid: string;
  
  /** Endereço de email do usuário */
  email: string;
  
  /** Nome de exibição do usuário */
  displayName: string;
  
  /** URL da foto de perfil do usuário (pode ser null) */
  photoURL: string | null;
  
  /** Indica se o email do usuário foi verificado */
  emailVerified: boolean;
  
  /** Role/papel do usuário no sistema */
  role: 'student' | 'admin' | 'teacher';
}

/**
 * Estado completo de autenticação da aplicação
 */
export interface AuthState {
  /** Usuário atualmente autenticado (null se não autenticado) */
  user: User | null;
  
  /** Indica se o estado de autenticação está sendo carregado */
  loading: boolean;
  
  /** Mensagem de erro de autenticação (null se não houver erro) */
  error: string | null;
  
  /** Token JWT atual (null se não autenticado) */
  token: string | null;
  
  /** Indica se há um usuário autenticado */
  isAuthenticated: boolean;
}

/**
 * Credenciais para login com email e senha
 */
export interface LoginCredentials {
  /** Endereço de email do usuário */
  email: string;
  
  /** Senha do usuário */
  password: string;
}

/**
 * Dados necessários para registro de novo usuário
 */
export interface RegisterData {
  /** Endereço de email do novo usuário */
  email: string;
  
  /** Senha do novo usuário */
  password: string;
  
  /** Nome de exibição do novo usuário */
  displayName: string;
}

/**
 * Estrutura de cache de tokens com timestamp e promise de refresh
 */
export interface TokenCache {
  /** Token JWT armazenado */
  token: string;
  
  /** Timestamp de quando o token foi armazenado */
  timestamp: number;
  
  /** Promise de refresh em andamento (opcional) */
  refreshPromise?: Promise<string>;
}

/**
 * Estatísticas de performance do sistema de requisições autenticadas
 */
export interface FetchStats {
  /** Número total de requisições feitas */
  requests: number;
  
  /** Número de requisições servidas do cache */
  cacheHits: number;
  
  /** Número de vezes que o token foi renovado */
  tokenRefreshes: number;
  
  /** Número de erros ocorridos */
  errors: number;
  
  /** Tempo médio de resposta em milissegundos */
  avgResponseTime: number;
  
  /** Taxa de cache hits em porcentagem */
  cacheHitRate: number;
  
  /** Taxa de erros em porcentagem */
  errorRate: number;
  
  /** Tamanho atual do pool de requisições */
  poolSize: number;
  
  /** Tamanho atual do cache de tokens */
  tokenCacheSize: number;
}

/**
 * Resultado de uma operação de autenticação bem-sucedida
 */
export interface AuthResult {
  /** Usuário autenticado */
  user: User;
  
  /** Token JWT gerado */
  token: string;
}

/**
 * Dados do usuário retornados pelo backend
 */
export interface BackendUserData {
  /** Role do usuário */
  role: 'student' | 'admin' | 'teacher';
  
  /** Dados adicionais do usuário */
  [key: string]: any;
}
