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
const mappings = {
  tables: {},
  columns: {}
};

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

// Gerar mapeamentos
tables.forEach(table => {
  const { name: tableName, columns } = table;
  
  // Mapear nome da tabela se necessário
  if (isCamelCase(tableName)) {
    const newTableName = camelToSnake(tableName);
    mappings.tables[tableName] = newTableName;
  }
  
  // Mapear colunas
  const currentTableName = isCamelCase(tableName) ? camelToSnake(tableName) : tableName;
  mappings.columns[currentTableName] = {};
  
  columns.forEach(columnName => {
    if (isCamelCase(columnName)) {
      const newColumnName = camelToSnake(columnName);
      mappings.columns[currentTableName][columnName] = newColumnName;
    }
  });
});

// Gerar arquivo JSON com mapeamentos
const mappingPath = path.join(__dirname, 'camel-to-snake-mapping.json');
fs.writeFileSync(mappingPath, JSON.stringify(mappings, null, 2));

// Gerar arquivo TypeScript com tipos
const typesContent = `// Mapeamento de nomes camelCase para snake_case
// Gerado automaticamente em ${new Date().toISOString()}

export const TABLE_MAPPINGS = ${JSON.stringify(mappings.tables, null, 2)} as const;

export const COLUMN_MAPPINGS = ${JSON.stringify(mappings.columns, null, 2)} as const;

// Tipo para nomes de tabelas antigos
export type OldTableNames = keyof typeof TABLE_MAPPINGS;

// Tipo para nomes de tabelas novos
export type NewTableNames = typeof TABLE_MAPPINGS[OldTableNames];

// Função helper para converter nomes de tabelas
export function getNewTableName(oldName: string): string {
  return TABLE_MAPPINGS[oldName as OldTableNames] || oldName;
}

// Função helper para converter nomes de colunas
export function getNewColumnName(tableName: string, oldColumnName: string): string {
  const tableColumns = COLUMN_MAPPINGS[tableName as keyof typeof COLUMN_MAPPINGS];
  if (tableColumns && tableColumns[oldColumnName as keyof typeof tableColumns]) {
    return tableColumns[oldColumnName as keyof typeof tableColumns];
  }
  return oldColumnName;
}

// Lista de todas as tabelas que foram renomeadas
export const RENAMED_TABLES = Object.keys(TABLE_MAPPINGS);

// Lista de todas as tabelas com colunas renomeadas
export const TABLES_WITH_RENAMED_COLUMNS = Object.keys(COLUMN_MAPPINGS).filter(
  tableName => Object.keys(COLUMN_MAPPINGS[tableName as keyof typeof COLUMN_MAPPINGS]).length > 0
);
`;

const typesPath = path.join(__dirname, 'camel-to-snake-mappings.ts');
fs.writeFileSync(typesPath, typesContent);

// Gerar arquivo de documentação
const docContent = `# Migração camelCase para snake_case

## Resumo

- **Total de tabelas analisadas:** ${tables.length}
- **Tabelas renomeadas:** ${Object.keys(mappings.tables).length}
- **Tabelas com colunas renomeadas:** ${Object.keys(mappings.columns).filter(t => Object.keys(mappings.columns[t]).length > 0).length}
- **Total de colunas renomeadas:** ${Object.values(mappings.columns).reduce((acc, cols) => acc + Object.keys(cols).length, 0)}

## Tabelas Renomeadas

${Object.entries(mappings.tables).map(([old, newName]) => `- \`${old}\` → \`${newName}\``).join('\n')}

## Colunas Renomeadas por Tabela

${Object.entries(mappings.columns)
  .filter(([, cols]) => Object.keys(cols).length > 0)
  .map(([tableName, cols]) => {
    const columnList = Object.entries(cols)
      .map(([old, newName]) => `  - \`${old}\` → \`${newName}\``)
      .join('\n');
    return `### Tabela: \`${tableName}\`\n\n${columnList}`;
  })
  .join('\n\n')}

## Arquivos Gerados

1. **migration-camel-to-snake.sql** - Script SQL para executar a migração
2. **camel-to-snake-mapping.json** - Mapeamento em formato JSON
3. **camel-to-snake-mappings.ts** - Tipos TypeScript e funções helper
4. **execute-migration.js** - Script para executar a migração de forma segura

## Como Usar

### 1. Executar a Migração no Banco

\`\`\`bash
# Configure as variáveis de ambiente
set SUPABASE_URL=https://your-project.supabase.co
set SUPABASE_SERVICE_KEY=your-service-key

# Execute a migração
node scripts/execute-migration.js
\`\`\`

### 2. Atualizar o Código

Use os mapeamentos gerados para atualizar suas queries e modelos:

\`\`\`typescript
import { getNewTableName, getNewColumnName } from './scripts/camel-to-snake-mappings';

// Exemplo de uso
const oldTableName = 'userStatistics';
const newTableName = getNewTableName(oldTableName); // 'user_statistics'

const oldColumnName = 'user_id';
const newColumnName = getNewColumnName('user_statistics', oldColumnName); // 'user_id'
\`\`\`

### 3. Verificar e Testar

- Execute todos os testes
- Verifique se todas as queries foram atualizadas
- Teste a aplicação completamente
- Atualize a documentação

## ⚠️ Importante

- **Faça backup** do banco antes de executar a migração
- **Teste em ambiente de desenvolvimento** primeiro
- **Atualize todo o código** que referencia as tabelas/colunas antigas
- **Execute os testes** para garantir compatibilidade
`;

const docPath = path.join(__dirname, 'MIGRATION_GUIDE.md');
fs.writeFileSync(docPath, docContent);

console.log('✅ Arquivos de mapeamento gerados:');
console.log(`📄 ${mappingPath}`);
console.log(`📄 ${typesPath}`);
console.log(`📄 ${docPath}`);
console.log('\n📋 Resumo dos mapeamentos:');
console.log(`- Tabelas renomeadas: ${Object.keys(mappings.tables).length}`);
console.log(`- Tabelas com colunas renomeadas: ${Object.keys(mappings.columns).filter(t => Object.keys(mappings.columns[t]).length > 0).length}`);
console.log(`- Total de colunas renomeadas: ${Object.values(mappings.columns).reduce((acc, cols) => acc + Object.keys(cols).length, 0)}`);