# Planner de Revisões - MedBrave

## Visão Geral

Sistema completo de planner para gerenciamento de revisões e atividades de estudo, com suporte a drag-and-drop, visualização diária e mensal, e integração com o sistema de revisões espaçadas (FSRS).

## Estrutura de Componentes

### 1. **ReviewSummaryCards**
Cards de resumo que mostram as revisões do dia atual, separadas por tipo:
- **Questões**: Questões de provas e exercícios
- **Flashcards**: Cards de memorização ativa
- **Caderno de Erros**: Questões que o usuário errou

**Features:**
- Contador de itens por tipo
- Tempo estimado total
- Botões de ação rápida
- Integração com API de revisões

### 2. **PlannerView**
Componente principal que gerencia a visualização do planner.

**Features:**
- Toggle entre visualização semanal e mensal
- Navegação por datas (anterior/próximo/hoje)
- Exibição do período atual
- Responsivo e adaptável

### 3. **DailyPlanner** (Visualização Semanal)
Planner semanal com suporte a drag-and-drop.

**Features:**
- 7 colunas representando os dias da semana
- Drag-and-drop de tarefas entre dias
- Adicionar tarefas manualmente
- Editar e excluir tarefas
- Visualização de revisões agendadas
- Destaque do dia atual

**Tecnologias:**
- `@dnd-kit/core` para drag-and-drop
- `@dnd-kit/sortable` para ordenação
- `date-fns` para manipulação de datas

### 4. **MonthlyPlanner** (Visualização Mensal) ⭐
Calendário mensal com visualização de todas as atividades.

**Features:**
- Grid de calendário completo
- **Agrupamento de revisões por tipo** (igual ao DailyPlanner)
- **Sistema de permissões integrado**
- Visualização de até 3 tarefas por dia
- Contador de tarefas adicionais
- **Clique para criar tarefa no dia**
- Destaque do dia atual com ring azul
- Dias de outros meses em opacidade reduzida
- **Badges de origem** (Sistema, Mentor, Admin)

### 5. **DayColumn**
Coluna individual representando um dia no planner semanal.

**Features:**
- Drop zone para receber tarefas
- Lista de tarefas do dia
- Botão de adicionar tarefa
- Contador de itens
- Destaque visual para dia atual

### 6. **TaskCard**
Card individual de tarefa/revisão com drag-and-drop.

**Features:**
- Drag handle para mover
- Ícones por tipo de conteúdo
- Cores por categoria
- Botões de edição e exclusão
- Exibição de tempo e duração
- Checkbox de conclusão (para tarefas)

## Sistema de Permissões e Tipos de Tarefas

### 1. Tarefas do Sistema (Revisões Automáticas)
- **Origem**: Geradas automaticamente pelo sistema de repetição espaçada (FSRS)
- **Tipos**: 
  - Revisão de Flashcards (🎴)
  - Revisão de Questões (❓)
  - Revisão de Caderno de Erros (📕)
- **Agrupamento**: Todas as revisões do mesmo tipo no mesmo dia são agrupadas em um único card
- **Permissões**:
  - ✅ Pode ajustar horário no mesmo dia
  - ✅ Pode ajustar duração
  - ❌ **NÃO pode mover para outro dia** (volta automaticamente ao dia original)
  - ❌ NÃO pode deletar
  - ❌ NÃO pode editar detalhes

### 2. Tarefas do Usuário (Manuais)
- **Origem**: Criadas manualmente pelo usuário
- **Tipos**: 
  - Sessão de Estudo (📚)
  - Outras Atividades (📝)
- **Criação**: Duplo clique em qualquer célula ou botão flutuante (+)
- **Permissões**:
  - ✅ **Total controle**
  - ✅ Pode mover para qualquer dia
  - ✅ Pode ajustar horário e duração
  - ✅ Pode deletar
  - ✅ Pode editar

### 3. Tarefas de Mentores (Futuro)
- **Origem**: Adicionadas por mentores via painel admin
- **Badge**: 🟠 Mentor
- **Permissões**:
  - ✅ Usuário pode reorganizar (horário e dia)
  - ✅ Pode ajustar duração
  - ❌ NÃO pode deletar (só mentor)
  - ❌ NÃO pode editar detalhes (só mentor)

### 4. Tarefas de Admin (Futuro)
- **Origem**: Adicionadas por administradores
- **Badge**: 🟣 Admin
- **Permissões**:
  - ✅ Pode ajustar horário no mesmo dia
  - ✅ Pode ajustar duração
  - ❌ NÃO pode mover para outro dia
  - ❌ NÃO pode deletar
  - ❌ NÃO pode editar

## Tipos de Dados

### PlannerTask
```typescript
interface PlannerTask {
  id: string;
  type: 'task';
  title: string;
  description?: string;
  time: string | null; // HH:mm format
  duration: number; // minutes
  color: string;
  completed: boolean;
  
  // Sistema de permissões
  taskType: TaskType;
  source: TaskSource;
  permissions: TaskPermissions;
  
  metadata?: {
    count?: number;
    reviewIds?: string[];
    createdBy?: string;
    createdByName?: string;
    originalDate?: string;
    [key: string]: any;
  };
}
```

