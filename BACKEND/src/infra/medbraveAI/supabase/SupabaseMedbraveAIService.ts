/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SupabaseMedbraveAILogger } from './SupabaseMedbraveAILogger';
import {
  MedicalCase,
  PulseResponse,
  PulseDiagnosis,
  PulseEducation,
  PulseConfiguration,
  PulseAuditLog,
} from '../../../domain/medbraveAI/types/MedbraveAITypes';

export class SupabaseMedbraveAIService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private logger: SupabaseMedbraveAILogger;
  private config: PulseConfiguration;

  constructor(config: PulseConfiguration) {
    this.config = config;
    this.genAI = new GoogleGenerativeAI(config.apiKey);

    // 🚀 OTIMIZADO: Usar modelo configurado no .env
    this.model = this.genAI.getGenerativeModel({
      model: config.defaultModel || 'gemini-2.5-flash-lite-preview-06-17', // Modelo configurado no .env
      generationConfig: {
        temperature: config.temperature || 0.3, // Configuração do .env
        topP: config.topP || 0.9,
        topK: config.topK || 64,
        maxOutputTokens: config.maxTokens || 65535, // MÁXIMO: 65535 tokens (limite real)
        candidateCount: 1,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_NONE',
        },
      ],
      requestOptions: {
        timeout: 300000, // 5 MINUTOS de timeout para processamento pesado
      },
    });
    this.logger = new SupabaseMedbraveAILogger();
  }

  async convertDocumentToMarkdown(
    content: string,
    documentType: 'html' | 'pdf' | 'docx',
    options: any,
    userId: string,
    userRole: string,
  ): Promise<{ success: boolean; markdown?: string; questionsPreview?: any[] }> {
    try {
      const prompt = `Converta o seguinte conteúdo (${documentType}) para Markdown estruturado e extraia possíveis questões (se existirem).`;
      const result = await this.model.generateContent([prompt, content]);
      const response = await result.response;
      const markdown = response.text();
      return { success: true, markdown, questionsPreview: [] };
    } catch (error) {
      return { success: false, questionsPreview: [] };
    }
  }

  async analyzeMedicalCase(medicalCase: any, userId: string, userRole: string) {
    try {
      const prompt = `Analise o caso médico e forneça diagnóstico diferencial e conduta.`;
      const result = await this.model.generateContent([prompt, JSON.stringify(medicalCase)]);
      const response = await result.response;
      return { success: true, analysis: response.text() };
    } catch (e) {
      return { success: false, error: 'Analysis failed' };
    }
  }

  async educateMedicalTopic(topic: string, specialty: string, complexity: string, userId: string, userRole: string) {
    try {
      const prompt = `Explique sobre ${topic} (${specialty}) em nível ${complexity}.`;
      const result = await this.model.generateContent([prompt]);
      const response = await result.response;
      return { success: true, content: response.text() };
    } catch (e) {
      return { success: false, error: 'Education failed' };
    }
  }

  async quickMedicalQuery(query: string, userId: string, userRole: string) {
    try {
      const result = await this.model.generateContent([query]);
      const response = await result.response;
      return { success: true, content: response.text() };
    } catch (e) {
      return { success: false, error: 'Query failed' };
    }
  }

  async explainQuestionAnswer(question: string, alternatives: string[], correctAnswer: string, userAnswer: string | undefined, specialty: string | undefined, userId: string, userRole: string) {
    try {
      const prompt = `Explique a resposta correta (${correctAnswer}) para a questão: ${question}`;
      const result = await this.model.generateContent([prompt]);
      const response = await result.response;
      return { success: true, explanation: response.text() };
    } catch (e) {
      return { success: false, error: 'Explain failed' };
    }
  }

  async extractQuestionsFromContent(content: string, options: any, userId: string, userRole: string) {
    return { success: true, questions: [] };
  }

  async categorizeQuestions(questions: any[], availableFilters: any[], userId: string, userRole: string) {
    return { success: true, categorizedQuestions: [], error: undefined };
  }

  /**
   * 🔥 NOVA FUNÇÃO: Processamento Inteligente Multi-Formato
   * Suporta TODOS os formatos nativos do Gemini Pro
   */
  async processDocumentWithGeminiNative(
    fileBuffer: Buffer,
    fileName: string,
  ): Promise<any> {
    try {
      const mimeType = this.detectMimeType(fileName);

      if (!this.isGeminiNativeFormat(mimeType)) {
        throw new Error(`Formato não suportado: ${mimeType}`);
      }

      const fileData = {
        inlineData: {
          data: fileBuffer.toString('base64'),
          mimeType: mimeType,
        },
      };

      const prompt =
        "Analise este documento médico e extraia todas as informações relevantes em formato estruturado.";

      const result = await this.model.generateContent([prompt, fileData]);
      const response = await result.response;

      return {
        success: true,
        content: response.text(),
        mimeType,
        fileName,
      };
    } catch (error) {
      console.error('Erro no processamento nativo:', error);
      throw error;
    }
  }

  getStatus() {
    const ready = !!this.config.apiKey;
    return {
      service: 'SupabaseMedbraveAIService',
      model: this.config.defaultModel,
      status: ready ? 'ready' : 'not_configured',
      timestamp: new Date().toISOString(),
      ready,
    };
  }

  async moderateMedicalContent(content: string, userId: string, context?: string): Promise<any> {
    try {
      const prompt = `Modere o conteúdo médico a seguir considerando segurança, privacidade e ética.`;
      const result = await this.model.generateContent([prompt, content, context || '']);
      const response = await result.response;
      const text = response.text();
      return { success: true, moderation: text };
    } catch (e) {
      return { success: false, error: 'Moderation failed' };
    }
  }

  /**
   * Detecta o tipo MIME baseado na extensão do arquivo
   */
  private detectMimeType(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop();

    const mimeTypes: { [key: string]: string } = {
      // Imagens
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      heic: 'image/heic',
      heif: 'image/heif',

      // Documentos
      pdf: 'application/pdf',

      // Áudio
      wav: 'audio/wav',
      mp3: 'audio/mp3',
      aiff: 'audio/aiff',
      aac: 'audio/aac',
      ogg: 'audio/ogg',
      flac: 'audio/flac',

      // Vídeo
      mp4: 'video/mp4',
      mpeg: 'video/mpeg',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      'x-flv': 'video/x-flv',
      mpg: 'video/mpg',
      webm: 'video/webm',
      wmv: 'video/wmv',
      '3gpp': 'video/3gpp',

      // Texto
      txt: 'text/plain',
      html: 'text/html',
      css: 'text/css',
      js: 'text/javascript',
      ts: 'text/typescript',
      csv: 'text/csv',
      md: 'text/markdown',
      py: 'text/x-python',
      json: 'application/json',
      xml: 'application/xml',
      rtf: 'text/rtf',
    };

    return mimeTypes[extension || ''] || 'application/octet-stream';
  }

  /**
   * Verifica se o formato é suportado nativamente pelo Gemini
   */
  private isGeminiNativeFormat(mimeType: string): boolean {
    const supportedFormats = [
      // Imagens
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif',

      // Documentos
      'application/pdf',

      // Áudio
      'audio/wav',
      'audio/mp3',
      'audio/aiff',
      'audio/aac',
      'audio/ogg',
      'audio/flac',

      // Vídeo
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-flv',
      'video/mpg',
      'video/webm',
      'video/wmv',
      'video/3gpp',

      // Texto
      'text/plain',
      'text/html',
      'text/css',
      'text/javascript',
      'text/typescript',
      'text/csv',
      'text/markdown',
      'text/x-python',
      'application/json',
      'application/xml',
      'text/rtf',
    ];

    return supportedFormats.includes(mimeType);
  }

  /**
   * 🩺 ANÁLISE DE CASO MÉDICO
   */
  async analyzeMedicalCase(
    medicalCase: MedicalCase,
    userId: string,
    userRole: string = 'student',
  ): Promise<PulseDiagnosis> {
    const sessionId = this.generateSessionId();

    try {
      this.validateMedicalCase(medicalCase);

      const prompt = this.buildMedicalPrompt(medicalCase, userRole);

      await this.logger.logRequest({
        sessionId,
        userId,
        requestType: 'medical_case_analysis',
        prompt: prompt.substring(0, 1000),
        inputData: medicalCase,
        userRole,
      });

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const diagnosis = this.parseMedicalResponse(text);

      const pulseResponse: PulseDiagnosis = {
        success: true,
        sessionId,
        timestamp: new Date().toISOString(),
        diagnosis,
        confidence: diagnosis.confidence || 0.85,
        processingTime: Date.now(),
        model:
          this.config.defaultModel || 'gemini-2.5-flash-lite-preview-06-17',
      };

      await this.logger.logResponse({
        sessionId,
        userId,
        responseType: 'medical_case_analysis',
        response: pulseResponse,
        success: true,
        processingTime: Date.now(),
      });

      return pulseResponse;
    } catch (error) {
      await this.logger.logError({
        sessionId,
        userId,
        errorType: 'medical_case_analysis_error',
        error: error.message,
        inputData: medicalCase,
      });

      throw error;
    }
  }

  /**
   * 📚 EDUCAÇÃO MÉDICA
   */
  async educateMedicalTopic(
    topic: string,
    specialty: string = '',
    complexity: 'básico' | 'intermediário' | 'avançado' = 'intermediário',
    userId: string = '',
    userRole: string = 'student',
  ): Promise<PulseEducation> {
    const sessionId = this.generateSessionId();

    try {
      const prompt = this.buildEducationPrompt(
        topic,
        complexity,
        userRole,
        specialty,
      );

      await this.logger.logRequest({
        sessionId,
        userId,
        requestType: 'medical_education',
        prompt: prompt.substring(0, 1000),
        inputData: { topic, specialty, complexity },
        userRole,
      });

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const education = this.parseEducationResponse(text);

      const pulseResponse: PulseEducation = {
        success: true,
        sessionId,
        timestamp: new Date().toISOString(),
        education,
        processingTime: Date.now(),
        model:
          this.config.defaultModel || 'gemini-2.5-flash-lite-preview-06-17',
      };

      await this.logger.logResponse({
        sessionId,
        userId,
        responseType: 'medical_education',
        response: pulseResponse,
        success: true,
        processingTime: Date.now(),
      });

      return pulseResponse;
    } catch (error) {
      await this.logger.logError({
        sessionId,
        userId,
        errorType: 'medical_education_error',
        error: error.message,
        inputData: { topic, specialty, complexity },
      });

      throw error;
    }
  }

  /**
   * ⚡ CONSULTA MÉDICA RÁPIDA
   */
  async quickMedicalQuery(
    query: string,
    userId: string = '',
    userRole: string = 'student',
  ): Promise<PulseResponse> {
    const sessionId = this.generateSessionId();

    try {
      const prompt = this.buildQuickQueryPrompt(query, userRole);

      await this.logger.logRequest({
        sessionId,
        userId,
        requestType: 'quick_medical_query',
        prompt: prompt.substring(0, 1000),
        inputData: { query },
        userRole,
      });

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const pulseResponse: PulseResponse = {
        success: true,
        sessionId,
        timestamp: new Date().toISOString(),
        response: text,
        processingTime: Date.now(),
        model:
          this.config.defaultModel || 'gemini-2.5-flash-lite-preview-06-17',
      };

      await this.logger.logResponse({
        sessionId,
        userId,
        responseType: 'quick_medical_query',
        response: pulseResponse,
        success: true,
        processingTime: Date.now(),
      });

      return pulseResponse;
    } catch (error) {
      await this.logger.logError({
        sessionId,
        userId,
        errorType: 'quick_medical_query_error',
        error: error.message,
        inputData: { query },
      });

      throw error;
    }
  }

  // Métodos auxiliares privados
  private validateMedicalCase(medicalCase: MedicalCase): void {
    if (!medicalCase.symptoms || medicalCase.symptoms.length === 0) {
      throw new Error('Sintomas são obrigatórios para análise médica');
    }
  }

  private buildMedicalPrompt(
    medicalCase: MedicalCase,
    userRole: string,
  ): string {
    const roleContext = this.getRoleContext(userRole);

    return `${roleContext}

Analise o seguinte caso médico:

**Sintomas:** ${medicalCase.symptoms.join(', ')}
**Idade:** ${medicalCase.age || 'Não informada'}
**Sexo:** ${medicalCase.gender || 'Não informado'}
**História Médica:** ${medicalCase.medicalHistory || 'Não informada'}
**Medicações:** ${medicalCase.medications?.join(', ') || 'Nenhuma'}
**Exames:** ${medicalCase.labResults || 'Não realizados'}

Forneça uma análise estruturada com:
1. Diagnósticos diferenciais mais prováveis
2. Exames complementares recomendados
3. Plano de tratamento inicial
4. Sinais de alerta
5. Prognóstico

Resposta em formato JSON estruturado.`;
  }

  private buildEducationPrompt(
    topic: string,
    complexity: string,
    userRole: string,
    specialty?: string,
  ): string {
    const roleContext = this.getRoleContext(userRole);
    const specialtyContext = specialty
      ? `na especialidade de ${specialty}`
      : '';

    return `${roleContext}

Explique o tópico médico "${topic}" ${specialtyContext} no nível ${complexity}.

Estruture a resposta com:
1. Definição e conceitos fundamentais
2. Fisiopatologia (quando aplicável)
3. Manifestações clínicas
4. Diagnóstico
5. Tratamento
6. Prognóstico
7. Pontos-chave para memorização

Resposta em formato JSON estruturado.`;
  }

  private buildQuickQueryPrompt(query: string, userRole: string): string {
    const roleContext = this.getRoleContext(userRole);

    return `${roleContext}

Responda de forma concisa e precisa à seguinte pergunta médica:

"${query}"

Forneça uma resposta clara, baseada em evidências científicas atuais.`;
  }

  private getRoleContext(userRole: string): string {
    const contexts = {
      student:
        'Você é um tutor médico especializado em ensinar estudantes de medicina.',
      resident:
        'Você é um mentor médico para residentes, focando em aplicação prática.',
      doctor: 'Você é um consultor médico para profissionais experientes.',
      admin:
        'Você é um especialista médico com acesso completo a todas as funcionalidades.',
    };

    return contexts[userRole] || contexts['student'];
  }

  private parseMedicalResponse(text: string): PulseDiagnosis['diagnosis'] {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('Erro ao parsear resposta JSON, usando fallback');
    }

    return {
      differentialDiagnoses: ['Análise não estruturada disponível'],
      recommendedTests: ['Consulte o texto completo'],
      treatmentPlan: text,
      warningSigns: [],
      prognosis: 'Veja resposta completa',
      confidence: 0.7,
    };
  }

  private parseEducationResponse(text: string): PulseEducation['education'] {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('Erro ao parsear resposta JSON, usando fallback');
    }

    return {
      definition: text,
      pathophysiology: 'Veja resposta completa',
      clinicalManifestations: [],
      diagnosis: 'Veja resposta completa',
      treatment: 'Veja resposta completa',
      prognosis: 'Veja resposta completa',
      keyPoints: [],
    };
  }

  private generateSessionId(): string {
    return `pulse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getStatus() {
    return {
      service: 'SupabasePulseAIService',
      model: this.config.defaultModel,
      status: 'active',
      timestamp: new Date().toISOString(),
    };
  }

  updateConfiguration(newConfig: Partial<PulseConfiguration>) {
    this.config = { ...this.config, ...newConfig };

    // Recria o modelo com nova configuração
    this.model = this.genAI.getGenerativeModel({
      model: this.config.defaultModel || 'gemini-2.5-flash-lite-preview-06-17',
      generationConfig: {
        temperature: this.config.temperature || 0.3,
        topP: this.config.topP || 0.9,
        topK: this.config.topK || 64,
        maxOutputTokens: this.config.maxTokens || 65535,
        candidateCount: 1,
      },
    });
  }
}
