import { Request, Response } from 'express';
import { SupabaseUnifiedReviewService } from '../../../../infra/studyTools/supabase/SupabaseUnifiedReviewService';
import { AppError } from '../../../../shared/errors/AppError';
import { logger } from '../../../../utils/logger';
import { supabase } from '../../../../config/supabase';

/**
 * Controller para preview de revisões
 * Calcula estimativas de próxima revisão ANTES do usuário responder
 */
export class ReviewPreviewController {
  private unifiedReviewService: SupabaseUnifiedReviewService;

  constructor() {
    this.unifiedReviewService = new SupabaseUnifiedReviewService(supabase);
  }

  /**
   * GET /unified-reviews/preview/:contentType/:contentId
   * Retorna estimativas de próxima revisão para cada grade (0-3)
   */
  async getReviewPreview(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw AppError.unauthorized('Usuário não autenticado');
      }

      const { contentType, contentId } = req.params;

      if (!contentType || !contentId) {
        throw AppError.badRequest('contentType e contentId são obrigatórios');
      }

      // Buscar card FSRS existente
      const { data: card, error: cardError } = await supabase
        .from('fsrs_cards')
        .select('*')
        .eq('user_id', userId)
        .eq('content_id', contentId)
        .eq('content_type', contentType.toUpperCase())
        .single();

      if (cardError && cardError.code !== 'PGRST116') {
        throw new AppError('Erro ao buscar card', 500);
      }

      // Se não existe card, criar um temporário para preview
      let previewCard = card;
      if (!card) {
        // Criar card temporário com valores iniciais do FSRS
        const now = new Date();
        previewCard = {
          id: 'preview-temp',
          user_id: userId,
          content_id: contentId,
          deck_id: '',
          content_type: contentType.toUpperCase() as any,
          due: now,
          stability: 0,
          difficulty: 5, // Dificuldade média inicial
          elapsed_days: 0,
          scheduled_days: 0,
          reps: 0,
          lapses: 0,
          state: 'NEW' as any,
          last_review: null,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        };
      }

      // Log do card atual


      // Calcular preview para cada grade (sem salvar)
      const previews = await Promise.all([
        this.calculatePreview(previewCard, 0, userId), // Again
        this.calculatePreview(previewCard, 1, userId), // Hard
        this.calculatePreview(previewCard, 2, userId), // Good
        this.calculatePreview(previewCard, 3, userId), // Easy
      ]);



      res.json({
        success: true,
        data: {
          again: previews[0],
          hard: previews[1],
          good: previews[2],
          easy: previews[3],
        },
      });
    } catch (error) {
      logger.error('Erro ao calcular preview de revisão:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Erro interno do servidor',
        });
      }
    }
  }

  /**
   * Calcula preview para um grade específico
   * Usa EXATAMENTE a mesma lógica do processReview
   */
  private async calculatePreview(
    card: any,
    grade: number,
    userId: string
  ): Promise<{
    scheduledDays: number;
    dueDate: string;
    stability: number;
    difficulty: number;
    usedThreshold: boolean;
  }> {
    try {

      
      // 🔥 PREVIEW NUNCA USA THRESHOLD! Sempre recalcula para mostrar o que aconteceria
      const isActiveReview = true;  // true = ignora threshold, sempre recalcula
      
      const schedulingInfo = await (this.unifiedReviewService as any).processReview(
        card,
        grade,
        userId,
        isActiveReview
      );

      // Usar o scheduled_days que vem do card (já calculado corretamente pelo FSRS)
      const scheduledDays = schedulingInfo.card.scheduled_days;
      const dueDate = new Date(schedulingInfo.card.due);

      // Verificar se usou threshold (due date não mudou)
      const originalDue = card.due ? new Date(card.due).getTime() : null;
      const newDue = dueDate.getTime();
      const usedThreshold = originalDue !== null && Math.abs(originalDue - newDue) < 1000; // Diferença < 1 segundo



      return {
        scheduledDays: scheduledDays,
        dueDate: schedulingInfo.card.due.toISOString(),
        stability: schedulingInfo.card.stability,
        difficulty: schedulingInfo.card.difficulty,
        usedThreshold: usedThreshold,
      };
    } catch (error) {
      logger.error(`Erro ao calcular preview para grade ${grade}:`, error);
      throw error;
    }
  }
}
