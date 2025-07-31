import { firestore } from 'firebase-admin';
import { FirebaseQuestionService } from '../services/FirebaseQuestionService';
import express from 'express';

/**
 * Cria o módulo específico para listas de questões (compatibilidade)
 * @param options Objeto contendo a instância do Firestore
 * @returns Objeto com um router básico
 */
export const createQuestionListModule = ({ firestoreDb }: { firestoreDb: firestore.Firestore }) => {
  console.log('⚠️ createQuestionListModule: Usando implementação simplificada (questões antigas removidas)');
  // Database instance initialized
  
  // Criar router básico para compatibilidade
  const router = express.Router();
  
  // Rota básica que indica que o sistema foi migrado
  router.get('/', (_req, res) => {
    res.json({
      message: 'Lista de questões migrada para sistema unificado',
      redirectTo: '/api/questions',
      status: 'deprecated'
    });
  });
  
  return { router };
};

/**
 * Cria serviço de questões (ainda funcional)
 */
export const createQuestionService = (db: firestore.Firestore) => {
  return new FirebaseQuestionService(db);
};

export default createQuestionListModule;