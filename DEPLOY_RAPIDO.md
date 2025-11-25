# 🚀 Deploy Rápido - MEDBRAVE

## ✅ Status Atual
- ✅ Código no GitHub: https://github.com/inocenciorjr/MEDBRAVE.APP.git
- ✅ Frontend e Backend commitados
- ✅ Arquivos .env protegidos
- ✅ Configurações prontas

---

## 🎯 Próximos 3 Passos

### 1️⃣ Deploy do Backend (Railway) - 10 minutos

1. Acesse: https://railway.app
2. Login com GitHub
3. "New Project" → "Deploy from GitHub repo"
4. Selecione: `inocenciorjr/MEDBRAVE.APP`
5. Configure:
   - **Root Directory**: `BACKEND`
   - **Start Command**: `npm start`
6. Adicione Redis:
   - No projeto, clique "+ New" → "Database" → "Redis"
7. Copie a URL do Railway (ex: `https://medbrave-backend.railway.app`)

**Variáveis de Ambiente**: Copie do arquivo `BACKEND/.env` para o Railway

---

### 2️⃣ Deploy do Frontend (Vercel) - 5 minutos

1. Acesse: https://vercel.com
2. "Add New Project"
3. Importe: `inocenciorjr/MEDBRAVE.APP`
4. Configure:
   - **Framework**: Next.js
   - **Root Directory**: `frontend`
5. Adicione variáveis de ambiente:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://yqlfgazngdymiprsrwvf.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=(copiar do .env)
   NEXT_PUBLIC_API_URL=https://SEU-BACKEND.railway.app/api
   ```

---

### 3️⃣ Conectar Frontend ↔️ Backend - 2 minutos

**No Vercel (Frontend):**
- Atualize `NEXT_PUBLIC_API_URL` com a URL do Railway
- Redeploy

**No Railway (Backend):**
- Adicione variável `FRONTEND_URL` com URL do Vercel
- Adicione variável `CORS_ORIGINS` com URL do Vercel

---

## 📋 Checklist Rápido

- [ ] Backend no Railway rodando
- [ ] Redis configurado no Railway
- [ ] Frontend no Vercel rodando
- [ ] URLs cruzadas atualizadas
- [ ] Teste de login funcionando
- [ ] Teste de upload funcionando

---

## 🆘 Problemas Comuns

**Erro de CORS:**
- Verifique `CORS_ORIGINS` no Railway

**Frontend não conecta:**
- Verifique `NEXT_PUBLIC_API_URL` no Vercel

**Erro 500 no backend:**
- Veja logs no Railway Dashboard

---

## 📚 Documentação Completa

Para mais detalhes, veja: `GUIA_DEPLOY.md`

---

**Tempo estimado total**: 20 minutos ⏱️
