import { firestore } from 'firebase-admin';
import { SimulatedExamController } from '../controllers/SimulatedExamController';
import { FirebaseSimulatedExamService } from '../services/FirebaseSimulatedExamService';
import { createSimulatedExamRoutes } from '../routes/simulatedExamRoutes';

export interface SimulatedExamModuleOptions {
  firestoreDb?: firestore.Firestore;
}

export const createSimulatedExamModule = (options?: SimulatedExamModuleOptions) => {
  // Obter a instância do Firestore
  const db = options?.firestoreDb || firestore();

  // Criar o serviço
  const simulatedExamService = new FirebaseSimulatedExamService(db);

  // Criar o controlador
  const simulatedExamController = new SimulatedExamController(simulatedExamService);

  // Criar as rotas
  const simulatedExamRoutes = createSimulatedExamRoutes(simulatedExamController);

  return {
    simulatedExamRoutes,
    simulatedExamService,
    simulatedExamController,
  };
};
