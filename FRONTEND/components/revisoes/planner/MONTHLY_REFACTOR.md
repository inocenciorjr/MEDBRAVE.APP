# Refatoração do MonthlyPlanner

## ✅ Mudanças Implementadas

### 1. Agrupamento de Revisões

**Antes**: Mostrava cada revisão individualmente
```
Dia 18:
- Revisão de Matemática
- Revisão de Física  
- Revisão de Química
- ... (20 itens individuais)
```

**Depois**: Agrupa por tipo
```
Dia 18:
- 20 Flashcards
- 10 Questões
- 10 Erros
```

### 2. Sistema de Permissões

Agora usa o mesmo sistema do DailyPlanner:
- `TaskSource`: system, user, mentor, admin
- `TaskPermissions`: controla o que pode fazer
- `getDefaultPermissions()`: permissões automáticas

### 3. Cores Consistentes

**Antes**: 
- Questões: Teal
- Flashcards: Pink
- Erros: Indigo

**Depois** (alinhado com DailyPlanner):
- Questões: Cyan
- Flashcards: Purple
- Erros: Red

### 4. Badges de Origem

Cada item mostra sua origem:
- **[S]** - Sistema (cinza)
- **[M]** - Mentor (laranja)
- **[A]** - Admin (rosa)
- Sem badge - Usuário

### 5. Criação de Tarefas

**Novo**: Clique em qualquer dia para criar tarefa
- Abre modal com data pré-selecionada
- Cria tarefa manual com permissões de usuário
- Aparece no calendário imediatamente

### 6. Visual Melhorado

**Antes**:
```
┌─────────┐
│ 18      │
│ Item 1  │
│ Item 2  │
│ +3      │
└─────────┘
```

**Depois**:
```
┌─────────────┐
│ 18      [5] │ ← Contador total
│ 🎴 20 Flash │ ← Ícone + contagem
│ ❓ 10 Quest │
│ 📕 10 Erros │
│ +2 mais     │
└─────────────┘
```

## 📊 Comparação Antes/Depois

### Interface

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Agrupamento | ❌ Individual | ✅ Por tipo |
| Permissões | ❌ Não tinha | ✅ Sistema completo |
| Badges | ❌ Não tinha | ✅ Origem visível |
| Criar tarefa | ❌ Não tinha | ✅ Clique no dia |
| Cores | 🟡 Diferentes | ✅ Consistentes |
| Ícones | 🟡 Genéricos | ✅ Específicos |

### Código

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Tipos | Simples | Extensível |
| Lógica | Básica | Agrupamento |
| Integração | Isolado | Alinhado com Daily |
| Extensibilidade | Baixa | Alta |

## 🎯 Funcionalidades Novas

### 1. Agrupamento Inteligente
```typescript
// Agrupa revisões por dia e tipo
const reviewsByDayAndType: Record<string, Record<string, any[]>> = {};

// Cria 1 card por tipo
grouped[dateKey].push({
  id: `grouped-${dateKey}-${contentType}`,
  title: '20 Flashcards',
  count: 20,
  reviewIds: [...],
  source: 'system',
  permissions: getDefaultPermissions('system'),
});
```

### 2. Criação de Tarefas
```typescript
// Clique no dia
onClick={() => {
  setSelectedDate(day);
  setIsCreateModalOpen(true);
}}

// Modal cria tarefa
onCreateTask={(taskData) => {
  const newTask = {
    id: `user-task-${Date.now()}`,
    title: taskData.title,
    source: 'user',
    permissions: getDefaultPermissions('user'),
  };
  
  setManualTasks(prev => ({
    ...prev,
    [dateKey]: [...(prev[dateKey] || []), newTask],
  }));
}}
```

### 3. Badges de Origem
```typescript
const getSourceBadge = (source: TaskSource) => {
  if (source === 'mentor') {
    return <span className="badge-mentor">M</span>;
  }
  if (source === 'admin') {
    return <span className="badge-admin">A</span>;
  }
  if (source === 'system') {
    return <span className="badge-system">S</span>;
  }
  return null;
};
```

## 🎨 Visual

### Dia Normal
```
┌─────────────────┐
│ 18          [3] │
│ 🎴 20 Flash [S] │
│ ❓ 10 Quest [S] │
│ 📕 10 Erros [S] │
└─────────────────┘
```

### Dia com Tarefas Manuais
```
┌─────────────────┐
│ 19          [4] │
│ 🎴 15 Flash [S] │
│ 📚 Estudar Mat  │ ← Tarefa manual (sem badge)
│ 👨‍🏫 Aula [M]    │ ← Tarefa de mentor
│ +1 mais         │
└─────────────────┘
```

### Dia Atual (Hoje)
```
┌═════════════════┐ ← Ring azul
║ 18 (hoje)   [5] ║
║ 🎴 20 Flash [S] ║
║ ❓ 10 Quest [S] ║
║ 📕 10 Erros [S] ║
║ +2 mais         ║
└═════════════════┘
```

## 🔧 Integração com DailyPlanner

Agora ambos os planners usam:
- ✅ Mesmos tipos (`TaskSource`, `TaskPermissions`)
- ✅ Mesmas cores
- ✅ Mesmos ícones
- ✅ Mesmo sistema de agrupamento
- ✅ Mesmo modal de criação
- ✅ Mesmas permissões

## 📈 Benefícios

### Para o Usuário
1. **Visão mais limpa**: Menos clutter visual
2. **Informação clara**: Contadores e badges
3. **Criação rápida**: Clique para criar tarefa
4. **Consistência**: Mesmo comportamento em ambas as views

### Para o Desenvolvedor
1. **Código reutilizável**: Mesmos tipos e helpers
2. **Manutenção fácil**: Mudanças em um lugar
3. **Extensível**: Fácil adicionar novos tipos
4. **Type-safe**: TypeScript garante consistência

## 🚀 Próximos Passos

### Melhorias Possíveis
1. **Drag and drop** no calendário mensal
2. **Modal de detalhes** ao clicar em item
3. **Filtros** por tipo de tarefa
4. **Exportar** mês como PDF
5. **Estatísticas** do mês

### Backend Necessário
1. Salvar tarefas manuais
2. Buscar tarefas por mês
3. Atualizar tarefas
4. Deletar tarefas

## 📝 Exemplo de Uso

### Criar Tarefa no Dia 20
```typescript
// 1. Usuário clica no dia 20
// 2. Modal abre com data = 20/11/2025
// 3. Usuário preenche:
//    - Título: "Estudar 50 questões"
//    - Tipo: Sessão de Estudo
//    - Duração: 2h
// 4. Clica em "Criar Tarefa"
// 5. Tarefa aparece no dia 20 do calendário
```

### Visualizar Revisões Agrupadas
```typescript
// Dia 18 tem:
// - 20 flashcards individuais
// - 10 questões individuais
// - 10 erros individuais

// Aparece como:
// - 1 card: "20 Flashcards"
// - 1 card: "10 Questões"
// - 1 card: "10 Erros"

// Total: 3 cards ao invés de 40
```

## ✨ Conclusão

MonthlyPlanner agora está **totalmente alinhado** com o DailyPlanner:
- ✅ Mesmo sistema de permissões
- ✅ Mesmo agrupamento
- ✅ Mesmas cores e ícones
- ✅ Mesma experiência de usuário
- ✅ Código consistente e reutilizável

**Pronto para uso!** 🎉
