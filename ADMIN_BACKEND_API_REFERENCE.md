# 📚 Referência Completa da API Backend - Sistema de Planos

## 🔐 Autenticação
Todas as rotas (exceto `/plans/public`) requerem autenticação via token JWT no header:
```
Authorization: Bearer <token>
```

Rotas marcadas com 🔒 **ADMIN ONLY** requerem `user_role = 'ADMIN'`

---

## 📦 1. PLANOS (`/api/plans`)

### GET `/api/plans/public`
**Descrição:** Lista planos públicos ativos (sem autenticação)  
**Rate Limit:** Sim  
**Auth:** ❌ Não requerida  
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "plan_123",
      "name": "Plano Premium",
      "description": "Acesso completo",
      "price": 99.90,
      "currency": "BRL",
      "durationDays": 30,
      "isActive": true,
      "isPublic": true,
      "features": ["Feature 1", "Feature 2"],
      "interval": "monthly",
      "limits": { /* PlanLimits */ },
      "badge": "POPULAR",
      "highlight": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST `/api/plans` 🔒
**Descrição:** Cria um novo plano  
**Auth:** ✅ Admin only  
**Body:**
```json
{
  "name": "Plano Premium",
  "description": "Acesso completo",
  "price": 99.90,
  "currency": "BRL",
  "durationDays": 30,
  "isActive": true,
  "isPublic": true,
  "features": ["Feature 1", "Feature 2"],
  "interval": "monthly",
  "limits": {
    "maxQuestionsPerDay": 100,
    "maxQuestionListsPerDay": 10,
    "maxSimulatedExamsPerMonth": 5,
    "maxFSRSCards": 1000,
    "maxReviewsPerDay": 200,
    "maxFlashcardsCreated": 500,
    "maxFlashcardDecks": 20,
    "maxPulseAIQueriesPerDay": 50,
    "maxQuestionExplanationsPerDay": 30,
    "maxContentGenerationPerMonth": 10,
    "canExportData": true,
    "canCreateCustomLists": true,
    "canAccessAdvancedStatistics": true,
    "canUseErrorNotebook": true,
    "canAccessMentorship": true,
    "canUseOfflineMode": true,
    "canCustomizeInterface": true,
    "supportLevel": "premium",
    "maxSupportTicketsPerMonth": 10
  },
  "badge": "POPULAR",
  "highlight": true,
  "metadata": {}
}
```

### GET `/api/plans` 🔒
**Descrição:** Lista todos os planos (com filtros)  
**Auth:** ✅ Admin only  
**Query Params:**
- `isActive` (boolean)
- `isPublic` (boolean)
- `limit` (number, default: 100)
- `page` (number, default: 1)

### GET `/api/plans/:planId`
**Descrição:** Obtém um plano específico  
**Auth:** ✅ Requerida (admin para planos privados)

### PUT `/api/plans/:planId` 🔒
**Descrição:** Atualiza um plano  
**Auth:** ✅ Admin only  
**Body:** Mesmos campos do POST (parcial)

### DELETE `/api/plans/:planId` 🔒
**Descrição:** Remove um plano  
**Auth:** ✅ Admin only

---

## 👤 2. PLANOS DE USUÁRIO (`/api/user-plans`)

### POST `/api/user-plans` 🔒
**Descrição:** Cria um plano para um usuário (manualmente)  
**Auth:** ✅ Admin only  
**Body:**
```json
{
  "userId": "user_123",
  "planId": "plan_123",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-02-01T00:00:00Z",
  "paymentMethod": "admin",
  "autoRenew": false,
  "metadata": {}
}
```

### GET `/api/user-plans/user/:userId`
**Descrição:** Lista todos os planos de um usuário  
**Auth:** ✅ Próprio usuário ou admin

### GET `/api/user-plans/user/:userId/active`
**Descrição:** Lista planos ativos de um usuário  
**Auth:** ✅ Próprio usuário ou admin

