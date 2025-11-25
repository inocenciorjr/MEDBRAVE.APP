import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const databaseUrl = process.env.DATABASE_URL!;

// Criar cliente Supabase com service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Criar cliente PostgreSQL direto
const pgClient = new Client({
  connectionString: databaseUrl
});

async function applyTriggerMigration() {
  try {
    console.log('📄 Lendo arquivo de migração do trigger...');
    
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250128000000_create_oauth_user_trigger.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔄 Aplicando migração do trigger...');
    
    // Executar o SQL diretamente usando uma query raw
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('❌ Erro ao aplicar migração:', error);
      return;
    }
    
    console.log('✅ Migração do trigger aplicada com sucesso!');
    console.log('📊 Resultado:', data);
    
    // Verificar se o trigger foi criado
    const { data: triggers, error: triggerError } = await supabase
      .from('information_schema.triggers')
      .select('*')
      .eq('trigger_name', 'on_auth_user_created');
    
    if (triggerError) {
      console.error('❌ Erro ao verificar trigger:', triggerError);
    } else {
      console.log('🔍 Triggers encontrados:', triggers?.length || 0);
    }
    
  } catch (error) {
    console.error('💥 Erro durante a aplicação da migração:', error);
  }
}

// Executar o script
applyTriggerMigration().then(() => {
  console.log('🏁 Script finalizado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});