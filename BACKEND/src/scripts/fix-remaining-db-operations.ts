import * as fs from 'fs';
import * as path from 'path';

/**
 * Script para corrigir as 18 ocorrências restantes de this.db
 * que não foram migradas pelo script anterior (operações em múltiplas linhas)
 */

const filePath = path.join(
  __dirname,
  '../domain/admin/controllers/AdminFlashcardController.ts',
);

function fixRemainingDbOperations() {
  console.log('🔧 Corrigindo operações this.db restantes...');

  let content = fs.readFileSync(filePath, 'utf8');

  // Padrões para operações em múltiplas linhas
  const multiLinePatterns = [
    {
      pattern:
        /const cardsSnapshot = await this\.db\s*\.collection\('flashcards'\)/g,
      replacement: 'const cardsSnapshot = await this.client.from(\'flashcards\')',
    },
    {
      pattern:
        /const decksSnapshot = await this\.db\s*\.collection\('decks'\)/g,
      replacement: 'const decksSnapshot = await this.client.from(\'decks\')',
    },
    {
      pattern:
        /const publicDecksSnapshot = await this\.db\s*\.collection\('decks'\)/g,
      replacement:
        'const publicDecksSnapshot = await this.client.from(\'decks\')',
    },
    {
      pattern:
        /const userDecksSnapshot = await this\.db\s*\.collection\('decks'\)/g,
      replacement: 'const userDecksSnapshot = await this.client.from(\'decks\')',
    },
    {
      pattern:
        /const userPublicDecksSnapshot = await this\.db\s*\.collection\('decks'\)/g,
      replacement:
        'const userPublicDecksSnapshot = await this.client.from(\'decks\')',
    },
    {
      pattern:
        /const collections = await this\.db\s*\.collection\('collections'\)/g,
      replacement: 'const collections = await this.client.from(\'collections\')',
    },
    {
      pattern: /const decksQuery = await this\.db\s*\.collection\('decks'\)/g,
      replacement: 'const decksQuery = await this.client.from(\'decks\')',
    },
    {
      pattern:
        /const flashcardsQuery = await this\.db\s*\.collection\('flashcards'\)/g,
      replacement:
        'const flashcardsQuery = await this.client.from(\'flashcards\')',
    },
    {
      pattern:
        /const existingSubscription = await this\.db\s*\.collection\('collection_subscriptions'\)/g,
      replacement:
        'const existingSubscription = await this.client.from(\'collection_subscriptions\')',
    },
    {
      pattern:
        /const subscriptionQuery = await this\.db\s*\.collection\('collection_subscriptions'\)/g,
      replacement:
        'const subscriptionQuery = await this.client.from(\'collection_subscriptions\')',
    },
    {
      pattern:
        /const subscriptionsQuery = await this\.db\s*\.collection\('collection_subscriptions'\)/g,
      replacement:
        'const subscriptionsQuery = await this.client.from(\'collection_subscriptions\')',
    },
    {
      pattern:
        /const querySnapshot = await this\.db\s*\.collection\('flashcards'\)/g,
      replacement: 'const querySnapshot = await this.client.from(\'flashcards\')',
    },
  ];

  let changesCount = 0;

  multiLinePatterns.forEach((pattern, index) => {
    const matches = content.match(pattern.pattern);
    if (matches) {
      console.log(
        `  ✅ ${index + 1}. Corrigindo ${matches.length} ocorrência(s): ${pattern.pattern.source}`,
      );
      content = content.replace(pattern.pattern, pattern.replacement);
      changesCount += matches.length;
    }
  });

  // Verificar se ainda restam ocorrências
  const remainingThisDb = (content.match(/this\.db/g) || []).length;

  if (remainingThisDb > 0) {
    console.log(`⚠️  Ainda restam ${remainingThisDb} ocorrências de 'this.db'`);

    // Mostrar as linhas que ainda contêm this.db
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('this.db')) {
        console.log(`   Linha ${index + 1}: ${line.trim()}`);
      }
    });
  } else {
    console.log('✅ Todas as ocorrências de this.db foram corrigidas!');
  }

  // Salvar o arquivo
  fs.writeFileSync(filePath, content, 'utf8');

  console.log("\n📊 Estatísticas:");
  console.log(`- Correções aplicadas: ${changesCount}`);
  console.log(`- Ocorrências restantes de 'this.db': ${remainingThisDb}`);
  console.log(`- Arquivo atualizado: ${filePath}`);
}

// Executar o script
fixRemainingDbOperations();
console.log('\n✅ Script de correção concluído!');
