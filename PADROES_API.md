# Padrões de API - Frontend e Backend

## Problema Identificado
Havia inconsistência entre as rotas chamadas pelo frontend e as rotas disponíveis no backend, causando erros 404.

## Padronização Estabelecida

### Backend
- **Todas as rotas da API devem estar sob o prefixo `/api`**
- Configurado em `BACKEND/src/app.ts`: `app.use('/api', router)`
- Estrutura de rotas:
  ```
  /api/questions       → Rotas de questões
  /api/admin           → Rotas administrativas
  /api/user            → Rotas de usuário
  /api/flashcards      → Rotas de flashcards
  etc.
  ```

### Frontend
- **Todas as chamadas de API devem usar o prefixo `/api`**
- Configurado em `frontend/services/admin/baseService.ts`
- Padrão de chamada:
  ```typescript
  // ✅ CORRETO
  get('/api/questions')
  post('/api/admin/dashboard/stats')
  
  // ❌ ERRADO
  get('/admin/questions')  // Falta o /api
  get('api/questions')     // Falta a barra inicial
  ```

### Regras de Construção de URL no Frontend

No `baseService.ts`, a URL é construída assim:

```typescript
const url = endpoint.startsWith('http') 
  ? endpoint                    // URL completa externa
  : endpoint.startsWith('/') 
    ? endpoint                  // Endpoint com / no início, usa direto
    : `${API_BASE_URL}/${endpoint}`;  // Adiciona /api/ no início
```

**Portanto:**
- Se o endpoint começa com `/`, ele é usado como está
- Se não começa com `/`, o sistema adiciona `/api/` automaticamente
- **SEMPRE use `/api/` no início dos endpoints para clareza**

## Checklist para Novas Rotas

### Ao criar uma nova rota no Backend:
1. ✅ Adicionar a rota em `BACKEND/src/routes.ts` ou no router específico
2. ✅ Garantir que está sob o prefixo `/api`
3. ✅ Documentar a rota (método, path, parâmetros)
4. ✅ Testar com curl ou Postman

### Ao criar uma nova chamada no Frontend:
1. ✅ Verificar se a rota existe no backend
2. ✅ Usar o prefixo `/api/` no início do endpoint
3. ✅ Usar os helpers do `baseService.ts` (get, post, put, del)
4. ✅ Testar a chamada no navegador

## Exemplo Completo

### Backend (BACKEND/src/domain/questions/routes/unifiedQuestionRoutes.ts)
```typescript
router.get('/stats', authMiddleware, (req, res, next) => 
  controller.getQuestionStats(req, res, next)
);
```

### Frontend (frontend/services/admin/questionService.ts)
```typescript
export async function getQuestionStats() {
  return get('/api/questions/stats');  // ✅ Correto: /api/questions/stats
}
```

### Resultado
- Frontend chama: `/api/questions/stats`
- Backend recebe: `/api/questions/stats`
- Rota registrada: `app.use('/api', router)` → `router.get('/stats')`
- ✅ Match perfeito!

## Correções Realizadas

### 1. Padronização de Rotas de Questions
- **Antes**: Frontend chamava `/api/admin/questions/*`
- **Depois**: Frontend chama `/api/questions/*`
- **Motivo**: As rotas de questions estão em `/api/questions`, não em `/api/admin/questions`

### 2. Adição de Rota de Estatísticas
- **Rota**: `GET /api/questions/stats`
- **Controller**: `UnifiedQuestionController.getQuestionStats()`
- **Service**: `SupabaseQuestionService.getQuestionStats()`

### 3. Validação de UUID em Rotas Admin
- Adicionada validação para evitar que rotas como `/admin/questions` sejam interpretadas como `/admin/:id`
- Retorna 404 quando o parâmetro não é um UUID válido

## Manutenção

Este documento deve ser atualizado sempre que:
- Novos padrões de API forem estabelecidos
- Mudanças na estrutura de rotas forem feitas
- Problemas de roteamento forem identificados e corrigidos
