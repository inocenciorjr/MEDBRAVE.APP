# Módulo de Administração

## Visão Geral
O módulo de administração fornece funcionalidades para gerenciar usuários administrativos, suas permissões e ações no sistema do MedPulse Academy. Este módulo é responsável por controlar o acesso a recursos administrativos e manter um registro de auditoria de todas as ações realizadas.

## Funcionalidades Principais

### Gerenciamento de Administradores
- Criação de contas de administrador
- Atribuição de permissões
- Atualização de informações
- Remoção de acesso administrativo

### Auditoria
- Registro de todas as ações administrativas
- Rastreamento de modificações no sistema
- Histórico detalhado com metadados

### Dashboard Administrativo
- Estatísticas gerais do sistema
- Métricas de usuários ativos
- Monitoramento de conteúdo reportado

## Arquitetura

O módulo segue a arquitetura Clean Architecture, com as seguintes camadas:

### Camada de Entidades
- `AdminUser`: Define o modelo de dados de usuário administrador
- `AdminAction`: Representa uma ação realizada por um administrador
- `AdminAuditLog`: Registra ações para auditoria

### Camada de Casos de Uso
- `GetAllAdminsUseCase`: Recupera todos os administradores
- `CreateAdminUseCase`: Cria um novo administrador

### Camada de Interface
- `AdminController`: Gerencia requisições HTTP
- `adminMiddleware`: Valida permissões de administrador

### Camada de Infraestrutura
- `FirebaseAdminRepository`: Implementação do repositório usando Firebase
- `FirebaseAdminService`: Serviço para gerenciar administradores
- `AdminDashboardService`: Serviço para métricas e estatísticas

## Como Usar

### Configuração do Módulo

```typescript
// Importar factory
import { AdminFactory } from './domain/admin/factories/AdminFactory';

// Inicializar módulo admin
const adminModule = AdminFactory.create();

// Adicionar rotas ao Express
app.use('/api/admin', adminModule.routes);
```

### Criação de Administrador

```typescript
const adminId = await adminService.createAdmin(
  'user123',
  'admin',
  ['users:read', 'users:write']
);
```

### Verificação de Permissões

```typescript
import { adminMiddleware } from './domain/admin/middlewares/adminMiddleware';

// Adicionar middleware a uma rota específica
router.get('/admin/settings', authMiddleware, adminMiddleware, settingsController);
```

## Prevenção de Erros

Para prevenir erros comuns, observe:

1. **Permissões**: Sempre use o `adminMiddleware` para proteger rotas administrativas
2. **Auditoria**: Sempre registre ações administrativas no log de auditoria
3. **Validação**: Valide todas as entradas de usuário com os validadores fornecidos

## Status de Implementação

Consulte [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) para detalhes sobre o status atual de implementação e próximos passos. 