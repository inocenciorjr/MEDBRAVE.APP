# Admin Services

Este diretório contém todos os serviços de API para o painel administrativo.

## Estrutura

### Core Services
- `baseService.ts` - Funções utilitárias base (fetchWithAuth wrapper, error handling)
- `authService.ts` - Autenticação admin
- `statsService.ts` - Estatísticas do dashboard

### Content Management
- `userService.ts` - CRUD de usuários
- `questionService.ts` - CRUD de questões
- `filterService.ts` - CRUD de filtros hierárquicos
- `notificationService.ts` - CRUD de notificações
- `medbraveService.ts` - Serviços MEDBRAVE AI

### Payment & Plans (✅ Implementados)
- `planService.ts` - CRUD de planos (criar, editar, deletar, duplicar)
- `userPlanService.ts` - Gestão de planos de usuários (cancelar, renovar, status)
- `couponService.ts` - CRUD de cupons de desconto
- `paymentService.ts` - Visualização e gestão de pagamentos (reembolsar, cancelar)
- `invoiceService.ts` - Gestão de invoices (criar, marcar como pago)

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
