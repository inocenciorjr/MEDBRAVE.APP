import migrationManager from '../infra/database/migrations';
import { CreateIndexesMigration } from '../infra/database/migrations/001_create_indexes';
import logger from '../utils/logger';

/**
 * Script para executar as migrações do banco de dados
 */
async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    // Registrar todas as migrações
    migrationManager.registerMigration(CreateIndexesMigration);

    // Adicionar aqui outras migrações quando forem criadas
    // migrationManager.registerMigration(OutraMigracao);

    // Executar migrações
    await migrationManager.runMigrations();

    logger.info('Database migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Error running database migrations:', error);
    process.exit(1);
  }
}

// Executar o script
runMigrations();
