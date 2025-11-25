# 📘 Guia de Configuração de Endpoints - MedBrave

## 🎯 Objetivo
Este guia documenta o padrão correto para criar novos endpoints no sistema, evitando erros 404 e problemas de autenticação.

---

## 🏗️ Arquitetura de Rotas

```
Frontend (Next.js) → API Route Proxy → Backend (Express)
     /api/xxx      →  /api/xxx       →  /api/xxx
```

### Fluxo Completo
1. **Frontend** chama `fetchWithAuth('/questions/123')`
2. `fetchWithAuth` transforma em `/api/questions/123`
3. **Next.js API Route** (`frontend/app/api/questions/[...path]/route.ts`) intercepta
4. Proxy faz requisição para **Backend** (`http://localhost:5000/api/questions/123`)
5. Backend processa e retorna resposta

---

## ✅ PADRÃO CORRETO - Exemplos que Funcionam

### 1. Questions (Questões)

#### Frontend: API Route Proxy
**Arquivo**: `frontend/app/api/questions/[...path]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return handleRequest(request, path, 'GET');
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return handleRequest(request, path, 'POST');
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return handleRequest(request, path, 'PUT');
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return handleRequest(request, path, 'DELETE');
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return handleRequest(request, path, 'PATCH');
}

async function handleRequest(request: NextRequest, pathSegments: string[], method: string) {
  try {
    const authHeader = request.headers.get('authorization');
    const path = pathSegments.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${BACKEND_URL}/api/questions/${path}${searchParams ? `?${searchParams}` : ''}`;

    console.log(`[Proxy /api/questions] ${method} ${path}`);

    const headers: HeadersInit = {};
    if (authHeader) headers['Authorization'] = authHeader;
    
    const contentType = request.headers.get('content-type');
    if (contentType) headers['Content-Type'] = contentType;

    const options: RequestInit = { method, headers };

    // Adicionar body para métodos que suportam
    if (method !== 'GET' && method !== 'HEAD') {
      const body = await request.text();
      if (body) options.body = body;
    }

    const response = await fetch(url, options);
    
    // Parsear resposta
    const contentTypeResponse = response.headers.get('content-type');
    if (contentTypeResponse?.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { 'Content-Type': contentTypeResponse || 'text/plain' },
    });
  } catch (error) {
    console.error('[Proxy /api/questions] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

#### Backend: Rotas Express
**Arquivo**: `BACKEND/src/routes.ts`

```typescript
import unifiedQuestionRoutes from "./domain/questions/routes/unifiedQuestionRoutes";

// Registrar rotas
router.use("/questions", unifiedQuestionRoutes);
```

**Arquivo**: `BACKEND/src/domain/questions/routes/unifiedQuestionRoutes.ts`

```typescript
import { Router } from 'express';
import { UnifiedQuestionController } from '../controllers/UnifiedQuestionController';
import { supabaseAuthMiddleware } from '../../../domain/auth/middleware/supabaseAuth.middleware';

const router = Router();
const controller = new UnifiedQuestionController(questionService);

// Rotas protegidas com autenticação
router.get('/:id', supabaseAuthMiddleware, controller.getQuestionById.bind(controller));
router.post('/', supabaseAuthMiddleware, controller.createQuestion.bind(controller));
router.put('/:id', supabaseAuthMiddleware, controller.updateQuestion.bind(controller));
router.delete('/:id', supabaseAuthMiddleware, controller.deleteQuestion.bind(controller));

export default router;
```

---

### 2. Filters (Filtros - Admin)

#### Frontend: API Route Proxy
**Arquivo**: `frontend/app/api/filters/[...path]/route.ts`

```typescript
// Mesmo padrão, mas aponta para /api/admin/filters no backend
const url = `${BACKEND_URL}/api/admin/filters/${path}${searchParams ? `?${searchParams}` : ''}`;
```

#### Backend: Rotas Express
**Arquivo**: `BACKEND/src/routes.ts`

```typescript
const { AdminFactory } = require("./domain/admin/factories/AdminFactory");
const adminModule = AdminFactory.create({ supabaseClient: supabase });
router.use("/admin", adminModule.routes);
```

**Arquivo**: `BACKEND/src/domain/admin/routes/filterRoutes.ts`

```typescript
import { Router } from 'express';
import { supabaseAuthMiddleware } from '../../auth/middleware/supabaseAuth.middleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();

// Rotas protegidas com autenticação + admin
router.use(supabaseAuthMiddleware);
router.use(adminMiddleware);

router.get('/filters', controller.listFilters);
router.post('/filters', controller.createFilter);
// ...

export default router;
```

---

### 3. Question Responses (Respostas de Questões)

#### Frontend: Não tem proxy próprio
Usa o proxy de `/api/questions` ou chama diretamente `/api/question-responses`

#### Backend: Rota Direta
**Arquivo**: `BACKEND/src/routes.ts`

```typescript
// Rota para salvar respostas de questões (requer autenticação)
try {
  const { supabaseAuthMiddleware } = require("./domain/auth/middleware/supabaseAuth.middleware");
  const { QuestionListController } = require("./controllers/QuestionListController");
  const responseController = new QuestionListController();
  
  router.post("/question-responses", supabaseAuthMiddleware, responseController.saveQuestionResponse.bind(responseController));
  console.log('✅ Rota de respostas de questões registrada em /question-responses');
} catch (error) {
  console.error("❌ Erro ao carregar rota de respostas:", error);
}
```

---

## 📋 CHECKLIST para Criar Novo Endpoint

### ✅ Backend (Express)

1. **Criar Controller**
   - [ ] Arquivo: `BACKEND/src/domain/[modulo]/controllers/[Nome]Controller.ts`
   - [ ] Métodos com tipagem correta
   - [ ] Tratamento de erros

2. **Criar Rotas**
   - [ ] Arquivo: `BACKEND/src/domain/[modulo]/routes/[nome]Routes.ts`
   - [ ] Importar `supabaseAuthMiddleware` de `./domain/auth/middleware/supabaseAuth.middleware`
   - [ ] Aplicar middleware em rotas protegidas
   - [ ] Se admin: importar e aplicar `adminMiddleware`

3. **Registrar em routes.ts**
   - [ ] Importar rotas em `BACKEND/src/routes.ts`
   - [ ] Registrar com `router.use("/prefixo", rotas)`
   - [ ] Adicionar try/catch com log de sucesso/erro
   - [ ] Verificar se prefixo não conflita com existentes

### ✅ Frontend (Next.js)

4. **Criar API Route Proxy** (se necessário)
   - [ ] Arquivo: `frontend/app/api/[nome]/[...path]/route.ts`
   - [ ] Copiar template de `questions` ou `filters`
   - [ ] Ajustar URL do backend no `handleRequest`
   - [ ] Implementar todos os métodos HTTP necessários (GET, POST, PUT, DELETE, PATCH)
   - [ ] Adicionar logs para debug

5. **Testar**
   - [ ] Backend responde em `http://localhost:5000/api/[endpoint]`
   - [ ] Frontend proxy funciona em `http://localhost:3000/api/[endpoint]`
   - [ ] Autenticação funciona (token é passado)
   - [ ] Erros retornam status code correto

---

## 🔒 Middlewares de Autenticação

### supabaseAuthMiddleware
**Uso**: Proteger rotas que requerem usuário autenticado

```typescript
import { supabaseAuthMiddleware } from './domain/auth/middleware/supabaseAuth.middleware';

router.get('/protected', supabaseAuthMiddleware, controller.method);
```

**O que faz**:
- Valida token JWT do Supabase
- Adiciona `req.user` com dados do usuário
- Retorna 401 se não autenticado

### adminMiddleware
**Uso**: Proteger rotas que requerem permissão de admin

```typescript
import { adminMiddleware } from './domain/admin/middleware/adminMiddleware';

router.use(supabaseAuthMiddleware); // Primeiro autentica
router.use(adminMiddleware);        // Depois verifica se é admin

router.post('/admin-only', controller.method);
```

**O que faz**:
- Verifica se `req.user.role === 'ADMIN'`
- Retorna 403 se não for admin

---

## 🚫 ERROS COMUNS

### ❌ Erro 404 - Rota não encontrada

**Causas**:
1. Proxy do Next.js não criado
2. Rota não registrada em `BACKEND/src/routes.ts`
3. Prefixo errado (ex: `/questions` vs `/api/questions`)
4. Typo no nome da rota

**Solução**:
- Verificar logs do backend: `✅ Rota X registrada em /Y`
- Testar backend diretamente: `curl http://localhost:5000/api/endpoint`
- Verificar se proxy existe em `frontend/app/api/[nome]/[...path]/route.ts`

### ❌ Erro 401 - Não autenticado

**Causas**:
1. Middleware de autenticação não aplicado
2. Token não está sendo passado no header
3. Token expirado ou inválido

**Solução**:
- Verificar se rota tem `supabaseAuthMiddleware`
- Verificar se proxy passa `Authorization` header
- Testar com token válido: `Authorization: Bearer <token>`

### ❌ Erro 403 - Sem permissão

**Causas**:
1. Rota requer admin mas usuário não é admin
2. `adminMiddleware` aplicado mas usuário comum

**Solução**:
- Verificar se rota realmente precisa ser admin
- Se sim, garantir que `adminMiddleware` está aplicado
- Se não, remover `adminMiddleware`

### ❌ Erro 500 - Erro interno

**Causas**:
1. Erro no controller (exception não tratada)
2. Erro no serviço (banco de dados, etc)
3. Proxy não consegue conectar ao backend

**Solução**:
- Verificar logs do backend
- Adicionar try/catch nos controllers
- Verificar se backend está rodando

---

## 📝 TEMPLATE para Novo Endpoint

### Backend: Controller
```typescript
// BACKEND/src/domain/[modulo]/controllers/[Nome]Controller.ts
import { Request, Response, NextFunction } from 'express';
import AppError from '../../../utils/AppError';

export class NomeController {
  constructor(private service: NomeService) {}

  async metodo(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw AppError.unauthorized("Usuário não autenticado");
      }

      const result = await this.service.metodo(userId, req.body);
      
      res.status(200).json({ 
        success: true,
        data: result 
      });
    } catch (error) {
      next(error);
    }
  }
}
```

### Backend: Rotas
```typescript
// BACKEND/src/domain/[modulo]/routes/[nome]Routes.ts
import { Router } from 'express';
import { NomeController } from '../controllers/NomeController';
import { supabaseAuthMiddleware } from '../../../domain/auth/middleware/supabaseAuth.middleware';

const router = Router();
const controller = new NomeController(service);

// Rotas protegidas
router.get('/', supabaseAuthMiddleware, controller.list.bind(controller));
router.post('/', supabaseAuthMiddleware, controller.create.bind(controller));
router.get('/:id', supabaseAuthMiddleware, controller.getById.bind(controller));
router.put('/:id', supabaseAuthMiddleware, controller.update.bind(controller));
router.delete('/:id', supabaseAuthMiddleware, controller.delete.bind(controller));

export default router;
```

### Backend: Registro em routes.ts
```typescript
// BACKEND/src/routes.ts
try {
  const nomeRoutes = require("./domain/[modulo]/routes/[nome]Routes").default;
  router.use("/nome", nomeRoutes);
  console.log('✅ Rotas de [nome] registradas em /nome');
} catch (error) {
  console.error("❌ Erro ao carregar rotas de [nome]:", error);
}
```

### Frontend: API Route Proxy
```typescript
// frontend/app/api/[nome]/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return handleRequest(request, path, 'GET');
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return handleRequest(request, path, 'POST');
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return handleRequest(request, path, 'PUT');
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return handleRequest(request, path, 'DELETE');
}

async function handleRequest(request: NextRequest, pathSegments: string[], method: string) {
  try {
    const authHeader = request.headers.get('authorization');
    const path = pathSegments.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${BACKEND_URL}/api/nome/${path}${searchParams ? `?${searchParams}` : ''}`;

    console.log(`[Proxy /api/nome] ${method} ${path}`);

    const headers: HeadersInit = {};
    if (authHeader) headers['Authorization'] = authHeader;
    
    const contentType = request.headers.get('content-type');
    if (contentType) headers['Content-Type'] = contentType;

    const options: RequestInit = { method, headers };

    if (method !== 'GET' && method !== 'HEAD') {
      const body = await request.text();
      if (body) options.body = body;
    }

    const response = await fetch(url, options);
    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Proxy /api/nome] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 🎯 Exemplo Completo: Question History

Vou usar como exemplo o novo endpoint de histórico de questões que vamos criar.

### Backend

**1. Controller**: `BACKEND/src/domain/questions/controllers/QuestionHistoryController.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { QuestionHistoryService } from '../services/QuestionHistoryService';
import AppError from '../../../utils/AppError';

export class QuestionHistoryController {
  constructor(private historyService: QuestionHistoryService) {}

  async getQuestionHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const { questionId } = req.params;
      const history = await this.historyService.getQuestionHistory(userId, questionId);
      
      res.status(200).json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  }

  async getQuestionStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const { questionId } = req.params;
      const stats = await this.historyService.getQuestionStats(userId, questionId);
      
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}
```

**2. Rotas**: `BACKEND/src/domain/questions/routes/questionHistoryRoutes.ts`
```typescript
import { Router } from 'express';
import { QuestionHistoryController } from '../controllers/QuestionHistoryController';
import { supabaseAuthMiddleware } from '../../../domain/auth/middleware/supabaseAuth.middleware';
import { QuestionHistoryService } from '../services/QuestionHistoryService';
import { supabase } from '../../../config/supabase';

const router = Router();
const service = new QuestionHistoryService(supabase);
const controller = new QuestionHistoryController(service);

// Todas as rotas requerem autenticação
router.get('/:questionId/history', supabaseAuthMiddleware, controller.getQuestionHistory.bind(controller));
router.get('/:questionId/stats', supabaseAuthMiddleware, controller.getQuestionStats.bind(controller));

export default router;
```

**3. Registro**: `BACKEND/src/routes.ts`
```typescript
// Adicionar junto com outras rotas de questions
try {
  const questionHistoryRoutes = require("./domain/questions/routes/questionHistoryRoutes").default;
  router.use("/questions", questionHistoryRoutes);
  console.log('✅ Rotas de histórico de questões registradas');
} catch (error) {
  console.error("❌ Erro ao carregar rotas de histórico:", error);
}
```

### Frontend

**Proxy**: Usa o proxy existente de `/api/questions/[...path]/route.ts`

Não precisa criar novo proxy! O proxy de questions já cobre:
- `/api/questions/:id/history` → `http://localhost:5000/api/questions/:id/history`
- `/api/questions/:id/stats` → `http://localhost:5000/api/questions/:id/stats`

---

## ✅ RESUMO - Regras de Ouro

1. **Sempre use middleware de autenticação** em rotas protegidas
2. **Sempre registre rotas em routes.ts** com try/catch e logs
3. **Sempre crie proxy no Next.js** para novos módulos (ou use existente)
4. **Sempre teste backend diretamente** antes de testar via frontend
5. **Sempre verifique logs** para confirmar que rota foi registrada
6. **Nunca deixe rotas desprotegidas** que manipulam dados do usuário
7. **Sempre use prefixo `/api`** no backend
8. **Sempre passe Authorization header** no proxy

---

## 🔍 Debug Checklist

Quando algo não funcionar:

1. [ ] Backend está rodando? (`http://localhost:5000`)
2. [ ] Rota aparece nos logs do backend? (`✅ Rota X registrada`)
3. [ ] Rota funciona direto no backend? (teste com curl/Postman)
4. [ ] Proxy existe no Next.js? (`frontend/app/api/[nome]/[...path]/route.ts`)
5. [ ] Proxy está passando Authorization header?
6. [ ] Middleware de autenticação está aplicado?
7. [ ] Token é válido? (não expirou)
8. [ ] Prefixo está correto? (`/api/...`)
9. [ ] Não há conflito de rotas? (duas rotas com mesmo path)
10. [ ] Logs mostram erro? (verificar console backend e frontend)
