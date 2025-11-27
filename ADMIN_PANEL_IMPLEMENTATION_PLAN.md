# 🎯 Plano de Implementação - Painel Admin de Planos

## 🏗️ Estrutura Existente no Frontend

### ✅ Já Implementado

#### Layout e Infraestrutura
- ✅ `/admin/layout.tsx` - Layout com autenticação e PagePlanGuard
- ✅ `/admin/page.tsx` - Dashboard principal com stats
- ✅ `components/admin/layout/AdminLayout.tsx` - Layout com sidebar
- ✅ `components/admin/layout/AdminSidebar.tsx` - Navegação lateral
- ✅ `components/admin/layout/AdminHeader.tsx` - Cabeçalho

#### Componentes UI Reutilizáveis (em `components/admin/ui/`)
- ✅ `AdminStats.tsx` - Card de estatística
- ✅ `AdminCard.tsx` - Card genérico
- ✅ `AdminButton.tsx` - Botão estilizado
- ✅ `AdminInput.tsx` - Input com validação
- ✅ `AdminModal.tsx` - Modal genérico
- ✅ `AdminTable.tsx` - Tabela com paginação
- ✅ `AdminPagination.tsx` - Paginação
- ✅ `AdminBadge.tsx` - Badge de status
- ✅ `RichTextEditor.tsx` - Editor de texto rico

#### Dashboard
- ✅ `components/admin/dashboard/StatsGrid.tsx` - Grid de estatísticas
- ✅ `components/admin/dashboard/QuickActions.tsx` - Ações rápidas
- ✅ `services/admin/statsService.ts` - Serviço de estatísticas com cache

#### Serviços Base (em `services/admin/`)
- ✅ `baseService.ts` - Funções HTTP (get, post, put, delete, patch)
- ✅ `authService.ts` - Autenticação admin
- ✅ `userService.ts` - Gestão de usuários
- ✅ `questionService.ts` - Gestão de questões
- ✅ `notificationService.ts` - Notificações
- ✅ `filterService.ts` - Filtros hierárquicos

#### Páginas Implementadas
- ✅ `/admin/users/page.tsx` - Gestão de usuários (completo)
- ✅ `/admin/questions/page.tsx` - Gestão de questões (completo)
- ✅ `/admin/filters/page.tsx` - Gestão de filtros (completo)
- ✅ `/admin/notifications/page.tsx` - Notificações (completo)
- ✅ `/admin/audit/page.tsx` - Auditoria (completo)
- ✅ `/admin/flashcards/page.tsx` - Flashcards (completo)

#### Páginas Placeholder (precisam implementação)
- 🚧 `/admin/plans/page.tsx` - Placeholder
- 🚧 `/admin/payments/page.tsx` - Placeholder
- 🚧 `/admin/coupons/page.tsx` - Placeholder
- 🚧 `/admin/finance/page.tsx` - Placeholder

### 🚧 A Implementar

#### Estrutura de Pastas a Criar
```
frontend/
├── app/admin/
│   ├── plans/
│   │   ├── page.tsx (listar planos)
│   │   ├── new/
│   │   │   └── page.tsx (criar plano)
│   │   └── [id]/
│   │       └── edit/
│   │           └── page.tsx (editar plano)
│   ├── user-plans/
│   │   ├── page.tsx (listar planos de usuários)
│   │   └── [id]/
│   │       └── page.tsx (detalhes do plano de usuário)
│   ├── coupons/
│   │   ├── page.tsx (listar cupons)
│   │   ├── new/
│   │   │   └── page.tsx (criar cupom)
│   │   └── [id]/
│   │       └── edit/
│   │           └── page.tsx (editar cupom)
│   └── payments/
│       ├── page.tsx (listar pagamentos)
│       └── [id]/
│           └── page.tsx (detalhes do pagamento)
├── components/admin/
│   ├── plans/
│   │   ├── PlansTable.tsx
│   │   ├── PlanForm.tsx
│   │   ├── PlanLimitsForm.tsx
│   │   ├── PlanCard.tsx
│   │   └── PlanStatusBadge.tsx
│   ├── coupons/
│   │   ├── CouponsTable.tsx
│   │   ├── CouponForm.tsx
│   │   ├── CouponCard.tsx
│   │   ├── CouponStatusBadge.tsx
│   │   └── CouponUsageChart.tsx
│   ├── user-plans/
│   │   ├── UserPlansTable.tsx
│   │   ├── UserPlanDetails.tsx
│   │   ├── UserPlanForm.tsx
│   │   ├── UserPlanStatusBadge.tsx
│   │   └── UserPlanActions.tsx
│   └── payments/
│       ├── PaymentsTable.tsx
│       ├── PaymentDetails.tsx
│       ├── PaymentStatusBadge.tsx
│       ├── PaymentMethodBadge.tsx
│       └── PaymentActions.tsx
└── services/admin/
    ├── planService.ts
    ├── userPlanService.ts
    ├── couponService.ts
    ├── paymentService.ts
    └── invoiceService.ts
```

