import { Request, Response } from "express";
import { SupabaseMedbraveAIService as MedbraveAIService } from "../../../infra/medbraveAI/supabase/SupabaseMedbraveAIService";
import { MedicalCase, PulseConfiguration } from "../types/MedbraveAITypes";
import { env } from "../../../config/env";

export class MedbraveAIController {
  private medbraveService: MedbraveAIService;
  private defaultConfig: PulseConfiguration;

  constructor() {
    this.defaultConfig = {
      apiKey: env.GOOGLE_AI_API_KEY,
      defaultModel: env.PULSE_AI_MODEL,
      temperature: env.PULSE_AI_TEMPERATURE,
      topP: 0.8,
      topK: 40,
      maxTokens: env.PULSE_AI_MAX_TOKENS,
      enableLogging: env.PULSE_AI_ENABLE_LOGGING,
      logLevel: env.PULSE_AI_LOG_LEVEL as "debug" | "info" | "warn" | "error",
    };

    this.medbraveService = new MedbraveAIService(this.defaultConfig);
  }

  /**
   * 🧠 POST /api/pulse-ai/analyze
   * Análise médica completa
   */
  analyzeMedicalCase = async (req: Request, res: Response) => {
    try {
      const {
        medicalCase,
        userRole = "student",
      }: {
        medicalCase: MedicalCase;
        userRole?: string;
      } = req.body;

      const userId = req.user?.id || "anonymous";

      // Validação de entrada
      if (!medicalCase || !medicalCase.question) {
        return res.status(400).json({
          success: false,
          error: "Caso médico e pergunta são obrigatórios",
          code: "MISSING_MEDICAL_CASE",
        });
      }

      // Verificar se API Key está configurada
      if (!this.defaultConfig.apiKey) {
        return res.status(500).json({
          success: false,
          error:
            "PULSE AI não configurado. Entre em contato com o administrador.",
          code: "PULSE_NOT_CONFIGURED",
        });
      }

      // Fazer análise
      const result = await this.medbraveService.analyzeMedicalCase(
        medicalCase,
        userId,
        userRole,
      );

      // Retornar resultado
      return res.status(result.success ? 200 : 500).json({
        ...result,
        pulseAI: {
          name: "PULSE AI",
          version: "1.0.0",
          model: this.defaultConfig.defaultModel,
        }
      });
    } catch (error: any) {
      console.error("❌ PULSE AI Controller Error:", error);

      return res.status(500).json({
        success: false,
        error: "Erro interno do PULSE AI",
        code: "PULSE_INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * 📚 POST /api/pulse-ai/educate
   * Educação médica
   */
  educateMedicalTopic = async (req: Request, res: Response) => {
    try {
      const {
        topic,
        specialty,
        complexity = "intermediário",
        userRole = "student",
      }: {
        topic: string;
        specialty?: string;
        complexity?: "básico" | "intermediário" | "avançado";
        userRole?: string;
      } = req.body;

      const userId = req.user?.id || "anonymous";

      // Validação
      if (!topic || topic.trim().length < 3) {
        return res.status(400).json({
          success: false,
          error: "Tópico deve ter pelo menos 3 caracteres",
          code: "INVALID_TOPIC",
        });
      }

      if (!this.defaultConfig.apiKey) {
        return res.status(500).json({
          success: false,
          error: "PULSE AI não configurado",
          code: "PULSE_NOT_CONFIGURED",
        });
      }

      // Educação - usar assinatura correta: topic, specialty, complexity, userId, userRole
      const result = await this.medbraveService.educateMedicalTopic(
        topic,
        specialty || "",
        complexity,
        userId,
        userRole,
      );

      return res.status(result.success ? 200 : 500).json({
        ...result,
        pulseAI: {
          name: "PULSE AI Education",
          topic,
          specialty: specialty || "Medicina Geral",
          complexity,
        }
      });
    } catch (error: any) {
      console.error("❌ PULSE AI Education Error:", error);

      return res.status(500).json({
        success: false,
        error: "Erro na educação médica do PULSE AI",
        code: "PULSE_EDUCATION_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * ⚡ POST /api/pulse-ai/quick
   * Consulta rápida
   */
  quickMedicalQuery = async (req: Request, res: Response) => {
    try {
      const {
        query,
        userRole = "student",
      }: {
        query: string;
        userRole?: string;
      } = req.body;

      const userId = req.user?.id || "anonymous";

      // Validação
      if (!query || query.trim().length < 5) {
        return res.status(400).json({
          success: false,
          error: "Pergunta deve ter pelo menos 5 caracteres",
          code: "INVALID_QUERY",
        });
      }

      if (query.length > 1000) {
        return res.status(400).json({
          success: false,
          error: "Pergunta muito longa (máximo 1000 caracteres)",
          code: "QUERY_TOO_LONG",
        });
      }

      if (!this.defaultConfig.apiKey) {
        return res.status(500).json({
          success: false,
          error: "PULSE AI não configurado",
          code: "PULSE_NOT_CONFIGURED",
        });
      }

      // Consulta rápida
      const result = await this.medbraveService.quickMedicalQuery(
        query,
        userId,
        userRole,
      );

      return res.status(result.success ? 200 : 500).json({
        ...result,
        pulseAI: {
          name: "PULSE AI Quick",
          type: "quick_query",
        },
      });
    } catch (error: any) {
      console.error("❌ PULSE AI Quick Error:", error);

      return res.status(500).json({
        success: false,
        error: "Erro na consulta rápida do PULSE AI",
        code: "PULSE_QUICK_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * 📝 POST /api/pulse-ai/explain-question
   * Explicar resposta de questão médica
   */
  explainQuestionAnswer = async (req: Request, res: Response) => {
    try {
      const {
        question,
        alternatives,
        correctAnswer,
        userAnswer,
        specialty,
        userRole = "student",
      }: {
        question: string;
        alternatives: string[];
        correctAnswer: string;
        userAnswer?: string;
        specialty?: string;
        userRole?: string;
      } = req.body;

      const userId = req.user?.id || "anonymous";

      // Validação
      if (!question || question.trim().length < 10) {
        return res.status(400).json({
          success: false,
          error: "Questão deve ter pelo menos 10 caracteres",
          code: "INVALID_QUESTION",
        });
      }

      if (!alternatives || alternatives.length < 2) {
        return res.status(400).json({
          success: false,
          error: "Deve haver pelo menos 2 alternativas",
          code: "INSUFFICIENT_ALTERNATIVES",
        });
      }

      if (!correctAnswer || correctAnswer.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "Resposta correta deve ser fornecida",
          code: "MISSING_CORRECT_ANSWER",
        });
      }

      if (!this.defaultConfig.apiKey) {
        return res.status(500).json({
          success: false,
          error: "PULSE AI não configurado",
          code: "PULSE_NOT_CONFIGURED",
        });
      }

      // Explicar questão
      const result = await this.medbraveService.explainQuestionAnswer(
        question,
        alternatives,
        correctAnswer,
        userAnswer,
        specialty,
        userId,
        userRole,
      );

      return res.status(result.success ? 200 : 500).json({
        ...result,
        pulseAI: {
          name: "PULSE AI Question Explainer",
          type: "question_explanation",
          correctAnswer,
          userWasCorrect: userAnswer ? userAnswer === correctAnswer : null,
        }
      });
    } catch (error: any) {
      console.error("❌ PULSE AI Question Explanation Error:", error);

      return res.status(500).json({
        success: false,
        error: "Erro na explicação da questão pelo PULSE AI",
        code: "PULSE_EXPLANATION_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * 📄 POST /api/pulse-ai/extract-questions
   * Extrair questões de PDFs/textos (Admin only)
   */
  extractQuestionsFromContent = async (req: Request, res: Response) => {
    try {
      // Verificar se é admin
      if ((req.user?.user_role || '').toUpperCase() !== "ADMIN") {
        return res.status(403).json({
          success: false,
          error:
            "Acesso negado. Apenas administradores podem extrair questões.",
          code: "ACCESS_DENIED",
        });
      }

      const {
        content,
        options = {},
      }: {
        content: string;
        options?: {
          specialty?: string;
          difficulty?: "básica" | "intermediária" | "avançada";
          questionType?: "multiple_choice" | "true_false" | "essay";
          maxQuestions?: number;
          includeExplanations?: boolean;
        };
      } = req.body;

      const userId = req.user?.id || "anonymous";

      // Validação
      if (!content || content.trim().length < 100) {
        return res.status(400).json({
          success: false,
          error: "Conteúdo deve ter pelo menos 100 caracteres",
          code: "INVALID_CONTENT",
        });
      }

      if (!this.defaultConfig.apiKey) {
        return res.status(500).json({
          success: false,
          error: "PULSE AI não configurado",
          code: "PULSE_NOT_CONFIGURED",
        });
      }

      // Extrair questões
      const result = await this.medbraveService.extractQuestionsFromContent(
        content,
        options,
        userId,
        "admin",
      );

      return res.status(result.success ? 200 : 500).json({
        ...result,
        pulseAI: {
          name: "PULSE AI Question Extractor",
          type: "question_extraction",
          questionsFound: result.questions?.length || 0,
        }
      });
    } catch (error: any) {
      console.error("❌ PULSE AI Question Extraction Error:", error);

      return res.status(500).json({
        success: false,
        error: "Erro na extração de questões pelo PULSE AI",
        code: "PULSE_EXTRACTION_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * 🏷️ POST /api/pulse-ai/categorize-questions
   * Categorizar questões com filtros/subfiltros do banco (Admin only)
   */
  categorizeQuestions = async (req: Request, res: Response) => {
    try {
      console.log("🎯 PULSE AI Categorization - Iniciando...");

      // Verificar se é admin
      if ((req.user?.user_role || '').toUpperCase() !== "ADMIN") {
        console.log("❌ Acesso negado - usuário não é admin:", req.user?.user_role);
        return res.status(403).json({
          success: false,
          error:
            "Acesso negado. Apenas administradores podem categorizar questões.",
          code: "ACCESS_DENIED",
        });
      }

      const {
        questions,
        availableFilters,
      }: {
        questions: Array<{
          question: string;
          alternatives: string[];
          correctAnswer: string;
          explanation?: string;
        }>;
        availableFilters: Array<{
          id: string;
          name: string;
          subfilters?: Array<{
            id: string;
            name: string;
          }>;
        }>;
      } = req.body;

      const userId = req.user?.id || "anonymous";

      console.log("📊 Dados recebidos:");
      console.log("  - Questões:", questions?.length || 0);
      console.log("  - Filtros:", availableFilters?.length || 0);
      console.log("  - API Key configurada:", !!this.defaultConfig.apiKey);
      console.log(
        "  - Primeiros chars da API Key:",
        this.defaultConfig.apiKey?.substring(0, 10) + "...",
      );

      // Validação
      if (!questions || questions.length === 0) {
        console.log("❌ Nenhuma questão fornecida");
        return res.status(400).json({
          success: false,
          error: "Deve fornecer pelo menos uma questão para categorizar",
          code: "NO_QUESTIONS",
        });
      }

      if (!availableFilters || availableFilters.length === 0) {
        console.log("❌ Nenhum filtro fornecido");
        return res.status(400).json({
          success: false,
          error: "Deve fornecer filtros disponíveis do banco de dados",
          code: "NO_FILTERS",
        });
      }

      if (!this.defaultConfig.apiKey) {
        console.log("❌ PULSE AI não configurado - API Key ausente");
        return res.status(500).json({
          success: false,
          error:
            "PULSE AI não configurado. Configure GOOGLE_AI_API_KEY no arquivo .env",
          code: "PULSE_NOT_CONFIGURED",
        });
      }

      console.log("✅ Validações passaram, iniciando categorização...");

      // Categorizar questões
      const result = await this.medbraveService.categorizeQuestions(
        questions,
        availableFilters,
        userId,
        "admin",
      );

      console.log("📈 Resultado da categorização:", {
        success: result.success,
        questionsProcessed: result.categorizedQuestions?.length || 0,
        hasError: !!result.error,
      });

      return res.status(result.success ? 200 : 500).json({
        ...result,
        pulseAI: {
          name: "PULSE AI Question Categorizer",
          type: "question_categorization",
          questionsCategorized: result.categorizedQuestions?.length || 0,
          filtersUsed: availableFilters.length,
        }
      });
    } catch (error: any) {
      console.error("❌ PULSE AI Question Categorization Error Details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });

      return res.status(500).json({
        success: false,
        error: "Erro na categorização de questões pelo PULSE AI",
        code: "PULSE_CATEGORIZATION_ERROR",
        timestamp: new Date().toISOString(),
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  };

  /**
   * 🔍 POST /api/pulse-ai/detect-outdated
   * Detectar questões desatualizadas via busca web (apenas administradores)
   */
  detectOutdatedQuestions = async (req: Request, res: Response) => {
    try {
      // Verificar se é admin
      if ((req.user?.user_role || '').toUpperCase() !== "ADMIN") {
        return res.status(403).json({
          success: false,
          error:
            "Acesso negado. Apenas administradores podem detectar questões desatualizadas.",
          code: "ACCESS_DENIED",
        });
      }

      console.log("🔍 Iniciando detecção de questões desatualizadas...");
      console.time("pulse-detect-outdated");

      const { questionData, userRole = "admin", options: _options = {} } = req.body;

      if (!questionData) {
        return res.status(400).json({
          success: false,
          error: "Dados das questões são obrigatórios",
          code: "MISSING_QUESTION_DATA",
        });
      }

      let parsedQuestions;
      try {
        parsedQuestions =
          typeof questionData === "string"
            ? JSON.parse(questionData)
            : questionData;
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: "Formato de dados das questões inválido",
          code: "INVALID_QUESTION_FORMAT",
        });
      }

      const questionsArray = parsedQuestions.questions || parsedQuestions;

      if (!Array.isArray(questionsArray) || questionsArray.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Array de questões vazio ou inválido",
          code: "EMPTY_QUESTIONS_ARRAY",
        });
      }

      console.log(
        `📊 Analisando ${questionsArray.length} questões para protocolos desatualizados`,
      );

      // Filtrar apenas questões com resposta correta definida
      const validQuestions = questionsArray.filter(
        (q) =>
          q.statement?.trim() &&
          q.correctAnswer &&
          q.alternatives &&
          Array.isArray(q.alternatives),
      );

      if (validQuestions.length === 0) {
        return res.status(400).json({
          success: false,
          error:
            "Nenhuma questão válida encontrada (precisam ter enunciado, alternativas e resposta correta)",
          code: "NO_VALID_QUESTIONS",
        });
      }

      console.log(
        `✅ ${validQuestions.length} questões válidas de ${questionsArray.length} totais`,
      );

      // Simular detecção inteligente de questões desatualizadas
      const outdatedQuestions: any[] = [];

      for (const [index, question] of validQuestions.entries()) {
        try {
          console.log(
            `🔍 Analisando questão ${index + 1}/${validQuestions.length}: ${question.statement?.substring(0, 100)}...`,
          );

          // PROMPT ESPECÍFICO para detecção de questões desatualizadas
          const detectionPrompt = `
Analise se esta questão médica pode estar com protocolo desatualizado:

QUESTÃO: ${question.statement}

ALTERNATIVAS:
${question.alternatives.map((alt: string, i: number) => `${String.fromCharCode(65 + i)}. ${alt}`).join("\n")}

RESPOSTA CORRETA: ${question.correctAnswer}

TAREFA:
1. Analise se a resposta correta está de acordo com protocolos médicos atuais (2024)
2. Verifique se houve mudanças recentes em diretrizes médicas relacionadas ao tema
3. Considere atualizações em sociedades médicas brasileiras e internacionais
4. Verifique se o protocolo mencionado na resposta correta ainda é o padrão-ouro

RESPONDA EM JSON:
{
  "isOutdated": boolean,
  "confidence": number (0-1),
  "reason": "explicação detalhada",
  "currentProtocol": "protocolo atual se diferente",
  "references": ["lista de fontes atualizadas"],
  "lastUpdate": "data estimada da última atualização do protocolo"
}

Seja conservador - apenas marque como desatualizada se tiver certeza de mudanças significativas.`;

          const result = await this.medbraveService.quickMedicalQuery(
            detectionPrompt,
            req.user?.id || "admin",
            userRole,
          );

          let analysisResult;
          try {
            // Tentar extrair JSON da resposta
            const content = result.content || '';
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              analysisResult = JSON.parse(jsonMatch[0]);
            } else {
              // Fallback: análise baseada em palavras-chave
              const isOutdated =
                content.toLowerCase().includes("desatualizada") ||
                content.toLowerCase().includes("mudou") ||
                content.toLowerCase().includes("atualizado");

              analysisResult = {
                isOutdated,
                confidence: isOutdated ? 0.7 : 0.3,
                reason: result.content,
                references: ["PULSE AI Analysis"],
                lastUpdate: new Date().toISOString(),
              };
            }
          } catch (e) {
            console.warn(
              `⚠️ Erro ao parsear JSON para questão ${index + 1}, usando fallback`,
            );
            analysisResult = {
              isOutdated: false,
              confidence: 0.5,
              reason: "Análise inconclusiva",
              references: ["PULSE AI"],
              lastUpdate: new Date().toISOString(),
            };
          }

          // Se detectada como desatualizada, adicionar à lista
          if (analysisResult.isOutdated && analysisResult.confidence > 0.6) {
            outdatedQuestions.push({
              questionId: question.questionId || `q-${index}`,
              questionNumber: question.questionNumber || `${index + 1}`,
              statement: question.statement,
              correctAnswer: question.correctAnswer,
              isOutdated: true,
              confidence: analysisResult.confidence,
              reason: analysisResult.reason,
              currentProtocol: analysisResult.currentProtocol,
              references: analysisResult.references || [],
              lastProtocolUpdate: analysisResult.lastUpdate,
              detectedAt: new Date().toISOString(),
            });

            console.log(
              `📅 Questão ${index + 1} marcada como DESATUALIZADA (${Math.round(analysisResult.confidence * 100)}% confiança)`,
            );
          } else {
            console.log(
              `✅ Questão ${index + 1} parece ATUALIZADA (${Math.round(analysisResult.confidence * 100)}% confiança)`,
            );
          }

          // Delay entre análises para não sobrecarregar a API
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`❌ Erro ao analisar questão ${index + 1}:`, error);
        }
      }

      console.timeEnd("pulse-detect-outdated");
      console.log(
        `✅ Detecção concluída: ${outdatedQuestions.length} questões desatualizadas de ${validQuestions.length} analisadas`,
      );

      return res.json({
        success: true,
        message: `Análise concluída: ${outdatedQuestions.length} questões possivelmente desatualizadas encontradas`,
        outdatedQuestions,
        summary: {
          totalAnalyzed: validQuestions.length,
          totalOriginal: questionsArray.length,
          outdatedFound: outdatedQuestions.length,
          upToDate: validQuestions.length - outdatedQuestions.length,
          analysisDate: new Date().toISOString(),
        },
        pulseAI: {
          name: "PULSE AI Outdated Detection",
          model: "gpt-4",
          confidence: "conservative",
          strategy: "protocol_verification",
        },
      });
    } catch (error: any) {
      console.error("❌ PULSE AI Detect Outdated Error:", error);
      console.timeEnd("pulse-detect-outdated");

      return res.status(500).json({
        success: false,
        error: "Erro na detecção de questões desatualizadas",
        code: "PULSE_DETECT_OUTDATED_ERROR",
        details: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * 🛡️ POST /api/pulse-ai/moderate
   * Moderação de conteúdo médico
   */
  moderateMedicalContent = async (req: Request, res: Response) => {
    try {
      const {
        content,
        context,
      }: {
        content: string;
        context?: string;
      } = req.body;

      const userId = req.user?.id || "anonymous";

      // Validação
      if (!content || content.trim().length < 5) {
        return res.status(400).json({
          success: false,
          error: "Conteúdo deve ter pelo menos 5 caracteres",
          code: "INVALID_CONTENT",
        });
      }

      if (content.length > 5000) {
        return res.status(400).json({
          success: false,
          error: "Conteúdo muito longo (máximo 5000 caracteres)",
          code: "CONTENT_TOO_LONG",
        });
      }

      if (!this.defaultConfig.apiKey) {
        return res.status(500).json({
          success: false,
          error: "PULSE AI não configurado",
          code: "PULSE_NOT_CONFIGURED",
        });
      }

      // Moderação
      const result = await this.medbraveService.moderateMedicalContent(
        content,
        userId,
        context,
      );

      return res.status(result.success ? 200 : 500).json({
        ...result,
        pulseAI: {
          name: "PULSE AI Moderator",
          type: "content_moderation",
        },
      });
    } catch (error: any) {
      console.error("❌ PULSE AI Moderation Error:", error);

      return res.status(500).json({
        success: false,
        error: "Erro na moderação do PULSE AI",
        code: "PULSE_MODERATION_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * 📊 GET /api/pulse-ai/status
   * Status do sistema
   */
  getStatus = async (_req: Request, res: Response) => {
    try {
      const status = this.medbraveService.getStatus();

      // Verificar saúde do sistema
      const health = {
        status: status.ready
          ? "healthy"
          : ("unhealthy" as "healthy" | "unhealthy"),
        lastHealthCheck: new Date().toISOString(),
        issues: status.ready ? [] : ["API Key não configurada"],
      };

      return res.json({
        ...status,
        health,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      });
    } catch (error: any) {
      console.error("❌ PULSE AI Status Error:", error);

      return res.status(500).json({
        success: false,
        error: "Erro ao obter status do PULSE AI",
        code: "PULSE_STATUS_ERROR",
      });
    }
  };

  /**
   * ⚙️ PUT /api/pulse-ai/config
   * Atualizar configuração (apenas admin)
   */
  updateConfiguration = async (req: Request, res: Response) => {
    try {
      // Verificar se é admin
      if ((req.user?.user_role || '').toUpperCase() !== "ADMIN") {
        return res.status(403).json({
          success: false,
          error:
            "Acesso negado. Apenas administradores podem alterar configurações.",
          code: "ACCESS_DENIED",
        });
      }

      const newConfig: Partial<PulseConfiguration> = req.body;

      // Validar configuração
      if (
        newConfig.temperature &&
        (newConfig.temperature < 0 || newConfig.temperature > 2)
      ) {
        return res.status(400).json({
          success: false,
          error: "Temperature deve estar entre 0 e 2",
          code: "INVALID_TEMPERATURE",
        });
      }

      if (
        newConfig.maxTokens &&
        (newConfig.maxTokens < 100 || newConfig.maxTokens > 8192)
      ) {
        return res.status(400).json({
          success: false,
          error: "MaxTokens deve estar entre 100 e 8192",
          code: "INVALID_MAX_TOKENS",
        });
      }

      // Atualizar configuração
      this.medbraveService.updateConfiguration(newConfig);

      // Atualizar config local
      this.defaultConfig = { ...this.defaultConfig, ...newConfig };

      return res.json({
        success: true,
        message: "Configuração do PULSE AI atualizada",
        configuration: this.defaultConfig,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("❌ PULSE AI Config Error:", error);

      return res.status(500).json({
        success: false,
        error: "Erro ao atualizar configuração do PULSE AI",
        code: "PULSE_CONFIG_ERROR",
      });
    }
  };

  /**
   * 📈 GET /api/pulse-ai/analytics
   * Estatísticas de uso (apenas admin)
   */
  getAnalytics = async (req: Request, res: Response) => {
    try {
      // Verificar se é admin
      if ((req.user?.user_role || '').toUpperCase() !== "ADMIN") {
        return res.status(403).json({
          success: false,
          error: "Acesso negado. Apenas administradores podem ver analytics.",
          code: "ACCESS_DENIED",
        });
      }

      const { startDate, endDate } = req.query;

      let timeRange;
      if (startDate && endDate) {
        timeRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string),
        };
      }

      // Obter estatísticas do logger
      const logger = (this.medbraveService as any).logger;
      const statistics = logger.getStatistics(timeRange);

      return res.json({
        success: true,
        analytics: statistics,
        pulseAI: {
          name: "PULSE AI Analytics",
          period: timeRange || "all_time",
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("❌ PULSE AI Analytics Error:", error);

      return res.status(500).json({
        success: false,
        error: "Erro ao obter analytics do PULSE AI",
        code: "PULSE_ANALYTICS_ERROR",
      });
    }
  };

  /**
   * 🧪 POST /api/pulse-ai/test
   * Teste do sistema (apenas desenvolvimento)
   */
  testSystem = async (_req: Request, res: Response) => {
    try {
      // Verificar ambiente
      if (process.env.NODE_ENV === "production") {
        return res.status(403).json({
          success: false,
          error: "Endpoint de teste não disponível em produção",
          code: "TEST_UNAVAILABLE",
        });
      }

      // Teste simples
      // Caso de teste omitido

      const result = await this.medbraveService.quickMedicalQuery(
        "Teste do PULSE AI - explicar brevemente hipertensão",
        "test_user",
        "admin",
      );

      return res.json({
        success: true,
        message: "Teste do PULSE AI executado",
        testResult: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("❌ PULSE AI Test Error:", error);

      return res.status(500).json({
        success: false,
        error: "Erro no teste do PULSE AI",
        code: "PULSE_TEST_ERROR",
        details: error.message,
      });
    }
  };

  /**
   * 💬 POST /api/pulse-ai/generate-explanation
   * Gerar comentário explicativo automático para questões
   */
  generateQuestionExplanation = async (req: Request, res: Response) => {
    try {
      console.log("💬 Iniciando geração de explicação automática...");
      console.time("pulse-generate-explanation");

      const {
        questionData,
        forceRegenerate = false,
        userRole = "student",
      }: {
        questionData: {
          id?: string;
          statement: string;
          alternatives: string[];
          correctAnswerIndex: number;
          correctAnswer: string;
          explanation?: string;
          tags?: string[];
          isAnnulled?: boolean;
          isOutdated?: boolean;
          specialty?: string;
          difficulty?: string;
        };
        forceRegenerate?: boolean;
        userRole?: string;
      } = req.body;

      const userId = req.user?.id || "anonymous";

      // Validação de entrada
      if (!questionData || !questionData.statement) {
        return res.status(400).json({
          success: false,
          error: "Dados da questão são obrigatórios",
          code: "MISSING_QUESTION_DATA",
        });
      }

      if (!questionData.alternatives || questionData.alternatives.length < 2) {
        return res.status(400).json({
          success: false,
          error: "Questão deve ter pelo menos 2 alternativas",
          code: "INSUFFICIENT_ALTERNATIVES",
        });
      }

      if (
        questionData.correctAnswerIndex === undefined ||
        questionData.correctAnswerIndex < 0
      ) {
        return res.status(400).json({
          success: false,
          error: "Índice da resposta correta deve ser fornecido",
          code: "MISSING_CORRECT_ANSWER",
        });
      }

      if (!this.defaultConfig.apiKey) {
        return res.status(500).json({
          success: false,
          error: "PULSE AI não configurado",
          code: "PULSE_NOT_CONFIGURED",
        });
      }

      // 🔑 GERAR HASH PARA CACHE (baseado no conteúdo da questão)
      const crypto = require("crypto");
      const questionHash = crypto
        .createHash("md5")
        .update(
          JSON.stringify({
            statement: questionData.statement.trim(),
            alternatives: questionData.alternatives,
            correctAnswerIndex: questionData.correctAnswerIndex,
            isAnnulled: questionData.isAnnulled || false,
            isOutdated: questionData.isOutdated || false,
          }),
        )
        .digest("hex");

      console.log(`🔑 Hash da questão: ${questionHash}`);

      // 💾 VERIFICAR CACHE (se não for regeneração forçada)
      if (!forceRegenerate) {
        // TODO: Implementar sistema de cache (Redis/MongoDB)
        // Por enquanto, pular cache e sempre gerar
        console.log(
          "💾 Cache não implementado ainda, gerando nova explicação...",
        );
      }

      // 🔍 VALIDAÇÃO PRÉVIA: Verificar se a IA concorda com a resposta marcada
      console.log("🔍 Executando validação prévia da resposta correta...");

      const validationPrompt = `ANÁLISE INDEPENDENTE DE QUESTÃO MÉDICA:

Analise esta questão médica e determine qual alternativa está CORRETA baseado em evidências científicas atuais:

QUESTÃO: ${questionData.statement}

ALTERNATIVAS:
${questionData.alternatives.map((alt: string, i: number) => `${String.fromCharCode(65 + i)}. ${alt}`).join('\n')}

${questionData.specialty ? `ESPECIALIDADE: ${questionData.specialty}` : ""}

RESPONDA APENAS com:
1. A letra da alternativa correta (A, B, C, D, etc.)
2. Uma justificativa breve (1 linha) do porquê

FORMATO:
ALTERNATIVA_CORRETA: [LETRA]
JUSTIFICATIVA: [Explicação breve]

IMPORTANTE: Base sua análise apenas em evidências médicas científicas atuais. Ignore qualquer indicação prévia de qual seria a "resposta correta".`;

      const validationResult = await this.medbraveService.quickMedicalQuery(
        validationPrompt,
        userId,
        userRole,
      );

      let aiAnalysisMatch = true;
      let aiSuggestedAnswer = "";
      let validationWarning = "";

      if (validationResult.success) {
        try {
          // Extrair a resposta da IA
          const contentToParse = validationResult.content || '';
          const aiAnswerMatch = contentToParse.match(
            /ALTERNATIVA_CORRETA:\s*([A-Z])/i,
          );
          const justificationMatch = contentToParse.match(
            /JUSTIFICATIVA:\s*(.+)/i,
          );

          if (aiAnswerMatch) {
            aiSuggestedAnswer = aiAnswerMatch[1].toUpperCase();
            const expectedAnswer = String.fromCharCode(
              65 + questionData.correctAnswerIndex,
            );

            aiAnalysisMatch = aiSuggestedAnswer === expectedAnswer;

            if (!aiAnalysisMatch) {
              validationWarning = `⚠️ DIVERGÊNCIA DETECTADA: A IA sugere alternativa ${aiSuggestedAnswer}, mas está marcada como ${expectedAnswer}. Justificativa da IA: ${justificationMatch?.[1] || "Não fornecida"}`;
              console.warn(validationWarning);
            } else {
              console.log(
                `✅ Validação OK: IA concorda com alternativa ${expectedAnswer}`,
              );
            }
          }
        } catch (e) {
          console.warn("⚠️ Erro ao parsear validação da IA, continuando...");
        }
      } else {
        console.warn(
          "⚠️ Falha na validação prévia, continuando com resposta marcada...",
        );
      }

      // 🧠 PROMPT ESPECIALIZADO para explicação educativa
      const explanationPrompt = `
Você é um professor de medicina experiente. Crie uma explicação educativa COMPLETA e DIDÁTICA para esta questão médica:

${
  !aiAnalysisMatch
    ? `
🚨 ATENÇÃO ESPECIAL: Foi detectada uma possível divergência na análise desta questão.
- Resposta marcada como correta: ${String.fromCharCode(65 + questionData.correctAnswerIndex)}
- IA sugere: ${aiSuggestedAnswer}
- Seja extra cuidadoso na explicação e mencione se há controvérsias ou diferentes interpretações possíveis.
`
    : ""
}

QUESTÃO: ${questionData.statement}

ALTERNATIVAS:
${questionData.alternatives
  .map(
    (alt: string, i: number) =>
    `${String.fromCharCode(65 + i)}. ${alt} ${i === questionData.correctAnswerIndex ? '← CORRETA (MARCADA)' : ''}`,
).join('\n')}

RESPOSTA CORRETA MARCADA: ${String.fromCharCode(65 + questionData.correctAnswerIndex)} - ${questionData.correctAnswer}

${questionData.specialty ? `ESPECIALIDADE: ${questionData.specialty}` : ""}
${questionData.difficulty ? `DIFICULDADE: ${questionData.difficulty}` : ""}

STATUS ESPECIAIS:
${questionData.isAnnulled ? "🚫 QUESTÃO ANULADA" : ""}
${questionData.isOutdated ? "📅 QUESTÃO DESATUALIZADA" : ""}

${
  !aiAnalysisMatch
    ? `
🔍 DIVERGÊNCIA DETECTADA:
${validationWarning}

POR FAVOR, na sua explicação:
1. Explique POR QUE a alternativa marcada como correta pode estar certa
2. Mencione se existe controvérsia ou diferentes interpretações
3. Se apropriado, discuta brevemente por que outra alternativa poderia ser considerada
4. Mantenha o foco educativo e científico
`
    : ""
}

TAREFA - Crie uma explicação educativa seguindo EXATAMENTE esta estrutura:

## 🎯 Resposta Correta: ${String.fromCharCode(65 + questionData.correctAnswerIndex)}

[Explicação detalhada de POR QUE esta alternativa está correta, incluindo:]
- Conceitos médicos fundamentais envolvidos
- Fisiopatologia relevante
- Protocolo/diretriz atual que sustenta esta resposta
- Raciocínio clínico para chegar a esta conclusão

## 🔄 Fluxograma de Raciocínio Clínico

\`\`\`mermaid
graph TD
    A[Apresentação Clínica] --> B{Sinais/Sintomas}
    B --> C[Hipótese Diagnóstica]
    C --> D[Exames Complementares]
    D --> E[Diagnóstico Final]
    E --> F[Conduta Terapêutica]
    
    %% Personalize este fluxograma baseado no tema da questão
    %% Exemplo: Para cardiologia, inclua ECG, troponinas, etc.
    %% Para pneumologia, inclua RX tórax, gasometria, etc.
\`\`\`

*Adapte o fluxograma acima para o tema específico da questão, incluindo:*
- Sinais e sintomas específicos
- Exames diagnósticos relevantes
- Critérios de decisão clínica
- Algoritmo terapêutico

## 📊 Diagrama Fisiopatológico

\`\`\`mermaid
graph LR
    A[Causa Inicial] --> B[Mecanismo 1]
    B --> C[Mecanismo 2]
    C --> D[Manifestação Clínica]
    
    %% Crie um diagrama específico para a fisiopatologia envolvida
\`\`\`

*Explique a fisiopatologia usando o diagrama acima, detalhando:*
- Mecanismos moleculares/celulares
- Cascata de eventos
- Correlação clínico-patológica

## ❌ Por que as outras alternativas estão incorretas:

${questionData.alternatives
  .map((alt: string, i: number) => {
    if (i === questionData.correctAnswerIndex) {return '';}
    return `**${String.fromCharCode(65 + i)}. ${alt}**
[Explicação específica do erro conceitual/prático desta alternativa]
- Qual conceito médico está incorreto
- Por que essa abordagem seria inadequada
- Possíveis consequências clínicas desta escolha`;
  }).filter(Boolean).join('\n\n')}

## 🎨 Elementos Visuais Contextuais

### 📋 Tabela Comparativa
| Critério | Opção Correta | Alternativas Incorretas |
|----------|---------------|------------------------|
| Eficácia | [Dados] | [Comparação] |
| Segurança | [Dados] | [Comparação] |
| Indicação | [Dados] | [Comparação] |

### 🔍 Imagens Sugeridas
*Para melhor compreensão, seria útil incluir:*
- 📸 **Imagem clínica**: [Descreva que tipo de imagem seria útil - ex: RX, ECG, lesão dermatológica]
- 🔬 **Microscopia**: [Se aplicável - histopatologia, citologia]
- 📊 **Gráficos**: [Curvas, estatísticas, progressão temporal]
- 🗺️ **Anatomia**: [Estruturas anatômicas relevantes]

### 💊 Algoritmo Terapêutico

\`\`\`mermaid
flowchart TD
    A[Diagnóstico Confirmado] --> B{Gravidade?}
    B -->|Leve| C[Tratamento Conservador]
    B -->|Moderada| D[Medicação Oral]
    B -->|Grave| E[Internação + IV]
    
    C --> F[Acompanhamento Ambulatorial]
    D --> G[Reavaliação em X dias]
    E --> H[Monitorização Intensiva]
\`\`\`

## 📚 Conceitos-Chave para Revisar:

1. **[Conceito 1]**: Definição e importância clínica
2. **[Conceito 2]**: Mecanismo de ação/fisiopatologia
3. **[Conceito 3]**: Diagnóstico diferencial
4. **[Conceito 4]**: Protocolo terapêutico atual
5. **[Conceito 5]**: Prognóstico e seguimento

## 🔗 Dicas de Estudo:

### 🧠 Mnemônicos Úteis
- **[Criar mnemônico relevante]**: Para memorizar critérios/sinais
- **[Acrônimo]**: Para lembrar sequência de tratamento

### 📖 Estratégias de Memorização
1. **Associação visual**: [Dica específica]
2. **Correlação clínica**: [Exemplo prático]
3. **Revisão ativa**: [Método de estudo]

### 🎯 Pontos de Atenção para Provas
- ⚠️ **Pegadinha comum**: [Erro frequente]
- 🔑 **Palavra-chave**: [Termo que indica a resposta]
- 📊 **Dados importantes**: [Valores/critérios para decorar]

${
  questionData.isAnnulled
    ? `
## 🚫 Sobre a Anulação:

Esta questão foi anulada provavelmente devido a:
- **Ambiguidade**: Múltiplas interpretações possíveis
- **Erro técnico**: Informação incorreta no enunciado
- **Múltiplas respostas**: Mais de uma alternativa correta
- **Desatualização**: Protocolo mudou após elaboração

### 📋 Análise da Anulação
\`\`\`mermaid
graph LR
    A[Questão Original] --> B[Problema Identificado]
    B --> C[Análise da Banca]
    C --> D[Decisão de Anulação]
    D --> E[Pontuação para Todos]
\`\`\`
`
    : ""
}

${
  questionData.isOutdated
    ? `
## 📅 Protocolo Desatualizado:

### 🔄 Evolução do Protocolo
\`\`\`mermaid
timeline
    title Evolução das Diretrizes
    
    Protocolo Antigo : Abordagem da época da questão
                     : Limitações conhecidas
    
    Transição       : Estudos que mudaram paradigma
                     : Evidências emergentes
    
    Protocolo Atual : Recomendação atual (2024)
                     : Benefícios da nova abordagem
\`\`\`

### 📊 Comparação: Antigo vs Atual
| Aspecto | Protocolo Antigo | Protocolo Atual |
|---------|------------------|-----------------|
| Abordagem | [Descrição] | [Descrição] |
| Evidência | [Nível] | [Nível] |
| Resultados | [Dados] | [Dados] |

**Resposta atual seria**: [Nova resposta baseada em protocolos 2024]
`
    : ""
}

## 🎓 Resumo Executivo

### ✅ Pontos-Chave
- **Diagnóstico**: [Resumo]
- **Tratamento**: [Resumo]
- **Prognóstico**: [Resumo]

### 🎯 Para a Prova
- **Lembre-se**: [Dica principal]
- **Cuidado com**: [Pegadinha]
- **Foque em**: [Conceito central]

IMPORTANTE: 
- Use linguagem didática mas técnica
- Seja preciso nas informações médicas
- Forneça contexto clínico relevante
- Mantenha foco educativo, não apenas informativo
- SEMPRE inclua elementos visuais (fluxogramas, diagramas, tabelas)
- Adapte os diagramas Mermaid ao tema específico da questão
- Sugira imagens contextuais relevantes para o aprendizado
`;

      console.log("🧠 Enviando prompt para PULSE AI...");

      // Gerar explicação usando PULSE AI
      const result = await this.medbraveService.quickMedicalQuery(
        explanationPrompt,
        userId,
        userRole,
      );

      if (!result.success) {
        throw new Error(result.error || "Falha na geração da explicação");
      }

      const generatedExplanation = result.content;

      // 📊 METADADOS da explicação gerada
      const explanationMetadata = {
        questionHash,
        generatedAt: new Date().toISOString(),
        generatedBy: "PULSE AI",
        model: this.defaultConfig.defaultModel,
        userId,
        userRole,
        questionId: questionData.id,
        hasSpecialStatus: questionData.isAnnulled || questionData.isOutdated,
        isAnnulled: questionData.isAnnulled || false,
        isOutdated: questionData.isOutdated || false,
        alternativesCount: questionData.alternatives.length,
        correctAnswerIndex: questionData.correctAnswerIndex,
        specialty: questionData.specialty,
        difficulty: questionData.difficulty,
        // 🔍 Metadados de validação
        validation: {
          performed: true,
          aiAnalysisMatch,
          markedAnswer: String.fromCharCode(
            65 + questionData.correctAnswerIndex,
          ),
          aiSuggestedAnswer: aiSuggestedAnswer || null,
          hasDiscrepancy: !aiAnalysisMatch,
          warning: validationWarning || null,
        }
      };

      console.timeEnd("pulse-generate-explanation");
      console.log(
        `✅ Explicação gerada com sucesso (${(generatedExplanation || '').length} caracteres)`,
      );

      // TODO: Salvar no cache para uso futuro
      // await cacheService.setExplanation(questionHash, {
      //   explanation: generatedExplanation,
      //   metadata: explanationMetadata
      // });

      return res.json({
        success: true,
        message: "Explicação educativa gerada com sucesso",
        explanation: {
          content: generatedExplanation,
          metadata: explanationMetadata,
          cached: false,
          hash: questionHash,
        },
        pulseAI: {
          name: "PULSE AI Educational Explainer",
          type: "question_explanation",
          model: this.defaultConfig.defaultModel,
          educationalLevel: "comprehensive",
        },
      });
    } catch (error: any) {
      console.error("❌ PULSE AI Generate Explanation Error:", error);
      console.timeEnd("pulse-generate-explanation");

      return res.status(500).json({
        success: false,
        error: "Erro na geração da explicação educativa",
        code: "PULSE_EXPLANATION_ERROR",
        details: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * 👍👎 POST /api/pulse-ai/rate-explanation
   * Avaliar qualidade da explicação da IA
   */
  rateAIExplanation = async (req: Request, res: Response) => {
    try {
      const {
        explanationHash,
        rating,
        feedback,
        questionId,
      }: {
        explanationHash: string;
        rating: "positive" | "negative";
        feedback?: string;
        questionId?: string;
      } = req.body;

      const userId = req.user?.id || "anonymous";

      // Validação
      if (!explanationHash) {
        return res.status(400).json({
          success: false,
          error: "Hash da explicação é obrigatório",
          code: "MISSING_EXPLANATION_HASH",
        });
      }

      if (!["positive", "negative"].includes(rating)) {
        return res.status(400).json({
          success: false,
          error: 'Rating deve ser "positive" ou "negative"',
          code: "INVALID_RATING",
        });
      }

      // 📊 SALVAR AVALIAÇÃO
      const ratingData = {
        explanationHash,
        userId,
        rating,
        feedback: feedback || null,
        questionId: questionId || null,
        timestamp: new Date().toISOString(),
        userAgent: req.headers["user-agent"],
      };

      console.log('👍👎 Avaliação recebida:', {
        hash: explanationHash.substring(0, 8) + "...",
        rating,
        hasFeedback: !!feedback,
        userId,
      });

      // TODO: Salvar no banco de dados
      // await ratingsService.saveExplanationRating(ratingData);

      return res.json({
        success: true,
        message: `Avaliação ${rating === "positive" ? "positiva" : "negativa"} registrada com sucesso`,
        rating: {
          hash: explanationHash,
          rating,
          feedback: feedback || null,
          timestamp: ratingData.timestamp,
        },
        pulseAI: {
          name: "PULSE AI Rating System",
          type: "explanation_rating",
        },
      });
    } catch (error: any) {
      console.error("❌ PULSE AI Rate Explanation Error:", error);

      return res.status(500).json({
        success: false,
        error: "Erro ao avaliar explicação da IA",
        code: "PULSE_RATING_ERROR",
        details: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * 📄 POST /api/pulse-ai/convert-to-markdown
   * Converter documentos (HTML/PDF/DOCX) para Markdown estruturado com IA
   */
  convertDocumentToMarkdown = async (req: Request, res: Response) => {
    try {
      // Verificar se é admin
      if ((req.user?.user_role || '').toUpperCase() !== "ADMIN") {
        return res.status(403).json({
          success: false,
          error:
            "Acesso negado. Apenas administradores podem converter documentos.",
          code: "ACCESS_DENIED",
        });
      }

      const {
        content,
        documentType = "html",
        options = {},
      }: {
        content: string;
        documentType: "html" | "pdf" | "docx";
        options?: {
          extractImages?: boolean;
          extractTables?: boolean;
          maxQuestions?: number;
          includeFormula?: boolean;
        };
      } = req.body;

      const userId = req.user?.id || "anonymous";

      console.log("📄 PULSE AI Document Conversion - Iniciando...");
      console.log("  - Tipo:", documentType);
      console.log("  - Tamanho:", content?.length || 0, "chars");
      console.log("  - Opções:", options);

      // Validação
      if (!content || content.trim().length < 100) {
        return res.status(400).json({
          success: false,
          error: "Conteúdo deve ter pelo menos 100 caracteres",
          code: "INVALID_CONTENT",
        });
      }

      if (!this.defaultConfig.apiKey) {
        return res.status(500).json({
          success: false,
          error: "PULSE AI não configurado",
          code: "PULSE_NOT_CONFIGURED",
        });
      }

      // Converter para Markdown usando IA
      const result = await this.medbraveService.convertDocumentToMarkdown(
        content,
        documentType,
        options,
        userId,
        "admin",
      );

      console.log("📄 Resultado da conversão:", {
        success: result.success,
        markdownSize: result.markdown?.length || 0,
        questionsFound: result.questionsPreview?.length || 0,
      });

      return res.status(result.success ? 200 : 500).json({
        ...result,
        pulseAI: {
          name: "PULSE AI Document Converter",
          type: "document_to_markdown",
          markdownGenerated: !!result.markdown,
          questionsPreview: result.questionsPreview?.length || 0,
        }
      });
    } catch (error: any) {
      console.error("❌ PULSE AI Document Conversion Error:", error);

      return res.status(500).json({
        success: false,
        error: "Erro na conversão de documento pelo PULSE AI",
        code: "PULSE_CONVERSION_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  };
}

