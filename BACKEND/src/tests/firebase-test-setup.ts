import * as admin from 'firebase-admin';
import { firestore } from 'firebase-admin';
import { createHash } from 'crypto';

// Variável para armazenar se o Firebase já foi inicializado
let firebaseInitialized = false;

/**
 * Gera um ID único baseado no timestamp atual e um valor aleatório
 * @param prefix Prefixo opcional para o ID
 * @returns String com ID único
 */
export function generateUniqueId(prefix = 'test'): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8);
  const hash = createHash('md5').update(`${timestamp}-${random}`).digest('hex').substring(0, 8);
  return `${prefix}-${hash}`;
}

/**
 * Inicializa o Firebase Admin se ainda não estiver inicializado
 * @returns Instância do Firestore
 */
export function initializeFirebaseForTesting(): firestore.Firestore {
  if (!firebaseInitialized) {
    try {
      // Utiliza as credenciais fornecidas
      const serviceAccount = {
        type: 'service_account',
        project_id: 'medforum-488ec',
        private_key_id: '5551c2161a0ebd3678a14f611128b41af1acd9c3',
        private_key:
          '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC3Zs+kjRlA1qbj\nLcV6gpAKwqqLUsPo7t2b1Q0e3ngSJ2vDfDW4ShGFBnLGAazxQ4enTwhbF+G8I/1+\nmZ0zbK2NbHjJA7Q1vLKa8kMuvF0pYturE3beiUMNMT3y1xTTNDje4XLPSaDb7i8b\nU4Q6Cm4XGJuZPLsvOf3WJQj1Uwb98xBD2SZymEmSZy8tm3AY7dembIMGuwbgxcv5\ntZZE7Xw+wmvM9TauC7cgGsmOeZhClXJHv6hilmVl68Lv0Gf2STfrXClYWpjcaWnB\nhwfv5hXJAMP1n2ZNnG/XfFe+rnLy4yQVax5pXIYXapGKUIbBL5AEzH/f5Zo48/ej\niMOEQ0/5AgMBAAECggEABiwz62QjWDMRSV6iQaIQ0ofkQQ2vUdDuTP8h8qrGrEe+\n4QS2cyYtCkbiCIeIaFNfRrKKg7RdUN1+O+tUJuWuvq6KrytMfq2D7mKef71vvkOZ\nRJwCWXGRu+kvHlP+W7BrhJbebBsciqJs2/TW47QzqdvWatUoMKn5QOKct1MMznG3\n4r8JEH52smzl62BukTFNS05afTA22c1zFQl3IbIzNJE4X3v49GIekV7V/ufN14H8\nmSJWe5M++FG/Z3F9wKaTzjnTQttPizwbRWq2LymMQQB2GsXzci5Xnbg2C3a2WLZX\nGQZ7uLd3ZAuTbXv4dBc6wspvwtDBz3uBb43vqgvmDQKBgQD2c3nsDqSFHi2y1MkD\nvH9eOlGe3NcM5vXT1OS4eyunM9GwWABhm3P5cTLdFqf2SGA6bMRHK+r7QM5Ff/4F\ngXq3Ly84ShwO1XIOZUzGY1l7VswdHkVKkNTuz4OMyJiGi8Zn/7ekdumqGY2Us1oG\nxokNiMvzDDziMH7L3FE+kgZZrQKBgQC+gfQRgTmkfgVGz69Zv3mliqt32HNdSt/p\ndrhMz2BpOICu1zC5/UIQquJPcIBVMkGCHrXncoe4iT/984/5sgTpRStnw6NgyqBe\ndlBpbiwqu3kHJN+yg3Dq5mR3Uc0s+FcMTExMksOf9UdUv5arnFSHw0TuwJ+BqPYf\nnSjtqeVw/QKBgQD1lRiXa/fxVqM/It60RG+/W+ndnj8Fcljgn7LTSpmzYeXADdFD\ncn7cwDppKZxxxKlvTtc//LmJaYiipOpiXiYEyJYLR34yIewoADXDM1kFmPaIxZNS\nvIQS/OIftfyXhk1NcPp0frJVeGUnGpnJSqljvT9OkJFS6/RN/NtQuH5veQKBgHYq\nz4SIHoQcsxMwQbkunrsDH8bP2Qc2KVt8C2eBfnDl3lQVIKFNKUyDYqsZwlCWQrH+\ncKCmlu7tG2dfS5/7PzaedAUCAfZI2V6ejtRGxVigPrsisSregw0BabHlaJoLVJtJ\nPE6G/pbaoqs7x66c4oXvpnNdwdLARiJn7no01x/VAoGBAOklX7oSW5l5mTBXZXax\nySOmPPVb+6wI3Mzlq2tlNdvgCh+6T8wqFgj8uHDtW7022x7cgxFlKYNhcy3r7DMA\nNpM8rJ1ytmYDDRi6CgZSV5h0UW/ykwR81Xv9QYDvqgUcJg4kPnGhbWrQu0xEv0mj\n5Tpg3eQlAyhXekmP3zz5qGZ9\n-----END PRIVATE KEY-----\n',
        client_email: 'firebase-adminsdk-fbsvc@medforum-488ec.iam.gserviceaccount.com',
        client_id: '112942838490293125021',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url:
          'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40medforum-488ec.iam.gserviceaccount.com',
        universe_domain: 'googleapis.com',
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      });

      firebaseInitialized = true;
      console.log('Firebase inicializado para testes');
    } catch (error) {
      console.error('Erro ao inicializar Firebase:', error);
      throw error;
    }
  }

  return admin.firestore();
}

/**
 * Limpa dados de teste do Firestore
 * Importante: Use prefixos específicos para garantir que apenas dados de teste sejam excluídos
 * @param collection Nome da coleção
 * @param prefix Prefixo usado para identificar documentos de teste
 */
export async function cleanupTestData(collection: string, prefix = 'test'): Promise<void> {
  const db = admin.firestore();
  const snapshot = await db
    .collection(collection)
    .where('id', '>=', prefix)
    .where('id', '<=', prefix + '\uf8ff')
    .get();

  if (snapshot.empty) {
    console.log(`Nenhum documento com prefixo ${prefix} encontrado em ${collection}`);
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`Limpeza concluída: ${snapshot.size} documentos removidos de ${collection}`);
}

/**
 * Converte um objeto para formato compatível com Firestore
 * (remove funções e outros tipos não suportados)
 */
export function toFirestoreData<T extends object>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Cria um timestamp do Firestore para a data atual
 */
export function getCurrentTimestamp(): firestore.Timestamp {
  return admin.firestore.Timestamp.now();
}
