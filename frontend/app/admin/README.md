# Admin Pages

Este diretório contém todas as páginas do painel administrativo do MEDBRAVE.

## Estrutura

- `layout.tsx` - Layout wrapper para todas as páginas admin
- `page.tsx` - Dashboard principal
- `users/` - Gestão de usuários
- `questions/` - Gestão de questões
- `filters/` - Gestão de filtros hierárquicos
- `notifications/` - Sistema de notificações
- `audit/` - Logs de auditoria
- `payments/` - Gestão de pagamentos
- `tasks/` - Tarefas administrativas
- `flashcards/` - Gestão de flashcards
- `plans/` - Planos de assinatura
- `coupons/` - Cupons de desconto
- `finance/` - Dashboard financeiro
- `ai/` - MEDBRAVE AI (insights e monitoramento)

## Convenções

- Todas as páginas devem usar o Next.js App Router
- Componentes de página devem ser Server Components por padrão
- Use 'use client' apenas quando necessário (interatividade, hooks)
- Mantenha lógica de negócio nos serviços (services/admin/)
