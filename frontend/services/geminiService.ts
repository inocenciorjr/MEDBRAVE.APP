import { GoogleGenerativeAI } from "@google/generative-ai";

// Configuração do Gemini
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';

if (!GEMINI_API_KEY) {
  console.warn('⚠️ REACT_APP_GEMINI_API_KEY não configurada no arquivo .env');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Modelos disponíveis
const MODELS = {
  GEMINI_PRO: 'gemini-pro',
  GEMINI_PRO_VISION: 'gemini-pro-vision',
  GEMINI_1_5_FLASH: 'gemini-1.5-flash',
  GEMINI_1_5_PRO: 'gemini-1.5-pro'
} as const;

export interface GeminiResponse {
  success: boolean;
  content?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface MedicalAnalysisRequest {
  question: string;
  category?: string;
  specialties?: string[];
  patientInfo?: {
    age?: number;
    gender?: string;
    symptoms?: string[];
  };
}

export interface MedicalAnalysisResponse extends GeminiResponse {
  analysis?: {
    possibleDiagnoses: string[];
    recommendedTests: string[];
    severity: 'low' | 'medium' | 'high' | 'emergency';
    specialtyRecommendation?: string;
    confidenceLevel: number;
  };
}

class GeminiService {
  private model;

  constructor(modelName: string = MODELS.GEMINI_1_5_FLASH) {
    this.model = genAI.getGenerativeModel({ model: modelName });
  }

  /**
   * Gera resposta usando Gemini para perguntas gerais
   */
  async generateResponse(prompt: string): Promise<GeminiResponse> {
    try {
      if (!GEMINI_API_KEY) {
        return {
          success: false,
          error: 'API Key do Gemini não configurada'
        };
      }

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        content: text,
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata?.totalTokenCount || 0
        }
      };
    } catch (error: any) {
      console.error('Erro ao gerar resposta com Gemini:', error);
      return {
        success: false,
        error: error.message || 'Erro desconhecido ao processar com Gemini'
      };
    }
  }

  /**
   * Análise médica especializada usando Gemini
   */
  async analyzeMedicalQuestion(request: MedicalAnalysisRequest): Promise<MedicalAnalysisResponse> {
    try {
      const prompt = this.buildMedicalPrompt(request);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse da resposta estruturada
      const analysis = this.parseMedicalResponse(text);

      return {
        success: true,
        content: text,
        analysis,
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata?.totalTokenCount || 0
        }
      };
    } catch (error: any) {
      console.error('Erro na análise médica com Gemini:', error);
      return {
        success: false,
        error: error.message || 'Erro ao analisar questão médica'
      };
    }
  }

  /**
   * Gera sugestões de conteúdo para o fórum médico
   */
  async generateForumSuggestions(topic: string, specialty?: string): Promise<GeminiResponse> {
    const prompt = `
Como especialista em conteúdo médico para fóruns, gere 5 sugestões de tópicos relacionados a "${topic}"${specialty ? ` na especialidade de ${specialty}` : ''}.

Cada sugestão deve ter:
- Título engajante
- Descrição breve (1-2 frases)
- Tags relevantes
- Nível de complexidade (básico/intermediário/avançado)

Formate como JSON:
{
  "suggestions": [
    {
      "title": "Título",
      "description": "Descrição",
      "tags": ["tag1", "tag2"],
      "complexity": "básico|intermediário|avançado"
    }
  ]
}
`;

    return this.generateResponse(prompt);
  }

  /**
   * Moderação de conteúdo usando Gemini
   */
  async moderateContent(content: string): Promise<GeminiResponse & { 
    moderation?: {
      isAppropriate: boolean;
      reasons?: string[];
      suggestedEdit?: string;
    }
  }> {
    const prompt = `
Analise o seguinte conteúdo médico para determinar se é apropriado para um fórum médico profissional:

"${content}"

Verifique:
1. Linguagem profissional e respeitosa
2. Ausência de informações potencialmente perigosas
3. Relevância médica
4. Ética médica

Responda em JSON:
{
  "isAppropriate": true/false,
  "reasons": ["motivo1", "motivo2"],
  "suggestedEdit": "versão corrigida se necessário"
}
`;

    try {
      const result = await this.generateResponse(prompt);
      if (result.success && result.content) {
        const moderation = JSON.parse(result.content);
        return {
          ...result,
          moderation
        };
      }
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'Erro ao moderar conteúdo'
      };
    }
  }

  /**
   * Constrói prompt especializado para análise médica
   */
  private buildMedicalPrompt(request: MedicalAnalysisRequest): string {
    let prompt = `
Como um sistema de apoio à decisão médica, analise a seguinte questão:

PERGUNTA: "${request.question}"
`;

    if (request.category) {
      prompt += `\nCATEGORIA: ${request.category}`;
    }

    if (request.specialties?.length) {
      prompt += `\nESPECIALIDADES RELEVANTES: ${request.specialties.join(', ')}`;
    }

    if (request.patientInfo) {
      prompt += `\nINFORMAÇÕES DO PACIENTE:`;
      if (request.patientInfo.age) prompt += `\n- Idade: ${request.patientInfo.age} anos`;
      if (request.patientInfo.gender) prompt += `\n- Sexo: ${request.patientInfo.gender}`;
      if (request.patientInfo.symptoms?.length) {
        prompt += `\n- Sintomas: ${request.patientInfo.symptoms.join(', ')}`;
      }
    }

    prompt += `

Forneça uma análise estruturada em JSON:
{
  "possibleDiagnoses": ["diagnóstico1", "diagnóstico2"],
  "recommendedTests": ["exame1", "exame2"],
  "severity": "low|medium|high|emergency",
  "specialtyRecommendation": "especialidade mais adequada",
  "confidenceLevel": 0.85,
  "explanation": "explicação detalhada",
  "disclaimer": "lembrete sobre consulta médica"
}

IMPORTANTE: Esta é uma ferramenta de apoio educacional. Sempre recomende consulta médica presencial.
`;

    return prompt;
  }

  /**
   * Parse da resposta médica estruturada
   */
  private parseMedicalResponse(text: string): MedicalAnalysisResponse['analysis'] {
    try {
      // Remove markdown e extrai JSON
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanText);
      
      return {
        possibleDiagnoses: parsed.possibleDiagnoses || [],
        recommendedTests: parsed.recommendedTests || [],
        severity: parsed.severity || 'medium',
        specialtyRecommendation: parsed.specialtyRecommendation,
        confidenceLevel: parsed.confidenceLevel || 0.5
      };
    } catch (error) {
      console.warn('Erro ao fazer parse da resposta médica:', error);
      return {
        possibleDiagnoses: [],
        recommendedTests: [],
        severity: 'medium',
        confidenceLevel: 0.5
      };
    }
  }

  /**
   * Troca o modelo em uso
   */
  switchModel(modelName: string) {
    this.model = genAI.getGenerativeModel({ model: modelName });
  }
}

// Instância singleton
export const geminiService = new GeminiService();

// Exports para facilitar uso
export { MODELS as GEMINI_MODELS };
export default GeminiService; 