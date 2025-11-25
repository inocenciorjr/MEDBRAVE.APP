import { SupabaseIndexManager, IndexDefinition } from '../src/infra/studyTools/supabase/SupabaseIndexManager';
import { supabase } from '../src/config/supabaseAdmin';
import { logger } from '../src/utils/logger';
import * as fs from 'fs';
import * as path from 'path';

interface FirebaseIndex {
  collectionGroup: string;
  queryScope: string;
  fields: Array<{
    fieldPath: string;
    order?: 'ASCENDING' | 'DESCENDING';
    arrayConfig?: 'CONTAINS';
  }>;
}

interface FirebaseIndexFile {
  indexes: FirebaseIndex[];
  fieldOverrides?: Array<{
    collectionGroup: string;
    fieldPath: string;
    indexes: Array<{
      order: 'ASCENDING' | 'DESCENDING';
      queryScope: string;
    }>;
  }>;
}

class FirebaseToPostgreSQLIndexMigrator {
  private indexManager: SupabaseIndexManager;
  private tableMapping: Record<string, string> = {
    // Firebase collection -> PostgreSQL table mapping
    'fsrs_cards': 'fsrs_cards',
    'performance_metrics': 'performance_metrics', 
    'fsrsQuestionReviews': 'fsrs_question_reviews',
    'decks': 'decks',
    'questions': 'questions',
    'errorNotebook': 'error_notebook_entries',
    'flashcards': 'flashcards',
    'collections': 'collections',
    'users': 'users',
    'studySessions': 'study_sessions',
    'unifiedReviews': 'unified_reviews',
    'achievementEvents': 'achievement_events',
    'userAchievements': 'user_achievements',
    'notifications': 'notifications',
    'audit_logs': 'audit_logs'
  };

  private fieldMapping: Record<string, string> = {
    // Firebase field -> PostgreSQL column mapping
    'userId': 'user_id',
    'deckId': 'deck_id',
    'specialtyId': 'specialty_id',
    'filterIds': 'filter_ids',
    'isActive': 'is_active',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'reviewedAt': 'reviewed_at',
    'due': 'due_date',
    'state': 'card_state',
    'operationType': 'operation_type',
    'timestamp': 'created_at'
  };

  constructor() {
    this.indexManager = new SupabaseIndexManager(supabase);
  }

  /**
   * Load Firebase indexes from JSON file
   */
  private loadFirebaseIndexes(): FirebaseIndexFile {
    const indexPath = path.join(__dirname, '../src/domain/studyTools/unifiedReviews/config/firestore-indexes.json');
    
    if (!fs.existsSync(indexPath)) {
      throw new Error(`Firebase indexes file not found: ${indexPath}`);
    }

    const content = fs.readFileSync(indexPath, 'utf8');
    return JSON.parse(content);
  }

  /**
   * Convert Firebase index to PostgreSQL index definition
   */
  private convertFirebaseIndex(firebaseIndex: FirebaseIndex): IndexDefinition | null {
    const tableName = this.tableMapping[firebaseIndex.collectionGroup];
    
    if (!tableName) {
      logger.warn(`No table mapping found for collection: ${firebaseIndex.collectionGroup}`);
      return null;
    }

    const columns: string[] = [];
    let hasArrayField = false;
    let method: 'btree' | 'gin' | 'gist' = 'btree';

    for (const field of firebaseIndex.fields) {
      const columnName = this.fieldMapping[field.fieldPath] || field.fieldPath;
      
      if (field.arrayConfig === 'CONTAINS') {
        // Array fields need GIN index in PostgreSQL
        columns.push(columnName);
        hasArrayField = true;
        method = 'gin';
      } else {
        columns.push(columnName);
      }
    }

    // Use GIN for array fields, B-tree for others
    if (hasArrayField) {
      method = 'gin';
    }

    return {
      table: tableName,
      columns,
      method,
      name: `idx_${tableName}_${columns.join('_')}`
    };
  }

