/**
 * 🔧 WORKER DEDICADO PARA PROCESSAR JOBS DO REDIS
 * 
 * Este worker roda em um processo separado do API server.
 * Isso permite reiniciar o backend sem interromper jobs em processamento.
 * 
 * Para iniciar: npm run worker
 */

import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Verificar variáveis essenciais
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Erro: Variáveis de ambiente não encontradas!');
  console.error('   Certifique-se de que o arquivo .env existe em BACKEND/');
  process.exit(1);
}

console.log('🔧 Iniciando Worker dedicado para processar jobs...\n');

// Importar o jobQueueService (isso vai iniciar o worker automaticamente)
import('./services/jobQueueService').then(() => {
  console.log('\n✅ Worker iniciado com sucesso!');
  console.log('📊 Aguardando jobs na fila...');
  console.log('⚠️  Não feche este terminal enquanto houver jobs em processamento!\n');
}).catch((error) => {
  console.error('❌ Erro ao iniciar worker:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️  Recebido sinal de interrupção (Ctrl+C)');
  console.log('🛑 Encerrando worker gracefully...');
  
  const { default: jobQueueService } = await import('./services/jobQueueService');
  await jobQueueService.close();
  
  console.log('✅ Worker encerrado com sucesso!');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Recebido sinal de término');
  console.log('🛑 Encerrando worker gracefully...');
  
  const { default: jobQueueService } = await import('./services/jobQueueService');
  await jobQueueService.close();
  
  console.log('✅ Worker encerrado com sucesso!');
  process.exit(0);
});
