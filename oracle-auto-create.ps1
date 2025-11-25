# Script para tentar criar VM no Oracle Cloud automaticamente
# Quando houver capacidade disponível

Write-Host "=== Oracle Cloud Auto-Create VM ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este script vai tentar criar a VM repetidamente até conseguir." -ForegroundColor Yellow
Write-Host "Pressione Ctrl+C para parar." -ForegroundColor Yellow
Write-Host ""

$tentativas = 0
$intervalo = 60 # segundos entre tentativas

while ($true) {
    $tentativas++
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    Write-Host "[$timestamp] Tentativa #$tentativas" -ForegroundColor Cyan
    
    # Aqui você usaria a CLI do Oracle Cloud (oci)
    # Por enquanto, apenas mostra instruções
    
    Write-Host "  -> Tentando criar VM..." -ForegroundColor Gray
    Write-Host "  -> Aguardando $intervalo segundos..." -ForegroundColor Gray
    
    Start-Sleep -Seconds $intervalo
}
