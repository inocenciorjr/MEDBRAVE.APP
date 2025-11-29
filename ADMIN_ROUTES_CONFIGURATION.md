# Configuração Correta das Rotas Admin

## ✅ Padrão Seguido (igual às rotas que funcionam)

### 1. Backend - Rotas Protegidas
```typescript
// BACKEND/src/domain/admin/routes/adminRoutes.ts
router.use(enhancedAuthMiddleware);  // Autenticação + Plano
router.use(adminMiddleware);          // Verificação de role ADMIN

router.get('/dashboard/stats', controller.getDashboardStats);
router.get('/users', userController.getUsers);
// ... outras rotas
```

✅ Todas protegidas com `enhancedAuthMiddleware` + `adminMiddleware`
✅ Prefixo correto: `/api/admin/*`

### 2. Proxy Next.js
```typescript
// frontend/app/api/admin/[...path]/route.ts
const url = `${BACKEND_URL}/api/admin/${path}`;
```

✅ Suporta GET, POST, PUT, DELETE, PATCH
✅ Repassa Authorization header
✅ Proxy para: `http://localhost:5000/api/admin/${path}`

### 3. Frontend Service
```typescript
// frontend/services/admin/baseService.ts
const API_BASE_URL = '/api';

// frontend/services/admin/statsService.ts
get('/admin/dashboard/stats')

// frontend/services/admin/userService.ts
get('/admin/users')
```

✅ Usa `baseService` com prefixo `/api`
✅ Endpoints SEM `/api` no início (baseService adiciona)

### 4. Fluxo Completo

```
Frontend: get('/admin/dashboard/stats')
    ↓
baseService adiciona /api: /api/admin/dashboard/stats
    ↓
Next.js Proxy intercepta: /api/admin/*
    ↓
Proxy chama backend: http://localhost:5000/api/admin/dashboard/stats
    ↓
Backend: enhancedAuthMiddleware valida token + plano
    ↓
Backend: adminMiddleware verifica role ADMIN
    ↓
Backend: AdminController.getDashboardStats()
    ↓
Retorna: { success: true, data: {...} }
```

## 🎯 Checklist de Configuração

### Backend
- [x] Rotas protegidas com `enhancedAuthMiddleware`
- [x] Rotas protegidas com `adminMiddleware`
- [x] Prefixo `/api/admin` nas rotas
- [x] Controllers retornam JSON padronizado

### Frontend Proxy
- [x] Proxy configurado em `frontend/app/api/admin/[...path]/route.ts`
- [x] Suporta todos os métodos HTTP
- [x] Repassa Authorization header
- [x] Faz proxy para `${BACKEND_URL}/api/admin/${path}`

### Frontend Service
- [x] `baseService` usa `API_BASE_URL = '/api'`
- [x] Services chamam endpoints SEM `/api` no início
- [x] Exemplo: `get('/admin/users')` → `/api/admin/users`

## 📝 Arquivos Corrigidos

1. ✅ `frontend/services/admin/baseService.ts` - API_BASE_URL = '/api'
2. ✅ `frontend/services/admin/statsService.ts` - Removido `/api` do endpoint
3. ✅ `frontend/services/admin/filterService.ts` - Removido `/api` do endpoint
4. ✅ `frontend/services/admin/userService.ts` - Já estava correto

## 🔒 Segurança

Todas as rotas admin estão protegidas com:
1. **enhancedAuthMiddleware**: Valida token JWT + plano ativo
2. **adminMiddleware**: Verifica se `user_role === 'ADMIN'` ou `'SUPERADMIN'`

Nenhuma rota admin está desprotegida!
