# 🐳 Redis Manager - Interface Interativa
# Gerenciar jobs do BullMQ diretamente no Docker Redis

function Show-Menu {
    Clear-Host
    Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║     🐳 REDIS MANAGER - BULLMQ        ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📊 VISUALIZAR:" -ForegroundColor Yellow
    Write-Host "  1. Ver resumo de todos os jobs"
    Write-Host "  2. Ver jobs aguardando (waiting)"
    Write-Host "  3. Ver jobs ativos (active)"
    Write-Host "  4. Ver jobs completados (completed)"
    Write-Host "  5. Ver jobs falhados (failed)"
    Write-Host "  6. Ver TODAS as keys do Redis"
    Write-Host ""
    Write-Host "🗑️  LIMPAR:" -ForegroundColor Red
    Write-Host "  7. Limpar TODOS os jobs (RECOMENDADO)"
    Write-Host "  8. Limpar apenas jobs completados"
    Write-Host "  9. Limpar apenas jobs falhados"
    Write-Host "  10. Limpar jobs aguardando"
    Write-Host "  11. LIMPAR TUDO DO REDIS (CUIDADO!)"
    Write-Host ""
    Write-Host "🔧 OUTROS:" -ForegroundColor Green
    Write-Host "  12. Entrar no Redis CLI"
    Write-Host "  13. Ver logs do Redis"
    Write-Host "  14. Reiniciar Redis"
    Write-Host ""
    Write-Host "  0. Sair"
    Write-Host ""
}

function Get-JobCounts {
    Write-Host "📊 Contando jobs..." -ForegroundColor Yellow
    
    $waiting = docker exec redis redis-cli LLEN "bull:scraper-jobs:wait" 2>$null
    $active = docker exec redis redis-cli LLEN "bull:scraper-jobs:active" 2>$null
    $completed = docker exec redis redis-cli ZCARD "bull:scraper-jobs:completed" 2>$null
    $failed = docker exec redis redis-cli ZCARD "bull:scraper-jobs:failed" 2>$null
    $delayed = docker exec redis redis-cli ZCARD "bull:scraper-jobs:delayed" 2>$null
    $paused = docker exec redis redis-cli LLEN "bull:scraper-jobs:paused" 2>$null
    
    Write-Host ""
    Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║         RESUMO DOS JOBS                ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  ⏳ Aguardando:  $waiting" -ForegroundColor White
    Write-Host "  🔄 Ativos:      $active" -ForegroundColor Blue
    Write-Host "  ✅ Completados: $completed" -ForegroundColor Green
    Write-Host "  ❌ Falhados:    $failed" -ForegroundColor Red
    Write-Host "  ⏰ Atrasados:   $delayed" -ForegroundColor Yellow
    Write-Host "  ⏸️  Pausados:    $paused" -ForegroundColor Gray
    Write-Host ""
    
    $total = [int]$waiting + [int]$active + [int]$completed + [int]$failed + [int]$delayed + [int]$paused
    Write-Host "  📦 TOTAL:       $total" -ForegroundColor Cyan
    Write-Host ""
}

function Show-WaitingJobs {
    Write-Host "⏳ Jobs Aguardando:" -ForegroundColor Yellow
    docker exec redis redis-cli LRANGE "bull:scraper-jobs:wait" 0 -1
    Write-Host ""
}

function Show-ActiveJobs {
    Write-Host "🔄 Jobs Ativos:" -ForegroundColor Blue
    docker exec redis redis-cli LRANGE "bull:scraper-jobs:active" 0 -1
    Write-Host ""
}

function Show-CompletedJobs {
    Write-Host "✅ Jobs Completados (últimos 20):" -ForegroundColor Green
    docker exec redis redis-cli ZRANGE "bull:scraper-jobs:completed" 0 19
    Write-Host ""
}

function Show-FailedJobs {
    Write-Host "❌ Jobs Falhados (últimos 20):" -ForegroundColor Red
    docker exec redis redis-cli ZRANGE "bull:scraper-jobs:failed" 0 19
    Write-Host ""
}

function Show-AllKeys {
    Write-Host "🔑 Todas as Keys do Redis:" -ForegroundColor Yellow
    docker exec redis redis-cli KEYS "*"
    Write-Host ""
    
    $dbsize = docker exec redis redis-cli DBSIZE
    Write-Host "Total de keys: $dbsize" -ForegroundColor Cyan
    Write-Host ""
}

