# 🚀 Implementação Frontend - Sistema de Planos

## 📋 Visão Geral

Implementação completa do sistema de verificação de planos no frontend, integrando com o backend já implementado.

## 🏗️ Arquitetura

```
frontend/
├── contexts/
│   └── PlanContext.tsx          # Context global de planos
├── hooks/
│   ├── usePlan.ts               # Hook principal de planos
│   ├── useAuth.ts               # Hook de autenticação com plano
│   └── useFeatureAccess.ts      # Hook de verificação de features
├── components/
│   ├── guards/
│   │   ├── PlanGuard.tsx        # Componente de proteção por plano
│   │   └── FeatureGuard.tsx     # Componente de proteção por feature
│   ├── plan/
│   │   ├── PlanCard.tsx         # Card de plano
│   │   ├── PlanComparison.tsx   # Comparação de planos
│   │   ├── UpgradeModal.tsx     # Modal de upgrade
│   │   └── UsageLimitWarning.tsx # Aviso de limite
│   └── ui/
│       └── PlanBadge.tsx        # Badge de plano
├── services/
│   └── planService.ts           # Serviço de API de planos
└── app/
    └── planos/
        └── page.tsx             # Página de planos
```

## 📦 Componentes a Criar

### 1. Context & Hooks (Prioridade ALTA)

#### `contexts/PlanContext.tsx`
- Gerencia estado global do plano do usuário
- Cache de 30 segundos (sincronizado com backend)
- Atualização automática após ações

#### `hooks/usePlan.ts`
- Hook principal para acessar plano
- Métodos: `checkFeature()`, `checkLimit()`, `getRemainingUsage()`
- Integração com cache

#### `hooks/useAuth.ts`
- Extensão do hook de autenticação existente
- Inclui dados do plano do usuário
- Sincronização com PlanContext

#### `hooks/useFeatureAccess.ts`
- Verificação de acesso a features
- Retorna: `hasAccess`, `reason`, `upgradeRequired`

### 2. Guards (Prioridade ALTA)

#### `components/guards/PlanGuard.tsx`
```tsx
<PlanGuard 
  feature="canExportData"
  fallback={<UpgradePrompt />}
>
  <ExportButton />
</PlanGuard>
```

#### `components/guards/FeatureGuard.tsx`
```tsx
<FeatureGuard 
  limit="maxQuestionsPerDay"
  currentUsage={questionsToday}
  fallback={<LimitReachedMessage />}
>
  <QuestionList />
</FeatureGuard>
```

### 3. UI Components (Prioridade MÉDIA)

#### `components/plan/PlanCard.tsx`
- Exibe informações do plano
- Botão de upgrade/downgrade
- Lista de features e limites

#### `components/plan/PlanComparison.tsx`
- Tabela comparativa de planos
- Destaque de diferenças
- Call-to-action

#### `components/plan/UpgradeModal.tsx`
- Modal de upgrade
- Comparação FREE vs PRO
- Integração com pagamento

#### `components/plan/UsageLimitWarning.tsx`
- Aviso quando próximo do limite
- Barra de progresso
- Link para upgrade

### 4. Services (Prioridade ALTA)

#### `services/planService.ts`
```typescript
- getActivePlans()
- getUserPlan()
- checkFeatureAccess(feature)
- checkLimitUsage(limit, currentUsage)
- upgradePlan(planId)
- cancelPlan()
```

### 5. Pages (Prioridade MÉDIA)

#### `app/planos/page.tsx`
- Página de planos disponíveis
- Comparação de features
- Processo de upgrade

## 🔄 Fluxo de Implementação

### Fase 1: Core (Semana 1)
1. ✅ Criar `PlanContext.tsx`
2. ✅ Criar `usePlan.ts`
3. ✅ Criar `planService.ts`
4. ✅ Integrar com `useAuth.ts` existente
5. ✅ Criar `PlanGuard.tsx`
6. ✅ Criar `FeatureGuard.tsx`

### Fase 2: UI Components (Semana 2)
7. ✅ Criar `PlanCard.tsx`
8. ✅ Criar `UsageLimitWarning.tsx`
9. ✅ Criar `UpgradeModal.tsx`
10. ✅ Criar `PlanBadge.tsx`

### Fase 3: Pages & Integration (Semana 3)
11. ✅ Criar página `/planos`
12. ✅ Integrar guards em páginas existentes
13. ✅ Adicionar avisos de limite
14. ✅ Testes de integração

### Fase 4: Polish & Testing (Semana 4)
15. ✅ Testes E2E
16. ✅ Otimização de performance
17. ✅ Documentação
18. ✅ Deploy

## 🎨 Design System

### Cores
- **FREE**: `#6366f1` (Indigo)
- **TRIAL**: `#f59e0b` (Amber)
- **PRO**: `#10b981` (Emerald)
- **PREMIUM**: `#8b5cf6` (Purple)

### Ícones
- FREE: `🆓`
- TRIAL: `⚡`
- PRO: `⭐`
- PREMIUM: `👑`

## 📊 Métricas de Sucesso

- [ ] 100% das funcionalidades protegidas
- [ ] Tempo de resposta < 100ms (cache)
- [ ] Taxa de conversão FREE → PRO > 5%
- [ ] Zero erros de verificação de plano
- [ ] Cobertura de testes > 80%

## 🔐 Segurança

1. **Verificação no Backend**: Sempre validar no servidor
2. **Frontend como UX**: Guards apenas para melhorar experiência
3. **Sem Hardcode**: Tudo configurável via API
4. **Cache Seguro**: TTL de 30 segundos
5. **Logs**: Rastrear tentativas de acesso negado

## 📝 Exemplos de Uso

### Proteger Funcionalidade
```tsx
import { PlanGuard } from '@/components/guards/PlanGuard';

export function ExportPage() {
  return (
    <PlanGuard feature="canExportData">
      <ExportDataComponent />
    </PlanGuard>
  );
}
```

### Verificar Limite
```tsx
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

export function QuestionList() {
  const { hasAccess, remaining } = useFeatureAccess('maxQuestionsPerDay', questionsToday);
  
  if (!hasAccess) {
    return <UpgradePrompt />;
  }
  
  return (
    <>
      {remaining < 5 && <UsageLimitWarning remaining={remaining} />}
      <Questions />
    </>
  );
}
```

### Exibir Badge
```tsx
import { PlanBadge } from '@/components/ui/PlanBadge';

export function UserProfile() {
  const { plan } = usePlan();
  
  return (
    <div>
      <h1>Perfil</h1>
      <PlanBadge plan={plan.name} />
    </div>
  );
}
```

## 🚀 Próximos Passos

1. Revisar e aprovar arquitetura
2. Criar branch `feature/plan-frontend`
3. Implementar Fase 1 (Core)
4. Code review e ajustes
5. Implementar Fase 2 (UI)
6. Testes e validação
7. Deploy gradual (feature flag)

## 📚 Referências

- [Backend Implementation](../BACKEND/PLAN_SYSTEM_SUMMARY.md)
- [API Endpoints](../BACKEND/COMPLETE_ROUTES_MAPPING.md)
- [Database Schema](../BACKEND/PLAN_VERIFICATION_PROGRESS.md)
