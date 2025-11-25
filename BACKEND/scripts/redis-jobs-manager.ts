/**
 * 🧹 REDIS JOBS MANAGER
 * 
 * Script CLI para gerenciar jobs do Redis
 * 
 * Uso:
 *   npm run redis:list          - Lista todos os jobs
 *   npm run redis:clean         - Remove jobs completed e failed
 *   npm run redis:obliterate    - Remove TODOS os jobs (nuclear)
 *   npm run redis:remove failed - Remove apenas jobs failed
 */

// ✅ Carregar variáveis de ambiente ANTES de importar serviços
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carregar .env do diretório BACKEND
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Verificar se variáveis essenciais foram carregadas
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Erro: Variáveis de ambiente não encontradas!');
  console.error('   Certifique-se de que o arquivo .env existe em BACKEND/');
  console.error('   Variáveis necessárias: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// ✅ Desabilitar worker para scripts CLI (evita processar jobs durante limpeza)
process.env.DISABLE_WORKER = 'true';

import jobQueueService from '../src/services/jobQueueService';

const command = process.argv[2];
const arg = process.argv[3];

async function main() {
  console.log('🔧 Redis Jobs Manager\n');

  try {
    switch (command) {
      case 'list':
        await listJobs();
        break;

      case 'clean':
        await cleanJobs();
        break;

      case 'obliterate':
        await obliterateJobs();
        break;

      case 'remove':
        if (!arg || !['completed', 'failed', 'waiting', 'active', 'delayed'].includes(arg)) {
          console.error('❌ Status inválido. Use: completed, failed, waiting, active, delayed');
          process.exit(1);
        }
        await removeByStatus(arg as any);
        break;

      default:
        console.log('Comandos disponíveis:');
        console.log('  list          - Lista todos os jobs');
        console.log('  clean         - Remove jobs completed e failed');
        console.log('  obliterate    - Remove TODOS os jobs (nuclear)');
        console.log('  remove <status> - Remove jobs por status');
        console.log('\nExemplos:');
        console.log('  npm run redis:list');
        console.log('  npm run redis:clean');
        console.log('  npm run redis:obliterate');
        console.log('  npm run redis:remove failed');
        process.exit(0);
    }

    await jobQueueService.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    await jobQueueService.close();
    process.exit(1);
  }
}

async function listJobs() {
  console.log('📊 Listando todos os jobs do Redis...\n');

  const result = await jobQueueService.getAllJobsDetailed();

  console.log('📈 RESUMO:');
  console.log(`   Total: ${result.total} jobs`);
  console.log(`   ✅ Completed: ${result.byStatus.completed}`);
  console.log(`   ❌ Failed: ${result.byStatus.failed}`);
  console.log(`   🔄 Active: ${result.byStatus.active}`);
  console.log(`   ⏳ Waiting: ${result.byStatus.waiting}`);
  console.log(`   ⏰ Delayed: ${result.byStatus.delayed}`);
}

async function cleanJobs() {
  console.log('🧹 Limpando jobs completed e failed...\n');

  const completedResult = await jobQueueService.removeJobsByStatus('completed');
  const failedResult = await jobQueueService.removeJobsByStatus('failed');

  const totalFound = completedResult.found + failedResult.found;
  const totalRemoved = completedResult.removed + failedResult.removed;
  const totalFailed = completedResult.failed + failedResult.failed;

  console.log('📊 RESULTADO:');
  console.log(`   Encontrados: ${totalFound} jobs`);
  console.log(`   ✅ Removidos: ${totalRemoved}`);
  if (totalFailed > 0) {
    console.log(`   ❌ Falhas: ${totalFailed}`);
  }
  console.log('\n📈 DETALHES:');
  console.log(`   ✅ Completed: ${completedResult.removed}/${completedResult.found}`);
  console.log(`   ❌ Failed: ${failedResult.removed}/${failedResult.found}`);
}

async function obliterateJobs() {
  console.log('💣 OBLITERANDO TODOS OS JOBS...\n');
  
  // Check for active jobs first
  const preCheck = await jobQueueService.getAllJobsDetailed();
  
  if (preCheck.byStatus.active > 0) {
    console.log('⚠️  ATENÇÃO: Existem jobs ATIVOS em execução!');
    console.log(`   🔄 ${preCheck.byStatus.active} jobs ativos detectados\n`);
    console.log('❌ Jobs ativos NÃO PODEM ser removidos enquanto o backend está rodando.');
    console.log('\n📋 OPÇÕES:');
    console.log('   1. PARAR o backend (Ctrl+C) e rodar este comando novamente');
    console.log('   2. AGUARDAR os jobs terminarem e usar "npm run redis:clean"');
    console.log('   3. CONTINUAR mesmo assim (removerá apenas jobs não-ativos)\n');
    
    console.log('Deseja continuar mesmo assim? (Ctrl+C para cancelar)');
    console.log('Continuando em 5 segundos...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  } else {
    console.log('⚠️  ATENÇÃO: Isso vai remover TODOS os jobs do Redis!');
    console.log('⚠️  Incluindo jobs em espera!\n');
    console.log('Iniciando em 3 segundos... (Ctrl+C para cancelar)');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  const result = await jobQueueService.obliterateAllJobs();

  console.log('\n📊 RESULTADO:');
  console.log(`   Encontrados: ${result.found} jobs`);
  console.log(`   ✅ Removidos: ${result.removed}`);
  
  if (result.failed > 0) {
    console.log(`   ❌ Não removidos: ${result.failed} (jobs ativos)`);
    console.log('\n⚠️  Jobs ativos não foram removidos porque o backend está rodando.');
    console.log('💡 Para remover TODOS os jobs:');
    console.log('   1. Pare o backend: Ctrl+C no terminal do backend');
    console.log('   2. Execute: npm run redis:obliterate');
    console.log('   3. Inicie o backend: npm run dev');
  } else {
    console.log('\n✅ Todos os jobs foram removidos com sucesso!');
  }
  
  console.log('\n💥 OBLITERAÇÃO COMPLETA!');
}

async function removeByStatus(status: 'completed' | 'failed' | 'waiting' | 'active' | 'delayed') {
  console.log(`🧹 Removendo jobs ${status}...\n`);

  const result = await jobQueueService.removeJobsByStatus(status);

  console.log('📊 RESULTADO:');
  console.log(`   Encontrados: ${result.found} jobs`);
  console.log(`   ✅ Removidos: ${result.removed}`);
  if (result.failed > 0) {
    console.log(`   ❌ Falhas: ${result.failed}`);
  }
}

main();
