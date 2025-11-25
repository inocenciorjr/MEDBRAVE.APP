# Comportamento do Planner - Regras de Negócio

## Exemplo Prático: 18 de Novembro

### Cenário
Hoje é **18 de novembro** e você tem:
- 20 revisões de flashcards
- 10 revisões de questões  
- 10 revisões de caderno de erros

### Visualização no Planner

No dia 18, você verá **3 cards agrupados**:

```
┌─────────────────────────────────────┐
│ 🎴 Revisão de Flashcards            │
│ 20 flashcards                       │
│ 08:00 - 10:00                       │
│ [Sistema] ⚠️ Não pode mudar de dia  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ❓ Revisão de Questões              │
│ 10 questões                         │
│ 10:00 - 12:00                       │
│ [Sistema] ⚠️ Não pode mudar de dia  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📕 Revisão de Caderno de Erros      │
│ 10 erros                            │
│ 14:00 - 16:00                       │
│ [Sistema] ⚠️ Não pode mudar de dia  │
└─────────────────────────────────────┘
```

## Interações Permitidas

### ✅ O que você PODE fazer com revisões do sistema:

1. **Reorganizar horários no mesmo dia**
   - Arrastar para cima/baixo dentro do dia 18
   - Exemplo: Mover flashcards de 08:00-10:00 para 14:00-16:00

2. **Ajustar duração**
   - Redimensionar o card arrastando a borda inferior
   - Exemplo: Aumentar de 2h para 3h se precisar de mais tempo

3. **Criar intervalos**
   - Deixar espaços em branco entre as atividades
   - Exemplo: 
     - 08:00-10:00: Flashcards
     - 10:00-12:00: Questões
     - 12:00-14:00: **ALMOÇO** (vazio ou criar tarefa manual)
     - 14:00-16:00: Caderno de Erros

### ❌ O que você NÃO PODE fazer com revisões do sistema:

1. **Mover para outro dia**
   - Se tentar arrastar para o dia 19, o card **volta automaticamente** para o dia 18
   - Comportamento: Animação de "bounce back"
   - Motivo: Sistema de repetição espaçada precisa manter as datas

2. **Deletar**
   - Não há botão de deletar
   - As revisões são obrigatórias

3. **Editar detalhes**
   - Não pode mudar o título
   - Não pode mudar a quantidade de itens
   - Não pode mudar o tipo

## Tarefas Manuais do Usuário

### Exemplo: Criar "Estudar 50 questões"

```
┌─────────────────────────────────────┐
│ 📚 Estudar 50 questões              │
│ Matemática - Álgebra                │
│ 16:00 - 18:00                       │
│ [Usuário] ✅ Total controle         │
└─────────────────────────────────────┘
```

### ✅ O que você PODE fazer com tarefas manuais:

1. **Mover para qualquer dia**
   - Arrastar do dia 18 para o dia 19, 20, etc.
   - Sem restrições

2. **Ajustar horário livremente**
   - Mover para qualquer horário
   - Sem limitações

3. **Ajustar duração**
   - Redimensionar como quiser

4. **Editar detalhes**
   - Mudar título
   - Mudar descrição
   - Mudar tipo

5. **Deletar**
   - Botão de deletar disponível

## Fluxo de Criação de Tarefa Manual

### Opção 1: Duplo Clique
1. Dê duplo clique em qualquer célula do calendário
2. Modal abre com data e hora pré-selecionadas
3. Preencha os detalhes
4. Clique em "Criar Tarefa"

### Opção 2: Botão Flutuante
1. Clique no botão (+) no canto inferior direito
2. Modal abre com data/hora padrão
3. Preencha os detalhes
4. Clique em "Criar Tarefa"

## Separadores Visuais

Cada tipo de revisão tem um separador visual:

```
┌────────────────────────────────────────┐
│ 🎴 Flashcards                      [20]│
├────────────────────────────────────────┤
│ [Cards de revisão de flashcards]       │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ ❓ Questões                        [10]│
├────────────────────────────────────────┤
│ [Cards de revisão de questões]         │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 📕 Caderno de Erros                [10]│
├────────────────────────────────────────┤
│ [Cards de revisão de erros]            │
└────────────────────────────────────────┘
```

## Badges de Origem

Cada tarefa mostra sua origem:

- **[Sistema]** - Cinza - Revisões automáticas
- **[Usuário]** - Sem badge - Tarefas manuais
- **[Mentor]** - Laranja - Adicionadas por mentor (futuro)
- **[Admin]** - Rosa - Adicionadas por admin (futuro)

## Feedback Visual

### Tentativa de Mover Revisão para Outro Dia
1. Usuário arrasta card de revisão
2. Card fica semi-transparente durante o arrasto
3. Ao soltar em outro dia:
   - ❌ Card volta para o dia original
   - 💬 Mensagem no console: "Tarefa do sistema não pode ser movida para outro dia"
   - 🎯 Futuro: Toast notification

### Sucesso ao Mover Tarefa Manual
1. Usuário arrasta tarefa manual
2. Card fica semi-transparente durante o arrasto
3. Ao soltar em outro dia:
   - ✅ Card move para o novo dia
   - 💾 Salvamento automático (futuro)

## Cores por Tipo

### Revisões do Sistema
- **Flashcards**: Azul (`bg-blue-100`)
- **Questões**: Verde (`bg-green-100`)
- **Caderno de Erros**: Vermelho (`bg-red-100`)

### Tarefas Manuais
- **Sessão de Estudo**: Roxo (`bg-purple-100`)
- **Outras Atividades**: Cinza (`bg-gray-100`)

### Tarefas de Mentores (Futuro)
- **Atividade de Mentor**: Laranja (`bg-orange-100`)

### Tarefas de Admin (Futuro)
- **Atividade de Admin**: Rosa (`bg-pink-100`)

## Extensibilidade

O sistema foi projetado para ser extensível:

### Adicionar Novo Tipo de Tarefa
1. Adicionar em `TaskType` no `types.ts`
2. Adicionar cor em `getTaskTypeColor()`
3. Adicionar ícone em `getTaskTypeIcon()`
4. Adicionar permissões em `getDefaultPermissions()`

### Adicionar Nova Fonte
1. Adicionar em `TaskSource` no `types.ts`
2. Adicionar permissões em `getDefaultPermissions()`
3. Adicionar badge em `getSourceBadge()`

### Exemplo: Adicionar "Tarefas de Grupo"
```typescript
// types.ts
export type TaskSource = 'system' | 'user' | 'mentor' | 'admin' | 'group';

// getDefaultPermissions()
case 'group':
  return {
    canChangeDays: true,
    canChangeTime: true,
    canChangeDuration: true,
    canDelete: false, // Só o criador do grupo pode deletar
    canEdit: false,   // Só o criador do grupo pode editar
  };
```

## Persistência (Futuro)

### Dados a Salvar
- Horário agendado para cada revisão
- Tarefas manuais criadas
- Movimentações de tarefas
- Status de conclusão

### Endpoints Necessários
- `POST /api/planner/tasks` - Criar tarefa manual
- `PUT /api/planner/tasks/:id` - Atualizar tarefa
- `DELETE /api/planner/tasks/:id` - Deletar tarefa
- `PUT /api/planner/reviews/:id/schedule` - Agendar horário de revisão
- `GET /api/planner/tasks?date=YYYY-MM-DD` - Buscar tarefas do dia
