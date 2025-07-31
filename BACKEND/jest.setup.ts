import { config } from 'dotenv';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// Carregar variáveis de ambiente
config();

// Inicializar Firebase Admin para testes
const app = admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

// Configurar timeout global para testes
jest.setTimeout(10000);

// Limpar mocks após cada teste
afterEach(() => {
  jest.clearAllMocks();
});

// Limpar recursos após todos os testes
afterAll(async () => {
  await app.delete();
});

// Variável para armazenar o prefixo de coleção para evitar conflitos
const TEST_COLLECTION_PREFIX = `test_${Date.now()}_`;

// Set up global console mocks
global.console = {
  ...console,
  // log: jest.fn(), // Comentado para permitir logs durante o desenvolvimento
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Inicializa o Firebase Admin SDK para testes
const initializeFirebaseForTests = async (): Promise<void> => {
  try {
    // Verifica se já está inicializado
    if (admin.apps.length > 0) {
      console.log('Firebase já inicializado');
      return;
    }

    // Carrega credenciais do arquivo
    const credentialsPath = path.resolve(__dirname, 'firebase-credentials.json');

    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`Arquivo de credenciais não encontrado em ${credentialsPath}`);
    }

    console.log(`Inicializando Firebase com credenciais de ${credentialsPath}`);

    // Inicializa o Firebase Admin SDK
    admin.initializeApp({
      credential: admin.credential.cert(require(credentialsPath)),
      // Pode ajustar outras configurações se necessário
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID || 'medforum-488ec'}.firebaseio.com`,
    });

    console.log('Firebase inicializado com sucesso para testes');
  } catch (error) {
    console.error('Erro ao inicializar Firebase para testes:', error);
    throw error;
  }
};

// Função para limpar os dados de teste
const cleanupTestData = async (): Promise<void> => {
  try {
    if (admin.apps.length === 0) {
      console.log('Firebase não está inicializado, não há nada para limpar');
      return;
    }

    console.log(`Limpando coleções de teste com prefixo: ${TEST_COLLECTION_PREFIX}`);

    // Lista todas as coleções
    const collections = await admin.firestore().listCollections();

    // Filtra apenas as coleções de teste
    const testCollections = collections.filter(col => col.id.startsWith(TEST_COLLECTION_PREFIX));

    // Exclui os documentos em cada coleção de teste
    for (const collection of testCollections) {
      const batch = admin.firestore().batch();
      const docs = await collection.get();

      if (!docs.empty) {
        docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`Excluídos ${docs.size} documentos da coleção ${collection.id}`);
      }
    }

    console.log('Limpeza de dados de teste concluída');
  } catch (error) {
    console.error('Erro ao limpar dados de teste:', error);
  }
};

// Expõe o prefixo de teste para ser usado nos testes
global.TEST_COLLECTION_PREFIX = TEST_COLLECTION_PREFIX;

beforeAll(async () => {
  console.log('Configurando ambiente de testes...');
  await initializeFirebaseForTests();
});

afterAll(async () => {
  console.log('Limpando ambiente de testes...');
  await cleanupTestData();

  // Fecha a conexão do Firebase
  const apps = admin.apps;
  if (apps.length > 0) {
    for (const app of apps) {
      if (app) {
        await app.delete();
      }
    }
    console.log('Conexão com Firebase encerrada');
  }
});
