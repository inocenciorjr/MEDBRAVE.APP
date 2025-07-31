# Módulo de Mentoria - MedPulse Academy

Este módulo implementa todas as funcionalidades relacionadas ao sistema de mentoria da plataforma MedPulse Academy, usando uma arquitetura baseada em domínios.

## Estrutura do Módulo

```
src/domain/mentorship/
  ├── types/              # Tipos, interfaces e enums
  ├── interfaces/         # Interfaces dos serviços
  ├── services/           # Implementações dos serviços
  ├── factories/          # Factories para injeção de dependências
  ├── controllers/        # Controladores da API
  ├── routes/             # Definições de rotas
  ├── middlewares/        # Middlewares de autenticação e autorização
  ├── utils/              # Utilitários específicos do domínio
  ├── __tests__/          # Testes unitários
  └── README.md           # Esta documentação
```

## Componentes Principais

### 1. Tipos e Enums

Os tipos e enums definidos para o módulo incluem:

- **MentorProfile**: Perfil de mentor com detalhes como especialidades e biografia
- **Mentorship**: Relacionamento de mentoria entre mentor e mentorado
- **Meeting**: Registros de reuniões de mentoria
- **MentorshipStatus**: Estados possíveis de uma mentoria (pending, active, completed, cancelled)
- **MeetingStatus**: Estados possíveis de uma reunião (scheduled, completed, cancelled)
- **MeetingFrequency**: Frequências de encontro (weekly, biweekly, monthly, custom)

### 2. Interfaces de Serviço

O módulo implementa as seguintes interfaces de serviço:

- **IMentorProfileService**: Gerenciamento de perfis de mentores
- **IMentorshipService**: Gerenciamento de relações de mentoria
- **IMeetingTrackingService**: Agendamento e acompanhamento de reuniões
- **IMatchingService**: Sugestão de mentores baseada em compatibilidade
- **IFeedbackService**: Gestão de avaliações e feedback

### 3. Implementações de Serviço

Todos os serviços são implementados usando o Firebase como persistência de dados:

- **FirebaseMentorProfileService**
- **FirebaseMentorshipService**
- **FirebaseMeetingTrackingService**
- **FirebaseMatchingService**
- **FirebaseFeedbackService**

### 4. Factory de Serviços

O padrão Factory é usado para injetar dependências e criar instâncias dos serviços:

```typescript
const factory = new MentorshipServiceFactory(firestore);
const mentorProfileService = factory.getMentorProfileService();
const mentorshipService = factory.getMentorshipService();
```

### 5. Controllers e Rotas

Os controllers implementam a lógica da API e as rotas definem os endpoints disponíveis:

- **MentorProfileController**: Gerencia perfis de mentores
- **MentorshipController**: Gerencia relações de mentoria
- **MeetingController**: Gerencia reuniões e acompanhamento

## Fluxo de Uso Típico

1. Um usuário cria um perfil de mentor (MentorProfileService)
2. Um estudante solicita mentoria com um mentor (MentorshipService)
3. O mentor aceita o pedido de mentoria (MentorshipService)
4. Reuniões são agendadas e registradas (MeetingTrackingService)
5. A mentoria é concluída e avaliada (MentorshipService, FeedbackService)

## Autenticação e Autorização

O módulo usa middlewares para garantir autenticação e autorização apropriadas:

- **authenticate**: Verifica token JWT e adiciona usuário ao request
- **isMentor**: Verifica se o usuário tem papel de mentor
- **isMentorOrMentee**: Verifica se o usuário é participante da mentoria

## Integração com o Sistema

O módulo é integrado ao restante da aplicação através de:

1. Registro de rotas em `/api/mentorships` e `/api/mentorships/profiles`
2. Integração com o sistema de autenticação central
3. Reutilização do sistema de notificações para alertas de mentoria
4. Uso do sistema de armazenamento para materiais compartilhados

## Testes

O módulo inclui testes unitários completos para:

1. Todos os serviços (unit tests de serviços)
2. Middlewares de autenticação
3. Controllers e integração com APIs

## Futuras Expansões

Funcionalidades planejadas para futuras versões:

1. Sistema de matching automatizado baseado em IA
2. Integração com calendário para agendamento de reuniões
3. Templates de planos de mentoria pré-definidos
4. Relatórios de progresso para mentores e instituições 