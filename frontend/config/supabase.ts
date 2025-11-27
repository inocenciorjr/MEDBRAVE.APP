/**
 * Configuração do cliente Supabase (DEPRECATED)
 * 
 * ⚠️ Este arquivo é mantido apenas para compatibilidade com código legado.
 * Para novos códigos, use:
 * - Client Components: import { createClient } from '@/lib/supabase/client'
 * - Server Components: import { createClient } from '@/lib/supabase/server'
 * - Middleware: import { createClient } from '@/lib/supabase/middleware'
 * 
 * @deprecated Use @/lib/supabase/client para Client Components
 * @module config/supabase
 */

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let _supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    // No servidor, retornar um mock que não faz nada
    return {
      auth: {},
      from: () => ({}),
    } as any;
  }

  if (!_supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      console.error('❌ Variáveis de ambiente do Supabase não encontradas!');
      console.error('NEXT_PUBLIC_SUPABASE_URL:', url);
      console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', key ? 'definida' : 'undefined');
    }

    _supabaseClient = createBrowserClient(
      url || '',
      key || ''
    );
  }

  return _supabaseClient;
}

/**
 * Cliente Supabase para uso em Client Components
 * Lazy initialization para evitar erros durante SSR
 * 
 * @deprecated Use createClient() from '@/lib/supabase/client' instead
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    
    // Se for uma função, fazer bind do contexto
    if (typeof value === 'function') {
      return value.bind(client);
    }
    
    return value;
  }
});
