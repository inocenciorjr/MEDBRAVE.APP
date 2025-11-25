-- Script para migrar usuários existentes de auth.users para public.users
-- Execute APÓS aplicar o fix-trigger.sql

-- 1. Verificar usuários que estão em auth.users mas não em public.users
SELECT 
    au.id,
    au.email,
    au.created_at,
    'MISSING_IN_PUBLIC' as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- 2. Migrar usuários existentes de auth.users para public.users
INSERT INTO public.users (
    id,
    email,
    "displayName",
    "usernameSlug",
    role,
    "emailVerified",
    "created_at",
    "updated_at",
    "lastLoginAt",
    is_active
)
SELECT 
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'display_name',
        au.raw_user_meta_data->>'name', 
        au.raw_user_meta_data->>'full_name', 
        split_part(au.email, '@', 1)
    ) as "displayName",
    -- Gerar username slug único
    lower(regexp_replace(split_part(au.email, '@', 1), '[^a-zA-Z0-9]', '', 'g')) || 
    CASE 
        WHEN COUNT(*) OVER (PARTITION BY lower(regexp_replace(split_part(au.email, '@', 1), '[^a-zA-Z0-9]', '', 'g'))) > 1 
        THEN ROW_NUMBER() OVER (PARTITION BY lower(regexp_replace(split_part(au.email, '@', 1), '[^a-zA-Z0-9]', '', 'g')) ORDER BY au.created_at)::text
        ELSE ''
    END as "usernameSlug",
    'student' as role,
    CASE WHEN au.email_confirmed_at IS NOT NULL THEN true ELSE false END as "emailVerified",
    au.created_at as "created_at",
    NOW() as "updated_at",
    COALESCE(au.last_sign_in_at, au.created_at) as "lastLoginAt",
    true as is_active
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 3. Verificar resultado da migração
SELECT 
    'auth.users' as tabela,
    COUNT(*) as total_usuarios
FROM auth.users
UNION ALL
SELECT 
    'public.users' as tabela,
    COUNT(*) as total_usuarios
FROM public.users;

-- 4. Verificar se todos os usuários foram migrados
SELECT 
    CASE 
        WHEN COUNT(au.id) = 0 THEN 'TODOS OS USUÁRIOS MIGRADOS COM SUCESSO'
        ELSE 'AINDA EXISTEM ' || COUNT(au.id)::text || ' USUÁRIOS NÃO MIGRADOS'
    END as status_migracao
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;