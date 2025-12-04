import { createBrowserClient } from '@supabase/ssr';

/**
 * Storage que salva PKCE code_verifier em cookies (funciona no Edge Mobile)
 * e outras chaves em localStorage
 */
class PkceStorage {
  private isPkceKey(key: string): boolean {
    return key.includes('code-verifier') || key.includes('code_verifier');
  }

  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    
    // PKCE: verificar cookie primeiro
    if (this.isPkceKey(key)) {
      const match = document.cookie.split('; ').find(row => row.startsWith(`${key}=`));
      if (match) {
        const value = match.split('=')[1];
        return value ? decodeURIComponent(value) : null;
      }
    }
    
    // Fallback para localStorage
    return localStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    
    // PKCE: salvar em cookie (persiste entre redirects)
    if (this.isPkceKey(key)) {
      document.cookie = `${key}=${encodeURIComponent(value)}; max-age=3600; path=/; samesite=lax`;
    }
    
    // Sempre salvar em localStorage também
    try {
      localStorage.setItem(key, value);
    } catch {}
  }

  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    
    // Remover cookie
    document.cookie = `${key}=; max-age=0; path=/`;
    
    // Remover localStorage
    try {
      localStorage.removeItem(key);
    } catch {}
  }
}

/**
 * Cria um cliente Supabase para uso em Client Components
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: new PkceStorage(),
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  );
}
