import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface IndexCommand {
  sql: string;
  indexName: string;
  tableName: string;
  columns: string;
}

class IndexCreator {
  private parseIndexFile(filePath: string): IndexCommand[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const commands: IndexCommand[] = [];
    
    // Dividir por comandos SQL completos (terminados com ;)
    const sqlCommands = content.split(';').filter(cmd => cmd.trim().length > 0);
    
    for (const sqlCommand of sqlCommands) {
      const trimmed = sqlCommand.trim();
      
      if (trimmed.includes('CREATE INDEX')) {
        const indexNameMatch = trimmed.match(/idx_([^\s]+)/);
        const tableMatch = trimmed.match(/ON\s+(\w+)\s+/i);
        const columnsMatch = trimmed.match(/\(([^)]+)\)/);
        
        if (indexNameMatch && tableMatch && columnsMatch) {
          commands.push({
            sql: trimmed + ';',
            indexName: indexNameMatch[0],
            tableName: tableMatch[1],
            columns: columnsMatch[1],
          });
        }
      }
    }
    
    return commands;
  }

  async createIndex(command: IndexCommand): Promise<boolean> {
    try {
      console.log(`🔄 Criando índice ${command.indexName} na tabela ${command.tableName}...`);
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: command.sql
      });
      
      if (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Índice ${command.indexName} já existe`);
          return true;
        }
        console.error(`❌ Erro ao criar ${command.indexName}:`, error.message);
        return false;
      }
      
      console.log(`✅ Índice ${command.indexName} criado com sucesso`);
      return true;
    } catch (error) {
      console.error(`❌ Erro inesperado ao criar ${command.indexName}:`, error);
      return false;
    }
  }

  async createAllIndexes(filePath: string, highPriorityOnly: boolean = false): Promise<void> {
    console.log('🚀 Iniciando criação de índices...');
    
    const commands = this.parseIndexFile(filePath);
    
    if (highPriorityOnly) {
      // Considera apenas os primeiros 20 índices como alta prioridade
      const highPriorityCommands = commands.slice(0, 20);
      console.log(`📊 Criando ${highPriorityCommands.length} índices de alta prioridade...`);
      
      for (const command of highPriorityCommands) {
        await this.createIndex(command);
        // Pequena pausa entre criações
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } else {
      console.log(`📊 Criando todos os ${commands.length} índices...`);
      
      for (const command of commands) {
        await this.createIndex(command);
        // Pequena pausa entre criações
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('🎉 Processo de criação de índices concluído!');
  }

  async checkIndexExists(indexName: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('pg_indexes')
        .select('indexname')
        .eq('indexname', indexName)
        .single();
      
      return !error && !!data;
    } catch {
      return false;
    }
  }

  async listExistingIndexes(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('pg_indexes')
        .select('tablename, indexname')
        .order('tablename');
      
      if (error) {
        console.error('❌ Erro ao listar índices:', error);
        return;
      }
      
      console.log('📋 Índices existentes:');
      data?.forEach(index => {
        console.log(`  ${index.tablename}: ${index.indexname}`);
      });
    } catch (error) {
      console.error('❌ Erro ao listar índices:', error);
    }
  }
}

// CLI
const command = process.argv[2];
const indexCreator = new IndexCreator();
const sqlFilePath = path.join(__dirname, '..', 'recommended-indexes.sql');

switch (command) {
  case 'create-all':
    indexCreator.createAllIndexes(sqlFilePath, false);
    break;
    
  case 'create-priority':
    indexCreator.createAllIndexes(sqlFilePath, true);
    break;
    
  case 'list':
    indexCreator.listExistingIndexes();
    break;
    
  default:
    console.log(`
🔧 Script de Criação de Índices PostgreSQL

Comandos disponíveis:
  create-all      - Cria todos os índices recomendados
  create-priority - Cria apenas os índices de alta prioridade
  list           - Lista índices existentes

Exemplos:
  npm run create-indexes create-priority
  npm run create-indexes create-all
  npm run create-indexes list
`);
    break;
}