function Clear-AllJobs {
    Write-Host ""
    Write-Host "⚠️  ATENÇÃO: Isso vai remover TODOS os jobs!" -ForegroundColor Red
    Write-Host ""
    $confirm = Read-Host "Tem certeza? (digite SIM para confirmar)"
    
    if ($confirm -eq "SIM") {
        Write-Host ""
        Write-Host "🗑️  Removendo todos os jobs..." -ForegroundColor Yellow
        
        docker exec redis redis-cli EVAL "local keys = redis.call('keys', 'bull:scraper-jobs:*') for i=1,#keys,5000 do redis.call('del', unpack(keys, i, math.min(i+4999, #keys))) end return keys" 0 | Out-Null
        
        Write-Host "✅ Todos os jobs foram removidos!" -ForegroundColor Green
        Write-Host ""
        
        # Verificar
        $remaining = docker exec redis redis-cli KEYS "bull:scraper-jobs:*"
        if ([string]::IsNullOrWhiteSpace($remaining)) {
            Write-Host "✨ Queue completamente limpa!" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Ainda restam algumas keys:" -ForegroundColor Yellow
            Write-Host $remaining
        }
    } else {
        Write-Host "❌ Operação cancelada." -ForegroundColor Yellow
    }
    Write-Host ""
}

function Clear-CompletedJobs {
    Write-Host "🗑️  Removendo jobs completados..." -ForegroundColor Yellow
    docker exec redis redis-cli DEL "bull:scraper-jobs:completed" | Out-Null
    Write-Host "✅ Jobs completados removidos!" -ForegroundColor Green
    Write-Host ""
}

function Clear-FailedJobs {
    Write-Host "🗑️  Removendo jobs falhados..." -ForegroundColor Yellow
    docker exec redis redis-cli DEL "bull:scraper-jobs:failed" | Out-Null
    Write-Host "✅ Jobs falhados removidos!" -ForegroundColor Green
    Write-Host ""
}

function Clear-WaitingJobs {
    Write-Host "🗑️  Removendo jobs aguardando..." -ForegroundColor Yellow
    docker exec redis redis-cli DEL "bull:scraper-jobs:wait" | Out-Null
    Write-Host "✅ Jobs aguardando removidos!" -ForegroundColor Green
    Write-Host ""
}

function Clear-Everything {
    Write-Host ""
    Write-Host "⚠️⚠️⚠️  PERIGO! ⚠️⚠️⚠️" -ForegroundColor Red
    Write-Host "Isso vai remover TODOS os dados do Redis!" -ForegroundColor Red
    Write-Host "Não apenas os jobs, mas TUDO!" -ForegroundColor Red
    Write-Host ""
    $confirm = Read-Host "Tem ABSOLUTA certeza? (digite DELETAR TUDO para confirmar)"
    
    if ($confirm -eq "DELETAR TUDO") {
        Write-Host ""
        Write-Host "🗑️  Removendo TUDO do Redis..." -ForegroundColor Red
        docker exec redis redis-cli FLUSHALL | Out-Null
        Write-Host "✅ Redis completamente limpo!" -ForegroundColor Green
    } else {
        Write-Host "❌ Operação cancelada." -ForegroundColor Yellow
    }
    Write-Host ""
}

function Enter-RedisCLI {
    Write-Host "🔧 Entrando no Redis CLI..." -ForegroundColor Green
    Write-Host "Digite 'exit' para sair" -ForegroundColor Yellow
    Write-Host ""
    docker exec -it redis redis-cli
}

function Show-RedisLogs {
    Write-Host "📋 Logs do Redis (últimas 50 linhas):" -ForegroundColor Yellow
    Write-Host ""
    docker logs redis --tail 50
    Write-Host ""
}

function Restart-Redis {
    Write-Host "🔄 Reiniciando Redis..." -ForegroundColor Yellow
    docker restart redis
    Start-Sleep -Seconds 2
    Write-Host "✅ Redis reiniciado!" -ForegroundColor Green
    Write-Host ""
}

# Loop principal
do {
    Show-Menu
    $choice = Read-Host "Escolha uma opção"
    
    switch ($choice) {
        "1" { Get-JobCounts; Read-Host "Pressione Enter para continuar" }
        "2" { Show-WaitingJobs; Read-Host "Pressione Enter para continuar" }
        "3" { Show-ActiveJobs; Read-Host "Pressione Enter para continuar" }
        "4" { Show-CompletedJobs; Read-Host "Pressione Enter para continuar" }
        "5" { Show-FailedJobs; Read-Host "Pressione Enter para continuar" }
        "6" { Show-AllKeys; Read-Host "Pressione Enter para continuar" }
        "7" { Clear-AllJobs; Read-Host "Pressione Enter para continuar" }
        "8" { Clear-CompletedJobs; Read-Host "Pressione Enter para continuar" }
        "9" { Clear-FailedJobs; Read-Host "Pressione Enter para continuar" }
        "10" { Clear-WaitingJobs; Read-Host "Pressione Enter para continuar" }
        "11" { Clear-Everything; Read-Host "Pressione Enter para continuar" }
        "12" { Enter-RedisCLI }
        "13" { Show-RedisLogs; Read-Host "Pressione Enter para continuar" }
        "14" { Restart-Redis; Read-Host "Pressione Enter para continuar" }
        "0" { Write-Host "👋 Até logo!" -ForegroundColor Cyan; break }
        default { Write-Host "❌ Opção inválida!" -ForegroundColor Red; Start-Sleep -Seconds 1 }
    }
} while ($choice -ne "0")
