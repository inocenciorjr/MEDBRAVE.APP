# ⚡ Comandos Rápidos - Cheat Sheet

## 🐳 Docker & Redis

### Verificar Status
```powershell
# Ver se Redis está rodando
docker ps | Select-String redis

# Ver todos os containers (incluindo parados)
docker ps -a
```

### Controlar Redis
```powershell
# Iniciar Redis
docker start redis-medbrave

# Parar Redis
docker stop redis-medbrave

# Reiniciar Redis
docker restart redis-medbrave

# Ver logs do Redis
docker logs redis-medbrave

# Ver logs em tempo real
docker logs -f redis-medbrave
```

### Gerenciar Container
```powershell
# Remover container (CUIDADO: apaga dados!)
docker rm -f redis-medbrave

# Recriar container do zero
docker run -d -p 6379:6379 --name redis-medbrave --restart unless-stopped redis:alpine

# Ver uso de recursos
docker stats redis-medbrave
```

---

## 🚀 Backend

### Iniciar/Parar
```powershell
# Iniciar backend (na pasta BACKEND)
npm run dev

# Parar backend
Ctrl + C
```

### Verificar
```powershell
# Ver se backend está rodando
curl http://localhost:5000/api/health

# Ver logs do backend
# (aparecem no terminal onde você rodou npm run dev)
```

---

## 🔍 Scraper CLI (Direto)

### Extrair de uma URL
```powershell
# Na pasta BACKEND
npm run scrape -- --url "https://www.provaderesidencia.com.br/demo/prova-123"

# Com opções
npm run scrape -- --url "URL" --output resultado.json --timeout 300
```

### Opções do Scraper
```
--url          URL da prova (obrigatório)
--output       Arquivo de saída (padrão: questions.json)
--timeout      Timeout em segundos (padrão: 300)
--headless     Rodar sem interface gráfica (padrão: true)
--download-images  Baixar imagens (padrão: true)
```

---

## 🗄️ Redis CLI (Avançado)

### Conectar ao Redis
```powershell
# Entrar no container
docker exec -it redis-medbrave redis-cli
```

### Comandos dentro do Redis
```redis
# Ver todas as chaves
KEYS *

# Ver valor de uma chave
GET chave

# Ver chaves de rate limit
KEYS rate_limit:*

# Ver chaves de jobs
KEYS bull:scraper-batch:*

# Limpar tudo (CUIDADO!)
FLUSHALL

# Sair
exit
```

---

## 📊 Monitoramento

### Ver Jobs no Redis
```powershell
docker exec -it redis-medbrave redis-cli KEYS "bull:scraper-batch:*"
```

### Ver Rate Limits
```powershell
docker exec -it redis-medbrave redis-cli KEYS "rate_limit:*"
```

### Resetar Rate Limit de um Usuário
```powershell
# Substitua USER_ID pelo ID do usuário
docker exec -it redis-medbrave redis-cli DEL "scraper_rate_limit:USER_ID"
```

---

## 🔧 Troubleshooting

### Redis não conecta
```powershell
# 1. Verificar se está rodando
docker ps | Select-String redis

# 2. Se não estiver, iniciar
docker start redis-medbrave

# 3. Ver logs de erro
docker logs redis-medbrave

# 4. Reiniciar
docker restart redis-medbrave
```

### Backend não inicia
```powershell
# 1. Verificar se Redis está rodando
docker ps | Select-String redis

# 2. Verificar porta 5000 livre
netstat -ano | findstr :5000

# 3. Limpar node_modules e reinstalar
cd BACKEND
Remove-Item -Recurse -Force node_modules
npm install
```

### Scraper falha
```powershell
# 1. Testar URL manualmente no navegador
# 2. Ver logs do backend
# 3. Aumentar timeout nas configurações
# 4. Verificar se não é conteúdo premium
```

---

## 🔄 Rotina Diária

### Ao ligar o computador
```powershell
# 1. Docker Desktop inicia automaticamente
# 2. Redis inicia automaticamente
# 3. Você só precisa iniciar o backend:
cd BACKEND
npm run dev
```

### Ao desligar
```powershell
# 1. Parar backend: Ctrl + C
# 2. Docker/Redis podem continuar rodando (não tem problema)
```

---

## 📦 Backup e Restore

### Backup do Redis
```powershell
# Criar snapshot
docker exec redis-medbrave redis-cli BGSAVE

# Copiar arquivo de backup
docker cp redis-medbrave:/data/dump.rdb ./redis-backup.rdb
```

### Restore do Redis
```powershell
# Parar Redis
docker stop redis-medbrave

# Copiar backup
docker cp ./redis-backup.rdb redis-medbrave:/data/dump.rdb

# Iniciar Redis
docker start redis-medbrave
```

---

## 🆘 Emergência - Reset Total

### Se tudo der errado
```powershell
# 1. Parar tudo
docker stop redis-medbrave
# Ctrl + C no backend

# 2. Remover Redis
docker rm -f redis-medbrave

# 3. Recriar Redis
docker run -d -p 6379:6379 --name redis-medbrave --restart unless-stopped redis:alpine

# 4. Reiniciar backend
cd BACKEND
npm run dev
```

---

## 📝 Notas Importantes

- **Redis persiste dados**: Mesmo se você parar o container, os dados ficam salvos
- **Restart automático**: Redis vai iniciar automaticamente com o Docker
- **Porta 6379**: É a porta padrão do Redis, não mude sem necessidade
- **Rate limiting**: Dados de rate limit expiram automaticamente após 1 hora
- **Jobs**: Jobs completados são limpos automaticamente após 7 dias