---

## 📋 Backend API Disponível

### ✅ Rotas Implementadas

#### 1. Planos (`/api/plans`)
- ✅ GET `/public` - Listar planos públicos (sem auth)
- ✅ POST `/` - Criar plano (admin)
- ✅ GET `/` - Listar todos (admin)
- ✅ GET `/:planId` - Obter por ID
- ✅ PUT `/:planId` - Atualizar (admin)
- ✅ DELETE `/:planId` - Deletar (admin)

#### 2. Planos de Usuário (`/api/user-plans`)
- ✅ POST `/` - Criar plano de usuário (admin)
- ✅ GET `/user/:userId` - Listar por usuário
- ✅ GET `/user/:userId/active` - Listar ativos
- ✅ GET `/` - Listar todos (admin)
- ✅ GET `/:userPlanId` - Obter por ID
- ✅ POST `/:userPlanId/cancel` - Cancelar
- ✅ POST `/:userPlanId/renew` - Renovar (admin)
- ✅ PUT `/:userPlanId/status` - Atualizar status (admin)
- ✅ PUT `/:userPlanId/metadata` - Atualizar metadata (admin)
- ✅ POST `/check-expired` - Verificar expirados (admin)

#### 3. Cupons (`/api/coupons`)
- ✅ POST `/` - Criar cupom (admin)
- ✅ GET `/` - Listar cupons (admin)
- ✅ GET `/:couponId` - Obter por ID (admin)
- ✅ PUT `/:couponId` - Atualizar (admin)
- ✅ DELETE `/:couponId` - Deletar (admin)
- ✅ POST `/validate` - Validar cupom (todos)

#### 4. Pagamentos (`/api/payments`)
- ✅ POST `/` - Criar pagamento
- ✅ GET `/user/:userId` - Listar por usuário
- ✅ GET `/:paymentId` - Obter por ID
- ✅ POST `/:paymentId/process` - Processar
- ✅ POST `/:paymentId/cancel` - Cancelar
- ✅ POST `/:paymentId/refund` - Reembolsar (admin)
- ✅ POST `/webhook` - Webhook de gateway

#### 5. Invoices (`/api/invoices`)
- ✅ POST `/` - Criar invoice (admin)
- ✅ GET `/` - Listar invoices
- ✅ GET `/:invoiceId` - Obter por ID
- ✅ PUT `/:invoiceId` - Atualizar (admin)
- ✅ POST `/:invoiceId/mark-paid` - Marcar como pago (admin)

---

## 📝 Ordem de Implementação

### ✅ Fase 0: Infraestrutura Base (CONCLUÍDA)
- ✅ Estrutura de pastas `/admin` criada
- ✅ Layout admin com sidebar implementado
- ✅ Componentes UI reutilizáveis criados
- ✅ Serviços base implementados
- ✅ Rotas protegidas configuradas
- ✅ Dashboard básico funcionando

---

### 🚀 Fase 1: Serviços Admin (1 dia) - PRÓXIMA

#### 1.1 Criar `services/admin/planService.ts`
```typescript
- getAllPlans(filters?)
- getPlanById(id)
- createPlan(data)
- updatePlan(id, data)
- deletePlan(id)
- togglePlanStatus(id)
- duplicatePlan(id)
- getPublicPlans()
```

#### 1.2 Criar `services/admin/userPlanService.ts`
```typescript
- getAllUserPlans(filters)
- getUserPlanById(id)
- getUserPlansByUserId(userId)
- createUserPlan(data)
- cancelUserPlan(id, reason)
- renewUserPlan(id, data)
- updateUserPlanStatus(id, status, reason)
- updateUserPlanMetadata(id, metadata)
- checkExpiredPlans()
```

