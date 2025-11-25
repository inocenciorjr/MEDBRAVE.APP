# TODO - Próximos Passos do Planner

## 🔴 Prioridade Alta - Backend

### Endpoints Necessários

- [ ] **POST /api/planner/tasks**
  - Criar tarefa manual do usuário
  - Body: `{ title, description, date, startHour, duration, taskType }`
  - Response: Tarefa criada com ID

- [ ] **PUT /api/planner/tasks/:id**
  - Atualizar tarefa (título, descrição, horário, duração)
  - Validar permissões (só usuário pode editar suas tarefas)

- [ ] **DELETE /api/planner/tasks/:id**
  - Deletar tarefa
  - Validar permissões (só usuário pode deletar suas tarefas)

- [ ] **PUT /api/planner/reviews/:id/schedule**
  - Agendar horário para revisão do sistema
  - Body: `{ date, startHour, duration }`
  - Validar que não pode mudar de dia

- [ ] **GET /api/planner/tasks**
  - Buscar todas as tarefas do usuário
  - Query params: `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
  - Incluir tarefas manuais + revisões agendadas

### Modelo de Dados

```typescript
// Tabela: planner_tasks
{
  id: string;
  user_id: string;
  title: string;
  description?: string;
  date: Date;
  start_hour: number;
  start_minute: number;
  duration: number; // minutos
  task_type: TaskType;
  source: TaskSource;
  completed: boolean;
  created_by?: string; // Para tarefas de mentor/admin
  created_at: Date;
  updated_at: Date;
  metadata: JSONB; // Dados extensíveis
}

