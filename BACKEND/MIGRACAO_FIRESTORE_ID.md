# Guia de Migração - Remoção da Coluna firestore_id

## 📋 Situação Atual
A coluna `firestore_id` ainda existe em várias tabelas do banco de dados, causando valores nulos e inconsistências. Esta migração remove completamente essa coluna.

## 🔗 Acesso ao Projeto
- **ID do Projeto**: `yqlfgazngdymiprsrwvf`
- **URL do Dashboard**: https://supabase.com/dashboard/project/yqlfgazngdymiprsrwvf

## 📊 Tabelas Afetadas
As seguintes tabelas terão a coluna `firestore_id` removida:
- flashcards
- notifications
- test
- achievements
- analytics
- api_key_usage_logs
- api_keys
- app_settings
- articles
- audit_logs
- backups
- cache
- collections
- comments
- content_reports
- decks
- flashcard_collections
- flashcard_sets
- folders
- plans
- profiles
- progress
- purchases
- quizzes

## 🚀 Passo a Passo para Aplicar a Migração

### Opção 1: Via Dashboard (Recomendado)
1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard/project/yqlfgazngdymiprsrwvf/sql)
2. Cole o conteúdo do arquivo `scripts/remove_firestore_id_migration.sql`
3. Clique em "Run" para executar todas as queries

### Opção 2: Via CLI (se a conexão for restaurada)
```bash
# No diretório BACKEND
npx supabase db push --linked
```

## ✅ Verificação
Após aplicar a migração, execute esta query para confirmar:
```sql
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name = 'firestore_id';
-- Deve retornar 0 resultados
```

## 🔄 Próximos Passos
1. Após a migração, gere novos tipos TypeScript:
   ```bash
   npx supabase gen types typescript --project-id yqlfgazngdymiprsrwvf --schema public > src/types/database.types.ts
   ```

2. Atualize os arquivos de configuração que referenciam firestore_id

## 📁 Arquivos Importantes
- `scripts/remove_firestore_id_migration.sql` - Script SQL completo
- `src/types/database.types.ts` - Tipos TypeScript (será atualizado após migração)