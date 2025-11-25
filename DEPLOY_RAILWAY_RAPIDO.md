# 🚀 Deploy Rápido no Railway - MEDBRAVE

## ⚡ Configuração Rápida (5 minutos)

### 1️⃣ Configurar o Serviço Backend

No Railway Dashboard:

1. Clique no serviço que está falhando
2. Vá em **Settings**
3. Configure:

```yaml
Root Directory: BACKEND
Build Command: npm install && npm run build
Start Command: npm start
```

4. Clique em **Deploy** novamente

---

### 2️⃣ Adicionar Redis

1. No mesmo projeto, clique em **+ New**
2. Selecione **Database** → **Redis**
3. Aguarde provisionar
4. Copie a variável `REDIS_URL`

---

### 3️⃣ Configurar Variáveis de Ambiente

No serviço do Backend, vá em **Variables** e adicione:

```env
# Porta (Railway define automaticamente)
PORT=${{RAILWAY_PUBLIC_PORT}}

# Ambiente
NODE_ENV=production

# URLs (atualizar depois com URL do Vercel)
FRONTEND_URL=https://seu-frontend.vercel.app
CORS_ORIGINS=https://seu-frontend.vercel.app

# Supabase
SUPABASE_URL=https://yqlfgazngdymiprsrwvf.supabase.co
SUPABASE_ANON_KEY=seu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=seu_service_role_key_aqui

# Database
DATABASE_URL=postgresql://postgres.yqlfgazngdymiprsrwvf:qh2cX0xoyCzftrzB@aws-0-sa-east-1.pooler.supabase.com:6543/postgres

# Redis (usar a URL do Redis do Railway)
REDIS_URL=${{Redis.REDIS_URL}}

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

# Firebase Hash
FIREBASE_SIGNER_KEY=ocYNJ7HJL9+4nWkRHlz8mxPtnJ2/7R6mg8UJGDVRYJg7gB5DZay5nJOQ69IYBIXC9Wt6TjvQj8M1WGjZwLOBDA==
FIREBASE_SALT_SEPARATOR=Bw==
FIREBASE_ROUNDS=8
FIREBASE_MEMCOST=14

# AI Models
USE_MINIMAX=true
MINIMAX_API_KEY=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
MINIMAX_MODEL=MiniMax-M2
MINIMAX_BASE_URL=https://api.minimax.io/anthropic
MINIMAX_MAX_TOKENS=128000
```

---

### 4️⃣ Redeploy

1. Vá em **Deployments**
2. Clique em **Deploy** ou aguarde deploy automático
3. Aguarde 3-5 minutos

---

## ✅ Verificar se Funcionou

Quando o deploy terminar, você terá uma URL tipo:
```
https://medbrave-backend-production.up.railway.app
```

Teste:
```
https://sua-url.railway.app/health
```

Deve retornar:
```json
{
  "status": "ok",
  "timestamp": "2025-11-25T..."
}
```

---

## 🚀 Próximo Passo: Deploy do Frontend no Vercel

1. Acesse: https://vercel.com
2. Import do GitHub: `inocenciorjr/MEDBRAVE.APP`
3. Configure:
   ```
   Root Directory: frontend
   Framework: Next.js
   ```
4. Adicione variáveis:
   ```
   NEXT_PUBLIC_API_URL=https://sua-url.railway.app/api
   NEXT_PUBLIC_BACKEND_URL=https://sua-url.railway.app
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

---

## 🆘 Se der erro de TypeScript

O erro que você viu é porque o TypeScript está tentando compilar arquivos que não existem.

**Solução:**

1. No Railway, vá em **Settings**
2. Em **Build Command**, use:
   ```
   npm install && npm run build -- --skipLibCheck
   ```

Ou atualize o `tsconfig.json`:
```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

---

## 💰 Custo

- Backend no Railway: ~US$ 5/mês
- Redis no Railway: Incluído
- Frontend no Vercel: Grátis

**Total: ~US$ 5/mês (R$ 25)**

---

**Tempo estimado: 10 minutos** ⏱️
