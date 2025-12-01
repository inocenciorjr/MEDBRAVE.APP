# Módulo de Mentoria - MedPulse Academy

Este módulo implementa todas as funcionalidades relacionadas ao sistema de mentoria da plataforma MedPulse Academy, usando uma arquitetura baseada em domínios.

## Estrutura do Módulo

```
src/domain/mentorship/
  ├── types/              # Tipos, interfaces e enums
  ├── interfaces/         # Interfaces dos serviços
  ├── controllers/        # Controladores da API
  │   ├── MentorProfileController.ts
  │   ├── MentorshipController.ts
  │   ├── MentorshipMeetingController.ts
  │   ├── MentorshipObjectiveController.ts
  │   ├── MentorshipFeedbackController.ts
  │   ├── MentorshipResourceController.ts
  │   └── MentorshipSimulatedExamController.ts
  ├── routes/             # Definições de rotas
  │   ├── mentorProfileRoutes.ts
  │   ├── mentorshipRoutes.ts
  │   ├── mentorshipMeetingRoutes.ts
  │   ├── mentorshipObjectiveRoutes.ts
  │   ├── mentorshipFeedbackRoutes.ts
  │   ├── mentorshipResourceRoutes.ts
  │   └── mentorshipSimulatedExamRoutes.ts
  ├── factories/          # Factories para injeção de dependências
  ├── middlewares/        # Middlewares de autenticação e autorização
  ├── utils/              # Utilitários específicos do domínio
  ├── __tests__/          # Testes unitários
  └── README.md           # Esta documentação

src/infra/mentorship/supabase/
  ├── SupabaseMentorProfileService.ts
  ├── SupabaseMentorshipService.ts
  ├── SupabaseMentorshipMeetingService.ts
  ├── SupabaseMentorshipObjectiveService.ts
  ├── SupabaseMentorshipFeedbackService.ts
  ├── SupabaseMentorshipResourceService.ts
  └── SupabaseMentorshipSimulatedExamService.ts
```

## Componentes Principais

### 1. Tipos e Enums

- **MentorProfile**: Perfil de mentor com especialidades, biografia e disponibilidade
- **Mentorship**: Relacionamento de mentoria entre mentor e mentorado
- **MentorshipMeeting**: Registros de reuniões de mentoria
- **MentorshipObjective**: Objetivos da mentoria com progresso
- **MentorshipFeedback**: Avaliações e feedbacks
- **MentorshipResource**: Materiais compartilhados
- **MentorshipSimulatedExam**: Simulados atribuídos pelo mentor

### 2. Status

**MentorshipStatus**: `pending` | `active` | `completed` | `cancelled`
**MeetingStatus**: `scheduled` | `completed` | `cancelled` | `rescheduled`
**ObjectiveStatus**: `pending` | `in_progress` | `completed` | `cancelled`
**ResourceType**: `link` | `file` | `video` | `article` | `other`

## Endpoints da API

### Perfis de Mentor (`/api/mentorship/profiles`)

| Método | Rota | Descrição | Acesso |
|--------|------|-----------|--------|
| POST | `/` | Criar perfil de mentor | Mentor |
| PUT | `/` | Atualizar perfil | Mentor |
| GET | `/me` | Meu perfil | Mentor |
| GET | `/:userId` | Perfil por ID | Público |
| GET | `/` | Listar todos | Público |
| GET | `/specialty/:specialty` | Buscar por especialidade | Público |
| GET | `/check/:userId` | Verificar se é mentor | Público |

### Mentorias (`/api/mentorship`)

| Método | Rota | Descrição | Acesso |
|--------|------|-----------|--------|
| POST | `/` | Criar mentoria | Autenticado |
| GET | `/:id` | Obter por ID | Mentor/Mentee |
| GET | `/` | Listar com filtros | Autenticado |
| GET | `/me/mentor` | Minhas mentorias (mentor) | Mentor |
| GET | `/me/mentee` | Minhas mentorias (mentee) | Mentee |
| PUT | `/:id/accept` | Aceitar mentoria | Mentor |
| PUT | `/:id/cancel` | Cancelar mentoria | Mentor/Mentee |
| PUT | `/:id/complete` | Completar mentoria | Mentor/Mentee |
| PUT | `/:id/objectives` | Atualizar objetivos | Mentor/Mentee |

### Reuniões (`/api/mentorship/meetings`)

| Método | Rota | Descrição | Acesso |
|--------|------|-----------|--------|
| POST | `/` | Criar reunião | Mentor/Mentee |
| GET | `/:id` | Obter por ID | Mentor/Mentee |
| GET | `/mentorship/:mentorshipId` | Listar por mentoria | Mentor/Mentee |
| GET | `/mentorship/:mentorshipId/upcoming` | Próximas reuniões | Mentor/Mentee |
| PUT | `/:id/complete` | Completar reunião | Mentor/Mentee |
| PUT | `/:id/cancel` | Cancelar reunião | Mentor/Mentee |
| PUT | `/:id/reschedule` | Reagendar reunião | Mentor/Mentee |
| PUT | `/:id/notes` | Adicionar notas | Mentor/Mentee |

### Objetivos (`/api/mentorship/objectives`)

