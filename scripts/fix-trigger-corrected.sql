-- Script corrigido para o trigger de criação de usuários
-- Execute este código no SQL Editor do Supabase

-- 1. Verificar estrutura atual da tabela users
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- 2. Remover trigger e função existentes
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Criar função corrigida para a estrutura atual da tabela
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Gerar username slug único
  DECLARE
    username_slug TEXT;
    base_slug TEXT;
    counter INTEGER := 0;
  BEGIN
    -- Criar slug base a partir do email
    base_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9]', '', 'g'));
    username_slug := base_slug;
    
    -- Verificar se já existe e adicionar número se necessário
    WHILE EXISTS (SELECT 1 FROM users WHERE "usernameSlug" = username_slug) LOOP
      counter := counter + 1;
      username_slug := base_slug || counter::text;
    END LOOP;
    
    -- Inserir novo usuário na tabela public.users com as colunas que existem
    INSERT INTO users (
      id,
      email,
      "displayName",
      "usernameSlug",
      role,
      "createdAt",
      "updatedAt",
      "lastLogin"
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'name', 
        NEW.raw_user_meta_data->>'full_name', 
        split_part(NEW.email, '@', 1)
      ),
      username_slug,
      'student',
      to_jsonb(NOW()),
      to_jsonb(NOW()),
      to_jsonb(NOW())
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      "displayName" = EXCLUDED."displayName",
      "updatedAt" = to_jsonb(NOW()),
      "lastLogin" = to_jsonb(NOW());
    
    RETURN NEW;
  END;
END;
$$;

-- 4. Criar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Verificar se foi criado corretamente
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 6. Testar contagem de usuários
SELECT 
    'Usuários em auth.users' as tabela,
    COUNT(*) as total
FROM auth.users
UNION ALL
SELECT 
    'Usuários em public.users' as tabela,
    COUNT(*) as total
FROM public.users;