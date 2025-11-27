import { useCallback } from 'react';
import { plannerService } from '../services/plannerService';
import { format } from 'date-fns';

export function usePlannerProgress() {
  const updateProgress = useCallback(async (
    contentType: 'FLASHCARD' | 'QUESTION' | 'ERROR_NOTEBOOK',
    completedCount: number,
    totalCount: number
  ) => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Buscar o evento do dia atual para este tipo de conteúdo
      const event = await plannerService.getEventByDateAndType(today, contentType);
      
      if (event) {
        // Atualizar o progresso
        await plannerService.updateProgress(event.id!, completedCount, totalCount);
        console.log(`✅ Progresso atualizado: ${completedCount}/${totalCount} ${contentType}`);
      } else {
        console.log(`ℹ️ Nenhum evento encontrado para ${contentType} em ${today}`);
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar progresso:', error);
    }
  }, []);

  const markAsCompleted = useCallback(async (
    contentType: 'FLASHCARD' | 'QUESTION' | 'ERROR_NOTEBOOK'
  ) => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const event = await plannerService.getEventByDateAndType(today, contentType);
      
      if (event && event.total_count) {
        await plannerService.updateProgress(event.id!, event.total_count, event.total_count);
        console.log(`✅ ${contentType} marcado como concluído`);
      }
    } catch (error) {
      console.error('❌ Erro ao marcar como concluído:', error);
    }
  }, []);

  return {
    updateProgress,
    markAsCompleted,
  };
}
