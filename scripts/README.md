# Scripts de Migração camelCase → snake_case

Scripts automatizados para resolver inconsistências de nomenclatura entre código e Supabase.

## 📋 Pré-requisitos

- Node.js 16+
- Supabase CLI (opcional)
- Acesso ao dashboard do Supabase

## 🚀 Instalação

```bash
cd scripts
npm install
```

## 📊 Uso dos Scripts

### 1. Migrar camelCase para snake_case

```bash
# Executar migração completa
npm run migrate:camel-to-snake

# Ou diretamente
node migrate-camel-to-snake.js
```

**O que faz:**
- ✅ Converte todas as referências camelCase para snake_case no código
- ✅ Gera arquivo SQL de migração para Supabase
- ✅ Atualiza propriedades em queries SQL
- ✅ Mantém comentários e formatação

### 2. Validar Schema após Migração

```bash
npm run validate:tables
```

**Verifica:**
- ✅ Nomenclatura snake_case em todas as colunas
- ✅ Consistência entre código e banco de dados
- ✅ Gera relatório de validação

### 3. Reverter (se necessário)

```bash
npm run rollback:snake-to-camel
```

## 📁 Arquivos Gerados

- `supabase/migrations/[timestamp]_migrate_camel_to_snake.sql` - SQL para Supabase
- `validation-report.json` - Relatório de validação
- `migration-backup/` - Backup automático (se implementado)

## 🗃️ Tabelas Afetadas

| Tabela | Colunas Migradas |
|--------|------------------|
| `flashcards` | user_id, deck_id, front_content, back_content, last_reviewed_at, next_review, review_count, lapse_count, created_at, updated_at |
| `decks` | user_id, is_public, flashcard_count, created_at, updated_at |
| `user_flashcard_interactions` | user_id, flashcard_id, created_at |
| `flashcard_review_history` | user_id, flashcard_id, review_time_ms, reviewed_at |

## ⚠️ Passos para Execução Completa

### 1. Executar no código
```bash
node migrate-camel-to-snake.js
```

### 2. Aplicar no Supabase

**Opção A: Via Dashboard**
1. Acesse: https://app.supabase.com/project/[seu-projeto]/sql
2. Copie o conteúdo do arquivo SQL gerado
3. Execute as queries

**Opção B: Via Supabase CLI**
```bash
supabase db reset --file supabase/migrations/[timestamp]_migrate_camel_to_snake.sql
```

### 3. Verificar
```bash
npm run validate:tables
```

## 🔧 Solução de Problemas

### Erro 500 persiste?
1. Verifique logs do Supabase
2. Execute validação: `npm run validate:tables`
3. Confirme se as políticas RLS foram atualizadas
4. Teste endpoints manualmente

### Coluna não encontrada?
1. Verifique o arquivo SQL gerado
2. Confirme se a coluna existe no Supabase
3. Verifique logs de migração

### Queries quebradas?
1. Verifique se todas as referências foram atualizadas
2. Teste queries individualmente
3. Use o relatório de validação

## 📞 Suporte

Se encontrar problemas:
1. Execute `npm run validate:tables`
2. Verifique `validation-report.json`
3. Revise logs do Supabase
4. Consulte documentação do Supabase

## 🔄 Próximos Passos

Após migração bem-sucedida:
- [ ] Atualizar documentação da API
- [ ] Verificar testes automatizados
- [ ] Atualizar exemplos de código
- [ ] Notificar equipe sobre mudanças