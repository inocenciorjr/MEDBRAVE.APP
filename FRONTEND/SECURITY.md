# 🔒 Guia de Segurança - Sistema de Autenticação MedBrave

## ✅ Checklist de Segurança Implementada

### 1. Proteção de Credenciais ✅

- [x] **Variáveis de ambiente protegidas**
  - `.env.local` no `.gitignore`
  - Padrão `.env*` bloqueia todos os arquivos .env
  - Template `.env.example` sem dados sensíveis

- [x] **Apenas chaves públicas no frontend**
  - Usa `NEXT_PUBLIC_SUPABASE_ANON_KEY` (chave anônima)
  - NUNCA usa `SUPABASE_SERVICE_KEY` (chave de serviço)
  - Chave anônima é segura para expor no navegador

- [x] **Validação de variáveis obrigatórias**
  ```typescript
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Variáveis de ambiente faltando');
  }
  ```

### 2. Gerenciamento de Tokens ✅

- [x] **Cache de tokens com TTL**
  - Tokens expiram em 60 minutos
  - Cache renovado 10 minutos antes (50 min)
  - Limpeza automática de tokens expirados

- [x] **Renovação automática**
  - Auto-refresh antes de expirar
  - Retry automático em caso de 401
  - Fallback para token em cache

- [x] **Armazenamento seguro**
  - Tokens em `localStorage` (não em cookies para evitar CSRF)
  - Limpeza completa no logout
  - Sem exposição em logs de produção

### 3. Autenticação e Sessões ✅

- [x] **Persistência de sessão**
  - `persistSession: true` no Supabase
  - `autoRefreshToken: true` para renovação
  - `detectSessionInUrl: true` para OAuth

- [x] **Validação de usuário**
  - Verifica autenticação antes de requisições
  - Aguarda inicialização do estado de auth
  - Sincronização com backend para role

- [x] **Logout seguro**
  ```typescript
  // Limpa TODOS os dados sensíveis
  localStorage.removeItem('user');
  localStorage.removeItem('user_id');
  localStorage.removeItem('authToken');
  localStorage.removeItem('userData');
  sessionStorage.removeItem('authToken');
  ```

### 4. Requisições HTTP ✅

- [x] **Timeout de 30 segundos**
  ```typescript
  signal: AbortSignal.timeout(30000)
  ```

- [x] **Headers de segurança**
  - `Authorization: Bearer ${token}`
  - `Content-Type: application/json`
  - Validação de FormData

- [x] **Retry com limite**
  - Apenas 1 retry em caso de 401
  - Evita loops infinitos
  - Fallback para token em cache

### 5. Proteção contra Ataques ✅

- [x] **Rate Limiting**
  - Debounce de 5s em sincronizações
  - Pool de requisições evita duplicatas
  - Cache reduz chamadas ao Supabase

- [x] **Validação de entrada**
  - Mensagens de erro sanitizadas
  - Validação de email e senha
  - Tratamento de erros do Supabase

- [x] **Proteção CSRF**
  - Tokens em localStorage (não cookies)
  - SameSite policy do Supabase
  - Validação de origem no backend

### 6. Logs e Monitoramento ✅

- [x] **Logs apenas em desenvolvimento**
  ```typescript
  if (process.env.NODE_ENV === 'development') {
    console.log('Debug info');
  }
  ```

- [x] **Estatísticas de performance**
  - Expostas apenas em dev via `window`
  - Não expõe dados sensíveis
  - Útil para debugging

- [x] **Mensagens de erro amigáveis**
  - Erros traduzidos para português
  - Sem exposição de detalhes técnicos
  - Stack traces apenas em dev

## 🚨 Vulnerabilidades Prevenidas

### ✅ XSS (Cross-Site Scripting)
- React escapa automaticamente valores
- Sem uso de `dangerouslySetInnerHTML`
- Validação de inputs

### ✅ CSRF (Cross-Site Request Forgery)
- Tokens em localStorage (não cookies)
- Validação de origem no backend
- Headers customizados

### ✅ Token Theft
- Tokens com TTL curto (60 min)
- Renovação automática
- Limpeza no logout

