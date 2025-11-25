-- Script para verificar se o trigger está funcionando
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se o trigger existe
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 2. Verificar se a função existe
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user' 
AND routine_schema = 'public';

-- 3. Contar usuários em auth.users
SELECT 
    'auth.users' as tabela,
    COUNT(*) as total_usuarios
FROM auth.users;

-- 4. Contar usuários em public.users
SELECT 
    'public.users' as tabela,
    COUNT(*) as total_usuarios
FROM public.users;

-- 5. Verificar usuários que estão em auth.users mas não em public.users
SELECT 
    au.id,
    au.email,
    au.created_at as auth_created_at,
    CASE WHEN pu.id IS NULL THEN 'MISSING' ELSE 'EXISTS' END as status_in_public_users
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC;

-- 6. Verificar últimos usuários criados em ambas as tabelas
SELECT 
    'Últimos usuários em auth.users' as info,
    id,
    email,
    created_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

SELECT 
    'Últimos usuários em public.users' as info,
    id,
    email,
    created_at
FROM public.users 
ORDER BY created_at DESC 
LIMIT 5;