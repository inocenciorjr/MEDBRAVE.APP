const fs = require('fs');
const path = require('path');

function fixMonitoringController() {
  const filePath = path.join(__dirname, '..', 'BACKEND', 'src', 'controllers', 'MonitoringController.ts');
  
  if (!fs.existsSync(filePath)) {
    console.log('MonitoringController.ts não encontrado');
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove duplicações de cabeçalho
    const headerPattern = /^\/\*\*[\s\S]*?\*\//gm;
    const headers = content.match(headerPattern);
    if (headers && headers.length > 1) {
      content = headers[0] + content.replace(headerPattern, '').trim();
    }
    
    // Corrige variáveis quebradas
    content = content.replace(/:(\d+)user_id/g, ':userId');
    
    // Remove linhas duplicadas consecutivas
    const lines = content.split('\n');
    const uniqueLines = [];
    let prevLine = '';
    
    for (const line of lines) {
      if (line.trim() !== prevLine.trim() || line.trim() === '') {
        uniqueLines.push(line);
      }
      prevLine = line;
    }
    
    content = uniqueLines.join('\n');
    
    // Faz backup
    const backupPath = filePath + '.backup';
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(filePath, backupPath);
    }
    
    fs.writeFileSync(filePath, content);
    console.log('✅ MonitoringController.ts corrigido com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao corrigir MonitoringController.ts:', error.message);
  }
}

function fixAuthController() {
  const filePath = path.join(__dirname, '..', 'BACKEND', 'src', 'domain', 'auth', 'controllers', 'AuthController.ts');
  
  if (!fs.existsSync(filePath)) {
    console.log('AuthController.ts não encontrado');
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove duplicações de cabeçalho
    const headerPattern = /^\/\*\*[\s\S]*?\*\//gm;
    const headers = content.match(headerPattern);
    if (headers && headers.length > 1) {
      content = headers[0] + content.replace(headerPattern, '').trim();
    }
    
    // Corrige imports quebrados
    content = content.replace(/import\s*{[^}]*}\s*from\s*[^;]*$/gm, (match) => match + ';');
    
    // Corrige variáveis quebradas
    content = content.replace(/if\s*\(!\s*(\d+)([a-zA-Z_])/g, 'if (!$2');
    content = content.replace(/\b(\d+)(user_id)\b/g, '$2');
    
    // Remove linhas duplicadas consecutivas
    const lines = content.split('\n');
    const uniqueLines = [];
    let prevLine = '';
    
    for (const line of lines) {
      if (line.trim() !== prevLine.trim() || line.trim() === '') {
        uniqueLines.push(line);
      }
      prevLine = line;
    }
    
    content = uniqueLines.join('\n');
    
    // Faz backup
    const backupPath = filePath + '.backup';
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(filePath, backupPath);
    }
    
    fs.writeFileSync(filePath, content);
    console.log('✅ AuthController.ts corrigido com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao corrigir AuthController.ts:', error.message);
  }
}

function main() {
  console.log('Iniciando correção de arquivos corrompidos...\n');
  
  fixMonitoringController();
  fixAuthController();
  
  console.log('\nCorreção concluída. Arquivos de backup criados com extensão .backup');
}

if (require.main === module) {
  main();
}