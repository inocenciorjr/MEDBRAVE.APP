# 🧹 Redis Jobs Manager

Ferramentas para gerenciar jobs do Redis/BullMQ.

## 🎯 Problema Resolvido

O BullMQ mantém jobs no Redis por períodos longos:
- Jobs **completed**: 7 dias
- Jobs **failed**: 30 dias

Isso causa problemas:
- ❌ Jobs "cancelados" continuam aparecendo (ficam como "failed")
- ❌ Jobs antigos "ressuscitam" quando você cria novos jobs
- ❌ Não há forma fácil de limpar completamente o Redis

## 🛠️ Ferramentas Disponíveis

### 1. Via CLI (Terminal)

```bash
# Listar todos os jobs do Redis
npm run redis:list

# Limpar jobs completed e failed (recomendado)
npm run redis:clean

# Remover apenas jobs failed
npm run redis:remove failed

# Remover apenas jobs completed
npm run redis:remove completed

# NUCLEAR: Remover TODOS os jobs (incluindo ativos!)
npm run redis:obliterate
```

### 2. Via API (HTTP)

```bash
# Listar todos os jobs
GET /api/admin/scraper/jobs/all

# Remover jobs por status
DELETE /api/admin/scraper/jobs/status/failed
DELETE /api/admin/scraper/jobs/status/completed
DELETE /api/admin/scraper/jobs/status/waiting
DELETE /api/admin/scraper/jobs/status/active
DELETE /api/admin/scraper/jobs/status/delayed

# Remover job específico (force)
DELETE /api/admin/scraper/jobs/:jobId/force

# NUCLEAR: Remover TODOS os jobs
DELETE /api/admin/scraper/jobs/obliterate
```

## 📊 Exemplo de Uso

### Cenário 1: Limpar jobs antigos (recomendado)

```bash
# Ver quantos jobs existem
npm run redis:list

# Limpar completed e failed
npm run redis:clean
```

**Resultado:**
```
✅ Completed: Removidos 45/45
❌ Failed: Removidos 12/12
✅ Total removido: 57 jobs
```

### Cenário 2: Remover apenas jobs failed

```bash
npm run redis:remove failed
```

**Resultado:**
```
📊 RESULTADO:
   Encontrados: 12 jobs
   ✅ Removidos: 12
   ❌ Falhas: 0

🗑️  Jobs removidos:
   1. batch-1730934567890-user123
   2. batch-1730934568901-user456
   ...
```

### Cenário 3: NUCLEAR - Limpar tudo

```bash
npm run redis:obliterate
```

**Resultado:**
```
💣 OBLITERANDO TODOS OS JOBS...
⚠️  ATENÇÃO: Isso vai remover TODOS os jobs do Redis!
⚠️  Incluindo jobs ativos e em espera!

Iniciando em 3 segundos... (Ctrl+C para cancelar)

📊 RESULTADO:
   Encontrados: 67 jobs
   ✅ Removidos: 67
   ❌ Falhas: 0

💥 OBLITERAÇÃO COMPLETA!
```

## 🔍 Status dos Jobs

- **completed**: Job finalizado com sucesso
- **failed**: Job falhou ou foi cancelado
- **active**: Job em execução agora
- **waiting**: Job na fila esperando
- **delayed**: Job agendado para depois

## ⚠️ Avisos

1. **Não use `obliterate` com jobs ativos!** Isso vai cancelar extrações em andamento.

2. **`clean` é seguro**: Remove apenas completed e failed (jobs já finalizados).

3. **Jobs "cancelados" ficam como "failed"**: Por isso você precisa limpar manualmente.

4. **Redis persiste jobs**: Mesmo após reiniciar o backend, jobs antigos continuam no Redis.

## 🎯 Recomendação

**Rotina de limpeza:**

```bash
# Toda semana, limpar jobs antigos
npm run redis:clean
```

Ou configure um cron job:

```bash
# Adicionar ao crontab (Linux/Mac)
0 0 * * 0 cd /path/to/backend && npm run redis:clean
```

## 🐛 Troubleshooting

### Jobs continuam aparecendo após cancelar

**Causa**: Jobs cancelados ficam como "failed" no Redis.

**Solução**:
```bash
npm run redis:remove failed
```

### Jobs "ressuscitam" após criar novos

**Causa**: Jobs antigos ainda estão no Redis.

**Solução**:
```bash
npm run redis:clean
```

### Quero começar do zero

**Solução**:
```bash
npm run redis:obliterate
```

## 📝 Logs

Todos os comandos mostram logs detalhados:

```
📊 Listando todos os jobs do Redis...

📈 RESUMO:
   Total: 67 jobs
   ✅ Completed: 45
   ❌ Failed: 12
   🔄 Active: 2
   ⏳ Waiting: 8
   ⏰ Delayed: 0

📋 JOBS:

1. Job batch-1730934567890-user123
   Status: completed
   User: user123
   URLs: 5
   Progress: 5/5
   Created: 11/6/2024, 10:30:00 PM
...
```

## 🔗 Integração com Frontend

Você pode criar botões no frontend para chamar as APIs:

```typescript
// Limpar jobs failed
async function cleanFailedJobs() {
  const response = await fetch('/api/admin/scraper/jobs/status/failed', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const result = await response.json();
  console.log(`Removidos ${result.data.removed} jobs`);
}
```

## 📚 Referências

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Redis Commands](https://redis.io/commands/)
