import { inject, injectable } from 'tsyringe';
import { INotificationPreferencesRepository } from '../interfaces/INotificationPreferencesRepository';
import { NotificationPreferences, NotificationType } from '../types';

/**
 * Caso de uso para obter preferências de notificações
 */
@injectable()
export class GetNotificationPreferencesUseCase {
  constructor(
    @inject('NotificationPreferencesRepository')
    private notificationPreferencesRepository: INotificationPreferencesRepository,
  ) {}

  /**
   * Obtém as preferências de notificação do usuário
   * @param userId ID do usuário
   */
  async execute(userId: string): Promise<NotificationPreferences> {
    if (!userId) {
      throw new Error('ID do usuário é obrigatório');
    }

    // Verificar se o usuário já tem preferências
    const existingPreferences =
      await this.notificationPreferencesRepository.getPreferencesByUserId(userId);

    if (existingPreferences) {
      return existingPreferences;
    }

    // Se não tiver, criar preferências padrão
    const defaultPreferences: NotificationPreferences = {
      id: '',
      userId,
      channels: {
        email: true,
        push: true,
        sms: false,
        inApp: true,
      },
      types: {
        [NotificationType.GENERAL]: { enabled: true },
        [NotificationType.SYSTEM]: { enabled: true },
        [NotificationType.PAYMENT]: { enabled: true },
        [NotificationType.CONTENT]: { enabled: true },
        [NotificationType.EXAM]: { enabled: true },
        [NotificationType.SOCIAL]: { enabled: true },
        [NotificationType.ACHIEVEMENT]: { enabled: true },
        [NotificationType.REMINDER]: { enabled: true },
        [NotificationType.ALERT]: { enabled: true },
      },
      doNotDisturb: {
        enabled: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Persistir e retornar as preferências padrão
    return this.notificationPreferencesRepository.savePreferences(defaultPreferences);
  }
}
