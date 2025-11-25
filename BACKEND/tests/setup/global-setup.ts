import { pgPool, testConnection } from '../../supabase.config';
import { execSync } from 'child_process';
import path from 'path';

/**
 * Configuração global para os testes
 * Executa antes de todos os testes
 */
export default async function globalSetup() {
  console.log('🚀 Iniciando configuração global dos testes...');
  
  try {
    // Verificar se o PostgreSQL está rodando
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('PostgreSQL não está disponível');
    }
    
    // Criar banco de dados de teste se não existir
    const testDbName = 'medbrave_test';
    try {
      await pgPool.query(`CREATE DATABASE ${testDbName}`);
      console.log(`✅ Banco de dados de teste '${testDbName}' criado`);
    } catch (error: any) {
      if (error.code === '42P04') {
        console.log(`ℹ️  Banco de dados de teste '${testDbName}' já existe`);
      } else {
        throw error;
      }
    }
    
    // Executar migrações no banco de teste
    const migrationsPath = path.join(__dirname, '../../migrations.sql');
    try {
      execSync(`psql -d ${testDbName} -f "${migrationsPath}"`, {
        env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD },
        stdio: 'pipe'
      });
      console.log('✅ Migrações executadas no banco de teste');
    } catch (error) {
      console.warn('⚠️  Erro ao executar migrações (pode ser normal se já executadas)');
    }
    
    // Configurar variáveis de ambiente para testes
    process.env.NODE_ENV = 'test';
    process.env.DB_NAME = testDbName;
    
    console.log('✅ Configuração global dos testes concluída');
    
  } catch (error) {
    console.error('❌ Erro na configuração global dos testes:', error);
    process.exit(1);
  }
}