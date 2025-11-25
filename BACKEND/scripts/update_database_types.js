#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Caminho para o arquivo database.types.ts
const filePath = path.join(__dirname, '..', 'src', 'types', 'database.types.ts');

// Ler o arquivo
let content = fs.readFileSync(filePath, 'utf8');

// Remover todas as ocorrências de firestore_id: string
content = content.replace(/\s*firestore_id:\s*string\s*,?\s*\n/g, '');
content = content.replace(/\s*firestore_id:\s*string\s*\|\s*null\s*,?\s*\n/g, '');

// Salvar o arquivo atualizado
fs.writeFileSync(filePath, content);

console.log('✅ Todas as referências a firestore_id foram removidas de database.types.ts');
console.log('📁 Arquivo atualizado:', filePath);