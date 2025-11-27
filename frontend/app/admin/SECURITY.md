# Segurança do Painel Administrativo

## Visão Geral

O painel administrativo do MEDBRAVE implementa múltiplas camadas de segurança para garantir que apenas usuários autorizados possam acessar funcionalidades administrativas.

## Arquitetura de Segurança

### 1. Verificação no Backend (Camada Principal)

Toda verificação de permissões é feita no **backend**, garantindo que não há vulnerabilidades de manipulação via frontend.

#### Middleware de Autenticação
- **Arquivo**: `BACKEND/src/domain/auth/middleware/supabaseAuth.middleware.ts`
- **Função**: Verifica se o usuário está autenticado via token JWT
- **Aplicado em**: Todas as rotas protegidas

#### Middleware de Admin
- **Arquivo**: `BACKEND/src/domain/auth/middleware/admin.middleware.ts`
- **Função**: Verifica se o usuário tem role `ADMIN` ou `SUPERADMIN`
- **Aplicado em**: Todas as rotas `/admin/*`

```typescript
// Exemplo de uso no backend
router.use(authMiddleware);  // Verifica autenticação
router.use(adminMiddleware); // Verifica se é admin
```

### 2. Proteção no Frontend (Camada de UX)

A proteção no frontend serve apenas para melhorar a experiência do usuário, redirecionando-o antes de tentar acessar recursos protegidos.

#### Hook useAdminAuth
- **Arquivo**: `frontend/hooks/useAdminAuth.ts`
- **Função**: Verifica autenticação e role admin consultando o backend
- **Comportamento**: Redireciona para `/login` se não autorizado

#### Layout Admin Protegido
- **Arquivo**: `frontend/app/admin/layout.tsx`
- **Função**: Envolve todas as páginas admin com verificação de acesso
- **Comportamento**: 
  - Mostra loading durante verificação
  - Redireciona se não autorizado
  - Renderiza conteúdo apenas para admins

## Fluxo de Autenticação

```
1. Usuário acessa /admin/*
   ↓
2. Layout Admin executa useAdminAuth()
   ↓
3. Hook chama verifyAdminAccess()
   ↓
4. Serviço faz requisição para /api/user/me
   ↓
5. Backend verifica token JWT (authMiddleware)
   ↓
6. Backend retorna dados do usuário com role
   ↓
7. Frontend verifica se role é ADMIN ou SUPERADMIN
   ↓
8. Se SIM: Renderiza conteúdo admin
   Se NÃO: Redireciona para /login
```

## Endpoints de Segurança

### GET /api/user/me
- **Autenticação**: Requerida (JWT token)
- **Retorna**: Dados do usuário atual incluindo role
- **Uso**: Verificar autenticação e permissões

```typescript
// Resposta de sucesso
{
  "id": "user-id",
  "email": "admin@example.com",
  "role": "ADMIN",
  "displayName": "Admin User"
}
```

## Roles Permitidas

Apenas usuários com as seguintes roles podem acessar o painel admin:

- `ADMIN`: Administrador padrão
- `SUPERADMIN`: Super administrador com permissões elevadas

## Segurança de Requisições

Todas as requisições para endpoints admin usam `fetchWithAuth()` que:

1. Adiciona automaticamente o token JWT no header `Authorization`
2. Renova o token automaticamente se expirado
3. Redireciona para login se não autenticado (401)
4. Implementa timeout de 30 segundos
5. Usa cache de tokens para performance

## Prevenção de Vulnerabilidades

### ✅ Proteções Implementadas

1. **Verificação no Backend**: Todas as permissões são verificadas no servidor
2. **JWT Tokens**: Autenticação baseada em tokens seguros
3. **Middleware em Camadas**: Autenticação + Autorização
4. **Sem Bypass Frontend**: Frontend não pode manipular permissões
5. **Timeout de Requisições**: Previne ataques de DoS
6. **Cache Seguro**: Tokens em cache com expiração

### ❌ O que NÃO fazer

1. **Nunca** confiar apenas em verificações do frontend
2. **Nunca** armazenar roles ou permissões apenas no localStorage
3. **Nunca** permitir que o frontend defina headers de autorização manualmente
4. **Nunca** expor endpoints admin sem middleware de verificação

## Testando a Segurança

### Teste 1: Acesso sem autenticação
```bash
# Deve retornar 401 Unauthorized
curl http://localhost:5000/admin/dashboard/stats
```

### Teste 2: Acesso com usuário não-admin
```bash
# Deve retornar 403 Forbidden
curl -H "Authorization: Bearer <student-token>" \
  http://localhost:5000/admin/dashboard/stats
```

### Teste 3: Acesso com admin
```bash
# Deve retornar 200 OK com dados
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:5000/admin/dashboard/stats
```

## Monitoramento

Para monitorar tentativas de acesso não autorizado, verifique os logs do backend:

```
❌ [AdminMiddleware] Usuário não autenticado
❌ [AdminMiddleware] Acesso negado. Role atual: STUDENT
✅ [AdminMiddleware] Acesso autorizado para admin
```

## Manutenção

Ao adicionar novas rotas admin:

1. **Backend**: Sempre aplicar `authMiddleware` + `adminMiddleware`
2. **Frontend**: Páginas admin automaticamente protegidas pelo layout
3. **Serviços**: Usar `fetchWithAuth()` para todas as requisições

## Contato

Para questões de segurança, entre em contato com a equipe de desenvolvimento.
