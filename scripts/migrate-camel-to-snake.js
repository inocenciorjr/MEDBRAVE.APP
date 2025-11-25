#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script para migrar camelCase para snake_case no código e Supabase
 */

const CAMEL_TO_SNAKE_REGEX = /([a-z])([A-Z])/g;
const CAMEL_TO_SNAKE_REPLACEMENT = '$1_$2';

// Diretórios a processar
const BACKEND_DIR = path.join(__dirname, '..', 'BACKEND', 'src');
const FRONTEND_DIR = path.join(__dirname, '..', 'FRONTEND', 'src');

// Extensões de arquivo a processar
const VALID_EXTENSIONS = ['.ts', '.js', '.tsx', '.jsx'];

// Tabelas e colunas conhecidas que precisam ser convertidas
const TABLE_MAPPINGS = {
  'user_flashcard_interactions': 'user_flashcard_interactions',
  'flashcard_review_history': 'flashcard_review_history',
  'flashcards': 'flashcards',
  'decks': 'decks',
  'users': 'users'
};

// Mapeamentos de colunas
const COLUMN_MAPPINGS = {
  'userId': 'user_id',
  'flashcardId': 'flashcard_id',
  'deckId': 'deck_id',
  'frontContent': 'front_content',
  'backContent': 'back_content',
  'lastReviewedAt': 'last_reviewed_at',
  'nextReview': 'next_review',
  'reviewCount': 'review_count',
  'lapseCount': 'lapse_count',
  'createdAt': 'created_at',
  'updatedAt': 'updated_at',
  'isPublic': 'is_public',
  'flashcardCount': 'flashcard_count',
  'collection': 'collection',
  'hierarchy': 'hierarchy'
};

/**
 * Converte camelCase para snake_case
 */
function camelToSnake(str) {
  return str.replace(CAMEL_TO_SNAKE_REGEX, CAMEL_TO_SNAKE_REPLACEMENT).toLowerCase();
}

/**
 * Verifica se um arquivo deve ser processado
 */
function shouldProcessFile(filePath) {
  return VALID_EXTENSIONS.includes(path.extname(filePath));
}

/**
 * Processa um arquivo para converter camelCase para snake_case
 */
function processFile(filePath) {
  if (!shouldProcessFile(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Substituir nomes de tabelas
  Object.entries(TABLE_MAPPINGS).forEach(([oldName, newName]) => {
    const regex = new RegExp(`\\b${oldName}\\b`, 'g');
    if (content.match(regex)) {
      content = content.replace(regex, newName);
      modified = true;
    }
  });

  // Substituir nomes de colunas
  Object.entries(COLUMN_MAPPINGS).forEach(([oldName, newName]) => {
    const regex = new RegExp(`\\b${oldName}\\b`, 'g');
    if (content.match(regex)) {
      content = content.replace(regex, newName);
      modified = true;
    }
  });

  // Substituir propriedades de objetos em strings de template
  const templateRegex = /`([^`]*\$\{[^}]*\}[^`]*)`/g;
  content = content.replace(templateRegex, (match) => {
    let modifiedTemplate = match;
    Object.entries(COLUMN_MAPPINGS).forEach(([oldName, newName]) => {
      const regex = new RegExp(`\\b${oldName}\\b`, 'g');
      modifiedTemplate = modifiedTemplate.replace(regex, newName);
    });
    return modifiedTemplate;
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Arquivo processado: ${path.relative(process.cwd(), filePath)}`);
  }
}

/**
 * Percorre diretórios recursivamente
 */
function processDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;

  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else {
      processFile(filePath);
    }
  });
}

/**
 * Gera SQL para renomear colunas no Supabase
 */
function generateSupabaseMigration() {
  const migration = `-- Migration: Convert camelCase to snake_case
-- Generated automatically by migrate-camel-to-snake.js

-- Renomear colunas na tabela flashcards
ALTER TABLE flashcards 
  RENAME COLUMN "userId" TO user_id;

ALTER TABLE flashcards 
  RENAME COLUMN "deckId" TO deck_id;

ALTER TABLE flashcards 
  RENAME COLUMN "frontContent" TO front_content;

ALTER TABLE flashcards 
  RENAME COLUMN "backContent" TO back_content;

ALTER TABLE flashcards 
  RENAME COLUMN "lastReviewedAt" TO last_reviewed_at;

ALTER TABLE flashcards 
  RENAME COLUMN "nextReview" TO next_review;

ALTER TABLE flashcards 
  RENAME COLUMN "reviewCount" TO review_count;

ALTER TABLE flashcards 
  RENAME COLUMN "lapseCount" TO lapse_count;

ALTER TABLE flashcards 
  RENAME COLUMN "createdAt" TO created_at;

ALTER TABLE flashcards 
  RENAME COLUMN "updatedAt" TO updated_at;

-- Renomear colunas na tabela decks
ALTER TABLE decks 
  RENAME COLUMN "userId" TO user_id;

ALTER TABLE decks 
  RENAME COLUMN "isPublic" TO is_public;

ALTER TABLE decks 
  RENAME COLUMN "flashcardCount" TO flashcard_count;

ALTER TABLE decks 
  RENAME COLUMN "createdAt" TO created_at;

ALTER TABLE decks 
  RENAME COLUMN "updatedAt" TO updated_at;

-- Renomear colunas na tabela user_flashcard_interactions
ALTER TABLE user_flashcard_interactions 
  RENAME COLUMN "userId" TO user_id;

ALTER TABLE user_flashcard_interactions 
  RENAME COLUMN "flashcardId" TO flashcard_id;

ALTER TABLE user_flashcard_interactions 
  RENAME COLUMN "createdAt" TO created_at;

-- Renomear colunas na tabela flashcard_review_history
ALTER TABLE flashcard_review_history 
  RENAME COLUMN "userId" TO user_id;

ALTER TABLE flashcard_review_history 
  RENAME COLUMN "flashcardId" TO flashcard_id;

ALTER TABLE flashcard_review_history 
  RENAME COLUMN "reviewTimeMs" TO review_time_ms;

ALTER TABLE flashcard_review_history 
  RENAME COLUMN "reviewedAt" TO reviewed_at;

-- Atualizar políticas RLS para usar novos nomes de coluna
-- (As políticas precisarão ser recriadas manualmente)

COMMIT;`;

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', `${Date.now()}_migrate_camel_to_snake.sql`);
  fs.writeFileSync(migrationPath, migration, 'utf8');
  
  console.log(`✅ Migration SQL gerada: ${path.relative(process.cwd(), migrationPath)}`);
}

/**
 * Executa a migração
 */
function runMigration() {
  console.log('🔄 Iniciando migração camelCase → snake_case...\n');

  // Processar backend
  console.log('📁 Processando backend...');
  processDirectory(BACKEND_DIR);

  // Processar frontend
  console.log('📁 Processando frontend...');
  processDirectory(FRONTEND_DIR);

  // Gerar SQL de migração
  console.log('📄 Gerando SQL de migração...');
  generateSupabaseMigration();

  console.log('\n✅ Migração concluída!');
  console.log('\n⚠️  IMPORTANTE: Execute a migration SQL no Supabase para concluir a migração');
  console.log('   Use: supabase db reset ou aplique manualmente via dashboard');
}

// Executar se chamado diretamente
if (require.main === module) {
  runMigration();
}

module.exports = { camelToSnake, processFile, processDirectory };