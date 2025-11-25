import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

interface ExtractOptions {
  specialty?: string;
  difficulty?: 'básica' | 'intermediária' | 'avançada';
  questionType?: 'multiple_choice' | 'true_false' | 'essay';
  maxQuestions?: number;
  includeExplanations?: boolean;
}

interface ExtractedQuestion {
  question: string;
  alternatives: string[];
  correctAnswer: string;
  explanation?: string;
  specialty: string;
  difficulty: 'básica' | 'intermediária' | 'avançada';
  topics: string[];
  references: string[];
  estimatedTime: number;
  bloomLevel: 'conhecimento' | 'compreensão' | 'aplicação' | 'análise' | 'síntese' | 'avaliação';
}

interface Filter {
  id: string;
  name: string;
  subfilters?: Array<{
    id: string;
    name: string;
  }>;
}

interface CategorizedQuestion extends ExtractedQuestion {
  tempId?: string;
  originalId?: string;
  suggestedFilters: Array<{
    filterId: string;
    filterName: string;
    confidence: number;
    reasoning: string;
  }>;
  suggestedSubfilters: Array<{
    subfilterId: string;
    subfilterName: string;
    filterId: string;
    confidence: number;
    reasoning: string;
  }>;
}

export class MedbraveService {
  private static instance: MedbraveService;
  private baseUrl = '/api/medbrave-ia';

  public static getInstance(): MedbraveService {
    if (!MedbraveService.instance) {
      MedbraveService.instance = new MedbraveService();
    }
    return MedbraveService.instance;
  }

  /**
   * 📄 Extrair questões de conteúdo (apenas admins)
   */
  async extractQuestions(content: string, options: ExtractOptions = {}) {
    try {
      // Timeout aumentado para 8 minutos devido ao processamento em lotes
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 480000); // 8 minutos
      
      const response = await fetchWithAuth(`${this.baseUrl}/extract-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          options
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        success: result.success,
        questions: result.questions as ExtractedQuestion[],
        metadata: result.metadata,
        medbraveIA: result.medbraveIA
      };
    } catch (error: any) {
      console.error('❌ Erro na extração de questões:', error);
      throw new Error(`Erro na extração: ${error.message}`);
    }
  }

  /**
   * 🏷️ Categorizar questões com filtros do banco (apenas admins)
   */
  async categorizeQuestions(questions: ExtractedQuestion[], availableFilters: Filter[]) {
    try {
      // Timeout MUITO MAIOR para categorização inteligente - 10 minutos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutos
      
      console.log(`🎯 Iniciando categorização MEDBRAVE IA: ${questions.length} questões`);
      
      const response = await fetchWithAuth(`${this.baseUrl}/categorize-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions,
          availableFilters
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log(`✅ Categorização MEDBRAVE IA concluída: ${result.categorizedQuestions?.length || 0} questões`);

      return {
        success: result.success,
        categorizedQuestions: result.categorizedQuestions as CategorizedQuestion[],
        summary: result.summary,
        medbraveIA: result.medbraveIA
      };
    } catch (error: any) {
      console.error('❌ Erro na categorização de questões:', error);
      throw new Error(`Erro na categorização: ${error.message}`);
    }
  }

  /**
   * 📝 Explicar resposta de questão
   */
  async explainQuestion(
    question: string,
    alternatives: string[],
    correctAnswer: string,
    userAnswer?: string,
    specialty?: string,
    userRole: string = 'student'
  ) {
    try {
      const response = await fetchWithAuth(`${this.baseUrl}/explain-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          alternatives,
          correctAnswer,
          userAnswer,
          specialty,
          userRole
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        success: result.success,
        content: result.content,
        explanation: result.explanation,
        medbraveIA: result.medbraveIA
      };
    } catch (error: any) {
      console.error('❌ Erro na explicação de questão:', error);
      throw new Error(`Erro na explicação: ${error.message}`);
    }
  }

  /**
   * 📄 Extrair questões a partir de arquivo (PDF, DOCX, PPTX) via upload
   */
  async extractQuestionsFromFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetchWithAuth('http://localhost:5001/extract-questions', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      return result;
    } catch (error: any) {
      console.error('❌ Erro na extração de questões por arquivo:', error);
      throw new Error(`Erro na extração: ${error.message}`);
    }
  }

  /**
   * Processar imagens de questões para R2
   */
  async processImagesToR2(html: string, questionNumber?: string): Promise<{
    success: boolean;
    html: string;
    processedImages: any[];
    totalFound: number;
    totalProcessed: number;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/process-images-to-r2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html,
          questionNumber: questionNumber || ''
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return {
        success: data.success,
        html: data.html,
        processedImages: data.processedImages || [],
        totalFound: data.totalFound || 0,
        totalProcessed: data.totalProcessed || 0
      };
    } catch (error: any) {
      console.error('❌ Erro ao processar imagens para R2:', error);
      return {
        success: false,
        html,
        processedImages: [],
        totalFound: 0,
        totalProcessed: 0,
        error: error.message
      };
    }
  }

  /**
   * 📊 Status do sistema
   */
  async getStatus() {
    try {
      const response = await fetchWithAuth(`${this.baseUrl}/status`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return result;
    } catch (error: any) {
      console.error('❌ Erro ao obter status:', error);
      throw new Error(`Erro no status: ${error.message}`);
    }
  }
}

// Export da instância singleton
export const medbraveService = MedbraveService.getInstance();
