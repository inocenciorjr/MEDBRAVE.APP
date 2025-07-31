import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import AppError from '../utils/AppError';

let app: admin.app.App;

try {
  // Check if app is already initialized
  app = admin.app();
  console.log('✅ [Firebase Admin] App já inicializado');
} catch (error) {
  console.log('🔧 [Firebase Admin] Inicializando Firebase Admin SDK...');
  
  // Initialize Firebase Admin SDK
  const credentialsPath = path.join(process.cwd(), 'firebase-credentials.json');
  
  console.log('📁 [Firebase Admin] Caminho das credenciais:', credentialsPath);
  
  let credentials;
  try {
    // Try to load credentials from file
    if (fs.existsSync(credentialsPath)) {
      console.log('✅ [Firebase Admin] Arquivo de credenciais encontrado');
      const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
      credentials = JSON.parse(credentialsContent);
      console.log('✅ [Firebase Admin] Credenciais carregadas. Project ID:', credentials.project_id);
    } else {
      console.error('❌ [Firebase Admin] Arquivo de credenciais não encontrado:', credentialsPath);
      throw new Error('Firebase credentials file not found');
    }
  } catch (e) {
    console.error('❌ [Firebase Admin] Erro ao carregar credenciais:', e);
    throw new Error('Invalid Firebase credentials format');
  }

  try {
    app = admin.initializeApp({
      credential: admin.credential.cert(credentials),
      projectId: credentials.project_id,
      storageBucket: `${credentials.project_id}.firebasestorage.app`,
    });
    
    console.log('✅ [Firebase Admin] SDK inicializado com sucesso');
    console.log('🔗 [Firebase Admin] Project ID configurado:', credentials.project_id);
    console.log('🪣 [Firebase Admin] Storage Bucket configurado:', `${credentials.project_id}.firebasestorage.app`);
  } catch (initError) {
    console.error('❌ [Firebase Admin] Erro na inicialização:', initError);
    throw initError;
  }
}

// Export needed Firebase services
export const auth = app.auth();

// Configure Firestore with settings to ignore undefined properties
const firestoreInstance = app.firestore();
firestoreInstance.settings({
  ignoreUndefinedProperties: true
});

export const firestore = firestoreInstance;
export const storage = app.storage();
export const messaging = app.messaging();

// Utilitário para deletar coleções (útil para testes)
export async function deleteCollection(collectionPath: string, batchSize = 500): Promise<void> {
  const collectionRef = firestore.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, batchSize, resolve, reject);
  });
}

async function deleteQueryBatch(
  query: admin.firestore.Query<admin.firestore.DocumentData>,
  batchSize: number,
  resolve: () => void,
  reject: (error: Error) => void,
) {
  try {
    const snapshot = await query.get();

    if (snapshot.size === 0) {
      resolve();
      return;
    }

    const batch = firestore.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    if (snapshot.size === batchSize) {
      process.nextTick(() => {
        deleteQueryBatch(query, batchSize, resolve, reject);
      });
    } else {
      resolve();
    }
  } catch (error) {
    reject(error as Error);
  }
}

export { AppError };

export default app;
