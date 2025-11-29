# 🔍 ANÁLISE COMPLETA DO SISTEMA DE MONITORAMENTO DE SEGURANÇA

## 📊 O QUE JÁ EXISTE NO SISTEMA:

### ✅ BACKEND - Serviços Existentes:

1. **SupabaseAuditLogService** (`BACKEND/src/infra/audit/supabase/SupabaseAuditLogService.ts`)
   - ✅ Registra ações de admin na tabela `audit_logs`
   - ✅ Métodos: `logAction()`, `getAuditLogs()`, `getActionsByUser()`, `getActionsByType()`
   - ✅ Singleton pattern implementado
   - ⚠️ **NÃO registra eventos de sessão de usuários** (apenas ações de admin)

2. **AlertService** (`BACKEND/src/domain/alerts/services/AlertService.ts`)
   - ✅ Cria alertas na tabela `user_alerts`
   - ✅ Métodos: `createAlert()`, `getUserAlerts()`, `markAsRead()`
   - ✅ Já tem códigos de alerta: `LOW_ACCURACY`, `LOW_RECALL`, `EXCESS_LAPSES`, `GOAL_GAP`
   - ✅ Tipos de alerta: `warning`, `info`, `danger`

3. **SessionService** (`BACKEND/src/domain/auth/services/SessionService.ts`)
   - ✅ Gerencia sessões de usuários
   - ✅ Limite de 2 sessões por usuário
   - ✅ Revoga sessões antigas automaticamente
   - ✅ Métodos: `getUserSessions()`, `revokeSession()`, `revokeAllUserSessions()`

4. **SupabaseAdminService** (`BACKEND/src/infra/admin/supabase/SupabaseAdminService.ts`)
   - ✅ Gerenciamento completo de usuários
   - ⚠️ **Métodos com TODO**: `getUserActiveSessions()`, `terminateUserSessions()`
   - ✅ Já tem endpoints para: logs, plans, statistics, sessions, notes

5. **AdminUserController** (`BACKEND/src/domain/admin/controllers/AdminUserController.ts`)
   - ✅ Endpoints completos de gerenciamento de usuários
   - ✅ Já tem rotas: `/users/:id/logs`, `/users/:id/sessions`, `/users/:id/statistics`
   - ⚠️ **FALTA**: Endpoints para análise de segurança e detecção de atividades suspeitas

### ✅ FRONTEND - Componentes Existentes:

1. **UserModal** (`frontend/components/admin/users/UserModal.tsx`)
   - ✅ Modal completo com abas: Info, Stats, Sessions, Logs, Notes
   - ⚠️ **FALTA**: Aba de "Segurança" com análise de atividades suspeitas

2. **UserSessionsTable** (`frontend/components/admin/users/UserSessionsTable.tsx`)
   - ✅ Exibe sessões ativas do usuário
   - ✅ Mostra: ID, Criação, User Agent, IP, Última Atividade
   - ⚠️ **FALTA**: Coluna de localização geográfica (país, cidade)

3. **UserLogsTable** (`frontend/components/admin/users/UserLogsTable.tsx`)
   - ✅ Exibe logs de auditoria do usuário
   - ✅ Já funcional

### 🗄️ BANCO DE DADOS:

1. **Tabela `auth.sessions`** (Supabase Auth)
   - ✅ Gerenciada automaticamente pelo Supabase
   - ✅ Campos: `id`, `user_id`, `created_at`, `updated_at`, `ip`, `user_agent`
   - ✅ Já está sendo usada pelo SessionService

2. **Tabela `auth.audit_log_entries`** (Supabase Auth)
   - ✅ Gerenciada automaticamente pelo Supabase
   - ✅ Registra eventos de autenticação: login, logout, token_revoked
   - ✅ Campos: `id`, `payload`, `created_at`, `ip_address`

3. **Tabela `audit_logs`** (Custom)
   - ✅ Para ações de admin
   - ✅ Já está sendo usada pelo SupabaseAuditLogService

4. **Tabela `user_alerts`** (Custom)
   - ✅ Para alertas de usuários
   - ✅ Já está sendo usada pelo AlertService

---

## 🎯 O QUE PRECISA SER IMPLEMENTADO:

### 1. ✅ SecurityMonitorService (JÁ CRIADO)
**Arquivo**: `BACKEND/src/domain/auth/services/SecurityMonitorService.ts`

**Funcionalidades**:
- ✅ `analyzeUserSessionActivity()` - Analisa atividade de sessões
- ✅ `detectSuspiciousActivity()` - Detecta padrões suspeitos
- ✅ `getIPLocation()` - Busca localização geográfica do IP
- ✅ `scanAllUsersForSuspiciousActivity()` - Escaneia todos os usuários

**Detecções Implementadas**:
- ✅ Muitas sessões simultâneas (> 5)
- ✅ Múltiplos IPs diferentes (> 3)
- ✅ Muitos logins em 24h (> 10)
- ✅ Muitos disconnects em 24h (> 5)

**Integração**:
- ✅ Usa `auth.sessions` para sessões ativas
- ✅ Usa `auth.audit_log_entries` para histórico de logins/logouts
- ✅ Cria alertas via `AlertService`
- ✅ Usa API externa (ip-api.com) para geolocalização

**⚠️ PROBLEMAS DETECTADOS**:
- ❌ Erros de TypeScript (tipos implícitos)
- ❌ Precisa de tratamento de erros melhor
- ❌ Falta validação de dados

### 2. ⚠️ Completar SupabaseAdminService
**Arquivo**: `BACKEND/src/infra/admin/supabase/SupabaseAdminService.ts`