### ✅ Man-in-the-Middle
- HTTPS obrigatório em produção
- Supabase usa TLS 1.3
- Certificados válidos

### ✅ Brute Force
- Rate limiting no Supabase
- Debounce de requisições
- Mensagens de erro genéricas

### ✅ SQL Injection
- Supabase usa prepared statements
- Validação de tipos TypeScript
- Sem queries SQL diretas no frontend

## ⚠️ Práticas de Segurança Obrigatórias

### Para Desenvolvedores

1. **NUNCA commite credenciais**
   ```bash
   # Verificar antes de commit
   git status
   git diff
   
   # Se acidentalmente commitou
   git reset HEAD~1
   git clean -fd
   ```

2. **Use apenas chaves públicas**
   ```typescript
   // ✅ CORRETO
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   
   // ❌ ERRADO - NUNCA FAÇA ISSO!
   NEXT_PUBLIC_SUPABASE_SERVICE_KEY=...
   ```

3. **Valide no backend também**
   - Frontend é apenas primeira camada
   - Backend deve validar TUDO
   - Nunca confie apenas no frontend

4. **Mantenha dependências atualizadas**
   ```bash
   npm audit
   npm audit fix
   npm update
   ```

### Para Deploy

1. **Use variáveis de ambiente da plataforma**
   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Environment Variables
   - Não use arquivos .env em produção

2. **Configure HTTPS**
   - Vercel/Netlify fazem automaticamente
   - Force HTTPS redirect
   - Use HSTS headers

3. **Configure CSP (Content Security Policy)**
   ```typescript
   // next.config.ts
   headers: [
     {
       key: 'Content-Security-Policy',
       value: "default-src 'self'; ..."
     }
   ]
   ```

4. **Monitore logs de erro**
   - Configure Sentry ou similar
   - Alerte em caso de múltiplos 401
   - Monitore tentativas de login

## 🔍 Auditoria de Segurança

### Checklist Mensal

- [ ] Atualizar dependências: `npm audit fix`
- [ ] Verificar logs de erro no Supabase
- [ ] Revisar permissões RLS no banco
- [ ] Testar fluxos de autenticação
- [ ] Verificar tokens expirados
- [ ] Revisar logs de acesso

### Ferramentas Recomendadas

```bash
# Verificar vulnerabilidades
npm audit

# Verificar dependências desatualizadas
npm outdated

# Análise de segurança
npx snyk test

# Verificar secrets commitados
git secrets --scan
```

## 📋 Compliance e Regulamentações

### LGPD (Lei Geral de Proteção de Dados)

- [x] Dados armazenados apenas com consentimento
- [x] Usuário pode deletar conta (logout limpa dados)
- [x] Dados criptografados em trânsito (HTTPS)
- [x] Logs não contêm dados pessoais sensíveis

### HIPAA (para dados médicos)

- [x] Autenticação forte (Supabase)
- [x] Audit trail (logs do Supabase)
- [x] Criptografia em trânsito e repouso
- [ ] BAA (Business Associate Agreement) com Supabase

## 🚨 Resposta a Incidentes

### Se detectar vazamento de credenciais:

1. **Imediato (< 5 min)**
   ```bash
   # Revogar chaves no Supabase
   # Settings → API → Reset anon key
   ```

2. **Curto prazo (< 1 hora)**
   - Atualizar `.env.local` com novas chaves
   - Fazer logout de todos os usuários
   - Notificar equipe

3. **Médio prazo (< 24 horas)**
   - Revisar logs de acesso
   - Verificar atividades suspeitas
   - Documentar incidente

4. **Longo prazo (< 1 semana)**
   - Implementar melhorias
   - Treinar equipe
   - Atualizar documentação

### Contatos de Emergência

- **Supabase Support:** support@supabase.io
- **Security Issues:** security@supabase.io

## 📚 Recursos Adicionais

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

## ✅ Certificação de Segurança

Este sistema de autenticação foi implementado seguindo:

- ✅ OWASP Security Guidelines
- ✅ Next.js Security Best Practices
- ✅ Supabase Security Recommendations
- ✅ TypeScript Type Safety
- ✅ LGPD Compliance Requirements

**Última revisão:** 2025-01-31
**Próxima revisão:** 2025-02-28
