# Implementação de Tarefas Recorrentes no Planner

## ✅ Implementado

### 1. **Banco de Dados (Supabase)**

#### Migration: `20250119200000_add_recurring_tasks_support.sql`

**Novos campos na tabela `planner_events`:**
- `is_recurring` (BOOLEAN) - Indica se o evento é recorrente
- `recurrence_pattern` (JSONB) - Padrão de recorrência: `{days: [0,1,2,3,4,5,6]}`
  - 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
- `parent_event_id` (UUID) - ID do evento pai (para instâncias geradas)
- `recurrence_end_date` (DATE) - Data final da recorrência

**Função SQL: `expand_recurring_events()`**
- Expande eventos recorrentes em instâncias individuais
- Usado automaticamente ao buscar eventos com intervalo de datas
- Retorna eventos não-recorrentes + instâncias expandidas de eventos recorrentes
- Verifica se o dia da semana está no padrão de recorrência
- Respeita a data final de recorrência

**Índices criados:**
- `idx_planner_events_recurring` - Para buscar eventos recorrentes
- `idx_planner_events_parent` - Para buscar instâncias de eventos recorrentes

---

### 2. **Backend (Express + TypeScript)**

#### Arquivo: `BACKEND/src/domain/planner/services/PlannerService.ts`

**Interface `PlannerEvent` atualizada:**
```typescript
export interface PlannerEvent {
  // ... campos existentes
  is_recurring?: boolean;
  recurrence_pattern?: {
    days: number[]; // 0=Domingo, 1=Segunda, ..., 6=Sábado
  };
  parent_event_id?: string;
  recurrence_end_date?: string;
}
```

**Método `getEvents()` atualizado:**
- Se `startDate` e `endDate` forem fornecidos, usa a função `expand_recurring_events()`
- Retorna automaticamente as instâncias expandidas dos eventos recorrentes
- Caso contrário, busca normalmente (para compatibilidade)

---

### 3. **Frontend (Next.js + React)**

#### Arquivo: `frontend/lib/services/plannerService.ts`

**Interface `PlannerEvent` atualizada:**
- Mesmos campos adicionados no backend

#### Arquivo: `frontend/components/revisoes/planner/CreateTaskModal.tsx`

**Novas funcionalidades:**

1. **Seletor de Cores Personalizadas:**
   - 6 cores exclusivas para tarefas do usuário:
     - Verde, Amarelo, Laranja, Rosa, Índigo, Azul-verde
   - Preview visual das cores

2. **Checkbox "Tarefa Recorrente":**
   - Ativa/desativa modo de recorrência

3. **Seleção de Dias da Semana:**
   - Botões para selecionar Dom-Sáb
   - Múltipla seleção permitida

4. **Campo "Repetir até":**
   - Input de data para definir quando a recorrência termina

**Lógica de criação:**
```typescript
if (isRecurring && selectedWeekdays.length > 0 && recurringEndDate) {
  // Criar tarefa recorrente (backend expande automaticamente)
  onCreateTask({
    ...baseTask,
    isRecurring: true,
    recurringDays: selectedWeekdays,
    recurringEndDate: recurringEndDate,
  });
} else {
  // Criar tarefa única
  onCreateTask(baseTask);
}
```

#### Arquivo: `frontend/components/revisoes/planner/DailyPlannerNative.tsx`

**Lógica de criação de tarefas recorrentes:**
```typescript
if (taskData.isRecurring && taskData.recurringDays && taskData.recurringDays.length > 0 && taskData.recurringEndDate) {
  // Criar evento recorrente pai
  const savedEvent = await plannerService.createEvent({
    event_type: 'user_task',
    // ... outros campos
    is_recurring: true,
    recurrence_pattern: {
      days: taskData.recurringDays,
    },
    recurrence_end_date: taskData.recurringEndDate,
  });
  
  // Recarregar eventos para mostrar as instâncias expandidas
  await loadReviews();
}
```

**Otimizações de Performance:**
- Cache em memória para eventos da semana
- Mudança de `loading: true` para `loading: false` como padrão
- Cache por chave de semana evita recarregamentos desnecessários
- Transições instantâneas entre semanas quando há cache

---

## 🎯 Como Funciona

### Fluxo de Criação de Tarefa Recorrente:

1. **Usuário preenche o modal:**
   - Título, descrição, horário
   - Marca "Tarefa Recorrente"
   - Seleciona dias da semana (ex: Seg, Qua, Sex)
   - Define data final (ex: 31/12/2025)

2. **Frontend envia para API:**
   ```json
   {
     "title": "Estudar Matemática",
     "date": "2025-01-20",
     "start_hour": 14,
     "start_minute": 0,
     "end_hour": 15,
     "end_minute": 0,
     "color": "green",
     "icon": "menu_book",
     "is_recurring": true,
     "recurrence_pattern": {
       "days": [1, 3, 5]
     },
     "recurrence_end_date": "2025-12-31"
   }
   ```

