# Implementação do Sistema de Permissões e Agrupamento

## ✅ O que foi implementado

### 1. Sistema de Tipos e Permissões (`types.ts`)

#### Novos Tipos
- `TaskSource`: Define a origem da tarefa (system, user, mentor, admin)
- `TaskType`: Define o tipo específico da tarefa
- `TaskPermissions`: Define o que pode ser feito com cada tarefa

#### Helpers
- `getDefaultPermissions()`: Retorna permissões padrão baseado na fonte
- `getTaskTypeColor()`: Retorna cor baseada no tipo de tarefa
- `getReviewTypeColor()`: Retorna cor baseada no tipo de revisão
- `getTaskTypeIcon()`: Retorna ícone baseado no tipo
- `getReviewTypeIcon()`: Retorna ícone baseado no tipo de revisão

### 2. Agrupamento de Revisões (`DailyPlanner.tsx`)

#### Lógica de Agrupamento
```typescript
// Agrupa revisões por dia e tipo
const groupedReviews: Record<string, Record<string, any[]>> = {};

// Para cada dia, cria 3 cards (se houver):
// 1. Flashcards
// 2. Questões  
// 3. Caderno de Erros
```

#### Exemplo de Card Agrupado
```typescript
{
  id: 'grouped-0-FLASHCARD',
  title: 'Revisão de Flashcards',
  subtitle: '20 flashcards',
  metadata: {
    count: 20,
    reviewIds: ['id1', 'id2', ...],
  },
  source: 'system',
  permissions: {
    canChangeDays: false,  // ❌ Não pode mudar de dia
    canChangeTime: true,   // ✅ Pode mudar horário
    canChangeDuration: true,
    canDelete: false,
    canEdit: false,
  }
}
```

### 3. Validação de Drag (`DailyPlanner.tsx`)

#### handleDragEnd()
```typescript
// Valida se pode mudar de dia
const isDifferentDay = dayIndex !== draggedEvent.day_index;

if (isDifferentDay && !draggedEvent.permissions.canChangeDays) {
  // Não permite - volta para o dia original
  console.log('Tarefa do sistema não pode ser movida para outro dia');
  return;
}
```

#### Desabilita Drag Condicional
```typescript
const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
  id: event.id,
  disabled: isResizing || !event.permissions.canChangeTime,
});
```

### 4. Validação de Resize (`DailyPlanner.tsx`)

#### handleResizeStart()
```typescript
const event = events.find(evt => evt.id === eventId);
if (!event?.permissions.canChangeDuration) {
  return; // Não permite resize
}
```

#### Renderização Condicional do Handle
```typescript
{event.permissions.canChangeDuration && (
  <div className="resize-handle">
    {/* Handle de redimensionamento */}
  </div>
)}
```

### 5. Modal de Criação de Tarefas (`CreateTaskModal.tsx`)

#### Features
- Formulário completo para criar tarefas
- Seleção de tipo de tarefa
- Duração configurável
- Data e hora pré-selecionadas
- Validação de campos

#### Criação de Tarefa
```typescript
onCreateTask({
  title,
  description,
  start_hour: selectedHour || 8,
  duration,
  taskType: 'study-session',
  source: 'user',
  permissions: getDefaultPermissions('user'),
  // ...
});
```

### 6. Interações para Criar Tarefas

#### Duplo Clique em Célula
```typescript
<DroppableCell 
  onDoubleClick={(dayIndex, hour) => {
    setSelectedCell({ dayIndex, hour });
    setIsCreateModalOpen(true);
  }}
/>
```

#### Botão Flutuante
```typescript
<button
  onClick={() => {
    setSelectedCell({ dayIndex: 0, hour: 8 });
    setIsCreateModalOpen(true);
  }}
  className="fixed bottom-8 right-8 ..."
>
  <span className="material-symbols-outlined">add</span>
</button>
```

### 7. Badges de Origem (`DraggableEvent`)

```typescript
const getSourceBadge = () => {
  if (event.source === 'mentor') {
    return <span className="badge-mentor">Mentor</span>;
  }
  if (event.source === 'admin') {
    return <span className="badge-admin">Admin</span>;
  }
  if (event.source === 'system') {
    return <span className="badge-system">Sistema</span>;
  }
  return null;
};
```

### 8. Separador Visual (`ReviewTypeSeparator.tsx`)

Componente para separar visualmente os tipos de revisão:
- Ícone do tipo
- Label
- Badge com contagem
- Cores específicas por tipo

### 9. Documentação

#### Arquivos Criados
- `COMPORTAMENTO.md`: Regras de negócio e exemplos práticos
- `IMPLEMENTACAO.md`: Este arquivo - detalhes técnicos
- `README.md`: Atualizado com sistema de permissões

## 🎯 Comportamento Implementado

### Revisões do Sistema (source: 'system')
```
✅ Pode ajustar horário no mesmo dia
✅ Pode ajustar duração
❌ NÃO pode mover para outro dia → volta automaticamente
❌ NÃO pode deletar
❌ NÃO pode editar
```

