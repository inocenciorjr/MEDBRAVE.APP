import { firestore } from '../../../config/firebaseAdmin';
import { firestore as firestoreTypes } from 'firebase-admin';
import logger from '../../../utils/logger';

/**
 * Interface para uma migração de banco de dados
 */
export interface IDatabaseMigration {
  /**
   * Nome único da migração
   */
  name: string;

  /**
   * Número da versão (para ordenação)
   */
  version: number;

  /**
   * Executa a migração
   */
  up(): Promise<void>;

  /**
   * Reverte a migração (opcional)
   */
  down?(): Promise<void>;
}

/**
 * Interface para um seed de banco de dados
 */
export interface IDatabaseSeed {
  /**
   * Nome único do seed
   */
  name: string;

  /**
   * Prioridade de execução (menor primeiro)
   */
  priority: number;

  /**
   * Executa o seed
   */
  run(): Promise<void>;
}

/**
 * Classe para gerenciar migrações e seeds do banco de dados
 */
export class DatabaseMigrationManager {
  private migrationsCollection = firestore.collection('database_migrations');
  private seedsCollection = firestore.collection('database_seeds');
  private migrations: IDatabaseMigration[] = [];
  private seeds: IDatabaseSeed[] = [];

  /**
   * Registra uma migração
   * @param migration Migração a registrar
   */
  registerMigration(migration: IDatabaseMigration): void {
    this.migrations.push(migration);
    logger.debug(`Migration registered: ${migration.name} (v${migration.version})`);
  }

  /**
   * Registra um seed
   * @param seed Seed a registrar
   */
  registerSeed(seed: IDatabaseSeed): void {
    this.seeds.push(seed);
    logger.debug(`Seed registered: ${seed.name} (priority: ${seed.priority})`);
  }

  /**
   * Executa todas as migrações pendentes
   */
  async runMigrations(): Promise<void> {
    try {
      logger.info('Running database migrations...');

      // Buscar migrações já executadas
      const executedSnapshot = await this.migrationsCollection.get();
      const executedMigrations = new Set<string>();

      executedSnapshot.forEach(doc => {
        executedMigrations.add(doc.id);
      });

      // Ordenar migrações por versão
      const pendingMigrations = this.migrations
        .filter(migration => !executedMigrations.has(migration.name))
        .sort((a, b) => a.version - b.version);

      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations.');
        return;
      }

      logger.info(`Found ${pendingMigrations.length} pending migrations.`);

      // Executar migrações pendentes em sequência
      for (const migration of pendingMigrations) {
        try {
          logger.info(`Running migration: ${migration.name} (v${migration.version})`);

          await migration.up();

          // Registrar migração executada
          await this.migrationsCollection.doc(migration.name).set({
            name: migration.name,
            version: migration.version,
            executedAt: new Date(),
          });

          logger.info(`Migration completed: ${migration.name}`);
        } catch (error) {
          logger.error(`Error running migration ${migration.name}:`, error);
          throw error; // Interromper o processo se uma migração falhar
        }
      }

      logger.info('All migrations completed successfully.');
    } catch (error) {
      logger.error('Error running migrations:', error);
      throw error;
    }
  }

  /**
   * Reverte as últimas n migrações
   * @param count Número de migrações a reverter (padrão: 1)
   */
  async rollbackMigrations(count: number = 1): Promise<void> {
    try {
      logger.info(`Rolling back ${count} migrations...`);

      // Buscar migrações executadas
      const executedSnapshot = await this.migrationsCollection
        .orderBy('executedAt', 'desc')
        .limit(count)
        .get();

      if (executedSnapshot.empty) {
        logger.info('No migrations to rollback.');
        return;
      }

      const toRollback: {
        doc: firestoreTypes.QueryDocumentSnapshot;
        migration: IDatabaseMigration;
      }[] = [];

      // Encontrar as migrações correspondentes
      executedSnapshot.forEach(doc => {
        const migrationName = doc.id;
        const migration = this.migrations.find(m => m.name === migrationName);

        if (migration && migration.down) {
          toRollback.push({ doc, migration });
        } else if (!migration) {
          logger.warn(`Migration ${migrationName} not found in registered migrations.`);
        } else {
          logger.warn(`Migration ${migrationName} does not have a 'down' method.`);
        }
      });

      // Executar rollbacks
      for (const { doc, migration } of toRollback) {
        try {
          logger.info(`Rolling back migration: ${migration.name}`);

          await migration.down!();

          // Remover registro da migração
          await doc.ref.delete();

          logger.info(`Rollback completed: ${migration.name}`);
        } catch (error) {
          logger.error(`Error rolling back migration ${migration.name}:`, error);
          throw error;
        }
      }

      logger.info('Rollback completed successfully.');
    } catch (error) {
      logger.error('Error rolling back migrations:', error);
      throw error;
    }
  }

  /**
   * Executa todos os seeds pendentes
   */
  async runSeeds(): Promise<void> {
    try {
      logger.info('Running database seeds...');

      // Buscar seeds já executados
      const executedSnapshot = await this.seedsCollection.get();
      const executedSeeds = new Set<string>();

      executedSnapshot.forEach(doc => {
        executedSeeds.add(doc.id);
      });

      // Ordenar seeds por prioridade
      const pendingSeeds = this.seeds
        .filter(seed => !executedSeeds.has(seed.name))
        .sort((a, b) => a.priority - b.priority);

      if (pendingSeeds.length === 0) {
        logger.info('No pending seeds.');
        return;
      }

      logger.info(`Found ${pendingSeeds.length} pending seeds.`);

      // Executar seeds pendentes
      for (const seed of pendingSeeds) {
        try {
          logger.info(`Running seed: ${seed.name}`);

          await seed.run();

          // Registrar seed executado
          await this.seedsCollection.doc(seed.name).set({
            name: seed.name,
            executedAt: new Date(),
          });

          logger.info(`Seed completed: ${seed.name}`);
        } catch (error) {
          logger.error(`Error running seed ${seed.name}:`, error);
          // Continuar com o próximo seed mesmo se um falhar
        }
      }

      logger.info('All seeds completed.');
    } catch (error) {
      logger.error('Error running seeds:', error);
      throw error;
    }
  }
}

// Instância singleton
const migrationManager = new DatabaseMigrationManager();

export default migrationManager;
