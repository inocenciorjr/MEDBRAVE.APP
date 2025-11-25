import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest } from '../domain/auth/middleware/supabaseAuth.middleware';

export class QuestionListController {
  /**
   * Criar uma nova lista de questões
   */
  async createQuestionList(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const {
        name,
        title,
        description,
        folder_id,
        is_public,
        tags,
        status,
        question_count,
        questions, // Array de IDs das questões
      } = req.body;

      if (!name || !title) {
        return res.status(400).json({ error: 'Nome e título são obrigatórios' });
      }

      // Gerar ID único
      const listId = `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Criar a lista
      const { data: list, error: listError } = await supabase
        .from('question_lists')
        .insert({
          id: listId,
          user_id: userId,
          name,
          title,
          description: description || null,
          folder_id: folder_id || null,
          is_public: is_public || false,
          tags: tags || [],
          status: status || 'active',
          question_count: question_count || 0,
          questions: questions || [],
          created_at: { value: new Date().toISOString() },
          updated_at: { value: new Date().toISOString() },
          last_added_at: { value: new Date().toISOString() },
          completion_percentage: 0,
          view_count: 0,
          favorite_count: 0,
        })
        .select()
        .single();

      if (listError) {
        console.error('[QuestionListController] Error creating list:', listError);
        return res.status(500).json({ error: listError.message });
      }

      return res.status(201).json({
        success: true,
        data: list,
      });
    } catch (error: any) {
      console.error('[QuestionListController] Error creating list:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Listar todas as listas do usuário
   */
  async getUserQuestionLists(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { data: lists, error } = await supabase
        .from('question_lists')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[QuestionListController] Error fetching lists:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({
        success: true,
        data: lists,
      });
    } catch (error: any) {
      console.error('[QuestionListController] Error fetching lists:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Buscar uma lista específica
   */
  async getQuestionListById(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      console.log('[QuestionListController] getQuestionListById - userId:', userId);
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { id } = req.params;
      console.log('[QuestionListController] Buscando lista:', id);

      const { data: list, error } = await supabase
        .from('question_lists')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('[QuestionListController] Error fetching list:', error);
        console.log('[QuestionListController] Tentando buscar sem filtro de user_id...');
        
        // Tentar buscar sem filtro de user_id para debug
        const { data: listDebug } = await supabase
          .from('question_lists')
          .select('*')
          .eq('id', id)
          .single();
        
        if (listDebug) {
          console.log('[QuestionListController] Lista existe! user_id da lista:', listDebug.user_id);
          console.log('[QuestionListController] user_id do request:', userId);
        }
        
        return res.status(404).json({ error: 'Lista não encontrada' });
      }

      return res.status(200).json({
        success: true,
        data: list,
      });
    } catch (error: any) {
      console.error('[QuestionListController] Error fetching list:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Atualizar uma lista
   */
  async updateQuestionList(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { id } = req.params;
      const updates = req.body;

      const { data: list, error } = await supabase
        .from('question_lists')
        .update({
          ...updates,
          updated_at: { value: new Date().toISOString() },
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('[QuestionListController] Error updating list:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({
        success: true,
        data: list,
      });
    } catch (error: any) {
      console.error('[QuestionListController] Error updating list:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Deletar uma lista
   */
  async deleteQuestionList(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { id } = req.params;

      const { error } = await supabase
        .from('question_lists')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('[QuestionListController] Error deleting list:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({
        success: true,
        message: 'Lista deletada com sucesso',
      });
    } catch (error: any) {
      console.error('[QuestionListController] Error deleting list:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Salvar resposta de uma questão
   * DEPRECATED: Use QuestionHistoryService.recordQuestionAttempt() instead
   */
  async saveQuestionResponse(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const {
        question_id,
        question_list_id,
        selected_alternative_id,
        is_correct_on_first_attempt,
        response_time_seconds,
        answered_at,
        study_mode,
        was_focus_mode,
        simulated_exam_id
      } = req.body;

      if (!question_id || !selected_alternative_id) {
        return res.status(400).json({ error: 'question_id e selected_alternative_id são obrigatórios' });
      }

      // Calcular attempt_number
      const { count } = await supabase
        .from('question_responses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('question_id', question_id);

      const attemptNumber = (count || 0) + 1;

      // Gerar ID único para a resposta
      const responseId = `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Salvar resposta com novos campos
      const { data: response, error: responseError } = await supabase
        .from('question_responses')
        .insert({
          id: responseId,
          user_id: userId,
          question_id,
          question_list_id: question_list_id || null,
          selected_alternative_id,
          is_correct_on_first_attempt: attemptNumber === 1 ? (is_correct_on_first_attempt || false) : false,
          response_time_seconds: response_time_seconds || 0,
          study_mode: study_mode || 'normal_list',
          was_focus_mode: was_focus_mode || false,
          simulated_exam_id: simulated_exam_id || null,
          attempt_number: attemptNumber,
          answered_at: answered_at || { value: new Date().toISOString() },
          created_at: { value: new Date().toISOString() },
        })
        .select()
        .single();

      if (responseError) {
        console.error('[QuestionListController] Error saving response:', responseError);
        return res.status(500).json({ error: responseError.message });
      }

      return res.status(201).json({
        success: true,
        data: response
      });
    } catch (error: any) {
      console.error('[QuestionListController] Error saving response:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Buscar questões incorretas de uma lista
   */
  async getIncorrectQuestions(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { id } = req.params;

      // Buscar a lista
      const { data: list, error: listError } = await supabase
        .from('question_lists')
        .select('questions')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (listError || !list) {
        console.error('[QuestionListController] Error fetching list:', listError);
        return res.status(404).json({ error: 'Lista não encontrada' });
      }

      const questionIds = list.questions || [];

      if (questionIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: []
        });
      }

      // Buscar respostas incorretas do usuário NESTA LISTA ESPECÍFICA
      const { data: responses, error: responsesError } = await supabase
        .from('question_responses')
        .select('question_id')
        .eq('user_id', userId)
        .eq('question_list_id', id)
        .eq('is_correct_on_first_attempt', false)
        .in('question_id', questionIds);

      if (responsesError) {
        console.error('[QuestionListController] Error fetching responses:', responsesError);
        return res.status(500).json({ error: responsesError.message });
      }

      const incorrectQuestionIds = responses?.map(r => r.question_id) || [];

      return res.status(200).json({
        success: true,
        data: incorrectQuestionIds
      });
    } catch (error: any) {
      console.error('[QuestionListController] Error fetching incorrect questions:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Buscar IDs das questões de uma lista (leve, para navegação)
   */
  async getQuestionListIds(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { id } = req.params;

      // Buscar a lista
      const { data: list, error: listError } = await supabase
        .from('question_lists')
        .select('questions')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (listError || !list) {
        console.error('[QuestionListController] Error fetching list:', listError);
        return res.status(404).json({ error: 'Lista não encontrada' });
      }

      const questionIds = list.questions || [];

      return res.status(200).json({
        success: true,
        data: questionIds,
      });
    } catch (error: any) {
      console.error('[QuestionListController] Error fetching question IDs:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Buscar respostas do usuário para uma lista
   */
  async getQuestionListResponses(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { id } = req.params;

      // Buscar respostas do usuário para esta lista
      const { data: responses, error: responsesError } = await supabase
        .from('question_responses')
        .select('question_id, selected_alternative_id, is_correct_on_first_attempt')
        .eq('user_id', userId)
        .eq('question_list_id', id);

      if (responsesError) {
        console.error('[QuestionListController] Error fetching responses:', responsesError);
        return res.status(500).json({ error: responsesError.message });
      }

      return res.status(200).json({
        success: true,
        data: responses || [],
      });
    } catch (error: any) {
      console.error('[QuestionListController] Error fetching responses:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Buscar estatísticas de alternativas de uma questão (porcentagem de respostas em cada alternativa)
   * Conta TODAS as respostas, incluindo múltiplas do mesmo usuário
   */
  async getQuestionAlternativeStats(req: AuthenticatedRequest, res: Response) {
    try {
      const { questionId } = req.params;

      if (!questionId) {
        return res.status(400).json({ error: 'questionId é obrigatório' });
      }

      // Buscar todas as respostas para esta questão
      const { data: responses, error: responsesError } = await supabase
        .from('question_responses')
        .select('selected_alternative_id')
        .eq('question_id', questionId);

      if (responsesError) {
        console.error('[QuestionListController] Error fetching alternative stats:', responsesError);
        return res.status(500).json({ error: responsesError.message });
      }

      // Contar respostas por alternativa
      const totalResponses = responses?.length || 0;
      
      if (totalResponses === 0) {
        return res.status(200).json({
          success: true,
          data: {},
        });
      }

      const alternativeCounts: Record<string, number> = {};
      responses?.forEach(response => {
        const altId = response.selected_alternative_id;
        alternativeCounts[altId] = (alternativeCounts[altId] || 0) + 1;
      });

      // Calcular porcentagens
      const alternativeStats: Record<string, number> = {};
      Object.keys(alternativeCounts).forEach(altId => {
        alternativeStats[altId] = Math.round((alternativeCounts[altId] / totalResponses) * 100);
      });

      return res.status(200).json({
        success: true,
        data: alternativeStats,
      });
    } catch (error: any) {
      console.error('[QuestionListController] Error fetching alternative stats:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Buscar estatísticas de uma lista (questões respondidas, acertos, erros)
   */
  async getQuestionListStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { id } = req.params;

      // Buscar a lista
      const { data: list, error: listError } = await supabase
        .from('question_lists')
        .select('questions, question_count')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (listError || !list) {
        console.error('[QuestionListController] Error fetching list:', listError);
        return res.status(404).json({ error: 'Lista não encontrada' });
      }

      const questionIds = list.questions || [];
      const totalQuestions = list.question_count || questionIds.length || 0;

      if (questionIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            total: totalQuestions,
            answered: 0,
            correct: 0,
            incorrect: 0,
          },
        });
      }

      // Buscar respostas do usuário para essas questões NESTA LISTA ESPECÍFICA
      const { data: responses, error: responsesError } = await supabase
        .from('question_responses')
        .select('question_id, is_correct_on_first_attempt')
        .eq('user_id', userId)
        .eq('question_list_id', id)  // Filtrar por lista específica
        .in('question_id', questionIds);

      if (responsesError) {
        console.error('[QuestionListController] Error fetching responses:', responsesError);
        return res.status(500).json({ error: responsesError.message });
      }

      // Calcular estatísticas
      const answered = responses?.length || 0;
      const correct = responses?.filter(r => r.is_correct_on_first_attempt).length || 0;
      const incorrect = answered - correct;

      return res.status(200).json({
        success: true,
        data: {
          total: totalQuestions,
          answered,
          correct,
          incorrect,
        },
      });
    } catch (error: any) {
      console.error('[QuestionListController] Error fetching list stats:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}
