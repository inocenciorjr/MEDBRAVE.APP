-- Migração para remover coluna firestore_id de todas as tabelas
-- Esta migração deve ser aplicada manualmente via Supabase Dashboard
-- Acesse: https://supabase.com/dashboard/project/yqlfgazngdymiprsrwvf/sql

-- 1. Remover coluna firestore_id da tabela flashcards
ALTER TABLE flashcards DROP COLUMN IF EXISTS firestore_id;

-- 2. Remover coluna firestore_id da tabela notifications
ALTER TABLE notifications DROP COLUMN IF EXISTS firestore_id;

-- 3. Remover coluna firestore_id da tabela test
ALTER TABLE test DROP COLUMN IF EXISTS firestore_id;

-- 4. Remover coluna firestore_id da tabela achievements
ALTER TABLE achievements DROP COLUMN IF EXISTS firestore_id;

-- 5. Remover coluna firestore_id da tabela analytics
ALTER TABLE analytics DROP COLUMN IF EXISTS firestore_id;

-- 6. Remover coluna firestore_id da tabela api_key_usage_logs
ALTER TABLE api_key_usage_logs DROP COLUMN IF EXISTS firestore_id;

-- 7. Remover coluna firestore_id da tabela api_keys
ALTER TABLE api_keys DROP COLUMN IF EXISTS firestore_id;

-- 8. Remover coluna firestore_id da tabela app_settings
ALTER TABLE app_settings DROP COLUMN IF EXISTS firestore_id;

-- 9. Remover coluna firestore_id da tabela articles
ALTER TABLE articles DROP COLUMN IF EXISTS firestore_id;

-- 10. Remover coluna firestore_id da tabela audit_logs
ALTER TABLE audit_logs DROP COLUMN IF EXISTS firestore_id;

-- 11. Remover coluna firestore_id da tabela backups
ALTER TABLE backups DROP COLUMN IF EXISTS firestore_id;

-- 12. Remover coluna firestore_id da tabela cache
ALTER TABLE cache DROP COLUMN IF EXISTS firestore_id;

-- 13. Remover coluna firestore_id da tabela collections
ALTER TABLE collections DROP COLUMN IF EXISTS firestore_id;

-- 14. Remover coluna firestore_id da tabela comments
ALTER TABLE comments DROP COLUMN IF EXISTS firestore_id;

-- 15. Remover coluna firestore_id da tabela content_reports
ALTER TABLE content_reports DROP COLUMN IF EXISTS firestore_id;

-- 16. Remover coluna firestore_id da tabela decks
ALTER TABLE decks DROP COLUMN IF EXISTS firestore_id;

-- 17. Remover coluna firestore_id da tabela flashcard_collections
ALTER TABLE flashcard_collections DROP COLUMN IF EXISTS firestore_id;

-- 18. Remover coluna firestore_id da tabela flashcard_sets
ALTER TABLE flashcard_sets DROP COLUMN IF EXISTS firestore_id;

-- 19. Remover coluna firestore_id da tabela folders
ALTER TABLE folders DROP COLUMN IF EXISTS firestore_id;

-- 20. Remover coluna firestore_id da tabela plans
ALTER TABLE plans DROP COLUMN IF EXISTS firestore_id;

-- 21. Remover coluna firestore_id da tabela profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS firestore_id;

-- 22. Remover coluna firestore_id da tabela progress
ALTER TABLE progress DROP COLUMN IF EXISTS firestore_id;

-- 23. Remover coluna firestore_id da tabela purchases
ALTER TABLE purchases DROP COLUMN IF EXISTS firestore_id;

-- 24. Remover coluna firestore_id da tabela quizzes
ALTER TABLE quizzes DROP COLUMN IF EXISTS firestore_id;

-- 25. Remover índices relacionados a firestore_id
DROP INDEX IF EXISTS idx_flashcards_firestore_id;
DROP INDEX IF EXISTS idx_notifications_firestore_id;
DROP INDEX IF EXISTS idx_test_firestore_id;

-- Comando para verificar se as colunas foram removidas com sucesso
-- SELECT table_name, column_name FROM information_schema.columns WHERE column_name = 'firestore_id';