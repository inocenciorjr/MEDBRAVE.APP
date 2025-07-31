import { NotificationController } from '../controllers/NotificationController';
import { FirebaseNotificationService } from '../services/FirebaseNotificationService';
import { CreateNotificationUseCase } from '../use-cases/CreateNotificationUseCase';
import { GetNotificationsUseCase } from '../use-cases/GetNotificationsUseCase';
import { MarkNotificationAsReadUseCase } from '../use-cases/MarkNotificationAsReadUseCase';

/**
 * Factory para criar o módulo de notificações
 * @returns Objeto com rotas, serviços, repositórios e casos de uso do módulo
 */
export function createNotificationsModule() {
  // Inicializar o serviço
  const notificationService = new FirebaseNotificationService();

  // Inicializar os casos de uso com o service
  const createNotificationUseCase = new CreateNotificationUseCase(notificationService);
  const getNotificationsUseCase = new GetNotificationsUseCase(notificationService);
  const markNotificationAsReadUseCase = new MarkNotificationAsReadUseCase(notificationService);

  // Inicializar o controller com os use cases
  const notificationController = new NotificationController(
    createNotificationUseCase,
    getNotificationsUseCase,
    markNotificationAsReadUseCase
  );

  return {
    notificationService,
    notificationController,
    useCases: {
      createNotificationUseCase,
      getNotificationsUseCase,
      markNotificationAsReadUseCase,
    },
  };
}