#### 1.3 Criar `services/admin/couponService.ts`
```typescript
- getAllCoupons(filters)
- getCouponById(id)
- createCoupon(data)
- updateCoupon(id, data)
- deleteCoupon(id)
- validateCoupon(code, planId)
- getCouponUsageStats(id)
```

#### 1.4 Criar `services/admin/paymentService.ts`
```typescript
- getAllPayments(filters)
- getPaymentById(id)
- getPaymentsByUserId(userId, filters)
- refundPayment(id, reason)
- cancelPayment(id, reason)
- getPaymentStats()
- exportPayments(filters)
```

#### 1.5 Criar `services/admin/invoiceService.ts`
```typescript
- getAllInvoices(filters)
- getInvoiceById(id)
- createInvoice(data)
- updateInvoice(id, data)
- markAsPaid(id)
- generatePDF(id)
- sendByEmail(id)
```

---

### 🚀 Fase 2: Componentes de Planos (2 dias)

#### 2.1 Componentes Base
- ❌ `PlansTable.tsx` - Tabela com filtros, ordenação, paginação
- ❌ `PlanCard.tsx` - Card de visualização do plano
- ❌ `PlanStatusBadge.tsx` - Badge de status (ativo/inativo)
- ❌ `PlanIntervalBadge.tsx` - Badge de intervalo (mensal/anual)

#### 2.2 Formulários
- ❌ `PlanForm.tsx` - Formulário principal (nome, descrição, preço, etc)
- ❌ `PlanLimitsForm.tsx` - Formulário de limites detalhados
- ❌ `PlanFeaturesForm.tsx` - Formulário de features

#### 2.3 Páginas
- ❌ `/admin/plans/page.tsx` - Listar e gerenciar planos
- ❌ `/admin/plans/new/page.tsx` - Criar novo plano
- ❌ `/admin/plans/[id]/edit/page.tsx` - Editar plano

---

### 🚀 Fase 3: Componentes de Cupons (1-2 dias)

#### 3.1 Componentes Base
- ❌ `CouponsTable.tsx` - Tabela com filtros
- ❌ `CouponCard.tsx` - Card de visualização
- ❌ `CouponStatusBadge.tsx` - Badge de status
- ❌ `CouponTypeBadge.tsx` - Badge de tipo (percentual/fixo)
- ❌ `CouponUsageChart.tsx` - Gráfico de uso

#### 3.2 Formulários
- ❌ `CouponForm.tsx` - Formulário de criação/edição

#### 3.3 Páginas
- ❌ `/admin/coupons/page.tsx` - Listar e gerenciar cupons
- ❌ `/admin/coupons/new/page.tsx` - Criar novo cupom
- ❌ `/admin/coupons/[id]/edit/page.tsx` - Editar cupom

---

### 🚀 Fase 4: Componentes de Planos de Usuário (2 dias)

#### 4.1 Componentes Base
- ❌ `UserPlansTable.tsx` - Tabela com filtros avançados
- ❌ `UserPlanCard.tsx` - Card de visualização
- ❌ `UserPlanStatusBadge.tsx` - Badge de status
- ❌ `UserPlanDetails.tsx` - Detalhes completos do plano
- ❌ `UserPlanTimeline.tsx` - Timeline de eventos

#### 4.2 Ações
- ❌ `UserPlanActions.tsx` - Dropdown de ações
- ❌ `CancelUserPlanModal.tsx` - Modal de cancelamento
- ❌ `RenewUserPlanModal.tsx` - Modal de renovação
- ❌ `UpdateStatusModal.tsx` - Modal de atualização de status

#### 4.3 Formulários
- ❌ `UserPlanForm.tsx` - Formulário de criação manual

#### 4.4 Páginas
- ❌ `/admin/user-plans/page.tsx` - Listar planos de usuários
- ❌ `/admin/user-plans/[id]/page.tsx` - Detalhes do plano

---

### 🚀 Fase 5: Componentes de Pagamentos (1-2 dias)

#### 5.1 Componentes Base
- ❌ `PaymentsTable.tsx` - Tabela com filtros
- ❌ `PaymentCard.tsx` - Card de visualização
- ❌ `PaymentStatusBadge.tsx` - Badge de status
- ❌ `PaymentMethodBadge.tsx` - Badge de método
- ❌ `PaymentDetails.tsx` - Detalhes completos

