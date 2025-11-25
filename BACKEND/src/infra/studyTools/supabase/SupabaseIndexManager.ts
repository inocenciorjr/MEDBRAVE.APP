import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../../../utils/logger';
import { AppError } from '../../../shared/errors/AppError';

export interface IndexDefinition {
  table: string;
  columns: string[];
  unique?: boolean;
  partial?: string; // WHERE clause for partial index
  method?: 'btree' | 'hash' | 'gin' | 'gist';
  name?: string;
}

export interface QueryPerformance {
  query: string;
  executionTimeMs: number;
  planningTimeMs: number;
  executionCount: number;
  avgExecutionTime: number;
  slowestExecution: number;
  indexesUsed: string[];
  suggestedIndexes?: string[];
}

export interface IndexUsageStats {
  indexName: string;
  tableName: string;
  schemaName: string;
  indexSize: string;
  tuples: number;
  indexScans: number;
  tuplesRead: number;
  tuplesReturned: number;
  efficiency: number; // percentage
  lastUsed?: Date;
}

export interface IndexHealthReport {
  totalIndexes: number;
  unusedIndexes: IndexUsageStats[];
  duplicateIndexes: Array<{
    indexes: string[];
    table: string;
    columns: string[];
  }>;
  missingIndexes: Array<{
    table: string;
    suggestedColumns: string[];
    reason: string;
  }>;
  performanceIssues: QueryPerformance[];
  recommendations: string[];
}

