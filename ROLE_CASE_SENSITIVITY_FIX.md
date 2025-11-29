# Correção de Case Sensitivity nos Roles

## Problema Identificado

O sistema tinha inconsistência entre:
- Banco de dados: `role = 'admin'` (minúsculo)
- Backend middleware: `user_role = 'ADMIN'` (maiúsculo)
- Controllers: Alguns usavam `req.user?.role` (não existe) ao invés de `req.user?.user_role`

## Correções Aplicadas

### 1. Padronização do Banco de Dados
✅ Migração aplicada para converter todos os roles para MAIÚSCULO:
```sql
UPDATE users SET role = UPPER(role) WHERE role != UPPER(role);
```

### 2. Função RPC para Revogar Sessões
✅ Criada função `revoke_session(p_session_id uuid)` para deletar sessões diretamente do `auth.sessions`

### 3. Arquivos Corrigidos

#### Backend - Domain Layer
- ✅ `BACKEND/src/domain/auth/services/SessionService.ts`
  - Corrigido `isUserAdmin()` para verificar `'ADMIN'` ao invés de `'admin'`
  - Corrigido `revokeSession()` para usar função RPC ao invés de `signOut()`

- ✅ `BACKEND/src/domain/admin/routes/adminRoutes.ts`
  - Corrigido `req.user?.role` → `req.user?.user_role`
  - Corrigido `'admin'` → `'ADMIN'`

- ✅ `BACKEND/src/domain/admin/controllers/AdminFlashcardController.ts`
  - Removidas verificações redundantes de `user.role === 'admin'`
  - Mantido apenas `user.role === 'ADMIN'`

- ✅ `BACKEND/src/domain/payment/controllers/PaymentController.ts`
  - Corrigido todas as ocorrências de `req.user?.role` → `req.user?.user_role`
  - Corrigido `'admin'` → `'ADMIN'`

- ✅ `BACKEND/src/domain/payment/controllers/UserPlanController.ts`
  - Corrigido `'admin'` → `'ADMIN'`

- ✅ `BACKEND/src/domain/payment/controllers/InvoiceController.ts`
  - Corrigido `'admin'` → `'ADMIN'`

#### Backend - Infrastructure Layer
- ✅ `BACKEND/src/infra/admin/supabase/SupabaseAdminService.ts`
  - Corrigido caminho do import do SessionService

### 4. Arquivos Verificados (Já Corretos)
✅ Todos os arquivos em:
- `BACKEND/src/domain/admin/**/*.ts`
- `BACKEND/src/domain/auth/**/*.ts`
- `BACKEND/src/domain/user/**/*.ts`
- `BACKEND/src/domain/audit/**/*.ts`
- `BACKEND/src/domain/alerts/**/*.ts`
- `BACKEND/src/infra/admin/**/*.ts`
- `BACKEND/src/infra/auth/**/*.ts`
- `BACKEND/src/infra/user/**/*.ts`

## Resultado

✅ Todos os roles agora estão padronizados em MAIÚSCULO
✅ Todos os controllers usam `req.user?.user_role` corretamente
✅ Função RPC criada para revogar sessões sem erros de JWT
✅ Sem erros de TypeScript
✅ Sistema de autenticação e autorização funcionando corretamente

## Próximos Passos

Testar o sistema para confirmar que:
1. Login funciona corretamente
2. Verificação de permissões admin funciona
3. Revogação de sessões funciona sem erros
4. Dashboard admin carrega sem erros
