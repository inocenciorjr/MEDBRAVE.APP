/**
 * Base service with utility functions for admin API calls
 */

import type { ApiResponse } from '@/types/admin/common';
import { fetchWithAuth as fetchWithAuthUtil } from '@/lib/utils/fetchWithAuth';

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
 * Enhanced fetch with authentication and error handling
 * Usa o fetchWithAuth centralizado que gerencia tokens automaticamente
 */
export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {},
  retries = 0
): Promise<Response> {
  try {
    // Usar o fetchWithAuth centralizado que já gerencia tokens e retry
    const response = await fetchWithAuthUtil(endpoint, options);

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
