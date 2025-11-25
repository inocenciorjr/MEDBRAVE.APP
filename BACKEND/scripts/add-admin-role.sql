-- Script para adicionar role admin a um usuário existente
-- Execute este script no SQL Editor do Supabase Dashboard

-- Opção 1: Adicionar role admin ao usuário inocencio_jr@hotmail.com
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'inocencio_jr@hotmail.com';

-- Verificar se foi atualizado
SELECT 
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data
FROM auth.users
WHERE email = 'inocencio_jr@hotmail.com';

-- OU

-- Opção 2: Criar um novo usuário admin
-- (Substitua o email e gere uma senha forte)
-- Nota: Você precisará confirmar o email depois

-- INSERT INTO auth.users (
--   instance_id,
--   id,
--   aud,
--   role,
--   email,
--   encrypted_password,
--   email_confirmed_at,
--   raw_user_meta_data,
--   created_at,
--   updated_at
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   gen_random_uuid(),
--   'authenticated',
--   'authenticated',
--   'admin@medbrave.com',
--   crypt('SuaSenhaForteAqui', gen_salt('bf')),
--   NOW(),
--   '{"role": "admin"}'::jsonb,
--   NOW(),
--   NOW()
-- );
