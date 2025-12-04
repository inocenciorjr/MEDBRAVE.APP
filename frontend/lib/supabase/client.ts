import { createBrowserClient } from '@supabase/ssr';

/**
 * Cria um cliente Supabase para uso em Client Components
 * Usa o storage padrão (localStorage) - funciona em todos os navegadores
 * Nota: Não funciona em modo anônimo/privado
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  );
}
