const fs = require('fs');
const path = require('path');

// Função para converter camelCase para snake_case
function camelToSnake(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

// Função para verificar se uma string está em camelCase
function isCamelCase(str) {
  return /[a-z][A-Z]/.test(str);
}

// Ler o arquivo de schema
const schemaPath = path.join(__dirname, '..', 'tabelas e colunas.md');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

// Extrair todas as tabelas e suas colunas
const tableRegex = /CREATE TABLE public\.(\w+) \(/g;
const columnRegex = /^\s+(\w+)\s+/gm;

let match;
const tables = [];
const migrations = [];

// Encontrar todas as tabelas
while ((match = tableRegex.exec(schemaContent)) !== null) {
  const tableName = match[1];
  const tableStartIndex = match.index;
  
  // Encontrar o final da definição da tabela
  const tableEndIndex = schemaContent.indexOf(');', tableStartIndex);
  const tableDefinition = schemaContent.substring(tableStartIndex, tableEndIndex);
  
  // Extrair colunas da tabela
  const columns = [];
  const columnMatches = [...tableDefinition.matchAll(columnRegex)];
  
  columnMatches.forEach(colMatch => {
    const columnName = colMatch[1];
    if (!['CONSTRAINT', 'PRIMARY', 'FOREIGN', 'CHECK', 'UNIQUE'].includes(columnName)) {
      columns.push(columnName);
    }
  });
  
  tables.push({ name: tableName, columns });
}

console.log('=== ANÁLISE DE CONVERSÃO CAMELCASE PARA SNAKE_CASE ===\n');

// Gerar migrações para tabelas
tables.forEach(table => {
  const { name: tableName, columns } = table;
  
  // Verificar se o nome da tabela precisa ser convertido
  if (isCamelCase(tableName)) {
    const newTableName = camelToSnake(tableName);
    migrations.push(`-- Renomear tabela ${tableName} para ${newTableName}`);
    migrations.push(`ALTER TABLE public.${tableName} RENAME TO ${newTableName};\n`);
    console.log(`📋 TABELA: ${tableName} → ${newTableName}`);
  }
  
  // Verificar colunas que precisam ser convertidas
  const columnsToRename = columns.filter(col => isCamelCase(col));
  
  if (columnsToRename.length > 0) {
    console.log(`\n🔧 COLUNAS da tabela ${tableName}:`);
    
    columnsToRename.forEach(columnName => {
      const newColumnName = camelToSnake(columnName);
      const currentTableName = isCamelCase(tableName) ? camelToSnake(tableName) : tableName;
      
      migrations.push(`-- Renomear coluna ${columnName} para ${newColumnName} na tabela ${currentTableName}`);
      migrations.push(`ALTER TABLE public.${currentTableName} RENAME COLUMN ${columnName} TO ${newColumnName};`);
      
      console.log(`   ${columnName} → ${newColumnName}`);
    });
    
    migrations.push(''); // Linha em branco para separação
  }
});

console.log('\n=== RESUMO ===');
console.log(`Total de tabelas analisadas: ${tables.length}`);
console.log(`Tabelas que precisam ser renomeadas: ${tables.filter(t => isCamelCase(t.name)).length}`);
console.log(`Total de colunas que precisam ser renomeadas: ${tables.reduce((acc, t) => acc + t.columns.filter(c => isCamelCase(c)).length, 0)}`);

// Salvar arquivo de migração
const migrationContent = `-- Migração para converter camelCase para snake_case\n-- Gerado automaticamente em ${new Date().toISOString()}\n\n-- ATENÇÃO: Execute este script em ordem e faça backup antes!\n\n${migrations.join('\n')}`;

const migrationPath = path.join(__dirname, 'migration-camel-to-snake.sql');
fs.writeFileSync(migrationPath, migrationContent);

console.log(`\n✅ Arquivo de migração gerado: ${migrationPath}`);
console.log('\n⚠️  IMPORTANTE:');
console.log('1. Faça backup do banco antes de executar');
console.log('2. Execute as migrações em ordem');
console.log('3. Atualize todas as referências no código após a migração');
console.log('4. Teste completamente antes de fazer deploy');