| Método | Rota | Descrição | Acesso |
|--------|------|-----------|--------|
| POST | `/` | Criar objetivo | Mentor/Mentee |
| GET | `/:id` | Obter por ID | Autenticado |
| GET | `/mentorship/:mentorshipId` | Listar por mentoria | Mentor/Mentee |
| PUT | `/:id` | Atualizar objetivo | Mentor/Mentee |
| PUT | `/:id/progress` | Atualizar progresso | Mentor/Mentee |
| PUT | `/:id/complete` | Completar objetivo | Mentor/Mentee |
| PUT | `/:id/cancel` | Cancelar objetivo | Mentor/Mentee |
| DELETE | `/:id` | Deletar objetivo | Mentor/Mentee |

### Feedbacks (`/api/mentorship/feedbacks`)

| Método | Rota | Descrição | Acesso |
|--------|------|-----------|--------|
| POST | `/` | Criar feedback | Mentor/Mentee |
| GET | `/me/received` | Feedbacks recebidos | Autenticado |
| GET | `/me/given` | Feedbacks dados | Autenticado |
| GET | `/:id` | Obter por ID | Autenticado |
| GET | `/mentorship/:mentorshipId` | Listar por mentoria | Mentor/Mentee |
| GET | `/user/:userId/rating` | Média de avaliação | Autenticado |
| PUT | `/:id` | Atualizar feedback | Autor |
| DELETE | `/:id` | Deletar feedback | Autor |

### Recursos (`/api/mentorship/resources`)

| Método | Rota | Descrição | Acesso |
|--------|------|-----------|--------|
| POST | `/` | Criar recurso | Mentor/Mentee |
| GET | `/me` | Meus recursos | Autenticado |
| GET | `/:id` | Obter por ID | Autenticado |
| GET | `/mentorship/:mentorshipId` | Listar por mentoria | Mentor/Mentee |
| GET | `/mentorship/:mentorshipId/type/:type` | Listar por tipo | Mentor/Mentee |
| PUT | `/:id` | Atualizar recurso | Autor |
| DELETE | `/:id` | Deletar recurso | Autor |

### Simulados (`/api/mentorship/simulated-exams`)

| Método | Rota | Descrição | Acesso |
|--------|------|-----------|--------|
| POST | `/` | Atribuir simulado | Mentor |
| GET | `/me/assigned` | Simulados atribuídos | Mentor |
| GET | `/:id` | Obter por ID | Autenticado |
| GET | `/mentorship/:mentorshipId` | Listar por mentoria | Mentor/Mentee |
| GET | `/mentorship/:mentorshipId/pending` | Simulados pendentes | Mentor/Mentee |
| PUT | `/:id/complete` | Completar simulado | Mentee |
| PUT | `/:id` | Atualizar simulado | Mentor |
| DELETE | `/:id` | Remover simulado | Mentor |

## Segurança e Autorização

1. **Autenticação Supabase** via `authenticate` middleware
2. **Enhanced Auth** via `enhancedAuthMiddleware` para validação de plano
3. **Feature Flag** via `requireFeature('canAccessMentorship')` - requer plano com acesso à mentoria
4. **Verificação de role** via `isMentor` middleware
5. **Verificação de participação** via `isMentorOrMentee` middleware

## Fluxo de Uso Típico

1. Um usuário cria um perfil de mentor (MentorProfileService)
2. Um estudante solicita mentoria com um mentor (MentorshipService)
3. O mentor aceita o pedido de mentoria (MentorshipService)
4. Objetivos são definidos para a mentoria (MentorshipObjectiveService)
5. Reuniões são agendadas e registradas (MentorshipMeetingService)
6. Recursos são compartilhados (MentorshipResourceService)
7. Simulados são atribuídos pelo mentor (MentorshipSimulatedExamService)
8. Feedbacks são trocados (MentorshipFeedbackService)
9. A mentoria é concluída e avaliada (MentorshipService)

## Tabelas Supabase

```sql
-- Tabelas necessárias:
mentor_profiles
mentorships
mentorship_meetings
mentorship_objectives
mentorship_feedbacks
mentorship_resources
mentorship_simulated_exams
```

## Frontend Service

O frontend possui um serviço completo em `frontend/lib/services/mentorshipService.ts` com:

- `mentorProfileService` - Gerenciamento de perfis de mentores
- `mentorshipService` - Gerenciamento de mentorias
- `mentorshipMeetingService` - Gerenciamento de reuniões
- `mentorshipObjectiveService` - Gerenciamento de objetivos
- `mentorshipFeedbackService` - Gerenciamento de feedbacks
- `mentorshipResourceService` - Gerenciamento de recursos
- `mentorshipSimulatedExamService` - Gerenciamento de simulados

## Proxy Next.js

O proxy está configurado em `frontend/app/api/mentorship/[...path]/route.ts` para redirecionar requisições do frontend para o backend.

## Futuras Expansões

- Sistema de matching automatizado baseado em IA
- Integração com calendário para agendamento de reuniões
- Templates de planos de mentoria pré-definidos
- Relatórios de progresso para mentores e instituições
- Notificações em tempo real via WebSocket
