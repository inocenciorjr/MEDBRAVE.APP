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

/**
 * Cliente Supabase para uso em Client Components
 * Lazy initialization para evitar erros durante SSR
 * 
 * @deprecated Use createClient() from '@/lib/supabase/client' instead
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    // Inicializar cliente apenas quando usado
    if (!_supabaseClient) {
      _supabaseClient = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }
    return (_supabaseClient as any)[prop];
  }
});
