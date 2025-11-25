import { createBrowserClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';

/**
 * Cria um cliente Supabase para uso em Client Components
 * Usa cookies e localStorage para persistir a sessão e PKCE verifier
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
