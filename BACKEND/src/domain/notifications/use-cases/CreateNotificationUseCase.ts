import { INotificationService } from '../interfaces/INotificationService';
import { CreateNotificationPayload, Notification } from '../types';

/**
 * Caso de uso para criar uma nova notificação
 */
export class CreateNotificationUseCase {
  constructor(private notificationService: INotificationService) {}

  /**
   * Executa o caso de uso
   * @param payload Dados da notificação a ser criada
   * @returns ID da notificação criada
   */
  async execute(data: CreateNotificationPayload): Promise<Notification> {
    // Validar dados
    if (!data.user_id) {
      throw new Error('ID do usuário é obrigatório');
    }

    if (!data.title) {
      throw new Error('Título da notificação é obrigatório');
    }

    if (!data.message) {
      throw new Error('Mensagem da notificação é obrigatória');
    }

    // Criar a notificação
    return this.notificationService.createNotification(data);
  }
}