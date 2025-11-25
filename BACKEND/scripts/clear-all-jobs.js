/**
 * Script para limpar TODOS os jobs do Redis/BullMQ
 * 
 * Remove jobs em todos os estados:
 * - waiting (aguardando)
 * - active (em execução)
 * - completed (concluídos)
 * - failed (falhados)
 * - delayed (atrasados)
 * - paused (pausados)
 * 
 * USO:
 * node scripts/clear-all-jobs.js
 */

const { Queue } = require('bullmq');
const Redis = require('ioredis');

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const QUEUE_NAME = 'scraper-jobs';

console.log('🧹 Iniciando limpeza de jobs...\n');
console.log(`📡 Redis: ${REDIS_HOST}:${REDIS_PORT}`);
console.log(`📦 Queue: ${QUEUE_NAME}\n`);

async function clearAllJobs() {
  // Criar conexão Redis
  const connection = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    maxRetriesPerRequest: null,
  });

  // Criar instância da queue
  const queue = new Queue(QUEUE_NAME, { connection });

  try {
    console.log('🔍 Verificando jobs existentes...\n');

    // Contar jobs em cada estado
    const counts = await queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused'
    );

    console.log('📊 Jobs encontrados:');
    console.log(`   ⏳ Waiting:   ${counts.waiting}`);
    console.log(`   🔄 Active:    ${counts.active}`);
    console.log(`   ✅ Completed: ${counts.completed}`);
    console.log(`   ❌ Failed:    ${counts.failed}`);
    console.log(`   ⏰ Delayed:   ${counts.delayed}`);
    console.log(`   ⏸️  Paused:    ${counts.paused}`);
    console.log(`   📦 Total:     ${Object.values(counts).reduce((a, b) => a + b, 0)}\n`);

    const totalJobs = Object.values(counts).reduce((a, b) => a + b, 0);

    if (totalJobs === 0) {
      console.log('✨ Nenhum job encontrado. Queue já está limpa!\n');
      await queue.close();
      await connection.quit();
      process.exit(0);
    }

    console.log('🗑️  Removendo jobs...\n');

    // Remover jobs de cada estado
    let removed = 0;

    // 1. Remover jobs waiting
    if (counts.waiting > 0) {
      await queue.drain();
      console.log(`   ✅ Removidos ${counts.waiting} jobs waiting`);
      removed += counts.waiting;
    }

    // 2. Remover jobs active (forçar falha primeiro)
    if (counts.active > 0) {
      const activeJobs = await queue.getActive();
      for (const job of activeJobs) {
        await job.moveToFailed(new Error('Job cancelado manualmente'), '0', true);
      }
      console.log(`   ✅ Cancelados ${counts.active} jobs active`);
      removed += counts.active;
    }

    // 3. Remover jobs completed
    if (counts.completed > 0) {
      await queue.clean(0, 0, 'completed');
      console.log(`   ✅ Removidos ${counts.completed} jobs completed`);
      removed += counts.completed;
    }

    // 4. Remover jobs failed
    if (counts.failed > 0) {
      await queue.clean(0, 0, 'failed');
      console.log(`   ✅ Removidos ${counts.failed} jobs failed`);
      removed += counts.failed;
    }

    // 5. Remover jobs delayed
    if (counts.delayed > 0) {
      const delayedJobs = await queue.getDelayed();
      for (const job of delayedJobs) {
        await job.remove();
      }
      console.log(`   ✅ Removidos ${counts.delayed} jobs delayed`);
      removed += counts.delayed;
    }

    // 6. Remover jobs paused
    if (counts.paused > 0) {
      const pausedJobs = await queue.getPaused();
      for (const job of pausedJobs) {
        await job.remove();
      }
      console.log(`   ✅ Removidos ${counts.paused} jobs paused`);
      removed += counts.paused;
    }

    console.log(`\n✨ Limpeza concluída! ${removed} jobs removidos.\n`);

    // Verificar se realmente limpou
    const newCounts = await queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused'
    );

    const remaining = Object.values(newCounts).reduce((a, b) => a + b, 0);

    if (remaining > 0) {
      console.log('⚠️  Ainda restam alguns jobs:');
      console.log(`   Total: ${remaining}`);
      console.log('\n💡 Execute o script novamente se necessário.\n');
    } else {
      console.log('✅ Queue completamente limpa!\n');
    }

    await queue.close();
    await connection.quit();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erro ao limpar jobs:', error.message);
    console.error(error.stack);
    
    await queue.close();
    await connection.quit();
    process.exit(1);
  }
}

// Executar
clearAllJobs();
