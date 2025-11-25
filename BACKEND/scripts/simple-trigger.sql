-- Versão simplificada do trigger que funciona sem permissões especiais
-- Execute este código no SQL Editor do Supabase

-- 1. Primeiro, criar a função usando o role service_role
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Inserir novo usuário na tabela public.users usando INSERT simples
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
    COALESCE(
      NEW.raw_user_meta_data->>'name', 
      NEW.raw_user_meta_data->>'full_name', 
      split_part(NEW.email, '@', 1)
    ),
    lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9]', '', 'g')),
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

-- 2. Remover trigger existente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Criar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION handle_new_user();

-- 4. Verificar se o trigger foi criado
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';