const fs = require('fs');
const path = require('path');

// Lista de palavras em camelCase para converter para snake_case
const camelCaseWords = [
  'collectionName', 'deckCount'
];

// Função para converter camelCase para snake_case
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Criar mapeamento de conversão
const conversionMap = {};
camelCaseWords.forEach(word => {
  conversionMap[word] = camelToSnake(word);
});

// Extensões de arquivo para processar
const fileExtensions = ['.js', '.ts', '.jsx', '.tsx', '.json', '.sql', '.md'];

// Diretórios para processar
const directories = [
  path.join(__dirname, '..', 'BACKEND'),
  path.join(__dirname, '..', 'FRONTEND')
];

// Função para verificar se um arquivo deve ser processado
function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  return fileExtensions.includes(ext);
}

// Função para processar um arquivo
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Aplicar conversões
    Object.entries(conversionMap).forEach(([camelCase, snakeCase]) => {
      // Padrões para diferentes contextos
      const patterns = [
        // Propriedades de objeto: "userId": ou userId:
        new RegExp(`(["']?)${camelCase}(["']?)\s*:`, 'g'),
        // Acesso a propriedades: .userId ou ['userId']
        new RegExp(`\\.${camelCase}\\b`, 'g'),
        new RegExp(`\\['${camelCase}'\\]`, 'g'),
        new RegExp(`\\["${camelCase}"\\]`, 'g'),
        // Strings: 'userId' ou "userId"
        new RegExp(`'${camelCase}'`, 'g'),
        new RegExp(`"${camelCase}"`, 'g'),
        // Variáveis e parâmetros (cuidado com contexto)
        new RegExp(`\\b${camelCase}\\b(?=\\s*[=,)]|$)`, 'g')
      ];
      
      patterns.forEach((pattern, index) => {
        const originalContent = content;
        
        if (index === 0) {
          // Para propriedades de objeto, manter as aspas
          content = content.replace(pattern, (match, quote1, quote2) => {
            return `${quote1 || ''}${snakeCase}${quote2 || ''}:`;
          });
        } else if (index === 1) {
          // Para acesso a propriedades
          content = content.replace(pattern, `.${snakeCase}`);
        } else if (index === 2 || index === 3) {
          // Para acesso com colchetes
          content = content.replace(pattern, `['${snakeCase}']`);
        } else if (index === 4 || index === 5) {
          // Para strings
          content = content.replace(pattern, `'${snakeCase}'`);
        } else {
          // Para variáveis e parâmetros
          content = content.replace(pattern, snakeCase);
        }
        
        if (content !== originalContent) {
          modified = true;
        }
      });
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Processado: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Erro ao processar ${filePath}:`, error.message);
    return false;
  }
}

// Função para percorrer diretórios recursivamente
function walkDirectory(dir, processedFiles = []) {
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Pular diretórios específicos
        if (['node_modules', '.git', 'dist', 'build', '.next'].includes(file)) {
          return;
        }
        walkDirectory(filePath, processedFiles);
      } else if (stat.isFile() && shouldProcessFile(filePath)) {
        if (processFile(filePath)) {
          processedFiles.push(filePath);
        }
      }
    });
  } catch (error) {
    console.error(`Erro ao ler diretório ${dir}:`, error.message);
  }
  
  return processedFiles;
}

// Executar o script
console.log('Iniciando conversão de camelCase para snake_case...');
console.log(`Palavras a converter: ${camelCaseWords.length}`);
console.log('Mapeamento de conversão:');
Object.entries(conversionMap).forEach(([camel, snake]) => {
  console.log(`  ${camel} → ${snake}`);
});
console.log('\n');

let totalProcessedFiles = [];

directories.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`Processando diretório: ${dir}`);
    const processedFiles = walkDirectory(dir);
    totalProcessedFiles = totalProcessedFiles.concat(processedFiles);
  } else {
    console.log(`Diretório não encontrado: ${dir}`);
  }
});

console.log(`\nConversão concluída!`);
console.log(`Total de arquivos modificados: ${totalProcessedFiles.length}`);

if (totalProcessedFiles.length > 0) {
  console.log('\nArquivos modificados:');
  totalProcessedFiles.forEach(file => {
    console.log(`  ${file}`);
  });
}