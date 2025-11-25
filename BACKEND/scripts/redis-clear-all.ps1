# Script PowerShell para limpar TUDO do Redis relacionado ao BullMQ
# ATENÇÃO: Isso remove TODOS os dados da queue!

Write-Host "🧹 Limpando Redis - BullMQ Queue..." -ForegroundColor Yellow
Write-Host ""

# Comandos Redis
$redisCommands = @"
KEYS bull:scraper-jobs:*
EVAL "local keys = redis.call('keys', 'bull:scraper-jobs:*') for i=1,#keys,5000 do redis.call('del', unpack(keys, i, math.min(i+4999, #keys))) end return keys" 0
KEYS bull:scraper-jobs:*
INFO keyspace
"@

# Executar no Docker
$redisCommands | docker exec -i redis redis-cli

Write-Host ""
Write-Host "✅ Limpeza concluída!" -ForegroundColor Green
Write-Host ""