**Métodos com TODO que precisam ser implementados**:
```typescript
async getUserActiveSessions(userId: string) {
  // TODO: Implementar busca de sessões ativas
  // Deve usar SessionService.getUserSessions()
}

async terminateUserSessions(userId: string, sessionIds?: string[]) {
  // TODO: Implementar revogação de sessões
  // Deve usar SessionService.revokeSession() ou revokeAllUserSessions()
}
```

### 3. ⚠️ Adicionar Endpoints no AdminUserController
**Arquivo**: `BACKEND/src/domain/admin/controllers/AdminUserController.ts`

**Novos endpoints necessários**:
```typescript
// GET /api/admin/users/:id/security-analysis
async getUserSecurityAnalysis(req, res, next) {
  // Retorna análise de segurança do usuário
  // Usa SecurityMonitorService.analyzeUserSessionActivity()
  // Usa SecurityMonitorService.detectSuspiciousActivity()
}

// GET /api/admin/users/:id/ip-location/:ip
async getIPLocation(req, res, next) {
  // Retorna localização de um IP específico
  // Usa SecurityMonitorService.getIPLocation()
}

// GET /api/admin/security/scan
async scanAllUsersForSuspiciousActivity(req, res, next) {
  // Escaneia todos os usuários
  // Usa SecurityMonitorService.scanAllUsersForSuspiciousActivity()
}
```

### 4. ⚠️ Adicionar Rotas no adminRoutes
**Arquivo**: `BACKEND/src/domain/admin/routes/adminRoutes.ts`

**Novas rotas necessárias**:
```typescript
router.get('/users/:id/security-analysis', userController.getUserSecurityAnalysis);
router.get('/users/:id/ip-location/:ip', userController.getIPLocation);
router.get('/security/scan', userController.scanAllUsersForSuspiciousActivity);
```

### 5. ⚠️ Criar Componente UserSecurityAnalysis (Frontend)
**Arquivo**: `frontend/components/admin/users/UserSecurityAnalysis.tsx`

**Funcionalidades**:
- Exibir métricas de segurança (sessões, IPs, dispositivos, logins, disconnects)
- Listar atividades suspeitas detectadas
- Mostrar severidade (low, medium, high) com cores
- Integrar com endpoint `/api/admin/users/:id/security-analysis`

### 6. ⚠️ Atualizar UserSessionsTable (Frontend)
**Arquivo**: `frontend/components/admin/users/UserSessionsTable.tsx`

**Melhorias necessárias**:
- Adicionar coluna "Localização" (país, cidade)
- Botão para buscar localização do IP
- Integrar com endpoint `/api/admin/users/:id/ip-location/:ip`
- Loading state para busca de localização

### 7. ⚠️ Adicionar Aba "Segurança" no UserModal (Frontend)
**Arquivo**: `frontend/components/admin/users/UserModal.tsx`

**Mudanças necessárias**:
- Adicionar aba "Segurança" no array de tabs
- Renderizar componente `UserSecurityAnalysis` quando aba ativa
- Ícone: `security`

---

## 🚀 PLANO DE IMPLEMENTAÇÃO (ORDEM CORRETA):

### FASE 1: Corrigir e Melhorar Backend ✅ COMPLETO
1. ✅ Corrigir erros de TypeScript no SecurityMonitorService
2. ✅ Implementar métodos TODO no SupabaseAdminService (JÁ ESTAVAM IMPLEMENTADOS)
3. ✅ Adicionar endpoints no AdminUserController
4. ✅ Adicionar rotas no adminRoutes
5. ⏭️ Testar endpoints com Postman/Insomnia (PRÓXIMO PASSO)

### FASE 2: Implementar Frontend 🔄 EM ANDAMENTO
6. ⚠️ Criar componente UserSecurityAnalysis
7. ⚠️ Atualizar UserSessionsTable com coluna de localização
8. ⚠️ Adicionar aba "Segurança" no UserModal
9. ⚠️ Testar interface completa

### FASE 3: Testes e Refinamentos 📝
10. ⚠️ Testar detecção de atividades suspeitas
11. ⚠️ Verificar criação de alertas
12. ⚠️ Ajustar thresholds se necessário
13. ⚠️ Documentar sistema completo

---

## ⚠️ PONTOS DE ATENÇÃO:

1. **Não duplicar funcionalidades**:
   - ✅ Usar SessionService existente (não criar novo)
   - ✅ Usar AlertService existente (não criar novo)
   - ✅ Usar SupabaseAuditLogService existente (não criar novo)

2. **Integração correta**:
   - ✅ SecurityMonitorService deve usar serviços existentes
   - ✅ AdminUserController deve usar SecurityMonitorService
   - ✅ Frontend deve usar endpoints do AdminUserController

3. **Segurança**:
   - ✅ Todos os endpoints devem ter autenticação de admin
   - ✅ Validar permissões antes de executar ações
   - ✅ Não expor dados sensíveis desnecessariamente

4. **Performance**:
   - ⚠️ Scan de todos os usuários pode ser pesado (implementar paginação?)
   - ⚠️ Cache de localizações de IP (evitar chamadas repetidas)
   - ⚠️ Limitar frequência de scans automáticos

---

## 📝 PRÓXIMOS PASSOS IMEDIATOS:

1. ✅ Corrigir erros de TypeScript no SecurityMonitorService
2. ✅ Implementar métodos TODO no SupabaseAdminService
3. ✅ Adicionar endpoints no AdminUserController
4. ✅ Adicionar rotas no adminRoutes
5. ⚠️ Criar componente UserSecurityAnalysis
6. ⚠️ Atualizar UserSessionsTable
7. ⚠️ Adicionar aba no UserModal
8. ⚠️ Testar tudo

---

**Status**: 🟡 Em Progresso
**Última Atualização**: Agora