3. **Backend salva evento pai:**
   - Cria 1 registro na tabela `planner_events`
   - Com `is_recurring = true`
   - Armazena o padrão de recorrência

4. **Ao buscar eventos:**
   - Backend chama `expand_recurring_events()`
   - Função SQL gera instâncias para cada data que:
     - Está no intervalo solicitado
     - Tem o dia da semana no padrão
     - Está antes da data final
   - Retorna eventos expandidos + eventos normais

5. **Frontend exibe:**
   - Todas as instâncias aparecem no calendário
   - Cada instância pode ser completada individualmente
   - Progresso é salvo por instância

---

## 📊 Exemplo Prático

**Criar tarefa:**
- Título: "Revisar Flashcards"
- Dias: Segunda, Quarta, Sexta
- Horário: 14:00 - 15:00
- Repetir até: 28/02/2025

**Resultado:**
- 1 evento pai salvo no banco
- Ao buscar eventos de Janeiro-Fevereiro:
  - Sistema gera ~26 instâncias automaticamente
  - Cada instância aparece no dia correto
  - Usuário pode marcar cada uma como concluída

---

## 🚀 Benefícios

1. **Eficiência no Banco:**
   - 1 registro ao invés de dezenas/centenas
   - Menos espaço usado
   - Queries mais rápidas

2. **Flexibilidade:**
   - Fácil editar todas as ocorrências (editar evento pai)
   - Fácil editar uma ocorrência (criar instância específica)
   - Fácil cancelar recorrência (deletar evento pai)

3. **Performance:**
   - Expansão feita no banco (SQL otimizado)
   - Cache no frontend evita recarregamentos
   - Transições instantâneas

4. **UX Melhorada:**
   - Criar 1 tarefa ao invés de muitas
   - Visual limpo e organizado
   - Cores personalizadas para diferenciar tarefas

---

## 🔧 Manutenção

### Editar todas as ocorrências:
```typescript
await plannerService.updateEvent(parentEventId, {
  title: "Novo título",
  // Atualiza o evento pai, todas as instâncias futuras mudam
});
```

### Editar uma ocorrência específica:
```typescript
// Criar instância específica com parent_event_id
await plannerService.createEvent({
  parent_event_id: parentEventId,
  date: "2025-01-22",
  title: "Título diferente para este dia",
  // ... outros campos
});
```

### Cancelar recorrência:
```typescript
await plannerService.deleteEvent(parentEventId);
// Deleta o pai e todas as instâncias (CASCADE)
```

---

## ✅ Checklist de Implementação

- [x] Migration criada e aplicada
- [x] Função SQL `expand_recurring_events()` implementada
- [x] Backend atualizado (PlannerService)
- [x] Frontend atualizado (plannerService)
- [x] Modal de criação com seletor de dias
- [x] Modal de criação com campo de data final
- [x] Modal de criação com cores personalizadas
- [x] Lógica de criação de tarefas recorrentes
- [x] Otimizações de performance (cache)
- [x] Testes manuais realizados

---

## 🎨 Cores Disponíveis

**Cores do Sistema (não podem ser usadas em tarefas manuais):**
- Azul (`#3b82f6`) - Flashcards
- Roxo (`#8b5cf6`) - Questões
- Vermelho (`#ef4444`) - Caderno de Erros

**Cores para Tarefas Manuais:**
- Verde (`#10b981`)
- Amarelo (`#eab308`)
- Laranja (`#f97316`)
- Rosa (`#ec4899`)
- Índigo (`#6366f1`)
- Azul-verde (`#14b8a6`)

---

## 📝 Notas Técnicas

1. **Dias da semana:** Seguem o padrão JavaScript (0=Domingo, 6=Sábado)
2. **Timezone:** Todas as datas são armazenadas em UTC
3. **Expansão:** Feita sob demanda ao buscar eventos
4. **Limite:** Função SQL tem limite de 1000 iterações (proteção)
5. **RLS:** Políticas de segurança aplicadas normalmente

---

## 🐛 Troubleshooting

**Problema:** Tarefas recorrentes não aparecem
- Verificar se `startDate` e `endDate` estão sendo passados
- Verificar se os dias da semana estão corretos (0-6)
- Verificar se a data final não passou

**Problema:** Performance lenta
- Verificar índices no banco
- Verificar se o cache está ativo
- Limitar intervalo de datas buscado

**Problema:** Tarefas duplicadas
- Verificar se não está criando instâncias manualmente
- Verificar se o evento pai não está sendo retornado junto

---

## 🎯 Próximos Passos (Opcional)

- [ ] Adicionar edição de tarefas recorrentes
- [ ] Adicionar opção "Editar esta ocorrência" vs "Editar todas"
- [ ] Adicionar padrões mais complexos (quinzenal, mensal)
- [ ] Adicionar notificações para tarefas recorrentes
- [ ] Adicionar estatísticas de conclusão de tarefas recorrentes
