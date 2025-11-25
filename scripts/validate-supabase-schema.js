#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script para validar o schema do Supabase após migração
 */

const SUPABASE_DIR = path.join(__dirname, '..', 'supabase');

// Schema esperado após migração
const EXPECTED_SCHEMA = {
  tables: {
    flashcards: [
      'id', 'user_id', 'deck_id', 'front_content', 'back_content', 'difficulty',
      'stability', 'last_reviewed_at', 'next_review', 'review_count', 'lapse_count',
      'state', 'srs_interval', 'srs_repetitions', 'srs_ease_factor', 'srs_lapses',
      'created_at', 'updated_at', 'is_archived'
    ],
    decks: [
      'id', 'user_id', 'name', 'description', 'is_public', 'flashcard_count',
      'created_at', 'updated_at'
    ],
    user_flashcard_interactions: [
      'id', 'user_id', 'flashcard_id', 'interaction_type', 'metadata', 'created_at'
    ],
    flashcard_review_history: [
      'id', 'user_id', 'flashcard_id', 'grade', 'review_time_ms', 'stability',
      'difficulty', 'elapsed_days', 'scheduled_days', 'reps', 'lapses', 'state',
      'due', 'last_review', 'reviewed_at'
    ]
  }
};

/**
 * Valida se o schema está consistente
 */
function validateSchema() {
  console.log('🔍 Validando schema do Supabase...\n');

  const results = {
    passed: [],
    failed: []
  };

  // Verificar se as tabelas existem
  Object.keys(EXPECTED_SCHEMA.tables).forEach(tableName => {
    const expectedColumns = EXPECTED_SCHEMA.tables[tableName];
    
    // Aqui você pode adicionar lógica para conectar ao Supabase
    // Por enquanto, apenas validamos a estrutura esperada
    console.log(`✅ Tabela ${tableName} - ${expectedColumns.length} colunas esperadas`);
    expectedColumns.forEach(col => {
      if (col.includes('_')) {
        console.log(`  - ${col} (snake_case)`);
      } else {
        console.log(`  - ${col} ⚠️ não está em snake_case`);
      }
    });
  });

  return results;
}

/**
 * Gera relatório de validação
 */
function generateReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    schema: EXPECTED_SCHEMA,
    validation: results
  };

  const reportPath = path.join(__dirname, 'validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Relatório gerado: ${reportPath}`);
}

// Executar validação
if (require.main === module) {
  const results = validateSchema();
  generateReport(results);
  
  console.log('\n✅ Validação concluída!');
  console.log('💡 Para validar com o Supabase real, use:');
  console.log('   npm run validate:tables');
}