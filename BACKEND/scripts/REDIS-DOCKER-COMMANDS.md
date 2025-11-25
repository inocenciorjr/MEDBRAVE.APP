# 🐳 Comandos Redis no Docker - Guia Completo

## 🔍 Ver TODOS os Jobs Existentes

### 1. Entrar no Redis CLI
```bash
docker exec -it redis redis-cli
```

### 2. Listar TODAS as keys da queue
```redis
KEYS bull:scraper-jobs:*
```

### 3. Ver quantos jobs existem (por tipo)
```redis
# Jobs aguardando
LLEN bull:scraper-jobs:wait

# Jobs ativos
LLEN bull:scraper-jobs:active

# Jobs completados
ZCARD bull:scraper-jobs:completed

# Jobs falhados
ZCARD bull:scraper-jobs:failed

# Jobs atrasados
ZCARD bull:scraper-jobs:delayed

# Jobs pausados
LLEN bull:scraper-jobs:paused
```

### 4. Ver detalhes de um job específico
```redis
# Listar IDs dos jobs aguardando
LRANGE bull:scraper-jobs:wait 0 -1

# Ver dados de um job específico (substitua JOB_ID)
HGETALL bull:scraper-jobs:JOB_ID

# Ver apenas o status
HGET bull:scraper-jobs:JOB_ID state
```

### 5. Ver TODOS os dados de forma organizada
```redis
# Total de keys
DBSIZE

# Ver todas as keys com padrão
SCAN 0 MATCH bull:scraper-jobs:* COUNT 100

# Ver info do Redis
INFO keyspace
```

---

## 🗑️ LIMPAR TUDO (Comando Único)

### Opção 1: Comando Completo (Copie e Cole)
```bash
docker exec -it redis redis-cli EVAL "local keys = redis.call('keys', 'bull:scraper-jobs:*') for i=1,#keys,5000 do redis.call('del', unpack(keys, i, math.min(i+4999, #keys))) end return keys" 0
```

### Opção 2: Dentro do Redis CLI
```bash
# 1. Entrar no Redis
docker exec -it redis redis-cli

# 2. Executar comando de limpeza
EVAL "local keys = redis.call('keys', 'bull:scraper-jobs:*') for i=1,#keys,5000 do redis.call('del', unpack(keys, i, math.min(i+4999, #keys))) end return keys" 0

# 3. Verificar se limpou
KEYS bull:scraper-jobs:*

# 4. Sair
exit
```

### Opção 3: Limpar TUDO do Redis (CUIDADO!)
```bash
docker exec -it redis redis-cli FLUSHALL
```
⚠️ **ATENÇÃO**: Isso remove TODOS os dados do Redis, não apenas os jobs!

---

## 📊 Comandos Úteis para Investigação

### Ver estrutura completa da queue
```redis
# Entrar no Redis
docker exec -it redis redis-cli

# Ver todas as listas
KEYS bull:scraper-jobs:*:*

# Ver jobs por estado
SMEMBERS bull:scraper-jobs:wait
SMEMBERS bull:scraper-jobs:active
ZRANGE bull:scraper-jobs:completed 0 -1
ZRANGE bull:scraper-jobs:failed 0 -1

# Ver metadados da queue
HGETALL bull:scraper-jobs:meta

# Ver eventos
XLEN bull:scraper-jobs:events
XRANGE bull:scraper-jobs:events - + COUNT 10
```

### Ver job específico em detalhes
```redis
# Substituir JOB_ID pelo ID real
HGETALL bull:scraper-jobs:JOB_ID

# Ver apenas campos específicos
HGET bull:scraper-jobs:JOB_ID data
HGET bull:scraper-jobs:JOB_ID progress
HGET bull:scraper-jobs:JOB_ID returnvalue
HGET bull:scraper-jobs:JOB_ID failedReason
```

### Buscar jobs por padrão
```redis
# Buscar jobs com ID específico
KEYS bull:scraper-jobs:*1234*

# Ver jobs de um usuário específico (se tiver no data)
SCAN 0 MATCH bull:scraper-jobs:* COUNT 1000
```

---

## 🎯 Comandos Práticos (Copy & Paste)

### Ver resumo completo
```bash
docker exec -it redis redis-cli << 'EOF'
echo "=== RESUMO DOS JOBS ==="
echo ""
echo "Jobs Aguardando:"
LLEN bull:scraper-jobs:wait
echo ""
echo "Jobs Ativos:"
LLEN bull:scraper-jobs:active
echo ""
echo "Jobs Completados:"
ZCARD bull:scraper-jobs:completed
echo ""
echo "Jobs Falhados:"
ZCARD bull:scraper-jobs:failed
echo ""
echo "Jobs Atrasados:"
ZCARD bull:scraper-jobs:delayed
echo ""
echo "Jobs Pausados:"
LLEN bull:scraper-jobs:paused
echo ""
echo "Total de Keys:"
KEYS bull:scraper-jobs:* | wc -l
EOF
```

