# 🚀 Deploy MEDBRAVE no Oracle Cloud Free Tier

## 💰 Oracle Cloud Free Tier - O que você ganha GRÁTIS:

- ✅ **2 VMs AMD** (1/8 OCPU, 1 GB RAM cada) - SEMPRE GRÁTIS
- ✅ **4 VMs ARM Ampere** (até 24 GB RAM total) - SEMPRE GRÁTIS
- ✅ **200 GB Block Storage** - SEMPRE GRÁTIS
- ✅ **10 GB Object Storage** - SEMPRE GRÁTIS
- ✅ **Autonomous Database** (2 instâncias, 20 GB cada) - SEMPRE GRÁTIS
- ✅ **Load Balancer** (10 Mbps) - SEMPRE GRÁTIS

---

## 📋 Arquitetura Recomendada

```
┌─────────────────────────────────────────────┐
│  Oracle Cloud Free Tier                     │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐      ┌──────────────┐   │
│  │   VM ARM     │      │   VM ARM     │   │
│  │  (Frontend)  │      │  (Backend)   │   │
│  │  Next.js     │◄────►│  Node.js     │   │
│  │  12 GB RAM   │      │  12 GB RAM   │   │
│  └──────────────┘      └──────────────┘   │
│         │                      │           │
│         │                      ▼           │
│         │              ┌──────────────┐   │
│         │              │    Redis     │   │
│         │              │  (Container) │   │
│         │              └──────────────┘   │
│         │                                  │
│         ▼                                  │
│  ┌──────────────────────────────────────┐ │
│  │     Load Balancer (10 Mbps)         │ │
│  └──────────────────────────────────────┘ │
│                                             │
└─────────────────────────────────────────────┘
         │
         ▼
   ┌──────────────┐
   │   Supabase   │ (já configurado)
   └──────────────┘
```

---

## 🎯 Passo a Passo Completo

### 1️⃣ Criar Conta Oracle Cloud (5 minutos)

1. Acesse: https://www.oracle.com/cloud/free/
2. Clique em "Start for free"
3. Preencha dados (precisa de cartão, mas não será cobrado)
4. Escolha região: **Brazil East (São Paulo)** 🇧🇷
5. Aguarde aprovação (geralmente instantâneo)

---

### 2️⃣ Criar VM para Backend (10 minutos)

#### A. Criar Instância Compute

1. No console Oracle, vá em: **Compute** → **Instances**
2. Clique em **Create Instance**
3. Configure:

```yaml
Nome: medbrave-backend
Image: Ubuntu 22.04
Shape: 
  - Clique em "Change Shape"
  - Selecione "Ampere" (ARM)
  - Configure: 2 OCPUs, 12 GB RAM
Networking:
  - Crie nova VCN ou use existente
  - Assign public IP: Yes
SSH Keys:
  - Generate SSH key pair (SALVE O ARQUIVO!)
Boot Volume: 50 GB
```

4. Clique em **Create**
5. Aguarde status "Running"
6. **Copie o IP público** (ex: 150.230.45.67)

#### B. Configurar Firewall

1. Na instância, vá em **Subnet** → **Security List**
2. Adicione **Ingress Rules**:

```
Source: 0.0.0.0/0
Protocol: TCP
Port: 22 (SSH)

Source: 0.0.0.0/0
Protocol: TCP
Port: 3001 (Backend API)

Source: 0.0.0.0/0
Protocol: TCP
Port: 80 (HTTP)

Source: 0.0.0.0/0
Protocol: TCP
Port: 443 (HTTPS)
```

#### C. Conectar via SSH

**Windows (PowerShell):**
```powershell
ssh -i caminho\para\sua-chave.key ubuntu@150.230.45.67
```

**Ou use PuTTY** (converter chave para .ppk primeiro)

---

### 3️⃣ Instalar Backend na VM (15 minutos)

Conectado via SSH, execute:

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PM2 (gerenciador de processos)
sudo npm install -g pm2

# Instalar Git
sudo apt install -y git

# Clonar repositório
cd /home/ubuntu
git clone https://github.com/inocenciorjr/MEDBRAVE.APP.git
cd MEDBRAVE.APP/BACKEND

# Instalar dependências
npm install

# Criar arquivo .env
nano .env
```

**Cole suas variáveis de ambiente** (copie do seu `.env` local):

```env
PORT=3001
NODE_ENV=production

# URLs
API_URL=http://150.230.45.67:3001
FRONTEND_URL=http://150.230.45.68:3000

# Supabase
SUPABASE_URL=https://yqlfgazngdymiprsrwvf.supabase.co
SUPABASE_ANON_KEY=seu_anon_key
SUPABASE_SERVICE_ROLE_KEY=seu_service_role_key

# Database
DATABASE_URL=postgresql://postgres.yqlfgazngdymiprsrwvf:qh2cX0xoyCzftrzB@aws-0-sa-east-1.pooler.supabase.com:6543/postgres

# Redis (vamos instalar localmente)
REDIS_HOST=localhost
REDIS_PORT=6379

