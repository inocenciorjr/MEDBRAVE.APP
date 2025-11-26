/**
 * Configuração centralizada de URLs do backend
 * Detecta automaticamente se está em desenvolvimento ou produção
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isServer = typeof window === 'undefined';

/**
 * URL do backend - usa localhost em dev, Railway em produção
 */
export const BACKEND_URL = isDevelopment
  ? 'http://localhost:5000'
  : (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://medbraveapp-production.up.railway.app');

/**
 * URL da API - adiciona /api ao backend URL
 */
export const API_URL = `${BACKEND_URL}/api`;

/**
 * Log da configuração (apenas no servidor para não poluir o console do browser)
 */
if (isServer) {
  console.log('[Config] Environment:', process.env.NODE_ENV);
  console.log('[Config] Backend URL:', BACKEND_URL);
  console.log('[Config] API URL:', API_URL);
}
