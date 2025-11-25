-- Migração segura para remover coluna firestore_id apenas das tabelas existentes
-- Esta migração deve ser aplicada manualmente via Supabase Dashboard
-- Acesse: https://supabase.com/dashboard/project/yqlfgazngdymiprsrwvf/sql

-- Primeiro, verificar quais tabelas realmente possuem a coluna firestore_id
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name = 'firestore_id' 
AND table_schema = 'public';

-- Remover coluna firestore_id apenas das tabelas que existem e possuem a coluna
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'firestore_id' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS firestore_id;', tbl.table_name);
        RAISE NOTICE 'Removida coluna firestore_id da tabela %', tbl.table_name;
    END LOOP;
END $$;

-- Remover índices relacionados a firestore_id apenas se existirem
DROP INDEX IF EXISTS idx_flashcards_firestore_id;
DROP INDEX IF EXISTS idx_notifications_firestore_id;
DROP INDEX IF EXISTS idx_test_firestore_id;

-- Verificar se as colunas foram removidas com sucesso
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name = 'firestore_id' 
AND table_schema = 'public';