// Tabela: planner_review_schedules
{
  id: string;
  user_id: string;
  review_id: string; // FK para unified_reviews
  scheduled_date: Date;
  scheduled_hour: number;
  scheduled_minute: number;
  duration: number;
  created_at: Date;
  updated_at: Date;
}
```

## 🟡 Prioridade Média - UX/UI

### Feedback Visual

- [ ] **Toast Notifications**
  - Sucesso ao criar/editar/deletar tarefa
  - Erro ao tentar mover revisão para outro dia
  - Salvamento automático

- [ ] **Animações**
  - Bounce back quando tenta mover revisão para outro dia
  - Fade in/out ao criar/deletar tarefa
  - Smooth transition ao mover tarefas

- [ ] **Loading States**
  - Skeleton loading ao carregar planner
  - Spinner ao salvar mudanças
  - Indicador de "Salvando..." durante drag

- [ ] **Confirmações**
  - Confirmar antes de deletar tarefa
  - Confirmar antes de mover tarefa de mentor/admin
  - Undo/Redo de ações (opcional)

### Melhorias de Interface

- [ ] **Modal de Edição**
  - Editar tarefa existente
  - Mesmo layout do modal de criação
  - Validação de campos

- [ ] **Modal de Detalhes da Revisão**
  - Mostrar lista de itens a revisar
  - Botão "Iniciar Revisão"
  - Estatísticas (tempo estimado, dificuldade)

- [ ] **Filtros**
  - Filtrar por tipo de tarefa
  - Filtrar por fonte (sistema, usuário, mentor, admin)
  - Mostrar/ocultar tarefas concluídas

- [ ] **Busca**
  - Buscar tarefas por título
  - Buscar por data
  - Buscar por tipo

## 🟢 Prioridade Baixa - Features Avançadas

### Funcionalidades Extras

- [ ] **Exportar Planner**
  - Exportar como PDF
  - Exportar como iCal (para Google Calendar, Outlook)
  - Exportar como CSV

- [ ] **Notificações**
  - Notificar 15min antes de revisão
  - Notificar tarefas não concluídas
  - Resumo diário por email

- [ ] **Estatísticas**
  - Tempo total de estudo por dia/semana/mês
  - Taxa de conclusão de tarefas
  - Gráficos de produtividade
  - Heatmap de atividades

- [ ] **Sincronização**
  - Sincronizar com Google Calendar
  - Sincronizar com Outlook
  - Webhook para apps externos

- [ ] **Colaboração**
  - Compartilhar planner com mentor
  - Grupos de estudo
  - Tarefas compartilhadas

### Atalhos de Teclado

- [ ] `N` - Nova tarefa
- [ ] `E` - Editar tarefa selecionada
- [ ] `D` - Deletar tarefa selecionada
- [ ] `←` `→` - Navegar entre dias
- [ ] `T` - Voltar para hoje
- [ ] `W` `M` - Toggle semanal/mensal
- [ ] `Esc` - Fechar modal
- [ ] `Enter` - Salvar modal

## 🔵 Funcionalidades de Mentor/Admin

### Painel de Mentor

- [ ] **Adicionar Tarefa para Aluno**
  - Selecionar aluno(s)
  - Criar tarefa com permissões de mentor
  - Notificar aluno

- [ ] **Visualizar Planner do Aluno**
  - Ver planner de qualquer aluno
  - Sugerir reorganizações
  - Comentar em tarefas

- [ ] **Templates de Tarefas**
  - Criar templates reutilizáveis
  - Aplicar template para múltiplos alunos
  - Biblioteca de templates

### Painel de Admin

- [ ] **Adicionar Tarefa Global**
  - Criar tarefa para todos os usuários
  - Criar tarefa para grupo específico
  - Agendar manutenções

- [ ] **Relatórios**
  - Uso do planner por usuário
  - Taxa de conclusão geral
  - Horários mais populares

- [ ] **Configurações**
  - Horário de início/fim do dia
  - Duração padrão de tarefas
  - Cores personalizadas

## 🛠️ Melhorias Técnicas

### Performance

- [ ] **Memoização**
  - Memoizar componentes pesados
  - useMemo para cálculos complexos
  - useCallback para handlers

- [ ] **Virtual Scrolling**
  - Para listas grandes de tarefas
  - Para calendário mensal com muitos eventos

- [ ] **Lazy Loading**
  - Carregar apenas semana/mês visível
  - Carregar mais ao scrollar
  - Prefetch de dados próximos

- [ ] **Otimistic Updates**
  - Atualizar UI imediatamente
  - Reverter se falhar
  - Melhor UX

### Testes

- [ ] **Unit Tests**
  - Testar helpers (getDefaultPermissions, etc)
  - Testar validações
  - Testar agrupamento

- [ ] **Integration Tests**
  - Testar drag and drop
  - Testar criação de tarefas
  - Testar validações de permissões

- [ ] **E2E Tests**
  - Fluxo completo de uso
  - Cenários de erro
  - Diferentes tipos de usuário

### Documentação

- [ ] **Storybook**
  - Documentar componentes
  - Exemplos interativos
  - Diferentes estados

- [ ] **API Docs**
  - Documentar endpoints
  - Exemplos de requests/responses
  - Códigos de erro

- [ ] **User Guide**
  - Tutorial interativo
  - Vídeos explicativos
  - FAQ

## 📱 Mobile

### Responsividade

- [ ] **Layout Mobile**
  - Adaptar grid para telas pequenas
  - Gestos touch-friendly
  - Bottom sheet para modais

- [ ] **PWA**
  - Service worker
  - Offline support
  - Install prompt

- [ ] **App Nativo** (Futuro)
  - React Native
  - Notificações push
  - Widget de home screen

## 🔐 Segurança

### Validações

- [ ] **Backend Validation**
  - Validar permissões em todos os endpoints
  - Rate limiting
  - Input sanitization

- [ ] **Frontend Validation**
  - Validar antes de enviar
  - Feedback imediato
  - Prevenir XSS

### Auditoria

- [ ] **Logs**
  - Log de todas as ações
  - Quem criou/editou/deletou
  - Histórico de mudanças

- [ ] **Backup**
  - Backup automático de tarefas
  - Restaurar versão anterior
  - Export de dados

## 🎨 Personalização

### Temas

- [ ] **Cores Personalizadas**
  - Usuário escolhe cores
  - Temas pré-definidos
  - Dark/Light mode

- [ ] **Layout**
  - Escolher visualização padrão
  - Customizar horários visíveis
  - Mostrar/ocultar elementos

### Preferências

- [ ] **Configurações do Usuário**
  - Horário de início do dia
  - Duração padrão de tarefas
  - Notificações
  - Idioma

## 📊 Métricas e Analytics

### Tracking

- [ ] **Eventos**
  - Track criação de tarefas
  - Track conclusão de revisões
  - Track tempo de uso

- [ ] **Conversão**
  - Taxa de uso do planner
  - Taxa de conclusão de tarefas
  - Retenção de usuários

### Insights

- [ ] **Recomendações**
  - Sugerir melhores horários
  - Sugerir duração ideal
  - Alertar sobre sobrecarga

- [ ] **Gamificação**
  - Pontos por conclusão
  - Streaks de dias consecutivos
  - Badges e conquistas

## 🔄 Integrações

### Calendários Externos

- [ ] **Google Calendar**
  - Importar eventos
  - Exportar tarefas
  - Sincronização bidirecional

- [ ] **Outlook**
  - Importar eventos
  - Exportar tarefas

- [ ] **Apple Calendar**
  - Importar eventos
  - Exportar tarefas

### Outras Ferramentas

- [ ] **Notion**
  - Sincronizar tarefas
  - Embed do planner

- [ ] **Trello**
  - Importar cards
  - Criar cards a partir de tarefas

- [ ] **Slack**
  - Notificações
  - Comandos slash
  - Bot interativo

## 🚀 Deploy e Infraestrutura

### CI/CD

- [ ] **Testes Automáticos**
  - Rodar testes em cada PR
  - Bloquear merge se falhar
  - Coverage report

- [ ] **Deploy Automático**
  - Deploy em staging
  - Deploy em produção
  - Rollback automático

### Monitoramento

- [ ] **Error Tracking**
  - Sentry ou similar
  - Alertas de erros
  - Stack traces

- [ ] **Performance Monitoring**
  - Tempo de carregamento
  - Tempo de resposta da API
  - Métricas de uso

## 📝 Notas

### Priorização Sugerida

1. **Fase 1** (1-2 semanas)
   - Endpoints básicos de CRUD
   - Persistência de tarefas
   - Toast notifications

2. **Fase 2** (2-3 semanas)
   - Modal de edição
   - Filtros e busca
   - Melhorias de UX

3. **Fase 3** (3-4 semanas)
   - Funcionalidades de mentor
   - Estatísticas básicas
   - Notificações

4. **Fase 4** (Futuro)
   - Features avançadas
   - Integrações
   - Mobile app

### Dependências

- Backend deve estar pronto antes de:
  - Persistência de tarefas
  - Funcionalidades de mentor/admin
  - Sincronização

- Design system deve estar pronto antes de:
  - Personalização de cores
  - Temas
  - Componentes customizados

### Recursos Necessários

- **Backend**: 1 desenvolvedor, 2-3 semanas
- **Frontend**: 1 desenvolvedor, 2-3 semanas
- **Design**: 1 designer, 1 semana
- **QA**: 1 tester, 1 semana

### Riscos

- Complexidade do drag and drop em mobile
- Performance com muitas tarefas
- Sincronização em tempo real
- Conflitos de horários

### Mitigações

- Testar em dispositivos reais
- Implementar paginação/lazy loading
- Usar WebSockets ou polling
- Validar conflitos no backend
