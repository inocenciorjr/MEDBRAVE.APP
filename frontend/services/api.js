import axios from 'axios';

// Detectar Edge Mobile
const isEdgeMobile = typeof navigator !== 'undefined' && 
  /Edg|Edge/i.test(navigator.userAgent) && 
  /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);

// URL base da API
// No Edge Mobile, SEMPRE usar proxy local (/api) para evitar problemas de CORS
const isDev = process.env.NODE_ENV === 'development';
const API_URL = isEdgeMobile 
  ? '/api'  // Proxy local - mesmo domínio, sem CORS
  : (process.env.NEXT_PUBLIC_API_URL || (isDev 
      ? 'http://localhost:5000/api' 
      : 'https://medbraveapp-production.up.railway.app/api'));

// Log para debug
if (typeof window !== 'undefined') {
  console.log('[API] Edge Mobile:', isEdgeMobile, 'API_URL:', API_URL);
}

// Criar instância do axios com configurações padrão
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
});

// Interceptor para adicionar token de autenticação
axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para tratamento de erros
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('Erro na resposta da API:', error.response.status, error.response.data);
      if (error.response.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
      }
    } else if (error.request) {
      console.error('Sem resposta da API:', error.request);
    } else {
      console.error('Erro na configuração da requisição:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * Wrapper de API que usa fetch nativo no Edge Mobile
 * O Axios/XMLHttpRequest pode falhar com "Network Error" no Edge Mobile
 */
const api = {
  async get(url, config = {}) {
    if (isEdgeMobile) {
      return this._fetchWrapper('GET', url, null, config);
    }
    return axiosInstance.get(url, config);
  },

  async post(url, data, config = {}) {
    if (isEdgeMobile) {
      return this._fetchWrapper('POST', url, data, config);
    }
    return axiosInstance.post(url, data, config);
  },

  async put(url, data, config = {}) {
    if (isEdgeMobile) {
      return this._fetchWrapper('PUT', url, data, config);
    }
    return axiosInstance.put(url, data, config);
  },

  async patch(url, data, config = {}) {
    if (isEdgeMobile) {
      return this._fetchWrapper('PATCH', url, data, config);
    }
    return axiosInstance.patch(url, data, config);
  },

  async delete(url, config = {}) {
    if (isEdgeMobile) {
      return this._fetchWrapper('DELETE', url, null, config);
    }
    return axiosInstance.delete(url, config);
  },

  async _fetchWrapper(method, url, data, config) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    
    const headers = {
      'Content-Type': 'application/json',
      ...(config.headers || {}),
    };
    
    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }

    const fullUrl = url.startsWith('http') ? url : `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    
    const fetchConfig = {
      method,
      headers,
      credentials: 'include',
    };

    if (data && method !== 'GET' && method !== 'DELETE') {
      fetchConfig.body = JSON.stringify(data);
    }

    const response = await fetch(fullUrl, fetchConfig);
    
    // Simular estrutura de resposta do Axios
    const responseData = await response.json().catch(() => null);
    
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.response = {
        status: response.status,
        data: responseData,
      };
      
      if (response.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
      }
      
      throw error;
    }

    return {
      data: responseData,
      status: response.status,
      headers: response.headers,
    };
  },

  // Manter compatibilidade com código que usa interceptors
  interceptors: axiosInstance.interceptors,
};

export default api;