# Resto das variáveis...
```

Salve: `Ctrl+X`, `Y`, `Enter`

```bash
# Instalar Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Build do backend
npm run build

# Iniciar com PM2
pm2 start dist/server.js --name medbrave-backend
pm2 save
pm2 startup

# Verificar se está rodando
pm2 status
curl http://localhost:3001/health
```

---

### 4️⃣ Criar VM para Frontend (10 minutos)

Repita o processo da VM do Backend, mas com estas diferenças:

```yaml
Nome: medbrave-frontend
Shape: Ampere 2 OCPUs, 12 GB RAM
Port: 3000 (ao invés de 3001)
```

Após conectar via SSH:

```bash
# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

# Instalar PM2
sudo npm install -g pm2

# Clonar repositório
cd /home/ubuntu
git clone https://github.com/inocenciorjr/MEDBRAVE.APP.git
cd MEDBRAVE.APP/frontend

# Instalar dependências
npm install

# Criar .env.local
nano .env.local
```

**Cole as variáveis do frontend:**

```env
NEXT_PUBLIC_SUPABASE_URL=https://yqlfgazngdymiprsrwvf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=seu_anon_key
NEXT_PUBLIC_API_URL=http://150.230.45.67:3001/api
NEXT_PUBLIC_BACKEND_URL=http://150.230.45.67:3001
NEXT_PUBLIC_STORAGE_BUCKET=medbrave-storage
```

```bash
# Build do frontend
npm run build

# Iniciar com PM2
pm2 start npm --name medbrave-frontend -- start
pm2 save
pm2 startup

# Verificar
pm2 status
```

---

### 5️⃣ Configurar Nginx (Opcional mas Recomendado)

Em ambas as VMs, instale Nginx para proxy reverso:

**Backend VM:**
```bash
sudo apt install -y nginx

# Configurar Nginx
sudo nano /etc/nginx/sites-available/medbrave-backend
```

Cole:
```nginx
server {
    listen 80;
    server_name 150.230.45.67;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/medbrave-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**Frontend VM:** (mesmo processo, porta 3000)

---

### 6️⃣ Configurar Domínio (Opcional)

Se você tem um domínio (ex: medbrave.com.br):

1. No seu provedor de DNS, adicione:
```
A    api.medbrave.com.br    → 150.230.45.67 (Backend IP)
A    app.medbrave.com.br    → 150.230.45.68 (Frontend IP)
```

2. Instale SSL com Let's Encrypt:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.medbrave.com.br
```

---

## ✅ Checklist Final

- [ ] VM Backend criada e rodando
- [ ] VM Frontend criada e rodando
- [ ] Redis instalado no backend
- [ ] PM2 configurado em ambas VMs
- [ ] Firewall configurado (portas abertas)
- [ ] Nginx instalado (opcional)
- [ ] SSL configurado (opcional)
- [ ] Teste de login funcionando
- [ ] Teste de upload funcionando

---

## 🔧 Comandos Úteis

### Gerenciar Aplicações (PM2)
```bash
pm2 status              # Ver status
pm2 logs                # Ver logs
pm2 restart all         # Reiniciar tudo
pm2 stop all            # Parar tudo
pm2 delete all          # Remover tudo
```

### Atualizar Código
```bash
cd /home/ubuntu/MEDBRAVE.APP
git pull
cd BACKEND
npm install
npm run build
pm2 restart medbrave-backend
```

### Ver Logs
```bash
pm2 logs medbrave-backend --lines 100
pm2 logs medbrave-frontend --lines 100
```

### Monitorar Recursos
```bash
htop                    # CPU e RAM
df -h                   # Disco
pm2 monit              # Monitor PM2
```

---

## 🆘 Troubleshooting

### Backend não inicia:
```bash
pm2 logs medbrave-backend
# Verifique erros de variáveis de ambiente
```

### Porta já em uso:
```bash
sudo lsof -i :3001
sudo kill -9 PID
```

### Sem memória:
```bash
free -h
# Considere adicionar swap:
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Firewall bloqueando:
```bash
# Ubuntu firewall
sudo ufw allow 3001
sudo ufw allow 3000
sudo ufw status
```

---

## 💰 Custos

**TUDO GRÁTIS!** 🎉

O Oracle Cloud Free Tier é permanentemente gratuito para:
- 2 VMs ARM (até 24 GB RAM total)
- 200 GB storage
- 10 TB transferência/mês

---

## 🚀 Próximos Passos

1. **Monitoramento**: Configure alertas no Oracle Cloud
2. **Backup**: Configure snapshots automáticos
3. **CI/CD**: Configure deploy automático com GitHub Actions
4. **CDN**: Use Oracle CDN para assets estáticos
5. **Database**: Migre para Oracle Autonomous Database (também grátis!)

---

## 📚 Recursos

- [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
- [Documentação Oracle Cloud](https://docs.oracle.com/en-us/iaas/Content/home.htm)
- [PM2 Documentation](https://pm2.keymetrics.io/)

---

**Tempo estimado total**: 45 minutos ⏱️
**Custo**: R$ 0,00 💰
