import { container } from 'tsyringe';
import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../../config/supabaseAdmin';

// Repositories
import { IFlashcardRepository } from '../../domain/studyTools/flashcards/repositories/IFlashcardRepository';
import { IDeckRepository } from '../../domain/studyTools/flashcards/repositories/IDeckRepository';
// import { IStudySessionRepository } from '../../domain/studyTools/studySessions/repositories/IStudySessionRepository'; // Removed
import { IErrorNotebookRepository } from '../../domain/studyTools/errorNotebook/repositories/IErrorNotebookRepository';
// import { ISearchIndexRepository } from '../../domain/studyTools/searchIndex/repositories/ISearchIndexRepository'; // Removed
import { SupabaseFlashcardRepository } from '../../infra/studyTools/supabase/SupabaseFlashcardRepository';
import { SupabaseDeckRepository } from '../../infra/studyTools/supabase/SupabaseDeckRepository';
// import { SupabaseStudySessionRepository } from '../../infra/studyTools/supabase/SupabaseStudySessionRepository'; // Removed
import { SupabaseErrorNotebookRepository } from '../../infra/studyTools/supabase/SupabaseErrorNotebookRepository';
// import { SupabaseSearchIndexRepository } from '../../infra/studyTools/supabase/SupabaseSearchIndexRepository'; // Removed

// Administração
import { IAdminRepository } from '../../domain/admin/repositories/AdminRepository';
import { SupabaseAdminRepository } from '../../infra/admin/supabase/SupabaseAdminRepository';
import { SupabaseAdminService } from '../../infra/admin/supabase/SupabaseAdminService';

// Usuários
import { IUserRepository } from '../../domain/user/repositories/IUserRepository';
import { IUserService } from '../../domain/user/services/IUserService';
import { SupabaseUserRepository } from '../../infra/user/SupabaseUserRepository';
import { SupabaseUserService } from '../../infra/user/SupabaseUserService';

// Autenticação
import { IAuthRepository } from '../../domain/auth/repositories/IAuthRepository';
import { SupabaseAuthRepository } from '../../domain/auth/repositories/SupabaseAuthRepository';
import { AuthService } from '../../domain/auth/services/AuthService';

// Notificações
import { INotificationRepository } from '../../domain/notifications/interfaces/INotificationRepository';
import { SupabaseNotificationRepository } from '../../infra/notifications/supabase/SupabaseNotificationRepository';
import { INotificationService } from '../../domain/notifications/interfaces/INotificationService';
import { SupabaseNotificationService } from '../../infra/notifications/supabase/SupabaseNotificationService';
import { CreateNotificationUseCase } from '../../domain/notifications/use-cases/CreateNotificationUseCase';
import { GetNotificationsUseCase } from '../../domain/notifications/use-cases/GetNotificationsUseCase';
import { MarkNotificationAsReadUseCase } from '../../domain/notifications/use-cases/MarkNotificationAsReadUseCase';

// Register Supabase client
container.registerInstance<SupabaseClient>('SupabaseClient', supabase);

// Register repositories with Supabase client injection
container.register<IFlashcardRepository>(
  'FlashcardRepository',
  {
    useFactory: (container) => {
      const supabaseClient = container.resolve<SupabaseClient>('SupabaseClient');
      return new SupabaseFlashcardRepository(supabaseClient);
    }
  }
);

container.register<IDeckRepository>(
  'DeckRepository',
  {
    useFactory: (container) => {
      const supabaseClient = container.resolve<SupabaseClient>('SupabaseClient');
      return new SupabaseDeckRepository(supabaseClient);
    }
  }
);



// container.register<IStudySessionRepository>(
//   'StudySessionRepository',
//   {
//     useFactory: (container) => {
//       const supabaseClient = container.resolve<SupabaseClient>('SupabaseClient');
//       return new SupabaseStudySessionRepository(supabaseClient);
//     },
//   },
// ); // Removed

container.register<IErrorNotebookRepository>(
  'ErrorNotebookRepository',
  {
    useFactory: (container) => {
      const supabaseClient = container.resolve<SupabaseClient>('SupabaseClient');
      return new SupabaseErrorNotebookRepository(supabaseClient);
    }
  }
);

// SearchIndexRepository removed - now uses GIN index directly on decks table
// container.register<ISearchIndexRepository>(
//   'SearchIndexRepository',
//   {
//     useFactory: (container) => {
//       const supabaseClient = container.resolve<SupabaseClient>('SupabaseClient');
//       return new SupabaseSearchIndexRepository(supabaseClient);
//     }
//   }
// );

container.registerSingleton<IAdminRepository>(
  'AdminRepository',
  SupabaseAdminRepository,
);

container.register<SupabaseAdminService>(
  'AdminService',
  {
    useFactory: () => SupabaseAdminService.getInstance()
  }
);

container.registerSingleton<IUserRepository>(
  'UserRepository',
  SupabaseUserRepository,
);

container.registerSingleton<IUserService>('UserService', SupabaseUserService);

container.registerSingleton<IAuthRepository>(
  'AuthRepository',
  SupabaseAuthRepository,
);

container.registerSingleton<AuthService>('AuthService', AuthService);

container.registerSingleton<INotificationRepository>(
  'NotificationRepository',
  SupabaseNotificationRepository,
);
container.registerSingleton<INotificationService>(
  'NotificationService',
  SupabaseNotificationService,
);
container.registerSingleton<CreateNotificationUseCase>(
  'CreateNotificationUseCase',
  CreateNotificationUseCase,
);
container.registerSingleton<GetNotificationsUseCase>(
  'GetNotificationsUseCase',
  GetNotificationsUseCase,
);
container.registerSingleton<MarkNotificationAsReadUseCase>(
  'MarkNotificationAsReadUseCase',
  MarkNotificationAsReadUseCase,
);

// Exportar o container
export { container };
