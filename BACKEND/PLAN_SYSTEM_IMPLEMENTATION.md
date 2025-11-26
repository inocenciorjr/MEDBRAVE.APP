# Sistema de Planos - Implementação Completa

## ✅ O que foi implementado

### 1. Planos Padrão no Banco de Dados

Foram criados dois planos padrão:

#### Plano FREE (free-plan-default)
- **Duração**: 1 ano
- **Preço**: R$ 0,00
- **Limites**:
  - 10 questões por dia
  - 2 listas de questões por dia
  - 1 simulado por mês
  - 100 cards FSRS
  - 50 revisões por dia
  - 50 flashcards criados
  - 3 decks de flashcards
  - 5 consultas Pulse AI por dia
  - 10 explicações de questões por dia
  - 5 gerações de conteúdo por mês
  - 2 tickets de suporte por mês
- **Features**:
  - ✅ Caderno de erros
  - ❌ Exportar dados
  - ❌ Listas customizadas
  - ❌ Estatísticas avançadas
  - ❌ Mentoria
  - ❌ Modo offline
  - ❌ Customização de interface
  - Suporte: básico

#### Plano TRIAL (trial-plan-7days)
- **Duração**: 7 dias
- **Preço**: R$ 0,00
- **Limites**: ILIMITADOS (null em todos os limites numéricos)
- **Features**: TODAS HABILITADAS
  - ✅ Caderno de erros
  - ✅ Exportar dados
  - ✅ Listas customizadas
  - ✅ Estatísticas avançadas
  - ✅ Mentoria
  - ✅ Modo offline
  - ✅ Customização de interface
  - Suporte: premium

### 2. Backend - Serviços e Middlewares

#### UserPlanAssignmentService
**Localização**: `BACKEND/src/domain/auth/services/UserPlanAssignmentService.ts`

Serviço responsável por atribuir planos automaticamente:
- `assignDefaultFreePlan(userId)`: Atribui plano FREE ao criar conta
- `assignTrialPlan(userId)`: Atribui plano TRIAL de 7 dias
- `upgradeToTrial(userId)`: Migra usuário de FREE para TRIAL

**Integração**: Chamado automaticamente no `supabaseAuthMiddleware` quando um novo usuário é criado.

#### planCheck.middleware.ts
**Localização**: `BACKEND/src/domain/auth/middleware/planCheck.middleware.ts`

Middleware que verifica se o usuário possui um plano ativo:
- Busca plano ativo do usuário
- Adiciona informações do plano ao `req.userPlan`
- Cache de 30 segundos para performance
- Bloqueia acesso se não tiver plano ativo

**Uso**:
```typescript
import { planCheckMiddleware } from '../domain/auth/middleware/planCheck.middleware';

router.use(planCheckMiddleware as any);
```

#### enhancedAuth.middleware.ts
**Localização**: `BACKEND/src/domain/auth/middleware/enhancedAuth.middleware.ts`

Middleware combinado que verifica autenticação + plano:

**Middlewares disponíveis**:

1. **enhancedAuthMiddleware**: Verifica autenticação + plano ativo
```typescript
router.use(enhancedAuthMiddleware as any);
```

2. **requireFeature(feature)**: Verifica se o usuário tem uma feature específica
```typescript
router.post('/export', requireFeature('canExportData') as any, controller.export);
```

3. **checkLimit(limitKey, getCurrentUsage)**: Verifica limite de uso
```typescript
router.post('/questions', checkLimit('maxQuestionsPerDay', async (req) => {
  return await getQuestionsAnsweredToday(req.user.id);
}) as any, controller.answerQuestion);
```

4. **addPlanHeaders**: Adiciona informações do plano nos headers da resposta
```typescript
router.use(addPlanHeaders);
```

5. **optionalPlanMiddleware**: Permite acesso mesmo sem plano (modo degradado)
```typescript
router.use(optionalPlanMiddleware as any);
```

### 3. Exemplo de Uso em Rotas

**Arquivo**: `BACKEND/src/routes/questionListRoutes.ts`

