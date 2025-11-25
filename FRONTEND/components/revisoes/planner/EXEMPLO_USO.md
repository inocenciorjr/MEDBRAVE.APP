# Exemplos de Uso do Sistema de Planner

## Cenário Real: Dia 18 de Novembro

### Dados do Sistema
```typescript
// Revisões automáticas do FSRS para hoje (18/11)
const revisoesHoje = {
  flashcards: 20,
  questoes: 10,
  cadernoErros: 10,
};
```

### Como Aparece no Planner

```
┌─────────────────────────────────────────────────────┐
│                    18 de Novembro                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│ 08:00 ┌──────────────────────────────────────────┐ │
│       │ 🎴 Revisão de Flashcards                 │ │
│       │ 20 flashcards                            │ │
│       │ [Sistema] ⚠️                             │ │
│ 10:00 └──────────────────────────────────────────┘ │
│                                                      │
│ 10:00 ┌──────────────────────────────────────────┐ │
│       │ ❓ Revisão de Questões                   │ │
│       │ 10 questões                              │ │
│       │ [Sistema] ⚠️                             │ │
│ 12:00 └──────────────────────────────────────────┘ │
│                                                      │
│ 12:00 [ALMOÇO - vazio]                              │
│ 14:00                                                │
│                                                      │
│ 14:00 ┌──────────────────────────────────────────┐ │
│       │ 📕 Revisão de Caderno de Erros           │ │
│       │ 10 erros                                 │ │
│       │ [Sistema] ⚠️                             │ │
│ 16:00 └──────────────────────────────────────────┘ │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Interação 1: Reorganizar Horários

### Usuário quer estudar flashcards à tarde

**Ação**: Arrastar card de flashcards de 08:00 para 14:00

**Resultado**:
```
┌─────────────────────────────────────────────────────┐
│                    18 de Novembro                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│ 08:00 [vazio]                                        │
│ 10:00                                                │
│                                                      │
│ 10:00 ┌──────────────────────────────────────────┐ │
│       │ ❓ Revisão de Questões                   │ │
│       │ 10 questões                              │ │
│ 12:00 └──────────────────────────────────────────┘ │
│                                                      │
│ 12:00 [ALMOÇO]                                       │
│ 14:00                                                │
│                                                      │
│ 14:00 ┌──────────────────────────────────────────┐ │
│       │ 🎴 Revisão de Flashcards                 │ │
│       │ 20 flashcards                            │ │
│ 16:00 └──────────────────────────────────────────┘ │
│                                                      │
│ 16:00 ┌──────────────────────────────────────────┐ │
│       │ 📕 Revisão de Caderno de Erros           │ │
│       │ 10 erros                                 │ │
│ 18:00 └──────────────────────────────────────────┘ │
│                                                      │
└─────────────────────────────────────────────────────┘
```

✅ **Permitido**: Mudou horário no mesmo dia

## Interação 2: Tentar Mover para Outro Dia

### Usuário tenta arrastar flashcards para dia 19

**Ação**: Arrastar card de flashcards do dia 18 para dia 19

**Resultado**:
```
1. Card fica semi-transparente durante o arrasto
2. Ao soltar no dia 19:
   - Card "volta" para o dia 18 (animação bounce)
   - Console: "Tarefa do sistema não pode ser movida para outro dia"
   - (Futuro) Toast: "⚠️ Revisões não podem ser movidas para outro dia"
