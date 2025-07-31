import { Router } from 'express';
import { StudySessionController } from '../controllers/studySessionController';
import { createStudySessionRoutes } from '../routes/studySessionRoutes';
import { IStudySessionRepository } from '../repositories/IStudySessionRepository';
import { FirebaseStudySessionRepository } from '../../../../infra/repositories/firebase/FirebaseStudySessionRepository';
import { CreateStudySessionUseCase } from '../use-cases/CreateStudySessionUseCase';
import { GetStudySessionByIdUseCase } from '../use-cases/GetStudySessionByIdUseCase';
import { GetUserStudySessionsUseCase } from '../use-cases/GetUserStudySessionsUseCase';
import { UpdateStudySessionUseCase } from '../use-cases/UpdateStudySessionUseCase';
import { DeleteStudySessionUseCase } from '../use-cases/DeleteStudySessionUseCase';
import { CompleteStudySessionUseCase } from '../use-cases/CompleteStudySessionUseCase';
import { RecordStudySessionAnswerUseCase } from '../use-cases/RecordStudySessionAnswerUseCase';

export interface StudySessionModuleOptions {
  studySessionRepository?: IStudySessionRepository;
}

/**
 * Factory para criar o módulo de sessões de estudo
 * @param options Opções de configuração
 */
export function createStudySessionModule(options?: StudySessionModuleOptions) {
  // Obter ou criar repositório
  const studySessionRepository =
    options?.studySessionRepository || new FirebaseStudySessionRepository();

  // Criar casos de uso
  const createStudySessionUseCase = new CreateStudySessionUseCase(studySessionRepository);
  const getStudySessionByIdUseCase = new GetStudySessionByIdUseCase(studySessionRepository);
  const getUserStudySessionsUseCase = new GetUserStudySessionsUseCase(studySessionRepository);
  const updateStudySessionUseCase = new UpdateStudySessionUseCase(studySessionRepository);
  const deleteStudySessionUseCase = new DeleteStudySessionUseCase(studySessionRepository);
  const completeStudySessionUseCase = new CompleteStudySessionUseCase(studySessionRepository);
  const recordStudySessionAnswerUseCase = new RecordStudySessionAnswerUseCase(
    studySessionRepository,
  );

  // Criar controladores
  const studySessionController = new StudySessionController(studySessionRepository);

  // Criar rotas
  const studySessionRoutes = createStudySessionRoutes(studySessionController);

  // Criar router principal
  const router = Router();

  // Configurar sub-rotas
  router.use('/sessions', studySessionRoutes);

  return {
    studySessionRoutes: router,

    // Expor controladores
    controllers: {
      studySessionController,
    },

    // Expor casos de uso
    useCases: {
      createStudySessionUseCase,
      getStudySessionByIdUseCase,
      getUserStudySessionsUseCase,
      updateStudySessionUseCase,
      deleteStudySessionUseCase,
      completeStudySessionUseCase,
      recordStudySessionAnswerUseCase,
    },

    // Expor repositórios
    repositories: {
      studySessionRepository,
    },
  };
}