export class SupabaseIndexManager {
  private supabase: SupabaseClient;
  private queryPerformanceCache: Map<string, QueryPerformance> = new Map();

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Create an index on Supabase
   */
  public async createIndex(indexDef: IndexDefinition): Promise<void> {
    try {
      const isValidIdentifier = (s: string) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s);
      if (!isValidIdentifier(indexDef.table)) {
        throw new AppError('Invalid table name', 400);
      }
      if (!indexDef.columns.length || !indexDef.columns.every(isValidIdentifier)) {
        throw new AppError('Invalid column name(s)', 400);
      }
      const indexName =
        indexDef.name || `idx_${indexDef.table}_${indexDef.columns.join('_')}`;
      const method = indexDef.method || 'btree';
      const unique = indexDef.unique ? 'UNIQUE' : '';
      // cláusula parcial desabilitada

      const sql = `
        CREATE ${unique} INDEX CONCURRENTLY IF NOT EXISTS ${indexName}
        ON ${indexDef.table} USING ${method} (${indexDef.columns.join(', ')})
      `;
      // Sem cláusula parcial para evitar SQL injection via entrada externa

      const { error } = await this.supabase.rpc('execute_sql', { sql });

      if (error) {
        logger.error(`Error creating index ${indexName}:`, error);
        throw new AppError(`Failed to create index: ${error.message}`, 500);
      }

      logger.info(`Successfully created index: ${indexName}`);
    } catch (error) {
      logger.error('Error in createIndex:', error);
      throw error;
    }
  }

  /**
   * Drop an index
   */
  public async dropIndex(indexName: string): Promise<void> {
    try {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(indexName)) {
        throw new AppError('Invalid index name', 400);
      }
      const sql = `DROP INDEX CONCURRENTLY IF EXISTS ${indexName};`;

      const { error } = await this.supabase.rpc('execute_sql', { sql });

      if (error) {
        logger.error(`Error dropping index ${indexName}:`, error);
        throw new AppError(`Failed to drop index: ${error.message}`, 500);
      }

      logger.info(`Successfully dropped index: ${indexName}`);
    } catch (error) {
      logger.error('Error in dropIndex:', error);
      throw error;
    }
  }

  /**
   * Get index usage statistics
   */
  public async getIndexUsageStats(
    tableName?: string,
  ): Promise<IndexUsageStats[]> {
    try {
      let sql = `
        SELECT 
          schemaname as schema_name,
          tablename as table_name,
          indexname as index_name,
          pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_returned,
          idx_scan as index_scans,
          CASE 
            WHEN idx_tup_read > 0 THEN round((idx_tup_fetch::numeric / idx_tup_read::numeric) * 100, 2)
            ELSE 0
          END as efficiency
        FROM pg_stat_user_indexes
        JOIN pg_indexes ON pg_indexes.indexname = pg_stat_user_indexes.indexname
      `;

      if (tableName) {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
          throw new AppError('Invalid table name', 400);
        }
        sql += ` WHERE tablename = '${tableName}'`;
      }

      sql += ' ORDER BY idx_scan DESC;';

      const { data, error } = await this.supabase.rpc('execute_sql', { sql });

      if (error) {
        logger.error('Error fetching index usage stats:', error);
        throw new AppError('Failed to fetch index usage stats', 500);
      }

      return (data || []).map((row: any) => ({
        indexName: row.index_name,
        tableName: row.table_name,
        schemaName: row.schema_name,
        indexSize: row.index_size,
        tuples: row.tuples_read || 0,
        indexScans: row.index_scans || 0,
        tuplesRead: row.tuples_read || 0,
        tuplesReturned: row.tuples_returned || 0,
        efficiency: row.efficiency || 0,
      }));
    } catch (error) {
      logger.error('Error in getIndexUsageStats:', error);
      throw error;
    }
  }

  /**
   * Analyze query performance
   */
  public async analyzeQuery(query: string): Promise<QueryPerformance> {
    try {
      if (!/^\s*SELECT\s+/i.test(query)) {
        throw new AppError('Only SELECT queries are allowed for analysis', 400);
      }
      // Check cache first
      const cacheKey = this.hashQuery(query);
      if (this.queryPerformanceCache.has(cacheKey)) {
        return this.queryPerformanceCache.get(cacheKey)!;
      }

      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;

      const startTime = Date.now();
      const { data, error } = await this.supabase.rpc('execute_sql', {
        sql: explainQuery,
      });
      const executionTimeMs = Date.now() - startTime;

      if (error) {
        logger.error('Error analyzing query:', error);
        throw new AppError('Failed to analyze query', 500);
      }

      const plan = data[0]?.['QUERY PLAN'][0];
      const planningTimeMs = plan?.['Planning Time'] || 0;
      const actualExecutionTime = plan?.['Execution Time'] || executionTimeMs;

      // Extract indexes used
      const indexesUsed = this.extractIndexesFromPlan(plan);

      // Generate suggestions
      const suggestedIndexes = this.generateIndexSuggestions(query, plan);

      const performance: QueryPerformance = {
        query,
        executionTimeMs: actualExecutionTime,
        planningTimeMs,
        executionCount: 1,
        avgExecutionTime: actualExecutionTime,
        slowestExecution: actualExecutionTime,
        indexesUsed,
        suggestedIndexes,
      };

      // Cache the result
      this.queryPerformanceCache.set(cacheKey, performance);

      return performance;
    } catch (error) {
      logger.error('Error in analyzeQuery:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive index health report
   */
  public async getIndexHealthReport(): Promise<IndexHealthReport> {
    try {
      const [indexStats, duplicates, slowQueries] = await Promise.all([
        this.getIndexUsageStats(),
        this.findDuplicateIndexes(),
        this.getSlowQueries(),
      ]);

      // Find unused indexes (no scans in recent period)
      const unusedIndexes = indexStats.filter(
        (stat) =>
          stat.indexScans === 0 &&
          !stat.indexName.endsWith('_pkey') && // Don't flag primary keys
          !stat.indexName.includes('unique'), // Don't flag unique constraints
      );

      // Generate missing index suggestions
      const missingIndexes = await this.suggestMissingIndexes();

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        unusedIndexes,
        duplicates,
        missingIndexes,
        slowQueries,
      );

      return {
        totalIndexes: indexStats.length,
        unusedIndexes,
        duplicateIndexes: duplicates,
        missingIndexes,
        performanceIssues: slowQueries,
        recommendations,
      };
    } catch (error) {
      logger.error('Error in getIndexHealthReport:', error);
      throw error;
    }
  }

  /**
   * Find duplicate indexes
   */
  private async findDuplicateIndexes(): Promise<
    Array<{
      indexes: string[];
      table: string;
      columns: string[];
    }>
    > {
    try {
      const sql = `
        SELECT 
          schemaname,
          tablename,
          indexname,
          string_agg(attname, ',' ORDER BY attnum) as columns
        FROM pg_index
        JOIN pg_class ON pg_class.oid = pg_index.indexrelid
        JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
        JOIN pg_class t ON t.oid = pg_index.indrelid
        JOIN pg_attribute ON pg_attribute.attrelid = pg_index.indrelid 
                         AND pg_attribute.attnum = ANY(pg_index.indkey)
        WHERE pg_namespace.nspname = 'public'
        GROUP BY schemaname, tablename, indexname
        ORDER BY tablename, columns;
      `;

      const { data, error } = await this.supabase.rpc('execute_sql', { sql });

      if (error) {
        logger.error('Error finding duplicate indexes:', error);
        return [];
      }

      // Group by table and columns to find duplicates
      const grouped: Record<string, any[]> = {};
      for (const row of data || []) {
        const key = `${row.tablename}:${row.columns}`;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(row);
      }

      // Find groups with more than one index
      const duplicates = Object.entries(grouped)
        .filter(([, indexes]) => indexes.length > 1)
        .map(([key, indexes]) => {
          const [table] = key.split(':');
          const columns = indexes[0].columns.split(',');
          return {
            indexes: indexes.map((idx) => idx.indexname),
            table,
            columns,
          };
        });

      return duplicates;
    } catch (error) {
      logger.error('Error in findDuplicateIndexes:', error);
      return [];
    }
  }

  /**
   * Get slow queries from performance monitoring
   */
  private async getSlowQueries(): Promise<QueryPerformance[]> {
    try {
      // This would typically come from pg_stat_statements or performance monitoring
      // For now, return cached query performance data
      return Array.from(this.queryPerformanceCache.values())
        .filter((perf) => perf.executionTimeMs > 1000) // Queries slower than 1 second
        .sort((a, b) => b.executionTimeMs - a.executionTimeMs)
        .slice(0, 10); // Top 10 slowest
    } catch (error) {
      logger.error('Error in getSlowQueries:', error);
      return [];
    }
  }

  /**
   * Suggest missing indexes based on common query patterns
   */
  private async suggestMissingIndexes(): Promise<
    Array<{
      table: string;
      suggestedColumns: string[];
      reason: string;
    }>
    > {
    const suggestions = [];

    // Common patterns for study tools
    const commonPatterns = [
      {
        table: 'fsrs_cards',
        suggestedColumns: ['user_id', 'due'],
        reason: 'Frequently queried for due reviews by user',
      },
      {
        table: 'fsrs_cards',
        suggestedColumns: ['user_id', 'content_type', 'due'],
        reason: 'Composite index for filtered due reviews',
      },
      {
        table: 'flashcards',
        suggestedColumns: ['user_id', 'deck_id', 'is_active'],
        reason: 'Common filter combination for active cards in deck',
      },
      {
        table: 'error_notebook_entries',
        suggestedColumns: ['user_id', 'created_at'],
        reason: 'Chronological listing of user entries',
      },
      {
        table: 'daily_progress',
        suggestedColumns: ['user_id', 'date'],
        reason: 'Daily progress tracking',
      },
    ];

    // Check if these indexes already exist
    for (const pattern of commonPatterns) {
      const indexExists = await this.checkIndexExists(
        pattern.table,
        pattern.suggestedColumns,
      );
      if (!indexExists) {
        suggestions.push(pattern);
      }
    }

    return suggestions;
  }

  /**
   * Check if an index exists for given table and columns
   */
  private async checkIndexExists(
    tableName: string,
    columns: string[],
  ): Promise<boolean> {
    try {
      const sql = `
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE tablename = '${tableName}'
        AND indexdef LIKE '%${columns.join('%')}%';
      `;

      const { data, error } = await this.supabase.rpc('execute_sql', { sql });

      if (error) {
        logger.error('Error checking index existence:', error);
        return false;
      }

      return (data?.[0]?.count || 0) > 0;
    } catch (error) {
      logger.error('Error in checkIndexExists:', error);
      return false;
    }
  }

  /**
   * Extract indexes used from query plan
   */
  private extractIndexesFromPlan(plan: any): string[] {
    const indexes: string[] = [];

    const extractFromNode = (node: any) => {
      if (node['Index Name']) {
        indexes.push(node['Index Name']);
      }

      if (node.Plans) {
        for (const subPlan of node.Plans) {
          extractFromNode(subPlan);
        }
      }
    };

    if (plan) {
      extractFromNode(plan.Plan || plan);
    }

    return Array.from(new Set(indexes));
  }

  /**
   * Generate index suggestions based on query plan
   */
  private generateIndexSuggestions(_query: string, plan: any): string[] {
    const suggestions: string[] = [];

    // Look for sequential scans that could benefit from indexes
    const findSeqScans = (node: any) => {
      if (node['Node Type'] === 'Seq Scan') {
        const relation = node['Relation Name'];
        if (relation) {
          suggestions.push(`Consider adding an index on table: ${relation}`);
        }
      }

      if (node.Plans) {
        for (const subPlan of node.Plans) {
          findSeqScans(subPlan);
        }
      }
    };

    if (plan) {
      findSeqScans(plan.Plan || plan);
    }

    return Array.from(new Set(suggestions));
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    unusedIndexes: IndexUsageStats[],
    duplicates: Array<{ indexes: string[]; table: string; columns: string[] }>,
    missingIndexes: Array<{
      table: string;
      suggestedColumns: string[];
      reason: string;
    }>,
    slowQueries: QueryPerformance[],
  ): string[] {
    const recommendations: string[] = [];

    if (unusedIndexes.length > 0) {
      recommendations.push(
        `Consider dropping ${unusedIndexes.length} unused indexes to improve write performance and reduce storage.`,
      );
    }

    if (duplicates.length > 0) {
      recommendations.push(
        `Found ${duplicates.length} sets of duplicate indexes. Consider keeping only the most efficient one from each set.`,
      );
    }

    if (missingIndexes.length > 0) {
      recommendations.push(
        `Consider adding ${missingIndexes.length} suggested indexes to improve query performance.`,
      );
    }

    if (slowQueries.length > 0) {
      recommendations.push(
        `Found ${slowQueries.length} slow queries. Review and optimize these queries or add appropriate indexes.`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Index configuration appears to be well optimized.');
    }

    return recommendations;
  }

  /**
   * Hash query for caching
   */
  private hashQuery(query: string): string {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Clear performance cache
   */
  public clearCache(): void {
    this.queryPerformanceCache.clear();
  }

  /**
   * Validate index configuration
   */
  public async validateIndexes(): Promise<{
    valid: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    try {
      const healthReport = await this.getIndexHealthReport();
      const issues: string[] = [];
      const suggestions: string[] = [];

      // Check for critical issues
      if (healthReport.unusedIndexes.length > 5) {
        issues.push(
          `Too many unused indexes (${healthReport.unusedIndexes.length})`,
        );
        suggestions.push('Review and remove unused indexes');
      }

      if (healthReport.duplicateIndexes.length > 0) {
        issues.push(
          `Duplicate indexes found (${healthReport.duplicateIndexes.length} sets)`,
        );
        suggestions.push('Consolidate duplicate indexes');
      }

      if (healthReport.performanceIssues.length > 3) {
        issues.push(
          `Multiple slow queries detected (${healthReport.performanceIssues.length})`,
        );
        suggestions.push('Optimize slow queries or add missing indexes');
      }

      return {
        valid: issues.length === 0,
        issues,
        suggestions:
          suggestions.length > 0 ? suggestions : healthReport.recommendations,
      };
    } catch (error) {
      logger.error('Error in validateIndexes:', error);
      return {
        valid: false,
        issues: ['Failed to validate indexes'],
        suggestions: ['Check database connectivity and permissions'],
      };
    }
  }
}
