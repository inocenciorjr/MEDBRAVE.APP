import { Question } from '@/types/resolucao-questoes';
import api from '@/services/api';
import { 
  getSubFiltersMap, 
  getYearFromQuestion, 
  getInstitutionFromQuestion,
  getSubjectFromQuestion,
  getTopicFromQuestion 
} from '@/lib/services/filterService';

/**
 * Fetches questions from a question list
 * @param listId - The question list ID
 * @returns Promise resolving to array of questions
 * @throws Error if fetch fails
 */
export async function getQuestionsFromList(listId: string): Promise<Question[]> {
  try {
    // Buscar subfiltros primeiro
    const subFiltersMap = await getSubFiltersMap();
    
    // Usar o endpoint direto de questões da lista (não requer autenticação)
    const questionsResponse = await api.get(`/questions/lists/${listId}/items`);
    
    const questions = questionsResponse.data.data || questionsResponse.data || [];
    
    if (questions.length === 0) {
      return [];
    }
    
    // Converter para o formato esperado pela UI
    const converted = questions.map((q: any, index: number) => {
      try {
        return convertToQuestionFormat(q, index + 1, subFiltersMap);
      } catch (err) {
        console.error('[Questions API] Erro ao converter questão:', q.id, err);
        throw err;
      }
    });
    return converted;
  } catch (error) {
    console.error('[Questions API] Erro ao buscar questões da lista:', error);
    throw error;
  }
}

/**
 * Fetches a single question by ID
 * @param id - The question ID
 * @param listId - Optional list ID for context
 * @returns Promise resolving to the question data
 * @throws Error if question is not found or fetch fails
 */
export async function getQuestion(id: string, listId?: string): Promise<Question> {
  try {
    
    // Buscar subfiltros primeiro
    const subFiltersMap = await getSubFiltersMap();
    
    const response = await api.get(`/questions/${id}`);
    const question = response.data;
    
    if (!question) {
      throw new Error(`Question with id ${id} not found`);
    }
    
    return convertToQuestionFormat(question, 1, subFiltersMap);
  } catch (error) {
    console.error('[Questions API] Erro ao buscar questão:', error);
    throw error;
  }
}

/**
 * Fetches the list of all questions (from a list context)
 * @param listId - The question list ID
 * @returns Promise resolving to array of questions
 * @throws Error if fetch fails
 */
export async function getQuestionList(listId?: string): Promise<Question[]> {
  if (listId) {
    return getQuestionsFromList(listId);
  }
  
  // Se não tiver listId, retornar vazio (não faz sentido buscar todas as questões)
  console.warn('[Questions API] getQuestionList chamado sem listId');
  return [];
}

/**
 * Fetches a batch of questions from a list
 * @param listId - The question list ID
 * @param offset - Starting index
 * @param limit - Number of questions to fetch
 * @returns Promise resolving to batch data
 */
export async function getQuestionsFromListBatch(
  listId: string,
  offset: number,
  limit: number
): Promise<{ questions: Question[]; total: number }> {
  try {
    // Buscar subfiltros primeiro
    const subFiltersMap = await getSubFiltersMap();
    
    // Buscar batch do backend
    const response = await api.get(`/questions/lists/${listId}/batch`, {
      params: { offset, limit }
    });
    
    const questions = response.data.data || [];
    const total = response.data.total || 0;
    
    // Converter para o formato esperado pela UI
    const converted = questions.map((q: any, index: number) => 
      convertToQuestionFormat(q, offset + index + 1, subFiltersMap)
    );
    
    return { questions: converted, total };
  } catch (error) {
    console.error('[Questions API] Erro ao buscar batch:', error);
    throw error;
  }
}

/**
 * Converts backend question format to UI format
 */
function convertToQuestionFormat(backendQuestion: any, questionNumber: number, subFiltersMap: Map<string, any>): Question {
  
  // Extrair informações dos filtros
  const filterIds = backendQuestion.filter_ids || [];
  const subFilterIds = backendQuestion.sub_filter_ids || [];
  
  // Extrair dados usando o serviço de filtros
  const year = getYearFromQuestion(subFilterIds, subFiltersMap);
  const institution = getInstitutionFromQuestion(subFilterIds, subFiltersMap);
  const subject = getSubjectFromQuestion(filterIds, subFiltersMap);
  const topic = getTopicFromQuestion(subFilterIds, subFiltersMap);
  
  return {
    id: backendQuestion.id,
    questionNumber,
    institution,
    year,
    subject,
    topic,
    text: backendQuestion.statement || backendQuestion.content || backendQuestion.title || '',
    isHtml: true,
    alternatives: (backendQuestion.alternatives || []).map((alt: any, index: number) => ({
      id: alt.id || `alt-${index}`,
      letter: String.fromCharCode(65 + index) as 'A' | 'B' | 'C' | 'D' | 'E',
      text: alt.text || '',
    })),
    correctAlternative: backendQuestion.correct_alternative_id || backendQuestion.alternatives?.find((a: any) => a.isCorrect)?.id || '',
    likes: 0, // TODO: Implementar sistema de likes
    dislikes: 0,
    tags: backendQuestion.tags || [],
    sub_filter_ids: subFilterIds, // Passar os sub_filter_ids para o frontend
    professorComment: backendQuestion.professorComment || backendQuestion.professor_comment, // Suporta ambos os formatos
    isAnnulled: backendQuestion.isAnnulled || backendQuestion.is_annulled || false,
    isOutdated: backendQuestion.isOutdated || backendQuestion.is_outdated || false,
  };
}

