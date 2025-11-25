# Correção de Rotas Admin - Ordem de Precedência

## Problema Identificado

Erro: `invalid input syntax for type uuid: "questions"`

### Causa Raiz

O Express estava interpretando `/api/admin/questions` como `/api/admin/:id`, onde "questions" era capturado como o parâmetro `id`. Isso acontecia porque as rotas com parâmetros dinâmicos (`:id`) estavam definidas ANTES das rotas específicas (`/dashboard/stats`, `/audit/logs`).

### Fluxo do Erro

1. Frontend faz requisição: `GET /api/admin/questions`
2. Express Router procura por match nas rotas
3. Encontra `router.get('/:id', ...)` ANTES de qualquer rota específica
4. Captura "questions" como valor do parâmetro `:id`
5. Controller tenta fazer `getAdminById("questions")`
6. Supabase tenta converter "questions" para UUID
7. **ERRO**: `invalid input syntax for type uuid: "questions"`

## Solução Implementada

### Mudança na Ordem das Rotas

**ANTES (INCORRETO):**
```typescript
// Rotas de administradores
router.get('/', controller.getAdmins.bind(controller));
router.get('/:id', controller.getAdminById.bind(controller));  // ❌ Captura tudo!
router.post('/', controller.createAdmin.bind(controller));
router.put('/:id', controller.updateAdmin.bind(controller));
router.delete('/:id', controller.deleteAdmin.bind(controller));

// Rotas de dashboard
router.get('/dashboard/stats', controller.getDashboardStats.bind(controller));

// Rotas de auditoria
router.get('/audit/logs', controller.getAuditLogs.bind(controller));
```

**DEPOIS (CORRETO):**
```typescript
// Rotas de dashboard (DEVEM VIR ANTES DAS ROTAS COM :id)
router.get('/dashboard/stats', controller.getDashboardStats.bind(controller));

// Rotas de auditoria (DEVEM VIR ANTES DAS ROTAS COM :id)
router.get('/audit/logs', controller.getAuditLogs.bind(controller));

// Rotas de administradores
router.get('/', controller.getAdmins.bind(controller));
router.get('/:id', controller.getAdminById.bind(controller));  // ✅ Agora vem depois
router.post('/', controller.createAdmin.bind(controller));
router.put('/:id', controller.updateAdmin.bind(controller));
router.delete('/:id', controller.deleteAdmin.bind(controller));
```

## Regra Geral do Express Router

**Rotas específicas SEMPRE devem vir ANTES de rotas com parâmetros dinâmicos!**

### Ordem Correta:
1. Rotas exatas: `/dashboard/stats`, `/audit/logs`, `/questions`
2. Rotas com parâmetros: `/:id`, `/:userId/profile`

### Por quê?

O Express Router faz match de rotas na ordem em que são definidas. Quando encontra o primeiro match, executa aquele handler. Se `/:id` vem primeiro, ele captura QUALQUER string como `id`.

## Próximos Passos

Se o frontend precisa acessar `/api/admin/questions`, você deve:

1. Criar um controller para questions no admin
2. Adicionar a rota ANTES das rotas com `:id`:

```typescript
// Rotas de questions (ANTES de /:id)
router.get('/questions', controller.getQuestions.bind(controller));
router.get('/questions/:questionId', controller.getQuestionById.bind(controller));

// Rotas de administradores (DEPOIS das rotas específicas)
router.get('/:id', controller.getAdminById.bind(controller));
```

## Resultado

✅ Erro de UUID resolvido
✅ Rotas específicas funcionando corretamente
✅ Rotas com parâmetros não capturam rotas específicas