```typescript
import { enhancedAuthMiddleware, requireFeature } from '../domain/auth/middleware/enhancedAuth.middleware';

// Todas as rotas requerem autenticação + plano ativo
router.use(enhancedAuthMiddleware as any);

// Criar lista requer feature específica
router.post('/', requireFeature('canCreateCustomLists') as any, controller.createQuestionList);
```

### 4. Tipos e Interfaces

**PlanAuthenticatedRequest**: Estende o Request com informações do plano
```typescript
interface PlanAuthenticatedRequest extends AuthenticatedRequest {
  userPlan?: {
    id: string;
    planId: string;
    planName: string;
    status: UserPlanStatus;
    limits: PlanLimits;
    endDate: Date;
    isActive: boolean;
  };
}
```

### 5. Códigos de Erro Adicionados

**Arquivo**: `BACKEND/src/utils/errors.ts`

```typescript
SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED',
SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
FEATURE_NOT_AVAILABLE = 'FEATURE_NOT_AVAILABLE',
PLAN_LIMIT_REACHED = 'PLAN_LIMIT_REACHED',
```

## 🔄 Fluxo de Autenticação com Planos

1. **Usuário faz login/registro**
   - `supabaseAuthMiddleware` verifica token
   - Se novo usuário, cria registro na tabela `users`
   - `UserPlanAssignmentService.assignDefaultFreePlan()` é chamado automaticamente
   - Plano FREE é atribuído ao usuário

2. **Usuário acessa rota protegida**
   - `enhancedAuthMiddleware` verifica autenticação
   - `planCheckMiddleware` verifica plano ativo
   - Informações do plano são adicionadas ao `req.userPlan`
   - Cache de 30 segundos evita consultas repetidas

3. **Usuário tenta usar feature específica**
   - `requireFeature('canExportData')` verifica se o plano permite
   - Se não permitir, retorna erro 403 com mensagem clara
   - Frontend pode mostrar modal de upgrade

4. **Usuário atinge limite de uso**
   - `checkLimit('maxQuestionsPerDay', getCurrentUsage)` verifica uso atual
   - Se atingiu limite, retorna erro 429 com mensagem clara
   - Frontend pode mostrar aviso e sugerir upgrade

## 📋 Próximos Passos

### Backend
1. ✅ Criar serviço de rastreamento de uso (UsageTrackingService)
2. ✅ Aplicar middlewares em todas as rotas importantes
3. ⏳ Criar endpoints de gerenciamento de planos
4. ⏳ Implementar sistema de pagamentos (Stripe/Mercado Pago)
5. ⏳ Criar job de expiração automática de planos

### Frontend
1. ⏳ Criar contexto de planos (PlanContext)
2. ⏳ Criar hook useAuth com informações de plano
3. ⏳ Criar componente PlanGuard para proteger rotas
4. ⏳ Criar componente UsageLimitWarning
5. ⏳ Criar página de planos e upgrade
6. ⏳ Adicionar verificação de plano em todas as páginas

### Testes
1. ⏳ Testar atribuição automática de plano FREE
2. ⏳ Testar verificação de features
3. ⏳ Testar limites de uso
4. ⏳ Testar upgrade de plano
5. ⏳ Testar expiração de plano

## 🔒 Segurança

- ✅ Verificação de plano no backend (não no frontend)
- ✅ Cache com TTL de 30 segundos
- ✅ Validação de limites antes de executar ações
- ✅ Mensagens de erro claras sem expor informações sensíveis
- ✅ Logs detalhados para auditoria

## 📊 Performance

- ✅ Cache de planos de usuário (30 segundos)
- ✅ Cache de usuários (30 segundos)
- ✅ Consultas otimizadas ao banco
- ✅ Índices nas tabelas de planos

## 🎯 Boas Práticas Implementadas

1. **Separação de responsabilidades**: Cada middleware tem uma função específica
2. **Reutilização de código**: Middlewares podem ser combinados
3. **Mensagens claras**: Erros informam exatamente o que está faltando
4. **Flexibilidade**: Sistema suporta planos ilimitados (null) e limitados
5. **Auditoria**: Logs detalhados de todas as operações
6. **Cache inteligente**: Reduz carga no banco sem comprometer segurança
7. **Tipo seguro**: TypeScript garante consistência
8. **Não hardcoded**: Tudo configurável via banco de dados
