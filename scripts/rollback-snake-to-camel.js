#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script para reverter snake_case para camelCase (caso necessário)
 */

const SNAKE_TO_CAMEL_REGEX = /_([a-z])/g;
const SNAKE_TO_CAMEL_REPLACEMENT = (_, letter) => letter.toUpperCase();

// Diretórios a processar
const BACKEND_DIR = path.join(__dirname, '..', 'BACKEND', 'src');
const FRONTEND_DIR = path.join(__dirname, '..', 'FRONTEND', 'src');

// Extensões de arquivo a processar
const VALID_EXTENSIONS = ['.ts', '.js', '.tsx', '.jsx'];

// Mapeamentos inversos
const REVERSE_COLUMN_MAPPINGS = {
  'user_id': 'userId',
  'flashcard_id': 'flashcardId',
  'deck_id': 'deckId',
  'front_content': 'frontContent',
  'back_content': 'backContent',
  'last_reviewed_at': 'lastReviewedAt',
  'next_review': 'nextReview',
  'review_count': 'reviewCount',
  'lapse_count': 'lapseCount',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
  'is_public': 'isPublic',
  'flashcard_count': 'flashcardCount',
  'review_time_ms': 'reviewTimeMs',
  'reviewed_at': 'reviewedAt'
};

/**
 * Converte snake_case para camelCase
 */
function snakeToCamel(str) {
  return str.replace(SNAKE_TO_CAMEL_REGEX, SNAKE_TO_CAMEL_REPLACEMENT);
}

/**
 * Cria backup antes de reverter
 */
function createBackup(dirPath) {
  const backupDir = path.join(__dirname, 'migration-backup', new Date().toISOString().slice(0, 19).replace(/:/g, '-'));
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  function copyRecursive(src, dest) {
    const stat = fs.statSync(src);
    
    if (stat.isDirectory()) {
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
      
      const files = fs.readdirSync(src);
      files.forEach(file => {
        copyRecursive(path.join(src, file), path.join(dest, file));
      });
    } else {
      if (VALID_EXTENSIONS.includes(path.extname(src))) {
        fs.copyFileSync(src, dest);
      }
    }
  }

  copyRecursive(dirPath, path.join(backupDir, path.basename(dirPath)));
  console.log(`💾 Backup criado: ${path.relative(process.cwd(), backupDir)}`);
  return backupDir;
}

/**
 * Processa um arquivo para reverter snake_case para camelCase
 */
function processFile(filePath) {
  if (!shouldProcessFile(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Substituir nomes de colunas de volta para camelCase
  Object.entries(REVERSE_COLUMN_MAPPINGS).forEach(([oldName, newName]) => {
    const regex = new RegExp(`\\b${oldName}\\b`, 'g');
    if (content.match(regex)) {
      content = content.replace(regex, newName);
      modified = true;
    }
  });

  // Substituir em strings de template
  const templateRegex = /`([^`]*\$\{[^}]*\}[^`]*)`/g;
  content = content.replace(templateRegex, (match) => {
    let modifiedTemplate = match;
    Object.entries(REVERSE_COLUMN_MAPPINGS).forEach(([oldName, newName]) => {
      const regex = new RegExp(`\\b${oldName}\\b`, 'g');
      modifiedTemplate = modifiedTemplate.replace(regex, newName);
    });
    return modifiedTemplate;
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Arquivo revertido: ${path.relative(process.cwd(), filePath)}`);
  }
}

/**
 * Verifica se um arquivo deve ser processado
 */
function shouldProcessFile(filePath) {
  return VALID_EXTENSIONS.includes(path.extname(filePath));
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
 * Gera SQL para reverter no Supabase
 */
function generateRollbackSQL() {
  const rollback = `-- Rollback: Reverter snake_case para camelCase
-- Generated automatically by rollback-snake-to-camel.js

-- Reverter colunas na tabela flashcards
ALTER TABLE flashcards 
  RENAME COLUMN user_id TO "userId";

ALTER TABLE flashcards 
  RENAME COLUMN deck_id TO "deckId";

ALTER TABLE flashcards 
  RENAME COLUMN front_content TO "frontContent";

ALTER TABLE flashcards 
  RENAME COLUMN back_content TO "backContent";

ALTER TABLE flashcards 
  RENAME COLUMN last_reviewed_at TO "lastReviewedAt";

ALTER TABLE flashcards 
  RENAME COLUMN next_review TO "nextReview";

ALTER TABLE flashcards 
  RENAME COLUMN review_count TO "reviewCount";

ALTER TABLE flashcards 
  RENAME COLUMN lapse_count TO "lapseCount";

ALTER TABLE flashcards 
  RENAME COLUMN created_at TO "createdAt";

ALTER TABLE flashcards 
  RENAME COLUMN updated_at TO "updatedAt";

-- Reverter colunas na tabela decks
ALTER TABLE decks 
  RENAME COLUMN user_id TO "userId";

ALTER TABLE decks 
  RENAME COLUMN is_public TO "isPublic";

ALTER TABLE decks 
  RENAME COLUMN flashcard_count TO "flashcardCount";

ALTER TABLE decks 
  RENAME COLUMN created_at TO "createdAt";

ALTER TABLE decks 
  RENAME COLUMN updated_at TO "updatedAt";

-- Reverter colunas na tabela user_flashcard_interactions
ALTER TABLE user_flashcard_interactions 
  RENAME COLUMN user_id TO "userId";

ALTER TABLE user_flashcard_interactions 
  RENAME COLUMN flashcard_id TO "flashcardId";

ALTER TABLE user_flashcard_interactions 
  RENAME COLUMN created_at TO "createdAt";

-- Reverter colunas na tabela flashcard_review_history
ALTER TABLE flashcard_review_history 
  RENAME COLUMN user_id TO "userId";

ALTER TABLE flashcard_review_history 
  RENAME COLUMN flashcard_id TO "flashcardId";

ALTER TABLE flashcard_review_history 
  RENAME COLUMN review_time_ms TO "reviewTimeMs";

ALTER TABLE flashcard_review_history 
  RENAME COLUMN reviewed_at TO "reviewedAt";

COMMIT;`;

  const rollbackPath = path.join(__dirname, '..', 'supabase', 'migrations', `${Date.now()}_rollback_snake_to_camel.sql`);
  fs.writeFileSync(rollbackPath, rollback, 'utf8');
  
  console.log(`📄 Rollback SQL gerado: ${path.relative(process.cwd(), rollbackPath)}`);
}

/**
 * Executa o rollback
 */
function runRollback() {
  console.log('🔄 Iniciando rollback snake_case → camelCase...\n');

  // Criar backups
  console.log('💾 Criando backups...');
  createBackup(BACKEND_DIR);
  createBackup(FRONTEND_DIR);

  // Processar backend
  console.log('📁 Revertendo backend...');
  processDirectory(BACKEND_DIR);

  // Processar frontend
  console.log('📁 Revertendo frontend...');
  processDirectory(FRONTEND_DIR);

  // Gerar SQL de rollback
  console.log('📄 Gerando SQL de rollback...');
  generateRollbackSQL();

  console.log('\n✅ Rollback concluído!');
  console.log('\n⚠️  IMPORTANTE: Execute o SQL de rollback no Supabase');
}

// Executar se chamado diretamente
if (require.main === module) {
  runRollback();
}

module.exports = { snakeToCamel, processFile, processDirectory };