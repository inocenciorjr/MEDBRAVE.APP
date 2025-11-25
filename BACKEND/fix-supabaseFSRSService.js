const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'infra', 'srs', 'supabase', 'SupabaseFSRSService.ts');
const backupPath = filePath + '.backup';

console.log('Iniciando correção do SupabaseFSRSService.ts...');

// Criar backup
if (fs.existsSync(filePath)) {
  fs.copyFileSync(filePath, backupPath);
  console.log('Backup criado:', backupPath);
}

// Ler arquivo
let content = fs.readFileSync(filePath, 'utf8');
const originalLines = content.split('\n').length;
console.log('Linhas originais:', originalLines);

// Remover strings mal formadas e corrupção
content = content.replace(/:}`,\s*\)/g, '');
content = content.replace(/:}`,/g, '');
content = content.replace(/\s*\);\s*return this\.defaultParameters;/g, '\n    return this.defaultParameters;');

// Normalizar quebras de linha
content = content.replace(/\r\n/g, '\n');

// Remover linhas excessivamente vazias
content = content.replace(/\n{3,}/g, '\n\n');

// Escrever arquivo corrigido
fs.writeFileSync(filePath, content, 'utf8');

const finalLines = content.split('\n').length;
console.log('Linhas finais:', finalLines);
console.log('Arquivo corrigido com sucesso!');
console.log('Redução de linhas:', originalLines - finalLines);