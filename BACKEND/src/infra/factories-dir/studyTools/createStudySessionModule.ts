import { Router } from 'express';
import { firestore } from 'firebase-admin';
import { StudySessionController } from '../../../domain/studyTools/studySessions/controllers/studySessionController';
import { createStudySessionRoutes } from '../../../domain/studyTools/studySessions/routes/studySessionRoutes';
import { FirebaseStudySessionRepository } from '../../repositories/firebase/FirebaseStudySessionRepository';

export interface StudySessionModuleOptions {
  firestoreDb?: firestore.Firestore;
}

export const createStudySessionModule = (
): {
  studySessionRoutes: Router;
  studySessionRepository: FirebaseStudySessionRepository;
  studySessionController: StudySessionController;
} => {
  // Criar repositório
  const studySessionRepository = new FirebaseStudySessionRepository();

  // Criar controlador
  const studySessionController = new StudySessionController(studySessionRepository);

  // Criar rotas
  const studySessionRoutes = createStudySessionRoutes(studySessionController);

  return {
    studySessionRoutes,
    studySessionRepository,
    studySessionController,
  };
};
