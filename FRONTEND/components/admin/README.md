# Admin Components

Este diretório contém todos os componentes do painel administrativo do MEDBRAVE.

## Estrutura

### Layout Components (`layout/`)
- `AdminLayout.tsx` - Layout principal com sidebar e header
- `AdminSidebar.tsx` - Sidebar de navegação
- `AdminHeader.tsx` - Header com breadcrumb e user info

### UI Components (`ui/`)
Componentes reutilizáveis que seguem o design system:
- `AdminButton.tsx` - Botão com variantes
- `AdminInput.tsx` - Input, textarea, select
- `AdminBadge.tsx` - Badge para status e categorias
- `AdminCard.tsx` - Card base
- `AdminModal.tsx` - Modal reutilizável
- `AdminTable.tsx` - Tabela com sorting, filtering, pagination
- `AdminPagination.tsx` - Controles de paginação
- `AdminStats.tsx` - Card de estatística

### Feature Components
Cada pasta contém componentes específicos de uma funcionalidade:
- `dashboard/` - Componentes do dashboard
- `users/` - Componentes de gestão de usuários
- `questions/` - Componentes de gestão de questões
- `filters/` - Componentes de gestão de filtros
- `notifications/` - Componentes de notificações
- `audit/` - Componentes de auditoria
- `payments/` - Componentes de pagamentos
- `tasks/` - Componentes de tarefas
- `flashcards/` - Componentes de flashcards
- `plans/` - Componentes de planos
- `coupons/` - Componentes de cupons
- `finance/` - Componentes financeiros
- `ai/` - Componentes de MEDBRAVE AI

## Convenções

- Todos os componentes devem usar TypeScript
- Use 'use client' para componentes interativos
- Props devem ser tipadas com interfaces
- Aplique o design system do MEDBRAVE (cores, fontes, espaçamentos)
- Use Material Symbols para ícones
- Mantenha componentes pequenos e focados (responsabilidade única)