#### 5.2 Ações
- ❌ `PaymentActions.tsx` - Dropdown de ações
- ❌ `RefundPaymentModal.tsx` - Modal de reembolso
- ❌ `CancelPaymentModal.tsx` - Modal de cancelamento

#### 5.3 Páginas
- ❌ `/admin/payments/page.tsx` - Listar pagamentos
- ❌ `/admin/payments/[id]/page.tsx` - Detalhes do pagamento

---

### 🚀 Fase 6: Dashboard Financeiro (1 dia)

#### 6.1 Atualizar Dashboard Principal
- ❌ Adicionar stats de planos ativos
- ❌ Adicionar stats de receita mensal
- ❌ Adicionar stats de novos assinantes
- ❌ Adicionar stats de cancelamentos

#### 6.2 Criar Componentes de Dashboard
- ❌ `RevenueChart.tsx` - Gráfico de receita
- ❌ `ActivePlansChart.tsx` - Gráfico de planos ativos
- ❌ `RecentPayments.tsx` - Lista de pagamentos recentes
- ❌ `RecentSubscriptions.tsx` - Lista de assinaturas recentes
- ❌ `TopPlans.tsx` - Planos mais populares

#### 6.3 Atualizar Serviço de Stats
- ❌ Adicionar `getFinancialStats()`
- ❌ Adicionar `getRevenueChart(period)`
- ❌ Adicionar `getActivePlansChart()`

---

### 🚀 Fase 7: Página Finance (1 dia)

#### 7.1 Criar `/admin/finance/page.tsx`
- ❌ Dashboard financeiro completo
- ❌ Gráficos de receita
- ❌ Métricas de conversão
- ❌ Análise de churn
- ❌ Previsão de receita

---

### � Fase 8: Polimento e Testes (1-2 dias)

#### 8.1 Testes
- ❌ Testar todos os fluxos de criação
- ❌ Testar todos os fluxos de edição
- ❌ Testar todos os fluxos de deleção
- ❌ Testar filtros e paginação
- ❌ Testar permissões (admin only)

#### 8.2 UI/UX
- ❌ Ajustar loading states
- ❌ Ajustar error states
- ❌ Ajustar empty states
- ❌ Adicionar tooltips
- ❌ Adicionar confirmações

#### 8.3 Documentação
- ❌ Documentar componentes
- ❌ Documentar serviços
- ❌ Criar guia de uso
- ❌ Atualizar README

---

## 🎨 Padrões de Design a Seguir

### Componentes
- Usar componentes existentes de `components/admin/ui/`
- Seguir padrão de nomenclatura: `[Entity][Action].tsx`
- Usar TypeScript com tipos bem definidos
- Usar 'use client' apenas quando necessário

### Serviços
- Usar `baseService` para chamadas HTTP
- Implementar cache quando apropriado
- Implementar retry logic para erros de rede
- Usar tipos do backend (`types/admin/`)

### Páginas
- Usar Server Components por padrão
- Usar Client Components para interatividade
- Implementar loading states
- Implementar error boundaries
- Usar Breadcrumb component

### Formulários
- Usar validação no frontend
- Usar validação no backend
- Mostrar erros de forma clara
- Implementar auto-save quando apropriado

---

## 🔐 Segurança

### Validações
- ✅ Todas as rotas admin verificam role
- ✅ PagePlanGuard protege área admin
- ❌ Validar inputs no frontend
- ❌ Sanitizar dados antes de enviar

### Logs
- ❌ Registrar todas as ações administrativas
- ❌ Incluir: quem, quando, o quê, dados antes/depois
- ❌ Implementar auditoria de mudanças

---

## 📊 Métricas e Analytics

### Eventos a Rastrear
- Criação de plano
- Edição de plano
- Ativação/desativação de plano
- Criação de cupom
- Uso de cupom
- Criação de plano de usuário
- Cancelamento de plano
- Renovação de plano
- Reembolso de pagamento

---

## 🚀 Próximos Passos Imediatos

1. **Criar serviços admin** (Fase 1)
   - Começar por `planService.ts`
   - Depois `userPlanService.ts`
   - Depois `couponService.ts`
   - Depois `paymentService.ts`

2. **Testar serviços**
   - Criar testes unitários
   - Testar integração com backend

3. **Criar componentes de planos** (Fase 2)
   - Começar pela tabela
   - Depois formulários
   - Depois páginas

4. **Iterar e ajustar**
   - Coletar feedback
   - Ajustar conforme necessário
