import authService from './authService';

// Função simplificada para requisições autenticadas
export async function fetchWithAuth(input, init = {}) {
  const token = authService.getToken();
  
  if (!token) {
    throw new Error('Usuário não autenticado');
  }

  let url = typeof input === 'string' ? input : input.toString();

  // Garantir que a URL sempre use localhost:5000 para API
  if (!url.startsWith('http')) {
    if (!url.startsWith('/api')) {
    url = `/api${url.startsWith('/') ? '' : '/'}${url}`;
    }
    url = `http://localhost:5000${url}`;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    ...(init.headers || {}),
  };

  // Se há body e não é FormData, definir Content-Type
  if (init.body && !(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...init,
      headers
    });
  
  if (response.status === 401) {
    // Token expirado, tentar renovação
    try {
      const refreshResult = await authService.refreshToken();
      
      if (!refreshResult) {
        authService.logout();
        throw new Error('Falha na renovação do token');
      }
      
      const newToken = authService.getToken();

      // Garantir URL completa para retry
      const retryUrl = url.startsWith('http') ? url : `http://localhost:5000${url}`;
      
      const retryResponse = await fetch(retryUrl, {
        ...init,
        headers: {
          'Authorization': `Bearer ${newToken}`,
          ...init.headers,
          ...(init.body && !(init.body instanceof FormData) && { 'Content-Type': 'application/json' }),
        },
      });
      
      return retryResponse;
    } catch (refreshError) {
      // Se falhar na renovação, fazer logout
      authService.logout();
      throw new Error('Sessão expirada');
    }
  }

  return response;
  } catch (error) {
    throw error;
  }
}

export default fetchWithAuth;