import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupExecFunction() {
  try {
    console.log('🔧 Criando função exec_sql...');
    
    const sqlContent = fs.readFileSync(path.join(__dirname, 'exec-sql.sql'), 'utf-8');
    
    // Dividir em comandos separados
    const commands = sqlContent.split(';').filter(cmd => cmd.trim().length > 0);
    
    for (const command of commands) {
      const trimmedCommand = command.trim();
      if (trimmedCommand) {
        console.log('Executando:', trimmedCommand.substring(0, 50) + '...');
        
        // Teste de conexão (não precisamos do resultado)
         await supabase
           .from('_dummy_table_that_does_not_exist')
           .select('*')
           .limit(0);
        
        // Como não podemos executar DDL diretamente, vamos tentar usar o RPC exec_sql se já existir
        try {
          const { error: rpcError } = await supabase.rpc('exec_sql', { sql: trimmedCommand });
          if (rpcError && !rpcError.message.includes('Could not find the function')) {
            console.error('❌ Erro ao executar comando:', rpcError.message);
          } else if (!rpcError) {
            console.log('✅ Comando executado com sucesso');
          }
        } catch (e) {
          console.log('⚠️ Função exec_sql ainda não existe, isso é esperado na primeira execução');
        }
      }
    }
    
    console.log('\n📋 Para criar a função exec_sql manualmente:');
    console.log('1. Acesse o Supabase Dashboard');
    console.log('2. Vá para SQL Editor');
    console.log('3. Execute o conteúdo do arquivo exec-sql.sql');
    console.log('\nApós isso, execute: npm run create-indexes create-all');
    
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

setupExecFunction();