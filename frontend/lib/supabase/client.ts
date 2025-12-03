import { createBrowserClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';

/**
 * Storage adapter híbrido que tenta múltiplas estratégias
 * Funciona em modo anônimo/privado onde localStorage pode falhar
 * 
 * Ordem de prioridade:
 * 1. sessionStorage (funciona em modo anônimo)
 * 2. localStorage (fallback)
 * 3. cookies (último recurso)
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

  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    
    // Tentar sessionStorage primeiro (funciona em modo anônimo)
    if (this.storageAvailable('sessionStorage')) {
      const value = sessionStorage.getItem(key);
      if (value) return value;
    }
    
    // Tentar localStorage
    if (this.storageAvailable('localStorage')) {
      const value = localStorage.getItem(key);
      if (value) return value;
    }
    
    // Tentar cookies como último recurso
    const value = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${key}=`))
      ?.split('=')[1];
    
    return value ? decodeURIComponent(value) : null;
  }

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    
    // Salvar em sessionStorage (prioridade - funciona em modo anônimo)
    if (this.storageAvailable('sessionStorage')) {
      try {
        sessionStorage.setItem(key, value);
      } catch (e) {
        // Silencioso
      }
    }
    
    // Salvar em localStorage também (fallback)
    if (this.storageAvailable('localStorage')) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        // Silencioso
      }
    }
    
    // Salvar em cookies também (último recurso)
    try {
      const maxAge = 3600; // 1 hora
      document.cookie = `${key}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; samesite=lax`;
    } catch (e) {
      // Silencioso
    }
  }

  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    
    // Remover de sessionStorage
    if (this.storageAvailable('sessionStorage')) {
      sessionStorage.removeItem(key);
    }
    
    // Remover de localStorage
    if (this.storageAvailable('localStorage')) {
      localStorage.removeItem(key);
    }
    
    // Remover de cookies
    document.cookie = `${key}=; max-age=0; path=/`;
  }
}

// Singleton para garantir uma única instância do cliente
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

// Intervalo de refresh proativo
let refreshInterval: NodeJS.Timeout | null = null;

/**
 * Cria um cliente Supabase para uso em Client Components
 * Usa cookies para persistir sessão E PKCE verifier (funciona em modo anônimo)
 * 
 * IMPORTANTE: Retorna sempre a mesma instância (singleton) para evitar
 * problemas de sincronização de estado entre componentes
 */
export function createClient() {
  if (supabaseClient) {
    return supabaseClient;
  }
  
  supabaseClient = createBrowserClient(
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
  
  // Iniciar refresh proativo em background (a cada 50 minutos)
  // Isso garante que o token seja renovado mesmo se o usuário não fizer chamadas diretas ao Supabase
  if (typeof window !== 'undefined' && !refreshInterval) {
    refreshInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabaseClient!.auth.getSession();
        if (session) {
          const expiresAt = session.expires_at;
          const now = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = expiresAt ? expiresAt - now : 0;
          
          // Se expira em menos de 10 minutos, renovar
          if (timeUntilExpiry < 600) {
            console.log('🔄 [Supabase] Refresh proativo do token...');
            const { error } = await supabaseClient!.auth.refreshSession();
            if (error) {
              console.error('❌ [Supabase] Erro no refresh proativo:', error);
            } else {
              console.log('✅ [Supabase] Token renovado proativamente');
            }
          }
        }
      } catch (e) {
        console.error('❌ [Supabase] Erro no refresh proativo:', e);
      }
    }, 50 * 60 * 1000); // A cada 50 minutos
  }
  
  return supabaseClient;
}