/**
 * Saves user's answer to a question
 */
export async function saveQuestionResponse(data: {
  questionId: string;
  questionListId?: string;
  selectedAlternativeId: string;
  isCorrect: boolean;
  responseTimeSeconds?: number;
  wasFocusMode?: boolean;
  isActiveReview?: boolean;
}): Promise<void> {
  try {
    // ✅ NOVA ROTA: /questions/:questionId/attempt
    await api.post(`/questions/${data.questionId}/attempt`, {
      selected_alternative_id: data.selectedAlternativeId,
      is_correct: data.isCorrect,
      study_mode: data.isActiveReview ? 'unified_review' : 'normal_list',
      was_focus_mode: data.wasFocusMode || false,
      question_list_id: data.questionListId,
      response_time_seconds: data.responseTimeSeconds,
      is_active_review: data.isActiveReview || false,
    });
  } catch (error) {
    console.error('[Questions API] Erro ao salvar resposta:', error);
    // Não lançar erro para não bloquear a UI
  }
}

/**
 * Fetches question IDs from a list (lightweight)
 */
export async function getQuestionIds(listId: string): Promise<string[]> {
  try {
    const response = await api.get(`/question-lists/${listId}/question-ids`);
    const ids = response.data.data || [];
    return ids;
  } catch (error) {
    console.error('[Questions API] Erro ao buscar IDs:', error);
    return [];
  }
}

/**
 * Fetches user's responses for questions in a list
 */
export async function getQuestionResponses(listId: string): Promise<Map<string, { selectedAlternative: string; isCorrect: boolean }>> {
  try {
    const response = await api.get(`/question-lists/${listId}/responses`);
    const responses = response.data.data || [];
    
    // Criar um mapa de questionId -> resposta
    const responsesMap = new Map<string, { selectedAlternative: string; isCorrect: boolean }>();
    
    responses.forEach((r: any) => {
      responsesMap.set(r.question_id, {
        selectedAlternative: r.selected_alternative_id,
        isCorrect: r.is_correct_on_first_attempt,
      });
    });
    
    return responsesMap;
  } catch (error) {
    console.error('[Questions API] Erro ao buscar respostas:', error);
    return new Map();
  }
}

/**
 * Fetches questions by filters
 * @param filters - Object containing filter criteria
 * @returns Promise resolving to filtered questions
 */
export async function getQuestionsByFilter(filters: {
  institution?: string;
  year?: number;
  subject?: string;
}): Promise<Question[]> {
  try {
    // Buscar subfiltros primeiro
    const subFiltersMap = await getSubFiltersMap();
    
    const response = await api.post('/questions/search', {
      // TODO: Converter filtros para o formato da API
      limit: 1000,
    });
    
    const questions = response.data.data?.questions || [];
    return questions.map((q: any, index: number) => convertToQuestionFormat(q, index + 1, subFiltersMap));
  } catch (error) {
    console.error('Error filtering questions:', error);
    throw error;
  }
}

/**
 * Buscar estatísticas de alternativas de uma questão (porcentagem de usuários que marcou cada alternativa)
 */
export async function getQuestionAlternativeStats(questionId: string): Promise<Record<string, number>> {
  try {
    const response = await api.get(`/question-lists/questions/${questionId}/alternative-stats`);
    const stats = response.data.data || {};
    return stats;
  } catch (error) {
    console.error('[Questions API] Erro ao buscar estatísticas de alternativas:', error);
    return {};
  }
}

/**
 * Buscar questões por IDs (para revisões)
 * @param ids - Array de IDs das questões
 * @returns Promise resolving to array of questions
 */
export async function getQuestionsByIds(ids: string[]): Promise<Question[]> {
  try {
    console.log('[getQuestionsByIds] Buscando questões:', ids);
    
    if (ids.length === 0) {
      return [];
    }

    // Buscar subfiltros primeiro
    const subFiltersMap = await getSubFiltersMap();
    
    // Buscar questões usando endpoint bulk-get
    const response = await api.post('/questions/bulk-get', { ids });
    console.log('[getQuestionsByIds] Resposta bulk recebida:', response.data);
    
    // Processar resposta bulk
    const questionsData = response.data?.data || response.data || [];
    console.log('[getQuestionsByIds] Questões recebidas:', questionsData.length);
    
    // Converter questões
    const questions = questionsData
      .map((questionData: any, index: number) => {
        try {
          console.log('[getQuestionsByIds] Convertendo questão:', questionData?.id);
          return convertToQuestionFormat(questionData, index + 1, subFiltersMap);
        } catch (err) {
          console.error('[Questions API] Erro ao converter questão:', err);
          return null;
        }
      })
      .filter((q: Question | null): q is Question => q !== null);
    
    console.log('[getQuestionsByIds] Questões convertidas:', questions.length);
    return questions;
  } catch (error) {
    console.error('[Questions API] Erro ao buscar questões por IDs:', error);
    throw error;
  }
}
