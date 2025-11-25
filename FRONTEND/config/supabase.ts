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

import { createClient as createBrowserClient } from '@supabase/ssr';

/**
 * Cliente Supabase para uso em Client Components
 * 
 * @deprecated Use createClient() from '@/lib/supabase/client' instead
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
