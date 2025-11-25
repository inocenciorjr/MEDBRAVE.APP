# Correção das Tabelas Admin - Supabase

## Problema Identificado

O erro `Could not find the table 'public.admins' in the schema cache` ocorria porque as tabelas `admins` e `admin_actions` nunca foram criadas no banco de dados Supabase, apesar do código backend estar tentando acessá-las.

## Análise

1. **Código existente**: O `SupabaseAdminService.ts` estava tentando acessar as tabelas `admins` e `admin_actions`
2. **Tipos definidos**: Os tipos `AdminUser` e `AdminAction` estavam definidos em `BACKEND/src/domain/admin/types/AdminTypes.ts`
3. **Migrations ausentes**: Não havia nenhuma migration SQL criando essas tabelas
4. **Tabelas não existiam**: Verificação no Supabase confirmou que as tabelas não existiam

## Solução Implementada

### 1. Migration Criada

Arquivo: `BACKEND/supabase/migrations/20250201000001_create_admin_tables.sql`

Criou as seguintes tabelas:

#### Tabela `admins`
- `id` (UUID, PK): Identificador único do admin
- `user_id` (UUID, FK → auth.users): Referência ao usuário autenticado
- `role` (VARCHAR): 'admin' ou 'superadmin'
- `permissions` (JSONB): Array de permissões
- `is_active` (BOOLEAN): Status ativo/inativo
- `created_by` (UUID, FK → auth.users): Quem criou o admin
- `created_at` (TIMESTAMPTZ): Data de criação
- `updated_at` (TIMESTAMPTZ): Data de atualização

#### Tabela `admin_actions`
- `id` (UUID, PK): Identificador único da ação
- `type` (VARCHAR): Tipo de ação (CREATE, UPDATE, DELETE, etc.)
- `description` (TEXT): Descrição da ação
- `performed_by` (UUID, FK → auth.users): Quem executou a ação
- `timestamp` (TIMESTAMPTZ): Quando a ação foi executada
- `metadata` (JSONB): Metadados adicionais
- `created_at` (TIMESTAMPTZ): Data de criação

### 2. Índices Criados

Para melhor performance:
- `idx_admins_user_id`: Busca por user_id
- `idx_admins_role`: Filtro por role
- `idx_admins_is_active`: Filtro por status ativo
- `idx_admin_actions_performed_by`: Busca por quem executou
- `idx_admin_actions_type`: Filtro por tipo de ação
- `idx_admin_actions_timestamp`: Ordenação por data

### 3. RLS (Row Level Security)

Políticas de segurança implementadas:

**Tabela admins:**
- Admins podem visualizar todos os registros de admin
- Apenas superadmins podem inserir novos admins
- Apenas superadmins podem atualizar registros de admin
- Apenas superadmins podem deletar registros de admin

**Tabela admin_actions:**
- Admins podem visualizar todas as ações
- Admins podem inserir suas próprias ações

### 4. Trigger de Updated_at

Trigger automático para atualizar o campo `updated_at` sempre que um registro de admin for modificado.

### 5. Usuário Admin Criado

O usuário `2cb83d3e-42a1-46e4-bf7e-d9581a0f57e1` (inocencio.123@gmail.com) foi configurado como **superadmin** com as seguintes permissões:
- read
- write
- delete
- manage_users
- manage_admins

## Resultado

✅ Tabelas criadas com sucesso no Supabase
✅ Usuário admin configurado
✅ RLS policies aplicadas
✅ Índices criados para performance
✅ Sistema de auditoria funcionando

O erro foi completamente resolvido e o painel administrativo agora funciona corretamente.

## Próximos Passos

Para adicionar novos admins, use o seguinte SQL:

```sql
INSERT INTO public.admins (user_id, role, permissions, is_active)
VALUES (
  'USER_UUID_HERE',
  'admin', -- ou 'superadmin'
  '["read", "write"]'::jsonb,
  true
);
```

Ou use o endpoint da API administrativa quando estiver implementado.
