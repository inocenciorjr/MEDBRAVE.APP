import { Request, Response, NextFunction } from 'express';
import { ReviewPreferencesService } from '../services/ReviewPreferencesService';
import AppError from '../../../../utils/AppError';

export class ReviewPreferencesController {
  constructor(private preferencesService: ReviewPreferencesService) { }

  // GET /api/review-preferences
  getPreferences = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.error('🎯 [ReviewPreferencesController] getPreferences chamado');
      const userId = req.user?.id;
      console.error('🎯 [ReviewPreferencesController] userId:', userId);

      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      console.error('🎯 [ReviewPreferencesController] Chamando service.getPreferences');
      const prefs = await this.preferencesService.getPreferences(userId);
      console.error('🎯 [ReviewPreferencesController] Preferências obtidas:', prefs ? 'SIM' : 'NÃO');

      console.error('🎯 [ReviewPreferencesController] Enviando resposta 200');
      res.status(200).json({ success: true, data: prefs });
      console.error('🎯 [ReviewPreferencesController] Resposta enviada com sucesso');
    } catch (error) {
      console.error('❌ [ReviewPreferencesController] Erro capturado:', error);
      next(error);
    }
  };

  // PUT /api/review-preferences
  updatePreferences = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const { reschedule_cards, ...preferences } = req.body;

      // Verificar se precisa reagendar
      let rescheduledCount = 0;
      if (reschedule_cards && preferences.max_interval_days) {
        rescheduledCount = await this.preferencesService.rescheduleCardsExceedingLimit(
          userId,
          preferences.max_interval_days
        );
      }

      const prefs = await this.preferencesService.updatePreferences(userId, preferences);

      res.status(200).json({
        success: true,
        message: rescheduledCount > 0
          ? `Preferências atualizadas e ${rescheduledCount} revisões reagendadas`
          : 'Preferências atualizadas com sucesso',
        data: prefs,
        rescheduled_count: rescheduledCount
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/review-preferences/cards-exceeding-limit
  getCardsExceedingLimit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const maxDays = parseInt(req.query.max_days as string);
      if (!maxDays) throw AppError.badRequest("max_days é obrigatório");

      const count = await this.preferencesService.countCardsExceedingLimit(userId, maxDays);

      res.status(200).json({
        success: true,
        data: { count, max_days: maxDays }
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/review-preferences/set-exam-date
  setExamDate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const { exam_date } = req.body;
      if (!exam_date) throw AppError.badRequest("Data da prova é obrigatória");

      const prefs = await this.preferencesService.updatePreferences(userId, { exam_date });

      res.status(200).json({
        success: true,
        message: 'Data da prova configurada com sucesso',
        data: prefs
      });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/review-preferences/exam-date
  clearExamDate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const prefs = await this.preferencesService.updatePreferences(userId, { exam_date: undefined });

      res.status(200).json({
        success: true,
        message: 'Data da prova removida',
        data: prefs
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/review-preferences/update-planner-schedules
  updatePlannerSchedules = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const { updateFutureOnly = true } = req.body;

      const result = await this.preferencesService.updatePlannerEventSchedules(
        userId,
        updateFutureOnly
      );

      res.status(200).json({
        success: true,
        message: `${result.updated} eventos atualizados com sucesso`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
}
