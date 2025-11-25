# Script para baixar e executar Redis no Windows
$redisUrl = "https://github.com/tporadowski/redis/releases/download/v5.0.14.1/Redis-x64-5.0.14.1.zip"
$redisZip = "redis.zip"
$redisDir = "redis-windows"

Write-Host "Baixando Redis para Windows..." -ForegroundColor Green
Invoke-WebRequest -Uri $redisUrl -OutFile $redisZip

Write-Host "Extraindo Redis..." -ForegroundColor Green
Expand-Archive -Path $redisZip -DestinationPath $redisDir -Force

Write-Host "Iniciando Redis..." -ForegroundColor Green
Set-Location $redisDir\Redis-x64-5.0.14.1
Start-Process -FilePath ".\redis-server.exe" -ArgumentList "redis.windows.conf" -NoNewWindow

Write-Host "Redis iniciado com sucesso na porta 6379!" -ForegroundColor Green
Write-Host "Para parar o Redis, feche esta janela ou pressione Ctrl+C" -ForegroundColor Yellow
