import * as fs from 'fs';
import * as path from 'path';

interface QueryPattern {
  table: string;
  columns: string[];
  whereConditions: string[];
  orderBy: string[];
  frequency: number;
  source: string;
}

interface IndexRecommendation {
  table: string;
  columns: string[];
  type: 'btree' | 'gin' | 'gist';
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
}

class BackendIndexAnalyzer {
  private queryPatterns: QueryPattern[] = [];
  private recommendations: IndexRecommendation[] = [];

  /**
   * Analisa todos os repositórios Supabase para identificar padrões de query
   */
  public async analyzeBackendQueries(): Promise<void> {
    const backendPath = path.join(__dirname, '../src');
    
    // Buscar todos os arquivos de repositório Supabase
    const supabaseFiles = this.findSupabaseRepositories(backendPath);
    
    console.log(`Analisando ${supabaseFiles.length} arquivos de repositório Supabase...`);
    
    for (const filePath of supabaseFiles) {
      await this.analyzeFile(filePath);
    }
    
    // Gerar recomendações baseadas nos padrões encontrados
    this.generateIndexRecommendations();
    
    // Exibir relatório
    this.displayReport();
  }

  /**
   * Encontra todos os arquivos de repositório Supabase
   */
  private findSupabaseRepositories(dir: string): string[] {
    const files: string[] = [];
    
    const scanDirectory = (currentDir: string) => {
      try {
        const items = fs.readdirSync(currentDir);
        
        for (const item of items) {
          const fullPath = path.join(currentDir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            scanDirectory(fullPath);
          } else if (item.includes('Supabase') && (item.endsWith('.ts') || item.endsWith('.js'))) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Ignorar diretórios inacessíveis
      }
    };
    
    scanDirectory(dir);
    return files;
  }

  /**
   * Analisa um arquivo específico em busca de padrões de query
   */
  private async analyzeFile(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = path.basename(filePath);
      
      // Extrair nome da tabela do arquivo
      const tableMatch = fileName.match(/Supabase(\w+)Repository/);
      const tableName = tableMatch ? this.convertToTableName(tableMatch[1]) : 'unknown';
      
      console.log(`Analisando ${fileName} -> tabela: ${tableName}`);
      
      // Padrões de query comuns no Supabase
      this.analyzeSupabaseQueries(content, tableName, fileName);
      
    } catch (error) {
      console.warn(`Erro ao analisar ${filePath}:`, (error as Error).message);
    }
  }

