# Admin Types

Este diretório contém todas as definições de tipos TypeScript para o painel administrativo.

## Estrutura

- `common.ts` - Tipos compartilhados (SortField, SortDirection, PaginationParams, etc)
- `user.ts` - User, UserStats, UserRole, UserStatus
- `question.ts` - Question, Alternative, QuestionStatus, Difficulty
- `filter.ts` - Filter, SubFilter, FilterCategory
- `notification.ts` - Notification, NotificationType, NotificationPriority
- `audit.ts` - AuditLog, AdminAction
- `payment.ts` - Payment, PaymentStatus, PaymentMethod
- `task.ts` - AdminTask, TaskStatus, TaskPriority
- `flashcard.ts` - Flashcard, Deck
- `plan.ts` - Plan, PlanFeature
- `coupon.ts` - Coupon, CouponType
- `finance.ts` - FinanceMetrics, RevenueData
- `ai.ts` - AIInsight, Pattern, Anomaly, Prediction

## Convenções

- Use interfaces para objetos
- Use type aliases para unions e intersections
- Use enums para valores fixos (Status, Role, etc)
- Exporte todos os tipos
- Adicione JSDoc comments para tipos complexos
- Mantenha consistência com o backend

## Exemplo

```typescript
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  MENTOR = 'MENTOR',
  ADMIN = 'ADMIN',
}
```