  /**
   * Create essential indexes based on common query patterns
   */
  private getEssentialIndexes(): IndexDefinition[] {
    return [
      // User-based queries (most common pattern)
      { table: 'unified_reviews', columns: ['user_id', 'due_date'], method: 'btree' },
      { table: 'unified_reviews', columns: ['user_id', 'content_type', 'due_date'], method: 'btree' },
      { table: 'flashcards', columns: ['user_id', 'deck_id', 'is_active'], method: 'btree' },
      { table: 'fsrs_cards', columns: ['user_id', 'due_date'], method: 'btree' },
      { table: 'fsrs_cards', columns: ['user_id', 'card_state', 'due_date'], method: 'btree' },
      
      // Performance and monitoring
      { table: 'performance_metrics', columns: ['user_id', 'created_at'], method: 'btree' },
      { table: 'study_sessions', columns: ['user_id', 'session_date'], method: 'btree' },
      
      // Content queries
      { table: 'questions', columns: ['filter_ids'], method: 'gin' },
      { table: 'questions', columns: ['is_active', 'created_at'], method: 'btree' },
      
      // Error notebook
      { table: 'error_notebook_entries', columns: ['user_id', 'created_at'], method: 'btree' },
      
      // Decks and collections
      { table: 'decks', columns: ['user_id', 'is_active', 'created_at'], method: 'btree' },
      { table: 'collections', columns: ['user_id', 'is_active'], method: 'btree' },
      
      // Achievements
      { table: 'user_achievements', columns: ['user_id', 'achievement_type'], method: 'btree' },
      { table: 'achievement_events', columns: ['user_id', 'created_at'], method: 'btree' },
      
      // Notifications
      { table: 'notifications', columns: ['user_id', 'is_read', 'created_at'], method: 'btree' },
      
      // Full-text search indexes
      { table: 'flashcards', columns: ['search_vector'], method: 'gin' },
      { table: 'questions', columns: ['search_vector'], method: 'gin' }
    ];
  }

  /**
   * Migrate all Firebase indexes to PostgreSQL
   */
  public async migrateIndexes(): Promise<void> {
    try {
      logger.info('Starting Firebase to PostgreSQL index migration...');
      
      // Load Firebase indexes
      const firebaseIndexes = this.loadFirebaseIndexes();
      logger.info(`Found ${firebaseIndexes.indexes.length} Firebase indexes`);
      
      const postgresIndexes: IndexDefinition[] = [];
      
      // Convert Firebase indexes
      for (const fbIndex of firebaseIndexes.indexes) {
        const pgIndex = this.convertFirebaseIndex(fbIndex);
        if (pgIndex) {
          postgresIndexes.push(pgIndex);
        }
      }
      
      // Add essential indexes
      const essentialIndexes = this.getEssentialIndexes();
      postgresIndexes.push(...essentialIndexes);
      
      logger.info(`Converting ${postgresIndexes.length} indexes to PostgreSQL...`);
      
      // Create indexes with error handling
      let successCount = 0;
      let errorCount = 0;
      
      for (const indexDef of postgresIndexes) {
        try {
          await this.indexManager.createIndex(indexDef);
          successCount++;
          logger.info(`✓ Created index: ${indexDef.name || indexDef.table + '_' + indexDef.columns.join('_')}`);
        } catch (error) {
          errorCount++;
          logger.error(`✗ Failed to create index for ${indexDef.table}:`, error);
        }
      }
      
      logger.info(`Migration completed: ${successCount} successful, ${errorCount} failed`);
      
      // Generate health report
      const healthReport = await this.indexManager.getIndexHealthReport();
      logger.info('Index health report:', healthReport);
      
    } catch (error) {
      logger.error('Error during index migration:', error);
      throw error;
    }
  }

