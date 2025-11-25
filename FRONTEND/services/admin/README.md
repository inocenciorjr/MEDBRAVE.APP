# Admin Services

Este diretório contém todos os serviços de API para o painel administrativo.

## Estrutura

- `baseService.ts` - Funções utilitárias base (fetchWithAuth wrapper, error handling)
- `userService.ts` - CRUD de usuários
- `questionService.ts` - CRUD de questões
- `filterService.ts` - CRUD de filtros hierárquicos
- `notificationService.ts` - CRUD de notificações
- `auditService.ts` - Logs de auditoria
- `paymentService.ts` - Gestão de pagamentos
- `taskService.ts` - CRUD de tarefas
- `flashcardService.ts` - CRUD de flashcards e decks
- `planService.ts` - CRUD de planos
- `couponService.ts` - CRUD de cupons
- `financeService.ts` - Métricas financeiras
- `aiService.ts` - Insights e monitoramento AI
- `statsService.ts` - Estatísticas do dashboard

## Convenções

- Todos os serviços devem usar TypeScript
- Use fetchWithAuth do baseService para requisições autenticadas
- Implemente error handling consistente
- Retorne tipos tipados (interfaces do types/admin/)
- Adicione JSDoc comments para funções públicas
- Implemente retry logic para requisições falhadas
- Use cache quando apropriado (SWR, React Query)

## Exemplo de Uso

```typescript
import { getUsers, updateUser } from '@/services/admin/userService';

// Buscar usuários
const users = await getUsers({ page: 1, limit: 50 });

// Atualizar usuário
await updateUser(userId, { status: 'ACTIVE' });
```
