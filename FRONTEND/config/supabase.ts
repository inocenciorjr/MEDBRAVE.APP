/**
 * Configuração do cliente Supabase
 * 
 * Este módulo configura e exporta uma instância única do cliente Supabase
 * para ser utilizada em toda a aplicação. A configuração inclui:
 * - Auto-refresh automático de tokens
 * - Persistência de sessão no localStorage
 * - Detecção de sessão em URLs (para OAuth callbacks)
 * 
 * @module config/supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * URL do projeto Supabase
 * Deve ser definida na variável de ambiente NEXT_PUBLIC_SUPABASE_URL
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

/**
 * Chave anônima (pública) do Supabase
 * Deve ser definida na variável de ambiente NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Validação de variáveis de ambiente obrigatórias
 * Exibe aviso no console se alguma variável estiver faltando
 */
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ [Supabase Config] Variáveis de ambiente faltando. ' +
    'Verifique se NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY estão definidas.'
  );
}

/**
 * Cliente Supabase configurado e pronto para uso
 * 
 * Configurações:
 * - persistSession: true - Mantém a sessão no localStorage
 * - autoRefreshToken: true - Renova tokens automaticamente antes de expirar
 * - detectSessionInUrl: true - Detecta sessão em URLs de callback OAuth
 * 
 * @example
 * ```typescript
 * import { supabase } from '@/config/supabase';
 * 
 * // Obter usuário atual
 * const { data: { user } } = await supabase.auth.getUser();
 * 
 * // Fazer query no banco
 * const { data, error } = await supabase
 *   .from('users')
 *   .select('*');
 * ```
 */
/**
 * Storage híbrido que salva tanto em localStorage quanto em cookies
 * Necessário para SSR funcionar corretamente
 */
const hybridStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    
    // Salvar no localStorage
    window.localStorage.setItem(key, value);
    
    // TAMBÉM salvar nos cookies para SSR
    try {
      const data = JSON.parse(value);
      if (data.access_token) {
        document.cookie = `sb-access-token=${data.access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        
        if (data.refresh_token) {
          document.cookie = `sb-refresh-token=${data.refresh_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        }
      }
    } catch (e) {
      // Ignorar erros de parse
    }
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    
    window.localStorage.removeItem(key);
    
    document.cookie = 'sb-access-token=; path=/; max-age=0';
    document.cookie = 'sb-refresh-token=; path=/; max-age=0';
  },
};

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token',
    storage: hybridStorage,
  },
});
