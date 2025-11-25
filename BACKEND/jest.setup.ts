import { config } from 'dotenv';
import { pgPool, testConnection } from '../supabase.config';
import { Pool } from 'pg';

// Carregar variáveis de ambiente
config();

// Configurar timeout global para testes
jest.setTimeout(30000);

// Pool de conexão específico para testes
let testPool: Pool;

// Prefixo para tabelas de teste para evitar conflitos
const TEST_TABLE_PREFIX = `test_${Date.now()}_`;

// Set up global console mocks
global.console = {
  ...console,
  // log: jest.fn(), // Comentado para permitir logs durante o desenvolvimento
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Inicializa o PostgreSQL para testes
const initializePostgreSQLForTests = async (): Promise<void> => {
  try {
    // Verificar conexão
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Não foi possível conectar ao PostgreSQL');
    }
    
    console.log('✅ PostgreSQL inicializado para testes');
    return;

  } catch (error) {
    console.error('Erro ao inicializar PostgreSQL para testes:', error);
    throw error;
  }
};

// Função para limpar os dados de teste
const cleanupTestData = async (): Promise<void> => {
  try {
    console.log('Limpando dados de teste...');
    
    // Limpar tabelas de teste (se existirem)
    const client = await pgPool.connect();
    
    try {
      // Truncar tabelas principais (cuidado em produção!)
      await client.query('TRUNCATE TABLE study_sessions, flashcards, questions, subfilters, filters, users RESTART IDENTITY CASCADE');
      console.log('✅ Dados de teste limpos');
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Erro ao limpar dados de teste:', error);
  }
};

// Expõe o prefixo de teste para ser usado nos testes
global.TEST_TABLE_PREFIX = TEST_TABLE_PREFIX;

// Limpar mocks após cada teste
afterEach(() => {
  jest.clearAllMocks();
});

beforeAll(async () => {
  console.log('Configurando ambiente de testes...');
  await initializePostgreSQLForTests();
});

afterAll(async () => {
  console.log('Limpando ambiente de testes...');
  await cleanupTestData();
  
  // Fechar pool de conexões
  if (testPool) {
    await testPool.end();
    console.log('Pool de conexões PostgreSQL encerrado');
  }
});
