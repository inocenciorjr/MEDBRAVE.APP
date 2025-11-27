# Sistema de Autenticação - MedBrave

Este diretório contém toda a infraestrutura de autenticação e utilitários compartilhados da aplicação MedBrave.

## 📁 Estrutura

```
lib/
├── contexts/          # React Contexts
│   └── AuthContext.tsx
├── services/          # Serviços de negócio
│   └── supabaseAuthService.ts
├── utils/             # Utilitários
│   └── fetchWithAuth.ts
└── types/             # Definições TypeScript
    └── auth.ts
```

## 🔐 Autenticação

### AuthContext

O `AuthContext` fornece estado e métodos de autenticação para toda a aplicação.

#### Configuração

Envolva sua aplicação com o `AuthProvider` no arquivo `app/layout.tsx`:

```typescript
import { AuthProvider } from '@/lib/contexts/AuthContext';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

#### Uso

Use o hook `useAuth` em qualquer componente:

```typescript
import { useAuth } from '@/lib/contexts/AuthContext';

function MyComponent() {
  const { user, login, logout, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!user) {
    return (
      <button onClick={() => login('email@example.com', 'password')}>
        Login
      </button>
    );
  }

  return (
    <div>
      <p>Bem-vindo, {user.displayName}!</p>
      <p>Role: {user.role}</p>
      <button onClick={logout}>Sair</button>
    </div>
  );
}
```

#### Métodos Disponíveis

- `login(email, password)` - Login com email e senha
- `loginWithGoogle()` - Login com Google OAuth
- `register(email, password, displayName)` - Registrar novo usuário
- `logout()` - Fazer logout
- `forgotPassword(email)` - Enviar email de recuperação de senha
- `updateUser(userData)` - Atualizar dados do usuário

#### Estado Disponível

- `user` - Usuário atual (null se não autenticado)
- `loading` - Indica se está carregando
- `error` - Mensagem de erro (null se não houver erro)
- `token` - Token JWT atual
- `isAuthenticated` - Boolean indicando se está autenticado

### supabaseAuthService

Serviço singleton que encapsula toda a lógica de autenticação com Supabase.

#### Uso Direto

```typescript
import { supabaseAuthService } from '@/lib/services/supabaseAuthService';

// Login
const { user, token } = await supabaseAuthService.login('email@example.com', 'password');

// Obter token válido
const token = await supabaseAuthService.getValidToken();

// Verificar autenticação
if (supabaseAuthService.isAuthenticated()) {
  console.log('Usuário autenticado');
}
```

#### Características

- Cache de tokens (50 minutos)
- Renovação automática de tokens
- Sincronização com backend para obter role
- Mensagens de erro em português
- Debounce de sincronização (5 segundos)

## 🌐 Requisições Autenticadas

### fetchWithAuth

Função utilitária para fazer requisições HTTP com autenticação automática.

#### Uso Básico

```typescript
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

// GET request
const response = await fetchWithAuth('/users');
const users = await response.json();

// POST request
const response = await fetchWithAuth('/users', {
  method: 'POST',
  body: JSON.stringify({ name: 'João' })
});

// PUT request
const response = await fetchWithAuth('/users/123', {
  method: 'PUT',
  body: JSON.stringify({ name: 'João Silva' })
});

// DELETE request
const response = await fetchWithAuth('/users/123', {
  method: 'DELETE'
});
```

#### Características

- Adiciona Authorization header automaticamente
- Pool de requisições GET para evitar duplicatas
- Retry automático em caso de token expirado (401)
- Timeout de 30 segundos
- Transformação automática de URLs para proxy Next.js
- Coleta de estatísticas de performance

#### Estatísticas de Performance

Em desenvolvimento, você pode acessar estatísticas no console:

```javascript
// No console do navegador
window.fetchAuthStats()
// Retorna: { requests, cacheHits, tokenRefreshes, errors, avgResponseTime, ... }

// Limpar cache
window.clearFetchCache()
```

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do frontend com:

```env
# Supabase Configuration (obrigatório)
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima

# API Configuration (opcional)
NEXT_PUBLIC_API_URL=/api

# Storage Configuration (opcional)
NEXT_PUBLIC_STORAGE_BUCKET=seu-bucket
```

**Importante:** Nunca commite o arquivo `.env.local` no repositório!

### Supabase Client

O cliente Supabase é configurado em `config/supabase.ts` e exportado como singleton:

```typescript
import { supabase } from '@/config/supabase';

// Obter usuário atual
const { data: { user } } = await supabase.auth.getUser();

// Fazer query
const { data, error } = await supabase
  .from('users')
  .select('*');
```

## 📝 Tipos TypeScript

Todos os tipos relacionados à autenticação estão em `lib/types/auth.ts`:

```typescript
import type { User, AuthState, LoginCredentials } from '@/lib/types/auth';

// User
interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  emailVerified: boolean;
  role: 'student' | 'admin' | 'teacher';
}

// AuthState
interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  token: string | null;
  isAuthenticated: boolean;
}
```

## 🐛 Troubleshooting

### Erro: "Usuário não autenticado"

**Causa:** O token expirou ou não existe.

**Solução:**
1. Verifique se o usuário está logado: `useAuth().isAuthenticated`
2. Tente fazer login novamente
3. Limpe o localStorage: `localStorage.clear()`

### Erro: "Variáveis de ambiente faltando"

**Causa:** As variáveis `NEXT_PUBLIC_SUPABASE_URL` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY` não estão definidas.

**Solução:**
1. Crie o arquivo `.env.local` na raiz do frontend
2. Adicione as variáveis necessárias
3. Reinicie o servidor de desenvolvimento

### Erro: "Module not found: Can't resolve '@/config/supabase'"

**Causa:** O alias `@` não está configurado no TypeScript.

**Solução:**
Verifique se o `tsconfig.json` tem:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Requisições falhando com 401

**Causa:** Token expirado ou inválido.

**Solução:**
1. O `fetchWithAuth` já tenta renovar automaticamente
2. Se persistir, faça logout e login novamente
3. Verifique se o backend está aceitando o token do Supabase

### Performance lenta

**Causa:** Muitas requisições duplicadas ou cache não funcionando.

**Solução:**
1. Verifique estatísticas: `window.fetchAuthStats()`
2. Limpe o cache: `window.clearFetchCache()`
3. Verifique se está usando `fetchWithAuth` para todas as requisições autenticadas

## 🔒 Segurança

### Boas Práticas

1. **Nunca exponha tokens em logs de produção**
   - Os logs de debug só aparecem em desenvolvimento

2. **Use HTTPS em produção**
   - O Next.js cuida disso automaticamente no Vercel

3. **Valide dados no backend**
   - Nunca confie apenas na validação do frontend

4. **Tokens têm TTL de 60 minutos**
   - São renovados automaticamente 10 minutos antes de expirar

5. **Limpe dados sensíveis no logout**
   - O `logout()` já limpa localStorage e sessionStorage

### Rate Limiting

- Sincronização com backend tem debounce de 5 segundos
- Pool de requisições evita chamadas duplicadas
- Cache de tokens reduz chamadas ao Supabase

## 📚 Recursos Adicionais

- [Documentação do Supabase](https://supabase.com/docs)
- [Documentação do Next.js](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🤝 Contribuindo

Ao modificar o sistema de autenticação:

1. Mantenha a documentação JSDoc atualizada
2. Adicione testes para novas funcionalidades
3. Siga os padrões de código existentes
4. Atualize este README se necessário

## 📄 Licença

Este código é parte do projeto MedBrave e está sujeito à sua licença.
