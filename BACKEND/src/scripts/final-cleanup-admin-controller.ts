import * as fs from 'fs';

/**
 * Script final para limpar inconsistências restantes no AdminFlashcardController
 */

const filePath =
  'C:\\MEDBRAVE.APP\\MEDBRAVE.APP\\BACKEND\\src\\domain\\admin\\controllers\\AdminFlashcardController.ts';

function finalCleanup() {
  console.log('🧹 Executando limpeza final do AdminFlashcardController...');

  let content = fs.readFileSync(filePath, 'utf8');
  let changesCount = 0;

  // Padrões para corrigir
  const fixes = [
    {
      name: 'Corrigir .docs para .data',
      pattern: /\.docs\.map/g,
      replacement: '.data?.map',
    },
    {
      name: 'Corrigir .docs.length para .data?.length',
      pattern: /\.docs\.length/g,
      replacement: '.data?.length || 0',
    },
    {
      name: 'Corrigir .size para .length',
      pattern: /\.size/g,
      replacement: '.length',
    },
    {
      name: 'Corrigir .exists para verificação null',
      pattern: /\.exists/g,
      replacement: ' !== null',
    },
    {
      name: 'Corrigir .data() para acesso direto',
      pattern: /\.data\(\)/g,
      replacement: '',
    },
    {
      name: 'Corrigir doc.id para item.id onde apropriado',
      pattern: /doc\.id/g,
      replacement: 'doc.id',
    },
    {
      name: 'Corrigir where para eq (single values)',
      pattern: /\.where\(([^,]+),\s*'=='\s*,\s*([^)]+)\)/g,
      replacement: '.eq($1, $2)',
    },
    {
      name: 'Corrigir where para in (arrays)',
      pattern: /\.where\(([^,]+),\s*'in'\s*,\s*([^)]+)\)/g,
      replacement: '.in($1, $2)',
    },
  ];

  fixes.forEach((fix, index) => {
    const matches = content.match(fix.pattern);
    if (matches) {
      console.log(
        `  ✅ ${index + 1}. ${fix.name}: ${matches.length} ocorrência(s)`,
      );
      content = content.replace(fix.pattern, fix.replacement);
      changesCount += matches.length;
    }
  });

  // Verificações específicas
  const remainingIssues = [
    { name: 'this.db', pattern: /this\.db/g },
    { name: '.docs', pattern: /\.docs/g },
    { name: '.size', pattern: /\.size/g },
    { name: '.exists', pattern: /\.exists/g },
    { name: '.data()', pattern: /\.data\(\)/g },
  ];

  console.log('\n🔍 Verificando problemas restantes:');
  remainingIssues.forEach((issue) => {
    const matches = content.match(issue.pattern);
    if (matches) {
      console.log(
        `  ⚠️  ${issue.name}: ${matches.length} ocorrência(s) restantes`,
      );
    } else {
      console.log(`  ✅ ${issue.name}: Nenhuma ocorrência`);
    }
  });

  // Salvar o arquivo
  fs.writeFileSync(filePath, content, 'utf8');

  console.log("\n📊 Resumo:");
  console.log(`- Correções aplicadas: ${changesCount}`);
  console.log(`- Arquivo atualizado: ${filePath}`);
}

// Executar o script
finalCleanup();
console.log('\n✅ Limpeza final concluída!');
