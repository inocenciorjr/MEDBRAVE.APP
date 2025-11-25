import axios from 'axios';

// URL base da API - usa variável de ambiente ou fallback para localhost
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Criar instância do axios com configurações padrão
const api = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60 segundos (aumentado para conexões via ngrok)
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  (config) => {
    // Verificar se estamos no cliente (browser)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Tratamento de erros comuns
    if (error.response) {
      // O servidor respondeu com um código de status diferente de 2xx
      console.error('Erro na resposta da API:', error.response.status, error.response.data);

      // Tratamento específico para erro 401 (não autorizado)
      if (error.response.status === 401) {
        // Limpar token inválido (apenas no cliente)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('authToken');
        }
      }
    } else if (error.request) {
      // A requisição foi feita mas não houve resposta
      console.error('Sem resposta da API:', error.request);
    } else {
      // Algo aconteceu na configuração da requisição
      console.error('Erro na configuração da requisição:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
