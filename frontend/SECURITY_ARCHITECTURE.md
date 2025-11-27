# 🔐 Arquitetura de Segurança - Sistema de Planos

## ⚠️ PRINCÍPIO FUNDAMENTAL

**NUNCA CONFIE NO FRONTEND PARA SEGURANÇA!**

O frontend é apenas para **experiência do usuário (UX)**. A segurança real está **100% no backend**.

## 🏗️ Camadas de Proteção

### 1️⃣ Backend (SEGURANÇA) ✅ JÁ IMPLEMENTADO

**Localização**: `BACKEND/src/domain/auth/middleware/`

**Status**: 65/73 arquivos protegidos (89%)

**Como funciona**:
```typescript
// Toda rota protegida tem enhancedAuthMiddleware
router.post('/api/question-lists', 
  enhancedAuthMiddleware,           // ← Verifica JWT + Plano Ativo
  requireFeature('canCreateCustomLists'), // ← Verifica feature específica
  controller.create
);

// Se usuário não tem acesso:
// → 403 Forbidden
// → { error: "FEATURE_NOT_AVAILABLE", message: "..." }
```

**Proteções implementadas**:
- ✅ Autenticação JWT
- ✅ Verificação de plano ativo
- ✅ Verificação de features booleanas (7 features)
- ✅ Verificação de limites numéricos (11 limites)
- ✅ Cache de 30 segundos
- ✅ Logs de auditoria

### 2️⃣ Frontend (UX) 🎨 EM IMPLEMENTAÇÃO

**Localização**: `frontend/components/guards/`

**Objetivo**: Melhorar experiência, NÃO segurança

**Como funciona**:
```tsx
// Guard verifica plano no cache (30s)
<PlanGuard feature="canCreateCustomLists">
  <CreateListButton />
</PlanGuard>

// Se não tem acesso:
// → Mostra prompt de upgrade
// → Evita request desnecessário
// → Melhora UX
```

**O que o frontend FAZ**:
- ✅ Mostra/oculta botões baseado no plano
- ✅ Exibe avisos antes de atingir limites
- ✅ Direciona para página de upgrade
- ✅ Evita requests que falhariam
- ✅ Melhora feedback visual

**O que o frontend NÃO FAZ**:
- ❌ Segurança (backend sempre valida)
- ❌ Decisões críticas de negócio
- ❌ Bloquear acesso real (só UI)

## 🚨 Cenários de Ataque

### Cenário 1: Usuário burla o frontend

```javascript
// Atacante abre DevTools e força request
fetch('/api/question-lists', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer token' },
  body: JSON.stringify({ name: 'Lista Hackeada' })
})

// ❌ Backend retorna 403:
{
  "error": "FEATURE_NOT_AVAILABLE",
  "message": "Feature canCreateCustomLists não disponível no plano FREE",
  "currentPlan": "FREE",
  "requiredFeature": "canCreateCustomLists"
}

// ✅ Ataque bloqueado pelo backend!
```

### Cenário 2: Cache desatualizado

```javascript
// 1. Usuário tem plano FREE (cache no frontend)
// 2. Faz upgrade para PRO em outro dispositivo
// 3. Cache do frontend ainda não atualizou (< 30s)

// Frontend: Mostra "Upgrade necessário" (cache antigo)
// Usuário: Clica no botão mesmo assim
// Backend: ✅ Permite (verifica em tempo real no banco)
// Frontend: Atualiza cache após sucesso

// ✅ Funciona corretamente!
```

### Cenário 3: Token roubado

```javascript
// Atacante rouba token JWT de um usuário FREE
// Tenta acessar feature PRO

// Backend:
// 1. Valida token ✅
// 2. Busca plano do usuário no banco
// 3. Verifica que é FREE
// 4. ❌ Retorna 403

// ✅ Ataque bloqueado!
```

## 📊 Fluxo Completo de Verificação

