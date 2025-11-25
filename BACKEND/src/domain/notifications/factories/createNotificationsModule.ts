import { NotificationControllerManual } from '../controllers/NotificationControllerManual';
import { SupabaseNotificationService } from '../services';
import { CreateNotificationUseCase } from '../use-cases/CreateNotificationUseCase';
import { GetNotificationsUseCase } from '../use-cases/GetNotificationsUseCase';
import { MarkNotificationAsReadUseCase } from '../use-cases/MarkNotificationAsReadUseCase';

/**
 * Factory para criar o módulo de notificações sem tsyringe
 * @returns Objeto com rotas, serviços, repositórios e casos de uso do módulo
 */
export function createNotificationsModule() {
  // Criar instâncias diretamente (sem tsyringe)
  const notificationService = new SupabaseNotificationService();
  const createNotificationUseCase = new CreateNotificationUseCase(notificationService);
  const getNotificationsUseCase = new GetNotificationsUseCase(notificationService);
  const markNotificationAsReadUseCase = new MarkNotificationAsReadUseCase(notificationService);
  const notificationController = new NotificationControllerManual(
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
