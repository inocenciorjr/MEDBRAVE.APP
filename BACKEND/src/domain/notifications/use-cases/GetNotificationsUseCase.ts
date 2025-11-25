import { INotificationService } from '../interfaces/INotificationService';
import {
  ListNotificationsOptions,
  PaginatedNotificationsResult,
} from '../types';

export class GetNotificationsUseCase {
  constructor(private notificationService: INotificationService) {}

  async execute(
    userId: string,
    options?: ListNotificationsOptions,
  ): Promise<PaginatedNotificationsResult> {
    if (!userId) {
      throw new Error('ID do usuário é obrigatório');
    }

    return this.notificationService.getUserNotifications(userId, options);
  }
}