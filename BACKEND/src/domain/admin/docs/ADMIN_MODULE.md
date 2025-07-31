# Módulo de Administração

## Visão Geral
O módulo de administração fornece funcionalidades para gerenciar usuários administrativos, suas permissões e ações no sistema.

## Estrutura
```
admin/
├── entities/      # Entidades do domínio
├── repositories/  # Repositórios para persistência
├── useCases/     # Casos de uso do módulo
├── services/     # Serviços específicos
├── types/        # Tipos e interfaces
└── validators/   # Validadores
```

## Funcionalidades Principais

### Gerenciamento de Administradores
- Criar administradores
- Atualizar permissões
- Bloquear/desbloquear acesso
- Excluir administradores

### Auditoria
- Log de todas as ações administrativas
- Rastreamento de mudanças
- Histórico de atividades

### Permissões
- Sistema granular de permissões
- Níveis de acesso configuráveis
- Validação de permissões

## Tipos Principais

### AdminUser
- id: string
- role: 'admin' | 'superadmin'
- permissions: string[]
- createdAt: Date
- updatedAt: Date

### AdminAction
- type: string
- description: string
- performedBy: string
- timestamp: Date
- metadata?: Record<string, any>

## Serviços

### FirebaseAdminService
Singleton responsável pelo gerenciamento de administradores no Firebase.

### FirebaseAuditLogService
Singleton responsável pelo registro e consulta de logs de auditoria.

## Validação
Todos os dados são validados usando Zod antes de serem processados ou armazenados. 