```
┌─────────────────────────────────────────────────────────────┐
│ 1. FRONTEND (UX Layer)                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Usuário clica em "Criar Lista Customizada"                │
│  ↓                                                          │
│  <PlanGuard feature="canCreateCustomLists">                │
│  ↓                                                          │
│  Verifica cache local (30s TTL)                            │
│  ↓                                                          │
│  ✅ TEM ACESSO → Mostra botão                              │
│  ❌ SEM ACESSO → Mostra prompt de upgrade                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    (usuário clica)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. REQUEST HTTP                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  POST /api/question-lists                                  │
│  Headers: { Authorization: "Bearer <token>" }              │
│  Body: { name: "Minha Lista" }                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. BACKEND (Security Layer) ✅ VALIDAÇÃO REAL               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  enhancedAuthMiddleware:                                   │
│  ├─ Valida JWT                                             │
│  ├─ Extrai userId                                          │
│  ├─ Busca plano ativo no banco (cache 30s)                │
│  ├─ Verifica se plano está ativo                           │
│  └─ Adiciona userPlan ao req                               │
│                                                             │
│  requireFeature('canCreateCustomLists'):                   │
│  ├─ Verifica req.userPlan.limits.canCreateCustomLists     │
│  ├─ Se false → 403 Forbidden                               │
│  └─ Se true → continua                                     │
│                                                             │
│  controller.create:                                        │
│  └─ Cria lista no banco                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. RESPONSE                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ 200 OK + { id, name, ... }                             │
│  OU                                                         │
│  ❌ 403 Forbidden + { error, message }                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. FRONTEND (Feedback)                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ Sucesso → Mostra lista criada                          │
│  ❌ Erro 403 → Mostra modal de upgrade                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Boas Práticas

### ✅ FAÇA

1. **Use guards para UX**
   ```tsx
   <PlanGuard feature="canExportData">
     <ExportButton />
   </PlanGuard>
   ```

2. **Sempre trate erro 403 do backend**
   ```typescript
   try {
     await api.post('/api/question-lists', data);
   } catch (error) {
     if (error.response?.status === 403) {
       showUpgradeModal();
     }
   }
   ```

3. **Mostre feedback visual**
   ```tsx
   <LimitGuard limit="maxQuestionsPerDay" currentUsage={10}>
     <QuestionList />
   </LimitGuard>
   ```

### ❌ NÃO FAÇA

1. **Confiar apenas no frontend**
   ```tsx
   // ❌ ERRADO
   if (hasFeature('canExport')) {
     exportData(); // Backend pode negar!
   }
   
   // ✅ CORRETO
   try {
     await api.post('/api/export'); // Backend valida
   } catch (error) {
     handleError(error);
   }
   ```

2. **Hardcoded de limites**
   ```tsx
   // ❌ ERRADO
   if (questionsToday >= 10) {
     showUpgradeModal();
   }
   
   // ✅ CORRETO
   const { checkLimit } = usePlan();
   const result = checkLimit('maxQuestionsPerDay', questionsToday);
   if (!result.allowed) {
     showUpgradeModal();
   }
   ```

3. **Ignorar erros do backend**
   ```tsx
   // ❌ ERRADO
   await api.post('/api/lists').catch(() => {});
   
   // ✅ CORRETO
   try {
     await api.post('/api/lists');
   } catch (error) {
     if (error.response?.status === 403) {
       // Usuário não tem acesso
       showUpgradeModal();
     }
   }
   ```

## 📝 Checklist de Implementação

### Backend (✅ Concluído)
- [x] enhancedAuthMiddleware em 65/73 rotas
- [x] Verificação de features booleanas
- [x] Verificação de limites numéricos
- [x] Cache de 30 segundos
- [x] Logs de auditoria
- [x] Mensagens de erro claras

### Frontend (🚧 Em Progresso)
- [x] PlanContext criado
- [x] usePlan hook criado
- [x] PlanGuard componente criado
- [x] LimitGuard componente criado
- [ ] Integrar guards em páginas
- [ ] Tratar erros 403 globalmente
- [ ] Página de planos
- [ ] Modal de upgrade
- [ ] Testes E2E

## 🔍 Como Testar

### Teste 1: Verificar proteção do backend
```bash
# Tente acessar sem token
curl -X POST http://localhost:3001/api/question-lists \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}'

# Esperado: 401 Unauthorized
```

### Teste 2: Verificar limite de plano
```bash
# Com token de usuário FREE
curl -X POST http://localhost:3001/api/question-lists \
  -H "Authorization: Bearer <token-free>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}'

# Esperado: 403 Forbidden (canCreateCustomLists = false)
```

### Teste 3: Verificar cache do frontend
```javascript
// 1. Abra DevTools → Application → Local Storage
// 2. Veja cache do plano (30s TTL)
// 3. Force refresh antes de 30s → usa cache
// 4. Force refresh depois de 30s → busca do backend
```

## 📚 Referências

- [Backend Implementation](../BACKEND/PLAN_SYSTEM_SUMMARY.md)
- [Middleware Documentation](../BACKEND/src/domain/auth/middleware/enhancedAuth.middleware.ts)
- [Frontend Implementation](./PLAN_FRONTEND_IMPLEMENTATION.md)