```

❌ **Bloqueado**: Revisões do sistema não podem mudar de dia

## Interação 3: Criar Tarefa Manual

### Usuário quer estudar 50 questões de Matemática

**Ação**: Duplo clique na célula 16:00 do dia 18

**Modal Abre**:
```
┌─────────────────────────────────────────┐
│ Nova Tarefa                         [X] │
├─────────────────────────────────────────┤
│                                         │
│ Título:                                 │
│ [Estudar 50 questões de Matemática]    │
│                                         │
│ Descrição (opcional):                   │
│ [Focar em Álgebra e Geometria]         │
│                                         │
│ Tipo de Tarefa:                         │
│ [📚 Sessão de Estudo ▼]                │
│                                         │
│ Duração (horas):                        │
│ [2]                                     │
│                                         │
│ ┌─────────────────────────────────┐   │
│ │ Data: 18/11/2025                │   │
│ │ Horário: 16:00                  │   │
│ └─────────────────────────────────┘   │
│                                         │
│ [Cancelar]  [Criar Tarefa]             │
└─────────────────────────────────────────┘
```

**Após Criar**:
```
┌─────────────────────────────────────────────────────┐
│                    18 de Novembro                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│ ... (revisões anteriores) ...                       │
│                                                      │
│ 16:00 ┌──────────────────────────────────────────┐ │
│       │ 📚 Estudar 50 questões de Matemática     │ │
│       │ Focar em Álgebra e Geometria             │ │
│       │ [Usuário] ✅                             │ │
│ 18:00 └──────────────────────────────────────────┘ │
│                                                      │
└─────────────────────────────────────────────────────┘
```

✅ **Criado**: Tarefa manual com total controle

## Interação 4: Mover Tarefa Manual para Outro Dia

### Usuário decide estudar matemática no dia 19

**Ação**: Arrastar "Estudar 50 questões" do dia 18 para dia 19

**Resultado**:
```
Dia 18:
┌─────────────────────────────────────────────────────┐
│ 16:00 [vazio - tarefa foi movida]                   │
└─────────────────────────────────────────────────────┘

Dia 19:
┌─────────────────────────────────────────────────────┐
│ 16:00 ┌──────────────────────────────────────────┐ │
│       │ 📚 Estudar 50 questões de Matemática     │ │
│       │ Focar em Álgebra e Geometria             │ │
│ 18:00 └──────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

✅ **Permitido**: Tarefas manuais podem mudar de dia

## Interação 5: Ajustar Duração

### Usuário precisa de mais tempo para flashcards

**Ação**: Arrastar borda inferior do card de 10:00 para 11:00

**Antes**:
```
08:00 ┌──────────────────────────────────────────┐
      │ 🎴 Revisão de Flashcards                 │
      │ 20 flashcards                            │
10:00 └──────────────────────────────────────────┘
```

**Depois**:
```
08:00 ┌──────────────────────────────────────────┐
      │ 🎴 Revisão de Flashcards                 │
      │ 20 flashcards                            │
      │                                          │
11:00 └──────────────────────────────────────────┘
```

✅ **Permitido**: Pode ajustar duração

## Cenário Futuro: Mentor Adiciona Tarefa

### Mentor Dr. João Silva adiciona "Aula ao Vivo"

**Backend**:
```typescript
POST /api/planner/mentor/tasks
{
  userId: "user-123",
  title: "Aula ao Vivo - Cardiologia",
  description: "Revisão de ECG e arritmias",
  date: "2025-11-19",
  startHour: 19,
  duration: 2,
  taskType: "mentor-activity",
}
```

**Aparece no Planner do Usuário**:
```
┌─────────────────────────────────────────────────────┐
│                    19 de Novembro                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│ 19:00 ┌──────────────────────────────────────────┐ │
│       │ 👨‍🏫 Aula ao Vivo - Cardiologia           │ │
│       │ Revisão de ECG e arritmias               │ │
│       │ [Mentor: Dr. João Silva] 🟠              │ │
│ 21:00 └──────────────────────────────────────────┘ │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Permissões do Usuário**:
- ✅ Pode mover para outro dia (se precisar)
- ✅ Pode ajustar horário
- ✅ Pode ajustar duração
- ❌ NÃO pode deletar (só o mentor)
- ❌ NÃO pode editar detalhes (só o mentor)

## Cenário Futuro: Admin Adiciona Manutenção

### Admin adiciona "Manutenção do Sistema"

**Backend**:
```typescript
POST /api/planner/admin/tasks
{
  userId: "all", // Para todos os usuários
  title: "Manutenção do Sistema",
  description: "Sistema ficará offline das 02:00 às 04:00",
  date: "2025-11-20",
  startHour: 2,
  duration: 2,
  taskType: "admin-activity",
}
```

**Aparece no Planner**:
```
┌─────────────────────────────────────────────────────┐
│                    20 de Novembro                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│ 02:00 ┌──────────────────────────────────────────┐ │
│       │ ⚙️ Manutenção do Sistema                 │ │
│       │ Sistema ficará offline                   │ │
│       │ [Admin] 🟣                               │ │
│ 04:00 └──────────────────────────────────────────┘ │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Permissões do Usuário**:
- ✅ Pode ajustar horário no mesmo dia (se quiser ver em outro horário)
- ❌ NÃO pode mover para outro dia (manutenção é fixa)
- ❌ NÃO pode deletar
- ❌ NÃO pode editar

