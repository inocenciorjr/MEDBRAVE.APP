# 🚀 Guia Completo de Deploy - MEDBRAVE

## 📋 Índice
1. [Pré-requisitos](#pré-requisitos)
2. [Deploy do Frontend (Vercel)](#deploy-do-frontend)
3. [Deploy do Backend (Railway/Render)](#deploy-do-backend)
4. [Configuração de Domínio](#configuração-de-domínio)
5. [Variáveis de Ambiente](#variáveis-de-ambiente)
6. [Checklist Final](#checklist-final)

---

## 🎯 Pré-requisitos

### Contas Necessárias:
- [ ] Conta no GitHub (para código)
- [ ] Conta no Vercel (para frontend)
- [ ] Conta no Railway ou Render (para backend)
- [ ] Supabase já configurado ✅
- [ ] Domínio (opcional, mas recomendado)

### Serviços Externos Já Configurados:
- ✅ Supabase (banco de dados)
- ✅ Cloudflare R2 (storage)
- ✅ Redis (precisa configurar em produção)

---

## 🎨 Deploy do Frontend (Vercel)

### Passo 1: Preparar o Repositório

1. **Criar repositório no GitHub** (se ainda não tiver):
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/medbrave.git
git push -u origin main
```

### Passo 2: Deploy no Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em "Add New Project"
3. Importe seu repositório do GitHub
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### Passo 3: Variáveis de Ambiente no Vercel

Adicione estas variáveis em **Settings > Environment Variables**:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://yqlfgazngdymiprsrwvf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# API (IMPORTANTE: Atualizar após deploy do backend)
NEXT_PUBLIC_API_URL=https://SEU-BACKEND.railway.app/api
NEXT_PUBLIC_BACKEND_URL=https://SEU-BACKEND.railway.app

# Storage
NEXT_PUBLIC_STORAGE_BUCKET=medbrave-storage
```

⚠️ **IMPORTANTE**: Após fazer deploy do backend, volte aqui e atualize as URLs!

---

## 🔧 Deploy do Backend (Railway)

### Opção A: Railway (Recomendado)

#### Passo 1: Criar Conta no Railway
1. Acesse [railway.app](https://railway.app)
2. Faça login com GitHub
3. Clique em "New Project"

#### Passo 2: Deploy do Backend
1. Selecione "Deploy from GitHub repo"
2. Escolha seu repositório
3. Configure:
   - **Root Directory**: `BACKEND`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`

#### Passo 3: Adicionar Redis
1. No mesmo projeto, clique em "+ New"
2. Selecione "Database" > "Redis"
3. Copie a URL de conexão

#### Passo 4: Variáveis de Ambiente no Railway

Adicione em **Variables**:

```env
# Porta (Railway define automaticamente)
PORT=${{RAILWAY_PUBLIC_PORT}}

# Ambiente
NODE_ENV=production

# URLs
API_URL=${{RAILWAY_PUBLIC_DOMAIN}}
FRONTEND_URL=https://SEU-FRONTEND.vercel.app

# CORS (atualizar com URL do Vercel)
CORS_ORIGINS=https://SEU-FRONTEND.vercel.app

# Supabase
SUPABASE_URL=https://yqlfgazngdymiprsrwvf.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database
DATABASE_URL=postgresql://postgres.yqlfgazngdymiprsrwvf:qh2cX0xoyCzftrzB@aws-0-sa-east-1.pooler.supabase.com:6543/postgres

# Redis (usar a URL do Redis do Railway)
REDIS_HOST=${{REDIS.RAILWAY_PRIVATE_DOMAIN}}
REDIS_PORT=6379

# APIs Externas
GOOGLE_AI_API_KEY=AIzaSyCSphKKYt8F4FTXCMZnY7Fwiqnt1RvWoT8
OPENROUTER_API_KEY=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

# Cloudflare R2
R2_ACCOUNT_ID=16fc5a72ff773d4925e9e5a1b0136737
R2_BUCKET_NAME=medbrave
R2_ACCESS_KEY_ID=41c779389c2f6cd8039d2537cced5a69
R2_SECRET_ACCESS_KEY=f99e3b6cc38730d0a8ccb266a8adedb9a677ed5308a8a39b18edd8b43dbb2a78
R2_ENDPOINT=https://16fc5a72ff773d4925e9e5a1b0136737.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://medbrave.com.br

# Azure Document Intelligence
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://medpulse.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=6kH3yz3xOpF5sRfN6nTaOUM3czDclPW2qIVEXhzVCpjeK5ur3pnSJQQJ99BEACZoyfiXJ3w3AAALACOGnwkh

# PDF.CO
PDF_CO_API_KEY=inocencio.123@gmail.com_kTpTlpi5bh9YFNMKFxlyB5dEu5tjPrI1wed4ZzdKRzq7FMat9TRmPK4hOKEWzdp7

# Firebase Hash (para migração de senhas)
FIREBASE_SIGNER_KEY=ocYNJ7HJL9+4nWkRHlz8mxPtnJ2/7R6mg8UJGDVRYJg7gB5DZay5nJOQ69IYBIXC9Wt6TjvQj8M1WGjZwLOBDA==
FIREBASE_SALT_SEPARATOR=Bw==
FIREBASE_ROUNDS=8
FIREBASE_MEMCOST=14

# AI Models
USE_MINIMAX=true
MINIMAX_API_KEY=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
MINIMAX_API_KEY_2=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
MINIMAX_MODEL=MiniMax-M2
MINIMAX_BASE_URL=https://api.minimax.io/anthropic
MINIMAX_MAX_TOKENS=128000
```

---

## 🌐 Configuração de Domínio (Opcional)

### Frontend (Vercel):
1. Vá em **Settings > Domains**
2. Adicione seu domínio (ex: `app.medbrave.com.br`)
3. Configure DNS conforme instruções

### Backend (Railway):
1. Vá em **Settings > Networking**
2. Adicione custom domain (ex: `api.medbrave.com.br`)
3. Configure DNS conforme instruções

---

## ✅ Checklist Final

### Antes do Deploy:
- [ ] Código commitado no GitHub
- [ ] Build local funcionando (`npm run build`)
- [ ] Variáveis de ambiente documentadas
- [ ] Supabase configurado e funcionando

### Deploy Frontend:
- [ ] Projeto criado no Vercel
- [ ] Variáveis de ambiente configuradas
- [ ] Build bem-sucedido
- [ ] Site acessível

### Deploy Backend:
- [ ] Projeto criado no Railway
- [ ] Redis adicionado
- [ ] Variáveis de ambiente configuradas
- [ ] Build bem-sucedido
- [ ] API acessível

### Pós-Deploy:
- [ ] Atualizar `NEXT_PUBLIC_API_URL` no Vercel com URL do Railway
- [ ] Atualizar `CORS_ORIGINS` no Railway com URL do Vercel
- [ ] Atualizar `FRONTEND_URL` no Railway
- [ ] Testar login
- [ ] Testar upload de arquivos
- [ ] Testar funcionalidades principais

---

## 🆘 Troubleshooting

### Frontend não conecta com Backend:
1. Verifique se `NEXT_PUBLIC_API_URL` está correto
2. Verifique CORS no backend
3. Verifique se backend está rodando

### Erro 500 no Backend:
1. Verifique logs no Railway
2. Verifique variáveis de ambiente
3. Verifique conexão com Supabase

### Redis não conecta:
1. Verifique se Redis foi adicionado no Railway
2. Verifique variáveis `REDIS_HOST` e `REDIS_PORT`

---

## 📞 Próximos Passos

Após seguir este guia:
1. Teste todas as funcionalidades
2. Configure monitoramento (Sentry, LogRocket)
3. Configure backups automáticos
4. Configure CI/CD para deploys automáticos

---

**Criado em**: 2025
**Última atualização**: Deploy inicial
