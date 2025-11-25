-- Script para limpeza completa do banco de dados
-- Remove todos os dados de teste e redefine para instalação limpa

-- 0. Limpar tabela auth.users (exceto admin se existir)
DELETE FROM auth.users WHERE email != 'admin@medbrave.com';

-- 1. Remover todos os dados das tabelas principais
DELETE FROM reviews;
DELETE FROM flashcards;
DELETE FROM decks;
DELETE FROM collections;
DELETE FROM "userProfiles";
DELETE FROM users WHERE email != 'admin@medbrave.com'; -- Manter apenas admin se existir

-- 2. Remover dados de sessões e notificações
DELETE FROM sessions;
DELETE FROM notifications;
DELETE FROM analytics;

-- 3. Remover dados de conquistas e progresso
DELETE FROM achievements;
DELETE FROM "apiKeys";

-- 4. Limpar tabela de usernames - REMOVIDO (tabela não existe mais)
-- DELETE FROM usernames WHERE username != 'admin';

-- 5. Resetar sequências se existirem
-- (Adicionar conforme necessário baseado na estrutura)

-- 6. Verificar se as políticas RLS estão ativas
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'decks', 'flashcards', 'collections', 'reviews');

-- 7. Verificar estrutura das tabelas após limpeza
SELECT 
  'users' as tabela, COUNT(*) as registros FROM users
UNION ALL
SELECT 
  'decks' as tabela, COUNT(*) as registros FROM decks
UNION ALL
SELECT 
  'flashcards' as tabela, COUNT(*) as registros FROM flashcards
UNION ALL
SELECT 
  'collections' as tabela, COUNT(*) as registros FROM collections
UNION ALL
SELECT 
  'reviews' as tabela, COUNT(*) as registros FROM reviews;