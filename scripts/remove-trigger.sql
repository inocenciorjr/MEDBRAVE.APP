-- Script para remover o trigger on_auth_user_created
-- Execute este script no SQL Editor do Supabase

-- Remover o trigger on_auth_user_created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remover a função handle_new_user (opcional)
DROP FUNCTION IF EXISTS handle_new_user();

-- Verificar se o trigger foi removido
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Verificar se a função foi removida
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- Verificar contagem de usuários nas tabelas
SELECT 'auth.users' as tabela, COUNT(*) as total FROM auth.users
UNION ALL
SELECT 'public.users' as tabela, COUNT(*) as total FROM public.users;