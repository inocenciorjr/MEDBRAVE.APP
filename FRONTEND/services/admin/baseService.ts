/**
 * Base service with utility functions for admin API calls
 */

import type { ApiResponse } from '@/types/admin/common';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get Supabase auth token from localStorage
 */
function getSupabaseToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    // 1. Tentar authToken direto (salvo pelo callback)
    const directToken = localStorage.getItem('authToken');
    if (directToken) {
      console.log('[getSupabaseToken] Token encontrado em authToken');
      return directToken;
    }
    
    // 2. Tentar formato novo do Supabase: supabase.auth.token
    let authData = localStorage.getItem('supabase.auth.token');
    
    // 3. Se não encontrar, tentar formato antigo: sb-<project-ref>-auth-token
    if (!authData) {
      const keys = Object.keys(localStorage);
      const supabaseKey = keys.find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
      if (supabaseKey) {
        authData = localStorage.getItem(supabaseKey);
      }
    }
    
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.access_token || null;
    }
  } catch (error) {
    console.error('[getSupabaseToken] Error getting Supabase token:', error);
  }
  
  console.warn('[getSupabaseToken] Nenhum token encontrado no localStorage');
  return null;
}

/**
 * Enhanced fetch with authentication and error handling
 */
export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {},
  retries = 0
): Promise<Response> {
  try {
    // Get auth token from Supabase
    const token = getSupabaseToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Build URL - if endpoint starts with /, use it as is, otherwise prepend API_BASE_URL
    const url = endpoint.startsWith('http') 
      ? endpoint 
      : endpoint.startsWith('/') 
        ? endpoint  // Endpoint já tem / no início, use direto
        : `${API_BASE_URL}/${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle authentication errors
    if (response.status === 401) {
      // Clear auth and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
      throw new ApiError('Unauthorized', 401);
    }

    // Handle forbidden errors
    if (response.status === 403) {
      throw new ApiError('Forbidden - insufficient permissions', 403);
    }

    // Handle not found errors
    if (response.status === 404) {
      throw new ApiError('Resource not found', 404);
    }

    // Handle server errors with retry logic
    if (response.status >= 500 && retries < MAX_RETRIES) {
      console.warn(`Server error, retrying... (${retries + 1}/${MAX_RETRIES})`);
      await sleep(RETRY_DELAY * (retries + 1));
      return fetchWithAuth(endpoint, options, retries + 1);
    }

    return response;
  } catch (error) {
    // Network errors - retry
    if (retries < MAX_RETRIES && error instanceof TypeError) {
      console.warn(`Network error, retrying... (${retries + 1}/${MAX_RETRIES})`);
      await sleep(RETRY_DELAY * (retries + 1));
      return fetchWithAuth(endpoint, options, retries + 1);
    }

    throw error;
  }
}

/**
 * Parse API response with error handling
 */
export async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  
  if (contentType?.includes('application/json')) {
    const data = await response.json();
    
    if (!response.ok) {
      throw new ApiError(
        data.message || data.error || 'An error occurred',
        response.status,
        data
      );
    }
    
    return data;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(text || 'An error occurred', response.status);
  }

  return response.text() as any;
}

/**
 * GET request helper
 */
export async function get<T>(endpoint: string): Promise<T> {
  const response = await fetchWithAuth(endpoint, { method: 'GET' });
  return parseResponse<T>(response);
}

/**
 * POST request helper
 */
export async function post<T>(endpoint: string, data?: any): Promise<T> {
  const response = await fetchWithAuth(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
  return parseResponse<T>(response);
}

/**
 * PUT request helper
 */
export async function put<T>(endpoint: string, data?: any): Promise<T> {
  const response = await fetchWithAuth(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
  return parseResponse<T>(response);
}

/**
 * PATCH request helper
 */
export async function patch<T>(endpoint: string, data?: any): Promise<T> {
  const response = await fetchWithAuth(endpoint, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
  return parseResponse<T>(response);
}

/**
 * DELETE request helper
 */
export async function del<T>(endpoint: string): Promise<T> {
  const response = await fetchWithAuth(endpoint, { method: 'DELETE' });
  return parseResponse<T>(response);
}

/**
 * Build query string from params object
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}
