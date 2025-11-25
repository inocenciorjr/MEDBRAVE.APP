import { INotificationService } from '../interfaces/INotificationService';
import { Notification } from '../types';

/**
 * Caso de uso para marcar notificação como lida
 */
export class MarkNotificationAsReadUseCase {
  constructor(private notificationService: INotificationService) {}

  /**
   * Marca uma notificação específica como lida
   * @param notificationId ID da notificação
   */
  async execute(notificationId: string): Promise<Notification | null> {
    if (!notificationId) {
      throw new Error('ID da notificação é obrigatório');
    }

    return this.notificationService.markNotificationAsRead(notificationId);
  }
}
