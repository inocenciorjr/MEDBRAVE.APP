import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AppError from '../utils/AppError';

// Configurações do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new AppError(
    'Supabase configuration is missing. Please check your environment variables.',
    500,
  );
}

// Cliente Supabase com service role para operações administrativas
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Cliente Supabase para operações públicas
const supabaseAnon: SupabaseClient = createClient(
  supabaseUrl,
  process.env.SUPABASE_ANON_KEY || '',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  },
);

// Funções utilitárias
export const auth = {
  // Criar usuário
  async createUser(email: string, password: string, userData?: any) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: userData,
    });

    if (error) {
      throw new AppError(`Failed to create user: ${error.message}`, 400);
    }

    return data;
  },

  // Deletar usuário
  async deleteUser(userId: string) {
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      throw new AppError(`Failed to delete user: ${error.message}`, 400);
    }
  },

  // Verificar token
  async verifyToken(token: string) {
    const { data, error } = await supabase.auth.getUser(token);

    if (error) {
      throw new AppError(`Invalid token: ${error.message}`, 401);
    }

    return data;
  },
};

export const storage = {
  // Upload de arquivo
  async uploadFile(
    bucket: string,
    path: string,
    file: Buffer | File,
    options?: any,
  ) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, options);

    if (error) {
      throw new AppError(`Failed to upload file: ${error.message}`, 400);
    }

    return data;
  },

  // Download de arquivo
  async downloadFile(bucket: string, path: string) {
    const { data, error } = await supabase.storage.from(bucket).download(path);

    if (error) {
      throw new AppError(`Failed to download file: ${error.message}`, 400);
    }

    return data;
  },

  // Deletar arquivo
  async deleteFile(bucket: string, paths: string[]) {
    const { error } = await supabase.storage.from(bucket).remove(paths);

    if (error) {
      throw new AppError(`Failed to delete file: ${error.message}`, 400);
    }
  },

  // Obter URL pública
  getPublicUrl(bucket: string, path: string) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);

    return data.publicUrl;
  },
};

// Exportar clientes
export { supabase, supabaseAnon };
export default supabase;
