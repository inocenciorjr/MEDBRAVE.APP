import { fetchWithAuth, parseResponse } from './baseService';

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  displayName?: string;
  photoURL?: string;
}

/**
 * Verifica se o usuário atual está autenticado e é admin
 * @returns Dados do usuário se for admin, null caso contrário
 */
export async function verifyAdminAccess(): Promise<UserProfile | null> {
  try {
    const response = await fetchWithAuth('/api/user/me');
    const user: UserProfile = await parseResponse<UserProfile>(response);
    
    // Verificar se o usuário tem role de admin (case-insensitive)
    const role = user.role?.toUpperCase();
    
    if (role === 'ADMIN' || role === 'SUPERADMIN') {
      return user;
    }

    return null;
  } catch (error) {
    console.error('Erro ao verificar acesso admin:', error);
    return null;
  }
}

/**
 * Verifica se o usuário está autenticado (qualquer role)
 * @returns Dados do usuário se autenticado, null caso contrário
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const response = await fetchWithAuth('/api/user/me');
    const user: UserProfile = await parseResponse<UserProfile>(response);
    return user;
  } catch (error) {
    console.error('Erro ao buscar usuário atual:', error);
    return null;
  }
}