  /**
   * Analisa queries Supabase no conteúdo do arquivo
   */
  private analyzeSupabaseQueries(content: string, tableName: string, fileName: string): void {
    // Padrões para identificar colunas usadas em WHERE
    const wherePatterns = [
      /\.eq\(['"](\w+)['"],/g,
      /\.filter\(['"](\w+)['"],/g,
      /\.in\(['"](\w+)['"],/g,
      /\.gte\(['"](\w+)['"],/g,
      /\.lte\(['"](\w+)['"],/g,
      /\.lt\(['"](\w+)['"],/g,
      /\.gt\(['"](\w+)['"],/g,
      /\.neq\(['"](\w+)['"],/g,
      /\.like\(['"](\w+)['"],/g,
      /\.ilike\(['"](\w+)['"],/g,
    ];
    
    // Padrões para ORDER BY
    const orderPatterns = [
      /\.order\(['"](\w+)['"],/g,
    ];
    
    // Coletar colunas WHERE
    const whereColumns: string[] = [];
    for (const pattern of wherePatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        whereColumns.push(match[1]);
      }
    }
    
    // Coletar colunas ORDER BY
    const orderColumns: string[] = [];
    for (const pattern of orderPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        orderColumns.push(match[1]);
      }
    }
    
    // Buscar queries compostas (múltiplas condições)
    this.analyzeCompositeQueries(content, tableName, fileName);
    
    // Adicionar padrões encontrados
    const allColumns = [...new Set([...whereColumns, ...orderColumns])];
    if (allColumns.length > 0) {
      this.addQueryPattern({
        table: tableName,
        columns: allColumns,
        whereConditions: whereColumns,
        orderBy: orderColumns,
        frequency: 1,
        source: fileName
      });
    }
  }

  /**
   * Analisa queries compostas com múltiplas condições
   */
  private analyzeCompositeQueries(content: string, tableName: string, fileName: string): void {
    // Buscar chains de métodos que indicam queries compostas
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Se a linha contém .from(), analisar as próximas linhas para chain
      if (line.includes('.from(')) {
        const chainLines = [line];
        
        // Coletar linhas que fazem parte da mesma query
        for (let j = i + 1; j < lines.length && j < i + 10; j++) {
          const nextLine = lines[j].trim();
          if (nextLine.startsWith('.') && (nextLine.includes('eq(') || nextLine.includes('filter(') || nextLine.includes('order('))) {
            chainLines.push(nextLine);
          } else if (!nextLine.startsWith('.')) {
            break;
          }
        }
        
        if (chainLines.length > 1) {
          const fullChain = chainLines.join(' ');
          const columns = this.extractColumnsFromChain(fullChain);
          
          if (columns.length > 1) {
            this.addQueryPattern({
              table: tableName,
              columns,
              whereConditions: columns,
              orderBy: [],
              frequency: 1,
              source: fileName
            });
          }
        }
      }
    }
  }

  /**
   * Extrai colunas de uma cadeia de métodos Supabase
   */
  private extractColumnsFromChain(chain: string): string[] {
    const columns: string[] = [];
    const methods = ['eq', 'filter', 'in', 'gte', 'lte', 'gt', 'lt', 'order'];
    
    for (const method of methods) {
      const pattern = new RegExp(`\\.${method}\\(['\"]([\\w_]+)['\"]`, 'g');
      let match;
      
      while ((match = pattern.exec(chain)) !== null) {
        columns.push(match[1]);
      }
    }
    
    return [...new Set(columns)];
  }

  /**
   * Adiciona um padrão de query à lista
   */
  private addQueryPattern(pattern: QueryPattern): void {
    const existing = this.queryPatterns.find(p => 
      p.table === pattern.table && 
      JSON.stringify(p.columns.sort()) === JSON.stringify(pattern.columns.sort())
    );
    
    if (existing) {
      existing.frequency++;
    } else {
      this.queryPatterns.push(pattern);
    }
  }

  /**
   * Converte nome do repositório para nome da tabela
   */
  private convertToTableName(repositoryName: string): string {
    const mapping: Record<string, string> = {
      'Flashcard': 'flashcards',
      'Deck': 'decks',
      'StudySession': 'study_sessions',
      'ErrorNotebook': 'error_notebook_entries',
      'UnifiedReview': 'unified_reviews',
      'Achievement': 'user_achievements',
      'Notification': 'notifications',
      'User': 'users',
      'Question': 'questions',
      'Collection': 'collections',
      'FSRSCard': 'fsrs_cards',
      'PerformanceMetrics': 'performance_metrics',
      'SearchIndex': 'search_index',
      'StudyTool': 'study_tools'
    };
    
    return mapping[repositoryName] || repositoryName.toLowerCase() + 's';
  }

  /**
   * Gera recomendações de índices baseadas nos padrões encontrados
   */
  private generateIndexRecommendations(): void {
    // Agrupar padrões por tabela
    const tablePatterns = this.groupPatternsByTable();
    
    for (const [table, patterns] of Object.entries(tablePatterns)) {
      // Índices para colunas mais frequentes
      const columnFrequency = this.calculateColumnFrequency(patterns);
      
      // Recomendar índices baseados na frequência
      for (const [column, frequency] of Object.entries(columnFrequency)) {
        if (frequency >= 2) {
          this.recommendations.push({
            table,
            columns: [column],
            type: 'btree',
            reason: `Coluna ${column} usada em ${frequency} queries`,
            priority: frequency >= 5 ? 'high' : frequency >= 3 ? 'medium' : 'low',
            estimatedImpact: `Melhoria de ${frequency * 20}% em queries com ${column}`
          });
        }
      }
      
      // Índices compostos para padrões comuns
      this.generateCompositeIndexes(table, patterns);
    }
    
    // Adicionar índices essenciais baseados em padrões conhecidos
    this.addEssentialIndexes();
  }

  /**
   * Agrupa padrões por tabela
   */
  private groupPatternsByTable(): Record<string, QueryPattern[]> {
    const grouped: Record<string, QueryPattern[]> = {};
    
    for (const pattern of this.queryPatterns) {
      if (!grouped[pattern.table]) {
        grouped[pattern.table] = [];
      }
      grouped[pattern.table].push(pattern);
    }
    
    return grouped;
  }

  /**
   * Calcula frequência de uso de cada coluna
   */
  private calculateColumnFrequency(patterns: QueryPattern[]): Record<string, number> {
    const frequency: Record<string, number> = {};
    
    for (const pattern of patterns) {
      for (const column of pattern.columns) {
        frequency[column] = (frequency[column] || 0) + pattern.frequency;
      }
    }
    
    return frequency;
  }

  /**
   * Gera índices compostos baseados em padrões de uso
   */
  private generateCompositeIndexes(table: string, patterns: QueryPattern[]): void {
    // Buscar padrões com múltiplas colunas
    const multiColumnPatterns = patterns.filter(p => p.columns.length > 1);
    
    for (const pattern of multiColumnPatterns) {
      if (pattern.frequency >= 2) {
        this.recommendations.push({
          table,
          columns: pattern.columns,
          type: 'btree',
          reason: `Índice composto para query com ${pattern.columns.join(', ')}`,
          priority: pattern.frequency >= 3 ? 'high' : 'medium',
          estimatedImpact: `Otimização de queries complexas com múltiplas condições`
        });
      }
    }
  }

  /**
   * Adiciona índices essenciais baseados em padrões conhecidos
   */
  private addEssentialIndexes(): void {
    const essentialIndexes = [
      // Índices de usuário (padrão mais comum)
      { table: 'unified_reviews', columns: ['user_id', 'due_date'], reason: 'Queries de revisão por usuário e data' },
      { table: 'flashcards', columns: ['user_id', 'deck_id'], reason: 'Flashcards por usuário e deck' },
      { table: 'fsrs_cards', columns: ['user_id', 'due_date'], reason: 'Cards FSRS por usuário e vencimento' },
      { table: 'study_sessions', columns: ['user_id', 'created_at'], reason: 'Sessões de estudo por usuário' },
      { table: 'notifications', columns: ['user_id', 'is_read'], reason: 'Notificações por usuário e status' },
      
      // Índices de busca
      { table: 'questions', columns: ['filter_ids'], reason: 'Busca por filtros (array)', type: 'gin' as const },
      { table: 'flashcards', columns: ['tags'], reason: 'Busca por tags (array)', type: 'gin' as const },
      
      // Índices de performance
      { table: 'performance_metrics', columns: ['created_at'], reason: 'Ordenação temporal de métricas' },
      { table: 'audit_logs', columns: ['created_at'], reason: 'Logs de auditoria por data' },
    ];
    
    for (const index of essentialIndexes) {
      // Verificar se já existe recomendação similar
      const exists = this.recommendations.some(r => 
        r.table === index.table && 
        JSON.stringify(r.columns.sort()) === JSON.stringify(index.columns.sort())
      );
      
      if (!exists) {
        this.recommendations.push({
          table: index.table,
          columns: index.columns,
          type: index.type || 'btree',
          reason: index.reason,
          priority: 'high',
          estimatedImpact: 'Essencial para performance da aplicação'
        });
      }
    }
  }

  /**
   * Exibe relatório de recomendações
   */
  private displayReport(): void {
    console.log('\n=== RELATÓRIO DE ANÁLISE DE ÍNDICES ===\n');
    
    console.log(`Arquivos analisados: ${this.queryPatterns.length} padrões encontrados`);
    console.log(`Recomendações geradas: ${this.recommendations.length}\n`);
    
    // Agrupar por prioridade
    const byPriority = {
      high: this.recommendations.filter(r => r.priority === 'high'),
      medium: this.recommendations.filter(r => r.priority === 'medium'),
      low: this.recommendations.filter(r => r.priority === 'low')
    };
    
    console.log('=== ÍNDICES DE ALTA PRIORIDADE ===');
    this.displayRecommendations(byPriority.high);
    
    console.log('\n=== ÍNDICES DE MÉDIA PRIORIDADE ===');
    this.displayRecommendations(byPriority.medium);
    
    console.log('\n=== ÍNDICES DE BAIXA PRIORIDADE ===');
    this.displayRecommendations(byPriority.low);
    
    console.log('\n=== PADRÕES DE QUERY ENCONTRADOS ===');
    this.displayQueryPatterns();
  }

  /**
   * Exibe recomendações formatadas
   */
  private displayRecommendations(recommendations: IndexRecommendation[]): void {
    for (const rec of recommendations) {
      console.log(`\nTabela: ${rec.table}`);
      console.log(`Colunas: ${rec.columns.join(', ')}`);
      console.log(`Tipo: ${rec.type.toUpperCase()}`);
      console.log(`Razão: ${rec.reason}`);
      console.log(`Impacto: ${rec.estimatedImpact}`);
      console.log('---');
    }
  }

  /**
   * Exibe padrões de query encontrados
   */
  private displayQueryPatterns(): void {
    const tableGroups = this.groupPatternsByTable();
    
    for (const [table, patterns] of Object.entries(tableGroups)) {
      console.log(`\n${table.toUpperCase()}:`);
      
      const columnFreq = this.calculateColumnFrequency(patterns);
      const sortedColumns = Object.entries(columnFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
      
      for (const [column, freq] of sortedColumns) {
        console.log(`  ${column}: ${freq} usos`);
      }
    }
  }

  /**
   * Gera script SQL para criação dos índices recomendados
   */
  public async generateIndexScript(): Promise<string> {
    let script = '-- Script de Criação de Índices PostgreSQL\n';
    script += '-- Gerado automaticamente baseado na análise do código backend\n\n';
    
    // Agrupar por prioridade
    const highPriority = this.recommendations.filter(r => r.priority === 'high');
    const mediumPriority = this.recommendations.filter(r => r.priority === 'medium');
    const lowPriority = this.recommendations.filter(r => r.priority === 'low');
    
    script += '-- ÍNDICES DE ALTA PRIORIDADE (Criar primeiro)\n';
    script += this.generateSQLForRecommendations(highPriority);
    
    script += '\n-- ÍNDICES DE MÉDIA PRIORIDADE\n';
    script += this.generateSQLForRecommendations(mediumPriority);
    
    script += '\n-- ÍNDICES DE BAIXA PRIORIDADE (Opcional)\n';
    script += this.generateSQLForRecommendations(lowPriority);
    
    return script;
  }

  /**
   * Gera SQL para um conjunto de recomendações
   */
  private generateSQLForRecommendations(recommendations: IndexRecommendation[]): string {
    let sql = '';
    
    for (const rec of recommendations) {
      const indexName = `idx_${rec.table}_${rec.columns.join('_')}`;
      sql += `\n-- ${rec.reason}\n`;
      sql += `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${indexName}\n`;
      sql += `ON ${rec.table} USING ${rec.type} (${rec.columns.join(', ')});\n`;
    }
    
    return sql;
  }
}

// CLI interface
if (require.main === module) {
  const analyzer = new BackendIndexAnalyzer();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'analyze':
      analyzer.analyzeBackendQueries()
        .then(() => {
          console.log('\nAnálise concluída!');
          process.exit(0);
        })
        .catch((error) => {
          console.error('Erro na análise:', error);
          process.exit(1);
        });
      break;
      
    case 'generate-script':
      analyzer.analyzeBackendQueries()
        .then(() => analyzer.generateIndexScript())
        .then((script) => {
          console.log(script);
          
          // Salvar em arquivo
          const fs = require('fs');
          fs.writeFileSync('recommended-indexes.sql', script);
          console.log('\nScript salvo em recommended-indexes.sql');
          process.exit(0);
        })
        .catch((error) => {
          console.error('Erro ao gerar script:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Uso:');
      console.log('  npm run analyze-indexes analyze        # Analisar código e mostrar recomendações');
      console.log('  npm run analyze-indexes generate-script # Gerar script SQL');
      process.exit(1);
  }
}

export { BackendIndexAnalyzer };