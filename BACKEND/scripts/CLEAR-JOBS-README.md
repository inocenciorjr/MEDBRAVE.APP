# 🧹 Scripts para Limpar Jobs do Redis/BullMQ

## 📋 Opções Disponíveis

### 1. Script Node.js (Recomendado) ✅

**Mais seguro e com feedback detalhado**

```bash
node scripts/clear-all-jobs.js
```

**O que faz:**
- ✅ Mostra quantos jobs existem em cada estado
- ✅ Remove jobs de forma organizada
- ✅ Confirma a limpeza
- ✅ Funciona em qualquer sistema operacional

**Saída esperada:**
```
🧹 Iniciando limpeza de jobs...

📡 Redis: localhost:6379
📦 Queue: scraper-jobs

🔍 Verificando jobs existentes...

📊 Jobs encontrados:
   ⏳ Waiting:   5
   🔄 Active:    2
   ✅ Completed: 10
   ❌ Failed:    3
   ⏰ Delayed:   0
   ⏸️  Paused:    0
   📦 Total:     20

🗑️  Removendo jobs...

   ✅ Removidos 5 jobs waiting
   ✅ Cancelados 2 jobs active
   ✅ Removidos 10 jobs completed
   ✅ Removidos 3 jobs failed

✨ Limpeza concluída! 20 jobs removidos.

✅ Queue completamente limpa!
```

---

### 2. Comando Redis Direto (Mais Rápido) ⚡

**Remove TUDO instantaneamente**

#### Windows (PowerShell):
```powershell
.\scripts\redis-clear-all.ps1
```

#### Linux/Mac (Bash):
```bash
chmod +x scripts/redis-clear-all.sh
./scripts/redis-clear-all.sh
```

#### Comando Manual (qualquer sistema):
```bash
docker exec -it redis redis-cli EVAL "local keys = redis.call('keys', 'bull:scraper-jobs:*') for i=1,#keys,5000 do redis.call('del', unpack(keys, i, math.min(i+4999, #keys))) end return keys" 0
```

**O que faz:**
- ⚡ Remove TODAS as keys do BullMQ instantaneamente
- ⚠️  Não pede confirmação
- ⚠️  Não mostra detalhes dos jobs

---

### 3. Comandos Redis Individuais

Se quiser mais controle, use comandos Redis diretamente:

```bash
# Entrar no Redis CLI
docker exec -it redis redis-cli

# Listar todas as keys da queue
KEYS bull:scraper-jobs:*

# Ver quantas keys existem
EVAL "return #redis.call('keys', 'bull:scraper-jobs:*')" 0

# Deletar todas as keys da queue
EVAL "local keys = redis.call('keys', 'bull:scraper-jobs:*') for i=1,#keys,5000 do redis.call('del', unpack(keys, i, math.min(i+4999, #keys))) end return keys" 0

# Verificar se limpou
KEYS bull:scraper-jobs:*

# Sair
exit
```

---

## 🎯 Quando Usar Cada Opção

### Use o Script Node.js quando:
- ✅ Quer ver detalhes dos jobs antes de remover
- ✅ Quer confirmação do que foi removido
- ✅ Está debugando problemas
- ✅ Quer um log do que aconteceu

### Use o Comando Redis Direto quando:
- ⚡ Precisa limpar TUDO rapidamente
- ⚡ Tem certeza que quer remover tudo
- ⚡ Está em emergência (jobs travados)
- ⚡ Não precisa de detalhes

---

## ⚠️ ATENÇÃO

**Esses scripts removem TODOS os jobs permanentemente!**

- ❌ Não há como desfazer
- ❌ Jobs em execução serão cancelados
- ❌ Histórico será perdido
- ❌ Dados não serão recuperáveis

**Use com cuidado!**

---

## 🔧 Troubleshooting

### Erro: "Cannot connect to Redis"

```bash
# Verificar se o Redis está rodando
docker ps | grep redis

# Iniciar Redis se não estiver rodando
docker start redis
```

### Erro: "Queue not found"

O nome da queue pode estar diferente. Verifique em:
- `BACKEND/src/services/jobQueueService.ts`
- Procure por `new Queue('nome-da-queue')`

### Jobs não são removidos

Execute o script Node.js novamente:
```bash
node scripts/clear-all-jobs.js
```

Se ainda não funcionar, use o comando Redis direto.

---

## 📝 Logs

Os scripts criam logs em:
- Console (stdout)
- Não salvam em arquivo (por segurança)

Se precisar salvar logs:
```bash
node scripts/clear-all-jobs.js > cleanup-log.txt 2>&1
```

---

## 🚀 Exemplo de Uso Completo

```bash
# 1. Ver quantos jobs existem
node scripts/clear-all-jobs.js

# 2. Se quiser limpar, execute novamente
# (o script já limpa na primeira execução)

# 3. Verificar se limpou
docker exec -it redis redis-cli KEYS "bull:scraper-jobs:*"

# Deve retornar: (empty array)
```

---

## 💡 Dicas

1. **Antes de limpar**: Verifique se não há jobs importantes rodando
2. **Após limpar**: Reinicie o backend para garantir que tudo está sincronizado
3. **Em produção**: Use com MUITO cuidado! Considere pausar jobs ao invés de remover
4. **Backup**: Não há backup automático. Se precisar, faça dump do Redis antes

---

## 🔗 Links Úteis

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Redis Commands](https://redis.io/commands/)
- [Docker Redis](https://hub.docker.com/_/redis)
