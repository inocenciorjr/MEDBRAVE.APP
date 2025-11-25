import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../../config/supabase';
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
 * Interface para registro de migração
 */
interface MigrationRecord {
  id: string;
  name: string;
  version: number;
  executed_at: string;
  execution_time_ms: number;
}

/**
 * Interface para registro de seed
 */
interface SeedRecord {
  id: string;
  name: string;
  priority: number;
  executed_at: string;
  execution_time_ms: number;
}

/**
 * Classe para gerenciar migrações e seeds do banco de dados usando Supabase
 */
export class SupabaseMigrationManager {
  private client: SupabaseClient;
  private migrationsTable = 'database_migrations';
  private seedsTable = 'database_seeds';
  private migrations: IDatabaseMigration[] = [];
  private seeds: IDatabaseSeed[] = [];

  constructor(client: SupabaseClient = supabase) {
    this.client = client;
  }

  /**
   * Registra uma migração
   * @param migration Migração a registrar
   */
  registerMigration(migration: IDatabaseMigration): void {
    this.migrations.push(migration);
    logger.debug(
      `Migration registered: ${migration.name} (v${migration.version})`,
    );
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
      logger.info(
        'SupabaseMigrationManager',
        'runMigrations',
        'Iniciando execução de migrações...',
      );

      // Buscar migrações já executadas
      const { data: executedMigrations, error: fetchError } = await this.client
        .from(this.migrationsTable)
        .select('name, version')
        .order('version', { ascending: true });

      if (fetchError) {
        logger.error(
          'SupabaseMigrationManager',
          'runMigrations',
          'Erro ao buscar migrações executadas:',
          fetchError,
        );
        throw fetchError;
      }

      const executedNames = new Set(
        executedMigrations?.map((m) => m.name) || [],
      );

      // Ordenar migrações por versão
      const sortedMigrations = this.migrations.sort(
        (a, b) => a.version - b.version,
      );

      // Executar migrações pendentes
      for (const migration of sortedMigrations) {
        if (!executedNames.has(migration.name)) {
          logger.info(
            'SupabaseMigrationManager',
            'runMigrations',
            `Executando migração: ${migration.name}`,
          );

          const startTime = Date.now();

          try {
            await migration.up();
            const executionTime = Date.now() - startTime;

            // Registrar migração como executada
            const migrationRecord: Omit<MigrationRecord, 'id'> = {
              name: migration.name,
              version: migration.version,
              executed_at: new Date().toISOString(),
              execution_time_ms: executionTime,
            };

            const { error: insertError } = await this.client
              .from(this.migrationsTable)
              .insert(migrationRecord);

            if (insertError) {
              logger.error(
                'SupabaseMigrationManager',
                'runMigrations',
                `Erro ao registrar migração ${migration.name}:`,
                insertError,
              );
              throw insertError;
            }

            logger.info(
              'SupabaseMigrationManager',
              'runMigrations',
              `Migração ${migration.name} executada com sucesso em ${executionTime}ms`,
            );
          } catch (error) {
            logger.error(
              'SupabaseMigrationManager',
              'runMigrations',
              `Erro ao executar migração ${migration.name}:`,
              error,
            );
            throw error;
          }
        } else {
          logger.debug(
            'SupabaseMigrationManager',
            'runMigrations',
            `Migração ${migration.name} já foi executada`,
          );
        }
      }

      logger.info(
        'SupabaseMigrationManager',
        'runMigrations',
        'Todas as migrações foram executadas',
      );
    } catch (error) {
      logger.error(
        'SupabaseMigrationManager',
        'runMigrations',
        'Erro inesperado:',
        error,
      );
      throw error;
    }
  }

  /**
   * Reverte migrações
   */
  async rollbackMigrations(count: number = 1): Promise<void> {
    try {
      logger.info(
        'SupabaseMigrationManager',
        'rollbackMigrations',
        `Iniciando rollback de ${count} migrações...`,
      );

      // Buscar migrações executadas em ordem decrescente
      const { data: executedMigrations, error: fetchError } = await this.client
        .from(this.migrationsTable)
        .select('*')
        .order('version', { ascending: false })
        .limit(count);

      if (fetchError) {
        logger.error(
          'SupabaseMigrationManager',
          'rollbackMigrations',
          'Erro ao buscar migrações:',
          fetchError,
        );
        throw fetchError;
      }

      if (!executedMigrations || executedMigrations.length === 0) {
        logger.info(
          'SupabaseMigrationManager',
          'rollbackMigrations',
          'Nenhuma migração para reverter',
        );
        return;
      }

      // Reverter migrações
      for (const migrationRecord of executedMigrations) {
        const migration = this.migrations.find(
          (m) => m.name === migrationRecord.name,
        );

        if (!migration) {
          logger.warn(
            'SupabaseMigrationManager',
            'rollbackMigrations',
            `Migração ${migrationRecord.name} não encontrada no código`,
          );
          continue;
        }

        if (!migration.down) {
          logger.warn(
            'SupabaseMigrationManager',
            'rollbackMigrations',
            `Migração ${migration.name} não possui método down()`,
          );
          continue;
        }

        logger.info(
          'SupabaseMigrationManager',
          'rollbackMigrations',
          `Revertendo migração: ${migration.name}`,
        );

        try {
          await migration.down();

          // Remover registro da migração
          const { error: deleteError } = await this.client
            .from(this.migrationsTable)
            .delete()
            .eq('id', migrationRecord.id);

          if (deleteError) {
            logger.error(
              'SupabaseMigrationManager',
              'rollbackMigrations',
              `Erro ao remover registro da migração ${migration.name}:`,
              deleteError,
            );
            throw deleteError;
          }

          logger.info(
            'SupabaseMigrationManager',
            'rollbackMigrations',
            `Migração ${migration.name} revertida com sucesso`,
          );
        } catch (error) {
          logger.error(
            'SupabaseMigrationManager',
            'rollbackMigrations',
            `Erro ao reverter migração ${migration.name}:`,
            error,
          );
          throw error;
        }
      }

      logger.info(
        'SupabaseMigrationManager',
        'rollbackMigrations',
        'Rollback concluído',
      );
    } catch (error) {
      logger.error(
        'SupabaseMigrationManager',
        'rollbackMigrations',
        'Erro inesperado:',
        error,
      );
      throw error;
    }
  }

  /**
   * Executa todos os seeds
   */
  async runSeeds(): Promise<void> {
    try {
      logger.info(
        'SupabaseMigrationManager',
        'runSeeds',
        'Iniciando execução de seeds...',
      );

      // Buscar seeds já executados
      const { data: executedSeeds, error: fetchError } = await this.client
        .from(this.seedsTable)
        .select('name')
        .order('priority', { ascending: true });

      if (fetchError) {
        logger.error(
          'SupabaseMigrationManager',
          'runSeeds',
          'Erro ao buscar seeds executados:',
          fetchError,
        );
        throw fetchError;
      }

      const executedNames = new Set(executedSeeds?.map((s) => s.name) || []);

      // Ordenar seeds por prioridade
      const sortedSeeds = this.seeds.sort((a, b) => a.priority - b.priority);

      // Executar seeds pendentes
      for (const seed of sortedSeeds) {
        if (!executedNames.has(seed.name)) {
          logger.info(
            'SupabaseMigrationManager',
            'runSeeds',
            `Executando seed: ${seed.name}`,
          );

          const startTime = Date.now();

          try {
            await seed.run();
            const executionTime = Date.now() - startTime;

            // Registrar seed como executado
            const seedRecord: Omit<SeedRecord, 'id'> = {
              name: seed.name,
              priority: seed.priority,
              executed_at: new Date().toISOString(),
              execution_time_ms: executionTime,
            };

            const { error: insertError } = await this.client
              .from(this.seedsTable)
              .insert(seedRecord);

            if (insertError) {
              logger.error(
                'SupabaseMigrationManager',
                'runSeeds',
                `Erro ao registrar seed ${seed.name}:`,
                insertError,
              );
              throw insertError;
            }

            logger.info(
              'SupabaseMigrationManager',
              'runSeeds',
              `Seed ${seed.name} executado com sucesso em ${executionTime}ms`,
            );
          } catch (error) {
            logger.error(
              'SupabaseMigrationManager',
              'runSeeds',
              `Erro ao executar seed ${seed.name}:`,
              error,
            );
            throw error;
          }
        } else {
          logger.debug(
            'SupabaseMigrationManager',
            'runSeeds',
            `Seed ${seed.name} já foi executado`,
          );
        }
      }

      logger.info(
        'SupabaseMigrationManager',
        'runSeeds',
        'Todos os seeds foram executados',
      );
    } catch (error) {
      logger.error(
        'SupabaseMigrationManager',
        'runSeeds',
        'Erro inesperado:',
        error,
      );
      throw error;
    }
  }

  /**
   * Lista migrações executadas
   */
  async getExecutedMigrations(): Promise<MigrationRecord[]> {
    try {
      const { data, error } = await this.client
        .from(this.migrationsTable)
        .select('*')
        .order('version', { ascending: true });

      if (error) {
        logger.error(
          'SupabaseMigrationManager',
          'getExecutedMigrations',
          'Erro ao buscar migrações:',
          error,
        );
        throw error;
      }

      return (data as MigrationRecord[]) || [];
    } catch (error) {
      logger.error(
        'SupabaseMigrationManager',
        'getExecutedMigrations',
        'Erro inesperado:',
        error,
      );
      throw error;
    }
  }

  /**
   * Lista seeds executados
   */
  async getExecutedSeeds(): Promise<SeedRecord[]> {
    try {
      const { data, error } = await this.client
        .from(this.seedsTable)
        .select('*')
        .order('priority', { ascending: true });

      if (error) {
        logger.error(
          'SupabaseMigrationManager',
          'getExecutedSeeds',
          'Erro ao buscar seeds:',
          error,
        );
        throw error;
      }

      return (data as SeedRecord[]) || [];
    } catch (error) {
      logger.error(
        'SupabaseMigrationManager',
        'getExecutedSeeds',
        'Erro inesperado:',
        error,
      );
      throw error;
    }
  }
}

// Exportar instância padrão
export const migrationManager = new SupabaseMigrationManager();
