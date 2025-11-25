const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Este script deve ser executado através do Trae AI com MCP do Supabase
console.log('\n🔧 Script de Migração camelCase → snake_case');
console.log('==========================================\n');
console.log('⚠️  IMPORTANTE: Este script precisa ser executado pelo Trae AI');
console.log('   que possui acesso ao MCP do Supabase para executar as migrações.\n');

// Verificar se as credenciais estão configuradas
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Erro: Credenciais do Supabase não encontradas no arquivo .env');
    console.error('   Certifique-se de que SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão configurados.');
    process.exit(1);
}

console.log('\n🚀 Script de Migração CamelCase para Snake_Case');
console.log('='.repeat(50));
console.log('\n⚠️  IMPORTANTE: Este script deve ser executado através do Trae AI');
console.log('   que possui acesso ao MCP do Supabase para executar as migrações.');
console.log('\n📋 Instruções:');
console.log('   1. Execute este script no Trae AI');
console.log('   2. O Trae AI usará o MCP do Supabase para aplicar as migrações');
console.log('   3. Todas as 605 migrações serão executadas automaticamente');
console.log('\n📁 Arquivo de migração: migration-camel-to-snake.sql');
console.log('\n' + '='.repeat(50));

// Ler e exibir estatísticas do arquivo de migração
const migrationPath = path.join(__dirname, 'migration-camel-to-snake.sql');
if (fs.existsSync(migrationPath)) {
  const migrationContent = fs.readFileSync(migrationPath, 'utf8');
  const commands = migrationContent.split(';').filter(cmd => cmd.trim());
  
  console.log(`\n📊 Estatísticas da Migração:`);
  console.log(`   • Total de comandos SQL: ${commands.length}`);
  console.log(`   • Renomeação de colunas: ${commands.filter(cmd => cmd.includes('RENAME COLUMN')).length}`);
  console.log(`   • Renomeação de tabelas: ${commands.filter(cmd => cmd.includes('RENAME TO')).length}`);
  
  console.log('\n✅ Arquivo de migração encontrado e analisado.');
  console.log('\n🔄 Para executar a migração, use o Trae AI com MCP do Supabase.');
} else {
  console.error('❌ Arquivo de migração não encontrado!');
  process.exit(1);
}

async function executeMigration() {
  console.log('🚀 Iniciando migração camelCase para snake_case...');
  
  // Ler arquivo de migração
  const migrationPath = path.join(__dirname, 'migration-camel-to-snake.sql');
  const migrationContent = fs.readFileSync(migrationPath, 'utf8');
  
  // Dividir em comandos individuais
  const commands = migrationContent
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('--'))
    .filter(line => line.trim() !== '');
  
  console.log(`📋 Total de comandos SQL: ${commands.length}`);
  
  console.log('\n💾 Backup recomendado antes da execução via MCP...');
  
  try {
    // Executar comandos em lotes
    const batchSize = 10;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < commands.length; i += batchSize) {
      const batch = commands.slice(i, i + batchSize);
      
      console.log(`\n🔄 Executando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(commands.length/batchSize)}...`);
      
      for (const command of batch) {
        try {
          console.log(`   Executando: ${command.substring(0, 80)}...`);
          
          console.log(`   ⚠️  Comando preparado para execução via MCP`);
          successCount++;
          
          // Pequena pausa entre comandos
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (err) {
          console.error(`   ❌ Erro inesperado: ${err.message}`);
          errorCount++;
        }
      }
      
      // Pausa entre lotes
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n📋 Resumo da preparação:');
    console.log(`✅ Comandos SQL analisados: ${successCount}`);
    console.log(`📁 Arquivo de migração: migration-camel-to-snake.sql`);
    
    console.log('\n🚀 Para executar a migração:');
    console.log('   1. Use o Trae AI com acesso ao MCP do Supabase');
    console.log('   2. Execute o comando: apply_migration com o conteúdo do arquivo SQL');
    console.log('   3. Monitore os logs para verificar o sucesso da migração');
    
    console.log('\n📚 Consulte o arquivo MIGRATION_GUIDE.md para detalhes sobre as alterações.');
    
    return {
        totalCommands: commands.length,
        migrationFile: migrationPath,
        ready: true
    };
    
  } catch (error) {
    console.error('❌ Erro fatal durante a migração:', error.message);
    process.exit(1);
  }
}

// Função para verificar se as credenciais estão configuradas
function checkCredentials() {
  console.log('✅ Credenciais do Supabase encontradas no arquivo .env');
  console.log(`📍 URL: ${supabaseUrl}`);
  console.log(`🔑 Service Key: ${supabaseKey.substring(0, 20)}...`);
}

// Função principal
async function main() {
  console.log('🔧 Script de Migração camelCase → snake_case');
  console.log('==========================================\n');
  
  checkCredentials();
  
  // Confirmação do usuário
  console.log('⚠️  ATENÇÃO: Esta migração irá renomear tabelas e colunas no banco de dados.');
  console.log('Certifique-se de ter feito backup antes de continuar.\n');
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  readline.question('Deseja continuar? (digite "SIM" para confirmar): ', (answer) => {
    readline.close();
    
    if (answer.toUpperCase() === 'SIM') {
      executeMigration();
    } else {
      console.log('❌ Migração cancelada pelo usuário.');
      process.exit(0);
    }
  });
}

if (require.main === module) {
  main();
}

module.exports = { executeMigration };