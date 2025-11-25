import { Router } from 'express';
import { container } from 'tsyringe';

// Controllers
import { NotificationController } from '../controllers/NotificationController';
import { NotificationPreferencesController } from '../controllers/NotificationPreferencesController';

// Services
import {
  SupabaseNotificationService,
  SupabasePaymentNotificationService,
} from '../services';

// Use cases
import { CreateNotificationUseCase } from '../use-cases/CreateNotificationUseCase';
import { GetNotificationsUseCase } from '../use-cases/GetNotificationsUseCase';
import { MarkNotificationAsReadUseCase } from '../use-cases/MarkNotificationAsReadUseCase';
import { UpdateNotificationPreferencesUseCase } from '../use-cases/UpdateNotificationPreferencesUseCase';
import { GetNotificationPreferencesUseCase } from '../use-cases/GetNotificationPreferencesUseCase';

// Repositories
import {
  SupabaseNotificationRepository,
  SupabaseNotificationPreferencesRepository,
} from '../repositories';

// Types e interfaces
import { INotificationRepository } from '../interfaces/INotificationRepository';
import { INotificationPreferencesRepository } from '../interfaces/INotificationPreferencesRepository';
import { INotificationService } from '../interfaces/INotificationService';
import { IPaymentNotificationService } from '../interfaces/IPaymentNotificationService';

/**
 * Cria e configura o módulo de notificações
 * @returns Objeto com as rotas e serviços de notificações
 */
function createNotificationModule() {
  // Registrar dependências no container
  container.registerSingleton<INotificationRepository>(
    'NotificationRepository',
    SupabaseNotificationRepository,
  );

  container.registerSingleton<INotificationPreferencesRepository>(
    'NotificationPreferencesRepository',
    SupabaseNotificationPreferencesRepository,
  );

  container.registerSingleton<INotificationService>(
    'NotificationService',
    SupabaseNotificationService,
  );

  // Registrar PaymentNotificationService depois do NotificationService
  container.register<IPaymentNotificationService>(
    'PaymentNotificationService',
    {
      useFactory: (container) => {
        const notificationService = container.resolve<INotificationService>(
          'NotificationService',
        );
        return new SupabasePaymentNotificationService(notificationService);
      },
    },
  );

  // Registrar casos de uso
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

  container.registerSingleton<UpdateNotificationPreferencesUseCase>(
    'UpdateNotificationPreferencesUseCase',
    UpdateNotificationPreferencesUseCase,
  );

  container.registerSingleton<GetNotificationPreferencesUseCase>(
    'GetNotificationPreferencesUseCase',
    GetNotificationPreferencesUseCase,
  );

  // Criar controllers – garantir que todas as dependências já estão registradas
  const notificationController = container.resolve(NotificationController);
  const preferencesController = container.resolve(
    NotificationPreferencesController,
  );

  // Configurar rotas
  const router = Router();

  // Rotas de notificações
  router.post('/', notificationController.createNotification);
  router.get('/', notificationController.getMyNotifications);
  router.patch('/:id/read', notificationController.markAsRead);

  // Rotas de preferências
  router.get('/preferences', preferencesController.getUserPreferences);
  router.put('/preferences', preferencesController.updatePreferences);

  return {
    notificationRoutes: router,
    notificationService: container.resolve<INotificationService>(
      'NotificationService',
    ),
    paymentNotificationService: container.resolve<IPaymentNotificationService>(
      'PaymentNotificationService',
    ),
  };
};

module.exports = { createNotificationModule };