### Limpar apenas jobs completados
```bash
docker exec -it redis redis-cli DEL bull:scraper-jobs:completed
```

### Limpar apenas jobs falhados
```bash
docker exec -it redis redis-cli DEL bull:scraper-jobs:failed
```

### Limpar jobs aguardando
```bash
docker exec -it redis redis-cli DEL bull:scraper-jobs:wait
```

### Limpar jobs ativos (forçar)
```bash
docker exec -it redis redis-cli DEL bull:scraper-jobs:active
```

---

## 🔧 Troubleshooting

### Jobs não aparecem mas o frontend mostra

**Problema**: Dados em cache ou dessincronia

**Solução**:
```bash
# 1. Ver TODAS as keys do Redis
docker exec -it redis redis-cli KEYS "*"

# 2. Procurar por outras queues
docker exec -it redis redis-cli KEYS "bull:*"

# 3. Ver se tem dados em outro namespace
docker exec -it redis redis-cli KEYS "*job*"
```

### Jobs aparecem mas não são removidos

**Problema**: Jobs podem estar em múltiplos estados

**Solução**: Remover TODAS as keys relacionadas
```bash
docker exec -it redis redis-cli EVAL "local keys = redis.call('keys', 'bull:*') for i=1,#keys,5000 do redis.call('del', unpack(keys, i, math.min(i+4999, #keys))) end return keys" 0
```

### Redis não responde

**Problema**: Container pode estar travado

**Solução**:
```bash
# Reiniciar Redis
docker restart redis

# Ver logs
docker logs redis --tail 50

# Verificar se está rodando
docker ps | grep redis
```

---

## 📝 Script Completo para Investigação

Copie e cole no terminal:

```bash
echo "🔍 INVESTIGAÇÃO COMPLETA DO REDIS"
echo "=================================="
echo ""

echo "📊 Status do Container:"
docker ps | grep redis
echo ""

echo "📦 Total de Keys no Redis:"
docker exec -it redis redis-cli DBSIZE
echo ""

echo "🎯 Keys da Queue:"
docker exec -it redis redis-cli KEYS "bull:scraper-jobs:*" | head -20
echo ""

echo "📈 Contagem por Estado:"
echo "  Aguardando: $(docker exec -it redis redis-cli LLEN bull:scraper-jobs:wait)"
echo "  Ativos: $(docker exec -it redis redis-cli LLEN bull:scraper-jobs:active)"
echo "  Completados: $(docker exec -it redis redis-cli ZCARD bull:scraper-jobs:completed)"
echo "  Falhados: $(docker exec -it redis redis-cli ZCARD bull:scraper-jobs:failed)"
echo "  Atrasados: $(docker exec -it redis redis-cli ZCARD bull:scraper-jobs:delayed)"
echo "  Pausados: $(docker exec -it redis redis-cli LLEN bull:scraper-jobs:paused)"
echo ""

echo "🔍 Primeiros 5 Jobs Aguardando:"
docker exec -it redis redis-cli LRANGE bull:scraper-jobs:wait 0 4
echo ""

echo "✅ Investigação completa!"
```

---

## 🚀 Comando DEFINITIVO para Limpar Tudo

**Use este comando quando nada mais funcionar:**

```bash
docker exec -it redis redis-cli << 'EOF'
EVAL "local keys = redis.call('keys', 'bull:*') for i=1,#keys,5000 do redis.call('del', unpack(keys, i, math.min(i+4999, #keys))) end return keys" 0
KEYS bull:*
DBSIZE
EOF
```

Este comando:
1. Remove TODAS as keys do BullMQ (bull:*)
2. Verifica se ainda existem keys
3. Mostra total de keys no Redis

---

## 💡 Dicas Importantes

1. **Sempre verifique antes de limpar**: Use `KEYS bull:scraper-jobs:*` primeiro
2. **Jobs ativos podem reaparecer**: Se o worker estiver rodando, pode recriar jobs
3. **Reinicie o backend após limpar**: Para garantir sincronia
4. **Use FLUSHALL com cuidado**: Remove TUDO do Redis, não apenas jobs
5. **Logs do Redis**: `docker logs redis` para ver o que está acontecendo

---

## 🎓 Entendendo a Estrutura

```
bull:scraper-jobs:wait          → Lista de jobs aguardando
bull:scraper-jobs:active        → Lista de jobs em execução
bull:scraper-jobs:completed     → Set ordenado de jobs completados
bull:scraper-jobs:failed        → Set ordenado de jobs falhados
bull:scraper-jobs:delayed       → Set ordenado de jobs atrasados
bull:scraper-jobs:paused        → Lista de jobs pausados
bull:scraper-jobs:meta          → Metadados da queue
bull:scraper-jobs:events        → Stream de eventos
bull:scraper-jobs:JOB_ID        → Hash com dados do job específico
bull:scraper-jobs:JOB_ID:logs   → Logs do job específico
```

Cada job tem um ID único e seus dados são armazenados em um hash Redis.
