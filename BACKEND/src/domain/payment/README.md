# Sistema de Planos e Pagamentos

## Visão Geral

Sistema completo de gerenciamento de planos de assinatura com suporte a múltiplos métodos de pagamento, auditoria e cache.

## Estrutura

```
payment/
├── constants/          # Constantes e configurações
├── controllers/        # Controladores HTTP
├── interfaces/         # Interfaces de serviços
├── routes/            # Definição de rotas
├── services/          # Serviços de domínio
├── types/             # Tipos TypeScript
└── validators/        # Validadores de entrada
```

## Funcionalidades

### Planos

- ✅ CRUD completo de planos
- ✅ Planos públicos e privados
- ✅ Limites configuráveis por plano
- ✅ Cache em memória
- ✅ Rate limiting
- ✅ Validação robusta

### Planos de Usuário

- ✅ Criação e gerenciamento
- ✅ Renovação automática
- ✅ Cancelamento
- ✅ Histórico de mudanças de status
- ✅ Expiração automática (via cron job)
- ✅ Validação de datas

### Segurança

- ✅ RLS (Row Level Security) habilitado
- ✅ Autenticação obrigatória
- ✅ Controle de acesso por role (admin/user)
- ✅ Rate limiting em rotas públicas
- ✅ Validação de entrada

### Auditoria

- ✅ Histórico de mudanças de status
- ✅ Triggers automáticos
- ✅ Logs detalhados
- ✅ Timestamps automáticos

## Uso

### Criar um Plano

```typescript
POST /api/plans
Authorization: Bearer <token>

{
  "name": "Premium",
  "description": "Plano premium com todos os recursos",
  "price": 99.90,
  "currency": "BRL",
  "durationDays": 30,
  "interval": "monthly",
  "features": ["Feature 1", "Feature 2"],
  "limits": {
    "maxQuestionsPerDay": 100,
    "canExportData": true,
    "supportLevel": "premium"
  }
}
```

### Listar Planos Públicos

```typescript
GET /api/plans/public

// Resposta
{
  "success": true,
  "data": [...]
}
```

### Criar Plano de Usuário

```typescript
POST /api/user-plans
Authorization: Bearer <token>

{
  "userId": "user-id",
  "planId": "plan-id",
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-02-01T00:00:00Z",
  "paymentMethod": "CREDIT_CARD"
}
```

## Constantes

Todas as constantes estão centralizadas em `constants/index.ts`:

- Limites de paginação
- Moedas permitidas
- TTL de cache
- Rate limits
- Validações

## Cache

O sistema usa cache em memória para:

- Planos públicos (TTL: 5 minutos)
- Planos por ID (TTL: 10 minutos)

O cache é invalidado automaticamente em:
- Criação de plano
- Atualização de plano
- Deleção de plano

## Jobs

### Expiração de Planos

Execute periodicamente para marcar planos vencidos:

```bash
npm run expire-plans
```

Configure um cron job (veja `cron-jobs.md`).

## Melhorias Futuras

- [ ] Notificações antes de expirar
- [ ] Webhooks para eventos
- [ ] Métricas (Prometheus)
- [ ] Documentação Swagger/OpenAPI
- [ ] Testes automatizados
- [ ] Feature flags
- [ ] Soft delete
