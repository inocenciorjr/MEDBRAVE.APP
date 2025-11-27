# 🌐 Configuração com Ngrok

## Como funciona

Ngrok cria um túnel público para o seu backend local, permitindo acesso de qualquer lugar.

## Setup Rápido

### 1. Inicie o ngrok para o backend

```bash
ngrok http 5000
```

Você verá algo como:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:5000
```

### 2. Configure o Frontend

Crie/edite o arquivo `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://abc123.ngrok.io/api
```

**⚠️ IMPORTANTE:** Use a URL **HTTPS** do ngrok (não HTTP)

### 3. Reinicie o Frontend

```bash
npm run dev
```

### 4. Acesse do celular

Você tem duas opções:

**Opção A: Frontend também via ngrok (recomendado)**
```bash
# Em outro terminal
ngrok http 3000
```

Acesse a URL do ngrok no celular (ex: `https://xyz789.ngrok.io`)

**Opção B: Frontend via IP local**

Acesse `http://SEU_IP:3000` no celular (mesma rede WiFi)

## 🔧 Troubleshooting

### Erro de CORS

Se aparecer erro de CORS, configure o backend para aceitar a origem do ngrok:

```javascript
// No backend
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://xyz789.ngrok.io', // URL do ngrok do frontend
  ],
  credentials: true
}));
```

### Ngrok URL muda toda vez

O ngrok free gera URLs aleatórias. Para URL fixa, use:
- Ngrok pago com domínio customizado
- Ou atualize `.env.local` toda vez que reiniciar o ngrok

### Verificar se está funcionando

Teste a API diretamente:
```
https://abc123.ngrok.io/api/health
```

## 📝 Exemplo Completo

```bash
# Terminal 1: Backend
cd BACKEND
npm run dev

# Terminal 2: Ngrok Backend
ngrok http 5000
# Copie a URL: https://abc123.ngrok.io

# Terminal 3: Configure Frontend
cd frontend
echo "NEXT_PUBLIC_API_URL=https://abc123.ngrok.io/api" > .env.local

# Terminal 4: Frontend
npm run dev

# Terminal 5: Ngrok Frontend (opcional)
ngrok http 3000
# Acesse no celular: https://xyz789.ngrok.io
```

## 🚀 Para Produção

Não use ngrok em produção! Configure:

```env
NEXT_PUBLIC_API_URL=https://api.seudominio.com/api
```