### GET `/api/user-plans` 🔒
**Descrição:** Lista todos os planos de usuários (com filtros)  
**Auth:** ✅ Admin only  
**Query Params:**
- `userId` (string)
- `planId` (string)
- `status` (UserPlanStatus)
- `limit` (number)
- `page` (number)

### GET `/api/user-plans/:userPlanId`
**Descrição:** Obtém detalhes de um plano de usuário  
**Auth:** ✅ Próprio usuário ou admin

### POST `/api/user-plans/:userPlanId/cancel`
**Descrição:** Cancela um plano de usuário  
**Auth:** ✅ Próprio usuário ou admin  
**Body:**
```json
{
  "reason": "Motivo do cancelamento"
}
```

### POST `/api/user-plans/:userPlanId/renew` 🔒
**Descrição:** Renova um plano de usuário  
**Auth:** ✅ Admin only  
**Body:**
```json
{
  "durationDays": 30,
  "paymentId": "payment_123",
  "paymentMethod": "admin"
}
```

### PUT `/api/user-plans/:userPlanId/status` 🔒
**Descrição:** Atualiza o status de um plano  
**Auth:** ✅ Admin only  
**Body:**
```json
{
  "status": "ACTIVE",
  "reason": "Motivo da alteração"
}
```

### PUT `/api/user-plans/:userPlanId/metadata` 🔒
**Descrição:** Atualiza metadata de um plano  
**Auth:** ✅ Admin only  
**Body:**
```json
{
  "metadata": {
    "key": "value"
  }
}
```

### POST `/api/user-plans/check-expired` 🔒
**Descrição:** Verifica e expira planos vencidos  
**Auth:** ✅ Admin only

---

## 🎟️ 3. CUPONS (`/api/coupons`)

### POST `/api/coupons` 🔒
**Descrição:** Cria um novo cupom  
**Auth:** ✅ Admin only  
**Body:**
```json
{
  "code": "PROMO2024",
  "description": "Desconto de lançamento",
  "discountType": "percentage",
  "discountValue": 20,
  "expirationDate": "2024-12-31T23:59:59Z",
  "maxUses": 100,
  "isActive": true,
  "applicablePlanIds": ["plan_123", "plan_456"]
}
```

### GET `/api/coupons` 🔒
**Descrição:** Lista todos os cupons  
**Auth:** ✅ Admin only  
**Query Params:**
- `isActive` (boolean)
- `createdBy` (string)
- `applicablePlanId` (string)

### GET `/api/coupons/:couponId` 🔒
**Descrição:** Obtém um cupom específico  
**Auth:** ✅ Admin only

### PUT `/api/coupons/:couponId` 🔒
**Descrição:** Atualiza um cupom  
**Auth:** ✅ Admin only  
**Body:** Mesmos campos do POST (parcial, exceto `code`, `createdBy`, `timesUsed`)

### DELETE `/api/coupons/:couponId` 🔒
**Descrição:** Remove um cupom  
**Auth:** ✅ Admin only

### POST `/api/coupons/validate`
**Descrição:** Valida um cupom  
**Auth:** ✅ Usuário autenticado  
**Body:**
```json
{
  "code": "PROMO2024",
  "planId": "plan_123"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "coupon": { /* Coupon object */ },
    "discountAmount": 19.98,
    "discountPercentage": 20,
    "finalPrice": 79.92
  }
}
```

---

## 💳 4. PAGAMENTOS (`/api/payments`)

### POST `/api/payments`
**Descrição:** Cria um novo pagamento  
**Auth:** ✅ Próprio usuário ou admin  
**Body:**
```json
{
  "userId": "user_123",
  "planId": "plan_123",
  "userPlanId": "userplan_123",
  "couponId": "coupon_123",
  "amount": 79.92,
  "originalAmount": 99.90,
  "discountAmount": 19.98,
  "description": "Pagamento Plano Premium",
  "paymentMethod": "CREDIT_CARD",
  "paymentMethodDetails": {},
  "metadata": {}
}
```

