import { container } from 'tsyringe';

// Repositories
import { IFlashcardRepository } from '../../domain/studyTools/flashcards/repositories/IFlashcardRepository';
import { IDeckRepository } from '../../domain/studyTools/flashcards/repositories/IDeckRepository';
import { FirebaseFlashcardRepository } from '../../infra/repositories/firebase/FirebaseFlashcardRepository';
import { FirebaseDeckRepository } from '../../infra/repositories/firebase/FirebaseDeckRepository';

// Notificações
import { INotificationRepository } from '../../domain/notifications/interfaces/INotificationRepository';
import { FirebaseNotificationRepository } from '../../domain/notifications/repositories/FirebaseNotificationRepository';
import { INotificationService } from '../../domain/notifications/interfaces/INotificationService';
import { FirebaseNotificationService } from '../../domain/notifications/services/FirebaseNotificationService';
import { CreateNotificationUseCase } from '../../domain/notifications/use-cases/CreateNotificationUseCase';
import { GetNotificationsUseCase } from '../../domain/notifications/use-cases/GetNotificationsUseCase';
import { MarkNotificationAsReadUseCase } from '../../domain/notifications/use-cases/MarkNotificationAsReadUseCase';

container.registerSingleton<IFlashcardRepository>(
  'FlashcardRepository',
  FirebaseFlashcardRepository,
);

container.registerSingleton<IDeckRepository>('DeckRepository', FirebaseDeckRepository);

container.registerSingleton<INotificationRepository>(
  'NotificationRepository',
  FirebaseNotificationRepository,
);
container.registerSingleton<INotificationService>(
  'NotificationService',
  FirebaseNotificationService,
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
