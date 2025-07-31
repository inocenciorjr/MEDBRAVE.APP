# Sistema de Gerenciamento de Revisões

Este módulo implementa funcionalidades avançadas para gerenciar o ciclo de revisões de flashcards, questões e cadernos de erros.

## Funcionalidades Implementadas

### 1. Marcar Dia Como Concluído

Permite ao usuário marcar um dia de estudos como concluído, aplicando automaticamente uma nota neutra (GOOD) a todos os itens pendentes do dia.

**Endpoint:** `POST /api/review-management/mark-day-complete`

**Parâmetros:**
- `userId` (string): ID do usuário
- `date` (string, opcional): Data no formato YYYY-MM-DD (padrão: hoje)
- `reason` (string, opcional): Motivo da conclusão

**Exemplo de uso:**
```javascript
const response = await fetch('/api/review-management/mark-day-complete', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    userId: 'user123',
    date: '2024-01-15',
    reason: 'Falta de tempo para estudar'
  })
});
```

### 2. Remover Itens do Ciclo de Revisões

Permite remover flashcards, questões ou cadernos de erros do sistema de revisões quando não são mais necessários.

**Endpoint:** `POST /api/review-management/remove-item`

**Parâmetros:**
- `userId` (string): ID do usuário
- `contentType` (string): Tipo do conteúdo (FLASHCARD, QUESTION, ERROR_NOTEBOOK)
- `contentId` (string): ID do conteúdo
- `reason` (string): Motivo da remoção
- `deleteType` (string): Tipo de remoção ('soft' ou 'hard')

**Razões de remoção disponíveis:**
- `NOT_RELEVANT`: Não é mais relevante
- `TOO_EASY`: Muito fácil
- `TOO_DIFFICULT`: Muito difícil
- `DUPLICATE`: Duplicado
- `OUTDATED`: Desatualizado
- `USER_PREFERENCE`: Preferência do usuário
- `COMPLETED_MASTERY`: Domínio completo

**Exemplo de uso:**
```javascript
const response = await fetch('/api/review-management/remove-item', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    userId: 'user123',
    contentType: 'FLASHCARD',
    contentId: 'flashcard456',
    reason: 'NOT_RELEVANT',
    deleteType: 'soft'
  })
});
```

### 3. Restaurar Itens Removidos

Permite restaurar itens que foram removidos com soft delete.

**Endpoint:** `POST /api/review-management/restore-item`

**Parâmetros:**
- `userId` (string): ID do usuário
- `contentType` (string): Tipo do conteúdo
- `contentId` (string): ID do conteúdo

### 4. Listar Itens Removidos

Permite visualizar todos os itens que foram removidos do sistema de revisões.

**Endpoint:** `GET /api/review-management/removed-items`

**Parâmetros de query:**
- `userId` (string): ID do usuário
- `contentType` (string, opcional): Filtrar por tipo de conteúdo
- `reason` (string, opcional): Filtrar por motivo de remoção
- `canRestore` (boolean, opcional): Filtrar apenas itens restauráveis
- `limit` (number, opcional): Limite de resultados (padrão: 50)

### 5. Estatísticas de Conclusão de Dias

Fornece estatísticas sobre os dias marcados como concluídos.

**Endpoint:** `GET /api/review-management/day-completion-stats`

**Parâmetros de query:**
- `userId` (string): ID do usuário
- `startDate` (string, opcional): Data de início (YYYY-MM-DD)
- `endDate` (string, opcional): Data de fim (YYYY-MM-DD)

### 6. Histórico de Conclusões

Retorna o histórico detalhado de dias marcados como concluídos.

**Endpoint:** `GET /api/review-management/completion-history`

**Parâmetros de query:**
- `userId` (string): ID do usuário
- `limit` (number, opcional): Limite de resultados (padrão: 30)
- `startDate` (string, opcional): Data de início
- `endDate` (string, opcional): Data de fim

## Tipos de Remoção

### Soft Delete
- Mantém o histórico de revisões
- Permite restauração posterior
- Remove apenas do ciclo ativo de revisões
- Recomendado para a maioria dos casos

### Hard Delete
- Remove permanentemente todos os dados
- Não permite restauração
- Deleta FSRSCard e todos os logs de revisão
- Use apenas quando tem certeza absoluta

## Arquitetura

### Serviços
- `ReviewManagementService`: Lógica principal de gerenciamento
- `DayCompletionService`: Gerencia conclusão de dias
- `ReviewRemovalService`: Gerencia remoção de itens

### Controladores
- `ReviewManagementController`: Endpoints da API REST

### Rotas
- `reviewManagementRoutes`: Definição das rotas HTTP

## Coleções do Firestore

### `dayCompletions`
Armazena registros de dias marcados como concluídos:
```typescript
{
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  itemsProcessed: number;
  reason?: string;
  createdAt: Timestamp;
}
```

### `removedReviewItems`
Armazena registros de itens removidos do sistema:
```typescript
{
  id: string;
  userId: string;
  contentType: UnifiedContentType;
  contentId: string;
  reason: RemovalReason;
  canRestore: boolean;
  fsrsSnapshot?: any;
  removedAt: Timestamp;
}
```

## Benefícios

1. **Flexibilidade**: Usuários podem personalizar seu ciclo de estudos
2. **Controle**: Possibilidade de remover conteúdo não relevante
3. **Histórico**: Manutenção de registros para análise
4. **Restauração**: Capacidade de desfazer remoções quando necessário
5. **Estatísticas**: Acompanhamento do progresso e consistência nos estudos

## Considerações de Performance

- Operações em lote para processar múltiplos itens
- Índices otimizados no Firestore
- Paginação para listagens grandes
- Cache de estatísticas quando apropriado

## Segurança

- Autenticação obrigatória em todas as rotas
- Validação de propriedade dos recursos
- Sanitização de parâmetros de entrada
- Rate limiting para operações sensíveis