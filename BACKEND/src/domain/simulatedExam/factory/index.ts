import { Router } from 'express';
import { firestore } from 'firebase-admin';
import { FirebaseSimulatedExamService } from '../services/FirebaseSimulatedExamService';
import { SimulatedExamController } from '../controllers/SimulatedExamController';
import { createSimulatedExamRoutes } from '../routes/simulatedExamRoutes';

/**
 * Cria e configura o módulo de simulados
 * @param db Instância do Firestore
 * @returns Router configurado com as rotas de simulados
 */
export const createSimulatedExamModule = (db: firestore.Firestore): Router => {
  const simulatedExamService = new FirebaseSimulatedExamService(db);
  const simulatedExamController = new SimulatedExamController(simulatedExamService);

  return createSimulatedExamRoutes(simulatedExamController);
};

export default createSimulatedExamModule;
