import { createBrowserClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';

/**
 * Storage adapter que usa cookies para PKCE verifier
 * Funciona em modo anônimo/privado onde localStorage pode falhar
 */
class CookieStorageAdapter {
  getItem(key: string): string | null {
    if (typeof document === 'undefined') return null;
    
    const value = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${key}=`))
      ?.split('=')[1];
    
    return value ? decodeURIComponent(value) : null;
  }

  setItem(key: string, value: string): void {
    if (typeof document === 'undefined') return;
    
    // Cookies com 1 hora de expiração para PKCE verifier
    const maxAge = 3600; // 1 hora
    document.cookie = `${key}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; samesite=lax; secure`;
  }

  removeItem(key: string): void {
    if (typeof document === 'undefined') return;
    
    document.cookie = `${key}=; max-age=0; path=/`;
  }
}

/**
 * Cria um cliente Supabase para uso em Client Components
 * Usa cookies para persistir sessão E PKCE verifier (funciona em modo anônimo)
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Usar cookies em vez de localStorage para PKCE
        storage: new CookieStorageAdapter() as any,
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
      cookies: {
        get(name: string) {
          // Ler cookie do browser
          if (typeof document === 'undefined') return undefined;
          
          const value = document.cookie
            .split('; ')
            .find(row => row.startsWith(`${name}=`))
            ?.split('=')[1];
          
          return value ? decodeURIComponent(value) : undefined;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Escrever cookie no browser
          if (typeof document === 'undefined') return;
          
          let cookie = `${name}=${encodeURIComponent(value)}`;
          
          if (options.maxAge) {
            cookie += `; max-age=${options.maxAge}`;
          }
          if (options.path) {
            cookie += `; path=${options.path}`;
          }
          if (options.domain) {
            cookie += `; domain=${options.domain}`;
          }
          if (options.sameSite) {
            cookie += `; samesite=${options.sameSite}`;
          }
          if (options.secure) {
            cookie += '; secure';
          }
          
          document.cookie = cookie;
        },
        remove(name: string, options: CookieOptions) {
          // Remover cookie do browser
          if (typeof document === 'undefined') return;
          
          let cookie = `${name}=; max-age=0`;
          
          if (options.path) {
            cookie += `; path=${options.path}`;
          }
          if (options.domain) {
            cookie += `; domain=${options.domain}`;
          }
          
          document.cookie = cookie;
        }
      }
    }
  );
}
