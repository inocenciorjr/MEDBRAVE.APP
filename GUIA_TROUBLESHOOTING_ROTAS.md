# 🔧 Guia de Troubleshooting - Rotas de API

## 📋 Problema Comum: Erro 404 em Rotas Novas

Quando você cria novos endpoints no backend e eles retornam 404, geralmente é porque:

1. ❌ Falta o proxy do Next.js
2. ❌ Middlewares não estão aplicados corretamente
3. ❌ Prefixo `/api` está errado
4. ❌ Rotas duplicadas

---

## ✅ Solução: Checklist Completo

### 1️⃣ BACKEND - Registrar Rotas Corretamente

#### Exemplo de Rota Funcional (Question Routes)
```typescript
// BACKEND/src/domain/questions/routes/unifiedQuestionRoutes.ts
import { Router } from 'express';
import { supabaseAuthMiddleware as authMiddleware } from '../../auth/middleware/supabaseAuth.middleware';

const router = Router();

// ✅ Aplicar authMiddleware em CADA rota
router.get('/', authMiddleware, controller.listQuestions);
router.post('/', authMiddleware, controller.createQuestion);

export default router;
```

#### Registrar no App Principal
```typescript
// BACKEND/src/routes.ts
export const createRouter = async (supabase: SupabaseClient): Promise<express.Router> => {
  const router = express.Router();

  // ✅ Registrar com prefixo /api (feito no app.ts)
  router.use("/questions", unifiedQuestionRoutes);
  
  return router;
};
```

```typescript
// BACKEND/src/app.ts
const router = await createRouter(supabaseClient);
app.use('/api', router); // ✅ Prefixo /api aplicado aqui
```

---

### 2️⃣ FRONTEND - Criar Proxy do Next.js

**IMPORTANTE:** O frontend NUNCA deve chamar `localhost:5000` diretamente!

#### Estrutura de Pastas
```
frontend/app/api/
├── questions/
│   └── [...path]/
│       └── route.ts       ✅ Proxy para /api/questions
├── flashcards/
│   └── [...path]/
│       └── route.ts       ✅ Proxy para /api/flashcards
└── unified-reviews/       ⬅️ CRIAR ESTA PASTA
    └── [...path]/
        └── route.ts       ✅ Proxy para /api/unified-reviews
```