### PlannerReview
```typescript
interface PlannerReview {
  id: string;
  type: 'review';
  content_type: 'QUESTION' | 'FLASHCARD' | 'ERROR_NOTEBOOK';
  title: string;
  subtitle?: string;
  time: string | null; // HH:mm format
  duration: number; // minutes
  color: string;
  
  // Sistema de permissões
  source: TaskSource;
  permissions: TaskPermissions;
  
  metadata?: {
    count?: number;
    reviewIds?: string[];
    originalDate?: string;
    [key: string]: any;
  };
}
```

### TaskPermissions
```typescript
interface TaskPermissions {
  canChangeDays: boolean;      // Pode arrastar para outros dias
  canChangeTime: boolean;      // Pode mudar horário no mesmo dia
  canChangeDuration: boolean;  // Pode redimensionar
  canDelete: boolean;          // Pode deletar
  canEdit: boolean;            // Pode editar detalhes
}
```

## Integração com Backend

### Endpoints Utilizados

1. **GET /api/unified-reviews/summary**
   - Retorna resumo das revisões do dia
   - Usado em: `ReviewSummaryCards`

2. **GET /api/unified-reviews/future?limit=200**
   - Retorna revisões futuras
   - Usado em: `DailyPlanner`, `MonthlyPlanner`

3. **GET /api/unified-reviews/today?limit=50**
   - Retorna revisões de hoje
   - Usado em: `ReviewSummaryCards`

## Funcionalidades Implementadas

### ✅ Drag and Drop
- Arrastar tarefas entre dias
- Feedback visual durante o arrasto
- Overlay de arrasto
- Salvamento automático (TODO: implementar backend)

### ✅ Gerenciamento de Tarefas
- Adicionar tarefas manualmente
- Editar tarefas existentes (TODO: modal)
- Excluir tarefas
- Marcar como concluída

### ✅ Visualizações
- Semanal (7 dias)
- Mensal (calendário completo)
- Toggle fácil entre visualizações

### ✅ Navegação
- Anterior/Próximo período
- Voltar para hoje
- Exibição do período atual

### ✅ Responsividade
- Layout adaptável
- Grid responsivo
- Funciona em mobile e desktop

## Próximos Passos (TODO)

### Backend
- [ ] Endpoint para salvar movimentação de tarefas
- [ ] Endpoint para criar/editar/excluir tarefas manuais
- [ ] Endpoint para marcar tarefa como concluída
- [ ] Persistência de horários agendados

### Frontend
- [ ] Modal de criação/edição de tarefas
- [ ] Modal de gerenciamento de revisões
- [ ] Integração com wizard de configurações
- [ ] Filtros por tipo de conteúdo
- [ ] Busca de tarefas
- [ ] Exportar planner (PDF/iCal)
- [ ] Notificações de revisões próximas
- [ ] Sincronização com calendário externo

### UX/UI
- [ ] Animações de transição
- [ ] Feedback de salvamento
- [ ] Undo/Redo de ações
- [ ] Atalhos de teclado
- [ ] Tutorial inicial
- [ ] Temas de cores personalizados

## Como Usar

### Instalação
```bash
cd frontend
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities date-fns
```

### Acessar a Página
```
/revisoes/planner
```

### Adicionar Tarefa
1. Clique no botão "Adicionar" em qualquer dia
2. Preencha os detalhes da tarefa
3. Salve

### Mover Tarefa
1. Clique e segure no ícone de arrastar (grip)
2. Arraste para o dia desejado
3. Solte para confirmar

### Alternar Visualização
- Use o toggle "Semanal/Mensal" no topo do planner

## Dependências

- `@dnd-kit/core`: ^6.1.0
- `@dnd-kit/sortable`: ^8.0.0
- `@dnd-kit/utilities`: ^3.2.2
- `date-fns`: ^3.0.0
- `lucide-react`: ^0.553.0

## Estrutura de Arquivos

```
frontend/components/revisoes/planner/
├── index.ts                    # Exports
├── types.ts                    # TypeScript types
├── ReviewSummaryCards.tsx      # Cards de resumo
├── PlannerView.tsx             # Container principal
├── DailyPlanner.tsx            # Visualização semanal
├── MonthlyPlanner.tsx          # Visualização mensal
├── DayColumn.tsx               # Coluna de dia
├── TaskCard.tsx                # Card de tarefa
└── README.md                   # Esta documentação
```

## Notas de Implementação

### Cores por Tipo
- **Azul**: Questões
- **Roxo**: Flashcards
- **Vermelho**: Caderno de Erros
- **Cinza**: Tarefas manuais

### Formato de Datas
- Todas as datas são manipuladas com `date-fns`
- Locale: `pt-BR`
- Formato de chave: `yyyy-MM-dd`

### Performance
- Lazy loading de revisões
- Limite de 200 revisões futuras
- Memoização de componentes (TODO)
- Virtual scrolling para listas grandes (TODO)

## Suporte

Para dúvidas ou problemas, consulte a documentação do backend em:
- `BACKEND/src/domain/studyTools/unifiedReviews/`
- `ANALISE_UNIFIED_REVIEW_FSRS.md`
