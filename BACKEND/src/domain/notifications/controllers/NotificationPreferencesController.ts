import { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { GetNotificationPreferencesUseCase } from '../use-cases/GetNotificationPreferencesUseCase';
import { UpdateNotificationPreferencesUseCase } from '../use-cases/UpdateNotificationPreferencesUseCase';
import { NotificationPreferences } from '../types';

@injectable()
export class NotificationPreferencesController {
  constructor(
    @inject('GetNotificationPreferencesUseCase')
    private getNotificationPreferencesUseCase: GetNotificationPreferencesUseCase,

    @inject('UpdateNotificationPreferencesUseCase')
    private updateNotificationPreferencesUseCase: UpdateNotificationPreferencesUseCase,
  ) {}

  getUserPreferences = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const preferences = await this.getNotificationPreferencesUseCase.execute(userId);

      return res.status(200).json(preferences);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao buscar preferências de notificação';
      return res.status(500).json({ error: errorMessage });
    }
  };

  updatePreferences = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const preferencesData = req.body;

      if (!preferencesData) {
        return res.status(400).json({ error: 'Dados de preferências não fornecidos' });
      }

      // Garantir que o userId corresponde ao usuário autenticado
      const preferences: NotificationPreferences = {
        ...preferencesData,
        userId: userId,
        id: preferencesData.id || '',
        createdAt: preferencesData.createdAt ? new Date(preferencesData.createdAt) : new Date(),
        updatedAt: new Date(),
      };

      const updatedPreferences =
        await this.updateNotificationPreferencesUseCase.execute(preferences);

      return res.status(200).json(updatedPreferences);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao atualizar preferências de notificação';
      return res.status(500).json({ error: errorMessage });
    }
  };
}
