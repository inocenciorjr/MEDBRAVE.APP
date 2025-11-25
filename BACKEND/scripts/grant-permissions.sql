-- Script para conceder permissões de proprietário no Supabase
-- Execute este código PRIMEIRO no SQL Editor do Supabase

-- 1. Conceder permissões de superusuário para sua conta (substitua pelo seu email)
-- IMPORTANTE: Substitua 'seu-email@exemplo.com' pelo seu email real
ALTER USER authenticated SET role = 'postgres';

-- 2. Conceder todas as permissões na tabela users
GRANT ALL PRIVILEGES ON TABLE public.users TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.users TO postgres;
GRANT ALL PRIVILEGES ON TABLE public.users TO service_role;

-- 3. Conceder permissões no esquema auth
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT ALL PRIVILEGES ON TABLE auth.users TO authenticated;

-- 4. Conceder permissões para criar triggers
GRANT CREATE ON SCHEMA public TO authenticated;
GRANT CREATE ON SCHEMA auth TO authenticated;

-- 5. Conceder permissões para executar funções
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO authenticated;

-- 6. Tornar você proprietário da tabela users
-- IMPORTANTE: Substitua 'seu-email@exemplo.com' pelo seu email real
-- ALTER TABLE public.users OWNER TO "seu-email@exemplo.com";

-- Alternativa mais simples: usar service_role
ALTER TABLE public.users OWNER TO postgres;

-- 7. Verificar permissões atuais
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'users';

-- 8. Listar roles disponíveis
SELECT rolname FROM pg_roles WHERE rolcanlogin = true;