## Resumo de Interações

| Ação | Revisão Sistema | Tarefa Usuário | Tarefa Mentor | Tarefa Admin |
|------|----------------|----------------|---------------|--------------|
| Mover horário mesmo dia | ✅ | ✅ | ✅ | ✅ |
| Mover para outro dia | ❌ | ✅ | ✅ | ❌ |
| Ajustar duração | ✅ | ✅ | ✅ | ✅ |
| Deletar | ❌ | ✅ | ❌ | ❌ |
| Editar detalhes | ❌ | ✅ | ❌ | ❌ |

## Código de Exemplo

### Criar Tarefa Manual Programaticamente
```typescript
const novaTarefa = {
  id: `user-task-${Date.now()}`,
  title: 'Estudar 50 questões',
  description: 'Matemática - Álgebra',
  start_hour: 16,
  start_minute: 0,
  end_hour: 18,
  end_minute: 0,
  color: 'purple',
  content_type: 'USER_TASK',
  day_index: 0,
  icon: 'menu_book',
  source: 'user',
  permissions: getDefaultPermissions('user'),
  metadata: {
    createdAt: new Date().toISOString(),
  },
};

setEvents(prev => [...prev, novaTarefa]);
```

### Validar Permissão Antes de Ação
```typescript
const podeMoverParaOutroDia = (event: Event) => {
  return event.permissions.canChangeDays;
};

const podeDeletar = (event: Event) => {
  return event.permissions.canDelete;
};

// Uso
if (podeMoverParaOutroDia(event)) {
  // Permite drag entre dias
} else {
  // Bloqueia e mostra mensagem
}
```

### Adicionar Novo Tipo de Tarefa
```typescript
// 1. Adicionar em types.ts
export type TaskType = 
  | 'flashcard-review'
  | 'question-review'
  | 'error-notebook-review'
  | 'study-session'
  | 'mentor-activity'
  | 'admin-activity'
  | 'group-study'  // ← NOVO
  | 'custom';

// 2. Adicionar cor
export const getTaskTypeColor = (taskType: TaskType): string => {
  switch (taskType) {
    // ... casos existentes
    case 'group-study':
      return 'bg-teal-500';  // ← NOVO
    default:
      return 'bg-gray-500';
  }
};

// 3. Adicionar ícone
export const getTaskTypeIcon = (taskType: TaskType): string => {
  switch (taskType) {
    // ... casos existentes
    case 'group-study':
      return '👥';  // ← NOVO
    default:
      return '📝';
  }
};

// 4. Usar
const tarefaGrupo = {
  // ...
  taskType: 'group-study',
  source: 'user',
  permissions: getDefaultPermissions('user'),
};
```

## Dicas de UX

### Feedback Visual
```typescript
// Ao tentar mover revisão para outro dia
if (!event.permissions.canChangeDays) {
  // Mostrar toast
  toast.warning('⚠️ Revisões não podem ser movidas para outro dia');
  
  // Animar "bounce back"
  animateBounceBack(event.id);
}
```

### Confirmação de Deleção
```typescript
const handleDelete = (event: Event) => {
  if (!event.permissions.canDelete) {
    toast.error('❌ Você não pode deletar esta tarefa');
    return;
  }
  
  if (confirm('Tem certeza que deseja deletar esta tarefa?')) {
    deleteEvent(event.id);
    toast.success('✅ Tarefa deletada com sucesso');
  }
};
```

### Indicador de Salvamento
```typescript
const handleDragEnd = async (event: DragEndEvent) => {
  // ... lógica de drag
  
  // Salvar no backend
  setSaving(true);
  try {
    await saveEventPosition(eventId, newPosition);
    toast.success('✅ Salvo');
  } catch (error) {
    toast.error('❌ Erro ao salvar');
    // Reverter mudança
  } finally {
    setSaving(false);
  }
};
```