### GET `/api/payments/user/:userId`
**Descrição:** Lista pagamentos de um usuário  
**Auth:** ✅ Próprio usuário ou admin  
**Query Params:**
- `planId` (string)
- `status` (PaymentStatus)
- `paymentMethod` (PaymentMethod)
- `startDate` (ISO date)
- `endDate` (ISO date)
- `limit` (number)
- `page` (number)

### GET `/api/payments/:paymentId`
**Descrição:** Obtém detalhes de um pagamento  
**Auth:** ✅ Próprio usuário ou admin

### POST `/api/payments/:paymentId/process`
**Descrição:** Processa um pagamento pendente  
**Auth:** ✅ Próprio usuário ou admin

### POST `/api/payments/:paymentId/cancel`
**Descrição:** Cancela um pagamento  
**Auth:** ✅ Próprio usuário (se pendente) ou admin  
**Body:**
```json
{
  "reason": "Motivo do cancelamento"
}
```

### POST `/api/payments/:paymentId/refund` 🔒
**Descrição:** Reembolsa um pagamento  
**Auth:** ✅ Admin only  
**Body:**
```json
{
  "reason": "Motivo do reembolso",
  "gatewayTransactionId": "txn_123"
}
```

### POST `/api/payments/webhook`
**Descrição:** Recebe webhooks de gateways de pagamento  
**Auth:** ❌ Não requerida (validação por assinatura)

---

## 🧾 5. INVOICES (`/api/invoices`)

### POST `/api/invoices` 🔒
**Descrição:** Cria uma nova invoice  
**Auth:** ✅ Admin only

### GET `/api/invoices`
**Descrição:** Lista invoices  
**Auth:** ✅ Próprio usuário ou admin  
**Query Params:**
- `status` (InvoiceStatus)
- `userPlanId` (string)
- `startDate` (ISO date)
- `endDate` (ISO date)
- `limit` (number)
- `page` (number)

### GET `/api/invoices/:invoiceId`
**Descrição:** Obtém detalhes de uma invoice  
**Auth:** ✅ Próprio usuário ou admin

### PUT `/api/invoices/:invoiceId` 🔒
**Descrição:** Atualiza uma invoice  
**Auth:** ✅ Admin only

### POST `/api/invoices/:invoiceId/mark-paid` 🔒
**Descrição:** Marca invoice como paga  
**Auth:** ✅ Admin only

---

## 📊 Enums e Tipos

### PaymentMethod
```typescript
'CREDIT_CARD' | 'PIX' | 'ADMIN' | 'FREE' | 'BANK_SLIP' | 'OTHER'
```

### PaymentStatus
```typescript
'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED' | 'CANCELLED' | 'CHARGEBACK' | 'FAILED'
```

### UserPlanStatus
```typescript
'PENDING_PAYMENT' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED' | 'TRIAL'
```

### PlanInterval
```typescript
'monthly' | 'yearly'
```

### InvoiceStatus
```typescript
'PENDING' | 'PAID' | 'CANCELLED' | 'OVERDUE'
```

### DiscountType
```typescript
'percentage' | 'fixed_amount'
```

### SupportLevel
```typescript
'basic' | 'priority' | 'premium'
```

---

## 🔄 Fluxo Típico de Compra

1. **Usuário seleciona plano**
   - GET `/api/plans/public`

2. **Usuário aplica cupom (opcional)**
   - POST `/api/coupons/validate`

3. **Usuário cria pagamento**
   - POST `/api/payments`

4. **Sistema processa pagamento**
   - POST `/api/payments/:paymentId/process`
   - Webhook recebido: POST `/api/payments/webhook`

5. **Sistema cria plano de usuário**
   - Automático após pagamento aprovado

6. **Sistema gera invoice**
   - Automático após pagamento aprovado

---

## 🛡️ Códigos de Erro Comuns

- `400` - Validação falhou
- `401` - Não autenticado
- `403` - Sem permissão (não é admin)
- `404` - Recurso não encontrado
- `409` - Conflito (ex: cupom já usado)
- `500` - Erro interno do servidor
