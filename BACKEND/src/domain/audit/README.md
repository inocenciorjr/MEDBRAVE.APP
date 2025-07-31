# Módulo de Auditoria

## Descrição

O Módulo de Auditoria do MedPulse Academy implementa um sistema de rastreamento e registro de todas as ações administrativas realizadas no sistema. Esse módulo é fundamental para manter a integridade e segurança da plataforma, permitindo a responsabilização e o controle de atividades dos administradores.

## Funcionalidades Principais

- Registro automático de ações administrativas
- Consulta de logs de auditoria com filtros avançados
- Visualização de atividades por usuário ou tipo de ação
- Rastreamento de metadados associados às ações
- Paginação e ordenação de registros

## Componentes

### Tipos

- `AdminAction`: Representa uma ação administrativa (tipo, descrição, autor, etc.)
- `AdminAuditLog`: Representa um registro de log de auditoria (ID, ação, timestamp)
- `AuditLogFilterOptions`: Opções para filtrar consultas de logs
- `AuditLogPaginationOptions`: Opções para paginação de consultas de logs

### Serviços

- `IAuditLogService`: Interface que define os contratos para o serviço de auditoria
- `FirebaseAuditLogService`: Implementação do serviço utilizando Firebase Firestore

### Controladores

- `AuditLogController`: Gerencia as requisições HTTP para o módulo de auditoria

### Rotas

- `POST /audit-logs`: Registra uma nova ação de auditoria
- `GET /audit-logs`: Lista logs de auditoria com filtros e paginação
- `GET /audit-logs/user/:userId`: Obtém logs de ações realizadas por um usuário específico
- `GET /audit-logs/type/:actionType`: Obtém logs de um tipo específico de ação

### Validadores

- `auditLogValidators.ts`: Contém esquemas Zod para validação de dados do módulo

## Uso

### Registro de Ação

```typescript
const auditLogService = FirebaseAuditLogService.getInstance();

await auditLogService.logAction({
  type: 'USER_UPDATE',
  description: 'Atualização de permissões do usuário',
  performedBy: 'admin-123',
  metadata: {
    userId: 'user-456',
    previousRole: 'user',
    newRole: 'editor'
  }
});
```

### Consulta de Logs

```typescript
// Obter todos os logs de um usuário específico
const logs = await auditLogService.getActionsByUser('admin-123');

// Obter logs paginados
const paginatedLogs = await auditLogService.getPaginatedAuditLogs(1, 10);
```

## Segurança

O módulo de auditoria é acessível apenas para usuários com permissões de administrador. Todas as rotas são protegidas pelos middlewares de autenticação e administrador.

## Integração com outros módulos

O módulo de auditoria é utilizado por diversos outros módulos da plataforma para registrar operações sensíveis:

- **Módulo de Admin**: Registra operações de gerenciamento de usuários e permissões
- **Módulo de Payment**: Registra operações relacionadas a pagamentos e planos
- **Módulo de Content**: Registra operações de criação e modificação de conteúdo

## Limitações

- Logs não podem ser modificados ou excluídos após sua criação
- A consulta de grandes volumes de logs pode impactar a performance
- O registro de metadados muito extensos pode consumir mais espaço de armazenamento 