#### Template de Proxy (Copiar e Adaptar)
```typescript
// frontend/app/api/unified-reviews/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handleRequest(request, path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handleRequest(request, path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handleRequest(request, path, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handleRequest(request, path, 'DELETE');
}

async function handleRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    const authHeader = request.headers.get('authorization');
    const path = pathSegments.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${BACKEND_URL}/api/unified-reviews/${path}${searchParams ? `?${searchParams}` : ''}`;

    console.log(`[Proxy /api/unified-reviews] ${method} ${path}`);

    const headers: HeadersInit = {};
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const contentType = request.headers.get('content-type');
    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    // Adicionar body para métodos que suportam
    if (method !== 'GET' && method !== 'HEAD') {
      const body = await request.text();
      if (body) {
        options.body = body;
      }
    }

    const response = await fetch(url, options);

    // Tentar parsear como JSON
    const contentTypeResponse = response.headers.get('content-type');
    if (contentTypeResponse?.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    // Se não for JSON, retornar como texto
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: {
        'Content-Type': contentTypeResponse || 'text/plain',
      },
    });
  } catch (error) {
    console.error('[Proxy /api/unified-reviews] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

---

### 3️⃣ FRONTEND - Usar o Proxy Corretamente

#### ❌ ERRADO - Chamar Backend Diretamente
```typescript
// ❌ NÃO FAZER ISSO!
const response = await fetch('http://localhost:5000/api/unified-reviews/dev/create-test-cards', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ count: 50 }),
});
```

#### ✅ CORRETO - Usar Proxy do Next.js
```typescript
// ✅ FAZER ASSIM!
const response = await fetch('/api/unified-reviews/dev/create-test-cards', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ count: 50 }),
});
```

---

## 🔍 Como Verificar se Está Funcionando

### 1. Backend Logs
```bash
# Deve aparecer no console do backend:
✅ Rotas de teste de desenvolvimento registradas
🚀 Servidor rodando em http://localhost:5000
```

### 2. Frontend Logs (Console do Navegador)
```
[Proxy /api/unified-reviews] POST dev/create-test-cards
[Proxy /api/unified-reviews] Backend URL: http://localhost:5000/api/unified-reviews/dev/create-test-cards
[Proxy /api/unified-reviews] Auth header: Present
[Proxy /api/unified-reviews] Fetching from backend...
[Proxy /api/unified-reviews] Backend response status: 200
```

### 3. Network Tab (DevTools)
```
Request URL: http://localhost:3000/api/unified-reviews/dev/create-test-cards
Status: 200 OK
```

---

## 🐛 Erros Comuns e Soluções

### Erro: "404 Not Found"
**Causa:** Proxy do Next.js não existe ou está mal configurado

**Solução:**
1. Criar pasta `frontend/app/api/[nome-da-rota]/[...path]/`
2. Criar arquivo `route.ts` com o template acima
3. Reiniciar o frontend (`npm run dev`)

---

### Erro: "401 Unauthorized"
**Causa:** Token de autenticação não está sendo enviado

**Solução:**
```typescript
// ✅ Sempre pegar o token antes de fazer a requisição
const { supabase } = await import('@/config/supabase');
const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  console.error('Usuário não está logado!');
  return;
}

const response = await fetch('/api/unified-reviews/dev/create-test-cards', {
  headers: {
    'Authorization': `Bearer ${session.access_token}`, // ✅ Token aqui
    'Content-Type': 'application/json',
  },
  // ...
});
```

---

### Erro: "403 Forbidden"
**Causa:** Endpoint de desenvolvimento sendo chamado em produção

**Solução:**
```typescript
// Backend verifica NODE_ENV
if (process.env.NODE_ENV === 'production') {
  return res.status(403).json({
    success: false,
    message: 'Endpoint disponível apenas em desenvolvimento',
  });
}
```

**Verificar:**
```bash
# No terminal do backend
echo $NODE_ENV  # Deve estar vazio ou "development"
```

---

### Erro: "500 Internal Server Error"
**Causa:** Erro no código do backend (controller, service, etc.)

**Solução:**
1. Verificar logs do backend no terminal
2. Procurar por stack trace
3. Corrigir o erro no código

**Exemplo de erro comum:**
```typescript
// ❌ ERRADO - count não é retornado pelo Supabase
const { error, count } = await supabase
  .from('fsrs_cards')
  .insert(cards);

// ✅ CORRETO - usar .select() para obter dados
const { error, data } = await supabase
  .from('fsrs_cards')
  .insert(cards)
  .select();

const count = data?.length || 0;
```

---

## 📝 Checklist Final

Antes de criar uma nova rota, verifique:

- [ ] Backend: Rota registrada em `routes.ts`
- [ ] Backend: Middleware `authMiddleware` aplicado
- [ ] Backend: Prefixo `/api` no `app.ts`
- [ ] Backend: Logs de confirmação aparecem ao iniciar
- [ ] Frontend: Pasta `app/api/[nome]/[...path]/` criada
- [ ] Frontend: Arquivo `route.ts` com todos os métodos HTTP
- [ ] Frontend: Código usa `/api/[nome]` (não `localhost:5000`)
- [ ] Frontend: Token de autenticação sendo enviado
- [ ] Ambos: Servidores rodando (backend:5000, frontend:3000)

---

## 🎯 Exemplo Completo: Rotas de Teste

### Backend
```typescript
// BACKEND/src/domain/studyTools/unifiedReviews/routes/devTestingRoutes.ts
import { Router } from 'express';
import { DevTestingController } from '../controllers/DevTestingController';
import { supabaseAuthMiddleware as authMiddleware } from '../../../auth/middleware/supabaseAuth.middleware';

export const createDevTestingRoutes = (): Router => {
  const router = Router();
  const controller = new DevTestingController(supabase);

  // ✅ authMiddleware em cada rota
  router.post('/simulate-overdue', authMiddleware, controller.simulateOverdueReviews);
  router.post('/reset-dates', authMiddleware, controller.resetDates);
  router.post('/create-test-cards', authMiddleware, controller.createTestCards);
  router.delete('/delete-test-cards', authMiddleware, controller.deleteTestCards);

  return router;
};
```

```typescript
// BACKEND/src/routes.ts
if (process.env.NODE_ENV !== 'production') {
  const { createDevTestingRoutes } = require("./domain/studyTools/unifiedReviews/routes/devTestingRoutes");
  const devTestingRoutes = createDevTestingRoutes();
  router.use("/unified-reviews/dev", devTestingRoutes); // ✅ Prefixo correto
  console.log('🧪 Rotas de teste de desenvolvimento registradas');
}
```

### Frontend
```typescript
// frontend/app/api/unified-reviews/[...path]/route.ts
// (usar template acima)
```

```typescript
// frontend/components/revisoes/DevTestingPanel.tsx
const handleCreateCards = async (count: number) => {
  const { supabase } = await import('@/config/supabase');
  const { data: { session } } = await supabase.auth.getSession();
  
  // ✅ Usar proxy do Next.js
  const response = await fetch('/api/unified-reviews/dev/create-test-cards', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ count }),
  });
  
  const data = await response.json();
  console.log('Resposta:', data);
};
```

---

## 🚀 Resultado Esperado

Quando tudo estiver correto:

1. ✅ Backend inicia sem erros
2. ✅ Frontend inicia sem erros
3. ✅ Painel de testes mostra "Backend: 🟢 Online"
4. ✅ Clicar em "Criar 50 Cards" retorna sucesso
5. ✅ Logs aparecem no console do backend
6. ✅ Logs aparecem no console do navegador

---

## 📚 Referências

- Rotas funcionais: `questions`, `flashcards`, `review-preferences`
- Padrão de proxy: `frontend/app/api/questions/[...path]/route.ts`
- Padrão de rotas: `BACKEND/src/domain/questions/routes/unifiedQuestionRoutes.ts`
