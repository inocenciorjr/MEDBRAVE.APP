import { createBrowserClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';

/**
 * Storage adapter que PRIORIZA COOKIES para PKCE
 * 
 * PROBLEMA: Edge Mobile perde sessionStorage/localStorage entre redirects OAuth
 * SOLUÇÃO: Cookies persistem entre redirects em TODOS os navegadores
 * 
 * Para chaves PKCE (code_verifier): Cookie PRIMEIRO
 * Para outras chaves: sessionStorage/localStorage primeiro
 */
class HybridStorageAdapter {
  private storageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
    try {
      const storage = window[type];
      const test = '__storage_test__';
      storage.setItem(test, test);
      storage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  private isPkceKey(key: string): boolean {
    // Chaves PKCE do Supabase contêm "code-verifier" ou "code_verifier"
    return key.includes('code-verifier') || key.includes('code_verifier');
  }

  private getCookie(key: string): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${key}=`));
    if (!match) return null;
    const value = match.split('=')[1];
    return value ? decodeURIComponent(value) : null;
  }

  private setCookie(key: string, value: string): void {
    if (typeof document === 'undefined') return;
    // SameSite=Lax permite cookies em redirects OAuth
    document.cookie = `${key}=${encodeURIComponent(value)}; max-age=3600; path=/; samesite=lax`;
  }

  private removeCookie(key: string): void {
    if (typeof document === 'undefined') return;
    document.cookie = `${key}=; max-age=0; path=/`;
  }

  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    
    // Para PKCE: verificar cookie PRIMEIRO (mais confiável entre redirects)
    if (this.isPkceKey(key)) {
      const cookieValue = this.getCookie(key);
      if (cookieValue) return cookieValue;
    }
    
    // Tentar sessionStorage
    if (this.storageAvailable('sessionStorage')) {
      const value = sessionStorage.getItem(key);
      if (value) return value;
    }
    
    // Tentar localStorage
    if (this.storageAvailable('localStorage')) {
      const value = localStorage.getItem(key);
      if (value) return value;
    }
    
    // Fallback para cookie (para chaves não-PKCE)
    if (!this.isPkceKey(key)) {
      return this.getCookie(key);
    }
    
    return null;
  }

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    
    // Para PKCE: SEMPRE salvar em cookie (mais confiável entre redirects)
    if (this.isPkceKey(key)) {
      this.setCookie(key, value);
    }
    
    // Salvar em sessionStorage
    if (this.storageAvailable('sessionStorage')) {
      try {
        sessionStorage.setItem(key, value);
      } catch (e) {
        // Silencioso
      }
    }
    
    // Salvar em localStorage
    if (this.storageAvailable('localStorage')) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        // Silencioso
      }
    }
    
    // Para não-PKCE: também salvar em cookie como backup
    if (!this.isPkceKey(key)) {
      try {
        this.setCookie(key, value);
      } catch (e) {
        // Silencioso
      }
    }
  }

  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    
    // Remover de todos os storages
    if (this.storageAvailable('sessionStorage')) {
      sessionStorage.removeItem(key);
    }
    
    if (this.storageAvailable('localStorage')) {
      localStorage.removeItem(key);
    }
    
    this.removeCookie(key);
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
        // Usar storage híbrido para PKCE (funciona em modo anônimo)
        storage: new HybridStorageAdapter() as any,
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
