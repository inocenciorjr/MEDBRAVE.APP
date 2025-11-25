-- Script para remover a tabela usernames e suas políticas RLS
-- Execute este script no Supabase SQL Editor

-- 1. Remover políticas RLS da tabela usernames
DROP POLICY IF EXISTS "Users can view own usernames" ON public.usernames;
DROP POLICY IF EXISTS "Users can create own usernames" ON public.usernames;

-- 2. Remover a tabela usernames
DROP TABLE IF EXISTS public.usernames;

-- 3. Verificar se a tabela foi removida
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'usernames';

-- Se não retornar nenhuma linha, a tabela foi removida com sucesso