  /**
   * Analyze current query performance and suggest missing indexes
   */
  public async analyzeAndSuggestIndexes(): Promise<void> {
    try {
      logger.info('Analyzing query performance and suggesting indexes...');
      
      const healthReport = await this.indexManager.getIndexHealthReport();
      
      console.log('\n=== INDEX HEALTH REPORT ===');
      console.log(`Total indexes: ${healthReport.totalIndexes}`);
      console.log(`Unused indexes: ${healthReport.unusedIndexes.length}`);
      console.log(`Duplicate indexes: ${healthReport.duplicateIndexes.length}`);
      console.log(`Missing indexes: ${healthReport.missingIndexes.length}`);
      console.log(`Performance issues: ${healthReport.performanceIssues.length}`);
      
      if (healthReport.recommendations.length > 0) {
        console.log('\n=== RECOMMENDATIONS ===');
        healthReport.recommendations.forEach((rec, i) => {
          console.log(`${i + 1}. ${rec}`);
        });
      }
      
      if (healthReport.missingIndexes.length > 0) {
        console.log('\n=== SUGGESTED MISSING INDEXES ===');
        for (const missing of healthReport.missingIndexes) {
          console.log(`Table: ${missing.table}`);
          console.log(`Columns: ${missing.suggestedColumns.join(', ')}`);
          console.log(`Reason: ${missing.reason}`);
          console.log('---');
        }
      }
      
    } catch (error) {
      logger.error('Error during analysis:', error);
      throw error;
    }
  }

  /**
   * Generate SQL script for manual index creation
   */
  public async generateIndexScript(): Promise<string> {
    const firebaseIndexes = this.loadFirebaseIndexes();
    const postgresIndexes: IndexDefinition[] = [];
    
    // Convert Firebase indexes
    for (const fbIndex of firebaseIndexes.indexes) {
      const pgIndex = this.convertFirebaseIndex(fbIndex);
      if (pgIndex) {
        postgresIndexes.push(pgIndex);
      }
    }
    
    // Add essential indexes
    const essentialIndexes = this.getEssentialIndexes();
    postgresIndexes.push(...essentialIndexes);
    
    let script = '-- PostgreSQL Index Migration Script\n';
    script += '-- Generated from Firebase indexes\n\n';
    
    for (const indexDef of postgresIndexes) {
      const indexName = indexDef.name || `idx_${indexDef.table}_${indexDef.columns.join('_')}`;
      const method = indexDef.method || 'btree';
      const unique = indexDef.unique ? 'UNIQUE' : '';
      const partial = indexDef.partial ? `WHERE ${indexDef.partial}` : '';
      
      script += `-- Index for ${indexDef.table}\n`;
      script += `CREATE ${unique} INDEX CONCURRENTLY IF NOT EXISTS ${indexName}\n`;
      script += `ON ${indexDef.table} USING ${method} (${indexDef.columns.join(', ')})\n`;
      if (partial) script += `${partial}\n`;
      script += ';\n\n';
    }
    
    return script;
  }
}

// CLI interface
if (require.main === module) {
  const migrator = new FirebaseToPostgreSQLIndexMigrator();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'migrate':
      migrator.migrateIndexes()
        .then(() => {
          console.log('Index migration completed successfully!');
          process.exit(0);
        })
        .catch((error) => {
          console.error('Migration failed:', error);
          process.exit(1);
        });
      break;
      
    case 'analyze':
      migrator.analyzeAndSuggestIndexes()
        .then(() => {
          console.log('Analysis completed!');
          process.exit(0);
        })
        .catch((error) => {
          console.error('Analysis failed:', error);
          process.exit(1);
        });
      break;
      
    case 'generate-script':
      migrator.generateIndexScript()
        .then((script) => {
          console.log(script);
          
          // Save to file
          const fs = require('fs');
          fs.writeFileSync('postgres-indexes.sql', script);
          console.log('\nScript saved to postgres-indexes.sql');
          process.exit(0);
        })
        .catch((error) => {
          console.error('Script generation failed:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Usage:');
      console.log('  npm run migrate-indexes migrate     # Migrate all indexes');
      console.log('  npm run migrate-indexes analyze     # Analyze current performance');
      console.log('  npm run migrate-indexes generate-script # Generate SQL script');
      process.exit(1);
  }
}

export { FirebaseToPostgreSQLIndexMigrator };