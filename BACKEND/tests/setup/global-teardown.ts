import { closePool } from '../../supabase.config';

/**
 * Limpeza global após todos os testes
 * Executa depois de todos os testes
 */
export default async function globalTeardown() {
  console.log('🧹 Iniciando limpeza global dos testes...');
  
  try {
    // Limpar dados de teste (opcional - manter dados para debug)
    // Uncomment para limpar o banco de teste após os testes
    // try {
    //   const testDbName = 'medbrave_test';
    //   await pgPool.query(`DROP DATABASE IF EXISTS ${testDbName}`);
    //   console.log(`✅ Banco de dados de teste '${testDbName}' removido`);
    // } catch (error) {
    //   console.warn('⚠️  Erro ao remover banco de teste:', error);
    // }
    
    // Fechar pool de conexões
    await closePool();
    
    console.log('✅ Limpeza global dos testes concluída');
    
  } catch (error) {
    console.error('❌ Erro na limpeza global dos testes:', error);
  }
}
