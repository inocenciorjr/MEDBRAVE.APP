-- Versão do trigger com permissões adequadas para Supabase
-- Execute este código no SQL Editor do Supabase

-- Primeiro, criar a função com SECURITY DEFINER para usar privilégios do criador
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  display_name TEXT;
  username_slug TEXT;
BEGIN
  -- Extrair nome de exibição dos metadados
  display_name := COALESCE(
    NEW.raw_user_meta_data->>'name', 
    NEW.raw_user_meta_data->>'full_name', 
    split_part(NEW.email, '@', 1)
  );
  
  -- Gerar username slug único baseado no email
  username_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9]', '', 'g'));
  
  -- Inserir novo usuário na tabela public.users
  INSERT INTO public.users (
    id,
    email,
    "displayName",
    "usernameSlug",
    role,
    status,
    "emailVerified",
    "createdAt",
    "updatedAt",
    "lastLoginAt"
  )
  VALUES (
    NEW.id,
    NEW.email,
    display_name,
    username_slug,
    'student',
    'active',
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN true ELSE false END,
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Criar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Comentários
COMMENT ON FUNCTION public.handle_new_user() IS 'Função que cria automaticamente um registro na tabela public.users quando um novo usuário é criado via OAuth na tabela auth.users';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Trigger que executa a função handle_new_user() após inserção de novo usuário na auth.users';