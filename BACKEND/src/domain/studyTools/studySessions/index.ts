// Controllers
export { StudySessionController } from './controllers/studySessionController';

// Routes
export { createStudySessionRoutes } from './routes/studySessionRoutes';

// Repositories
export {
  IStudySessionRepository,
  type StudySessionFilters,
  type PaginationOptions,
  type PaginatedStudySessions,
} from './repositories/IStudySessionRepository';

// Use Cases
export { CreateStudySessionUseCase } from './use-cases/CreateStudySessionUseCase';
export { GetStudySessionByIdUseCase } from './use-cases/GetStudySessionByIdUseCase';
export { GetUserStudySessionsUseCase } from './use-cases/GetUserStudySessionsUseCase';
export { UpdateStudySessionUseCase } from './use-cases/UpdateStudySessionUseCase';
export { DeleteStudySessionUseCase } from './use-cases/DeleteStudySessionUseCase';
export { CompleteStudySessionUseCase } from './use-cases/CompleteStudySessionUseCase';
export { RecordStudySessionAnswerUseCase } from './use-cases/RecordStudySessionAnswerUseCase';

// Types
export {
  StudySessionType,
  StudySessionMood,
  StudySessionDifficulty,
  type StudySession,
  type CreateStudySessionDTO,
  type UpdateStudySessionDTO,
  type CompleteStudySessionDTO,
  type RecordAnswerDTO,
} from './types/studySession.types';

// Validation
export { validate } from './validation/studySessionSchemas';