### Tarefas do Usuário (source: 'user')
```
✅ Total controle
✅ Pode mover para qualquer dia
✅ Pode ajustar horário e duração
✅ Pode deletar
✅ Pode editar
```

### Tarefas de Mentores (source: 'mentor') - PREPARADO
```
✅ Usuário pode reorganizar
✅ Pode ajustar duração
❌ NÃO pode deletar (só mentor)
❌ NÃO pode editar (só mentor)
```

### Tarefas de Admin (source: 'admin') - PREPARADO
```
✅ Pode ajustar horário no mesmo dia
✅ Pode ajustar duração
❌ NÃO pode mover para outro dia
❌ NÃO pode deletar
❌ NÃO pode editar
```

## 🔧 Como Adicionar Tarefas de Mentor/Admin (Futuro)

### Backend
```typescript
// Endpoint para mentor adicionar tarefa
POST /api/planner/mentor/tasks
{
  userId: string,
  title: string,
  description: string,
  date: string,
  startHour: number,
  duration: number,
  taskType: 'mentor-activity',
}

// Resposta
{
  id: string,
  source: 'mentor',
  permissions: {
    canChangeDays: true,
    canChangeTime: true,
    canChangeDuration: true,
    canDelete: false,
    canEdit: false,
  },
  metadata: {
    createdBy: 'mentor-id',
    createdByName: 'Dr. João Silva',
  }
}
```

### Frontend
```typescript
// Ao carregar tarefas, o sistema já reconhece automaticamente
const task = {
  ...taskData,
  source: 'mentor', // Vem do backend
  permissions: getDefaultPermissions('mentor'), // Aplica permissões
};

// O drag/drop já valida automaticamente
// O badge já aparece automaticamente
// As cores já são aplicadas automaticamente
```

## 📊 Estrutura de Dados

### Antes (Simples)
```typescript
interface Event {
  id: string;
  title: string;
  start_hour: number;
  end_hour: number;
  // ...
}
```

### Depois (Extensível)
```typescript
interface Event {
  id: string;
  title: string;
  start_hour: number;
  end_hour: number;
  
  // Sistema de controle
  source: TaskSource;
  permissions: TaskPermissions;
  originalDayIndex?: number;
  
  // Dados extensíveis
  metadata?: {
    count?: number;
    reviewIds?: string[];
    createdBy?: string;
    createdByName?: string;
    [key: string]: any; // Totalmente extensível
  };
}
```

## 🎨 Cores Implementadas

### Por Tipo de Revisão
- Flashcards: `bg-blue-100` / `bg-blue-500`
- Questões: `bg-green-100` / `bg-green-500`
- Caderno de Erros: `bg-red-100` / `bg-red-500`

### Por Tipo de Tarefa
- Sessão de Estudo: `bg-purple-100` / `bg-purple-500`
- Atividade de Mentor: `bg-orange-100` / `bg-orange-500`
- Atividade de Admin: `bg-pink-100` / `bg-pink-500`
- Outras: `bg-gray-100` / `bg-gray-500`

## 🚀 Próximos Passos

### Backend Necessário
1. Endpoint para salvar horários agendados de revisões
2. Endpoint para CRUD de tarefas manuais
3. Endpoint para mentores adicionarem tarefas
4. Endpoint para admins adicionarem tarefas
5. Sincronização em tempo real (opcional)

### Melhorias de UX
1. Toast notification ao tentar mover revisão para outro dia
2. Animação de "bounce back" mais suave
3. Confirmação antes de deletar tarefa
4. Undo/Redo de ações
5. Atalhos de teclado

### Features Adicionais
1. Filtros por tipo de tarefa
2. Busca de tarefas
3. Exportar planner (PDF/iCal)
4. Notificações de revisões próximas
5. Estatísticas de produtividade

## 📝 Notas de Implementação

### Extensibilidade
O sistema foi projetado para ser **totalmente extensível**:
- Novos tipos de tarefas: adicionar em `TaskType`
- Novas fontes: adicionar em `TaskSource`
- Novas permissões: adicionar em `TaskPermissions`
- Novos metadados: usar `metadata[key]`

### Performance
- Agrupamento é feito no frontend (pode mover para backend)
- Limite de 200 revisões futuras
- Memoização pode ser adicionada depois

### Compatibilidade
- Funciona com dados antigos (campos opcionais)
- Migração gradual possível
- Backward compatible

## ✨ Resumo

Sistema completo de permissões e agrupamento implementado:
- ✅ Agrupamento de revisões por tipo e dia
- ✅ Validação de drag entre dias
- ✅ Permissões por fonte de tarefa
- ✅ Modal de criação de tarefas
- ✅ Badges de origem
- ✅ Separadores visuais
- ✅ Extensível para mentor/admin
- ✅ Documentação completa

**Pronto para uso e extensão futura!** 🎉
