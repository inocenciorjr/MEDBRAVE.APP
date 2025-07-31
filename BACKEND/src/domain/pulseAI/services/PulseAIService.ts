/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PulseAILogger } from '../utils/PulseAILogger';
import { 
  MedicalCase, 
  PulseResponse, 
  PulseDiagnosis, 
  PulseEducation,
  PulseConfiguration,
  PulseAuditLog 
} from '../types/PulseAITypes';

export class PulseAIService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private logger: PulseAILogger;
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
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ],
      requestOptions: {
        timeout: 300000, // 5 MINUTOS de timeout para processamento pesado
      }
    });
    this.logger = new PulseAILogger();
  }

  /**
   * 🔥 NOVA FUNÇÃO: Processamento Inteligente Multi-Formato
   * Suporta TODOS os formatos nativos do Gemini Pro
   */
  async processDocumentWithGeminiNative(fileBuffer: Buffer, fileName: string): Promise<any> {
    try {
      console.log(`🚀 PULSE AI: Processando ${fileName} com Gemini Files API nativo...`);
      
      // 📂 DETECÇÃO AUTOMÁTICA DE FORMATO
      const mimeType = this.detectMimeType(fileName);
      console.log(`📋 Formato detectado: ${mimeType}`);
      
      // ✅ VERIFICAR SE É SUPORTADO NATIVAMENTE
      if (!this.isGeminiNativeFormat(mimeType)) {
        throw new Error(`Formato ${mimeType} não é suportado nativamente pelo Gemini`);
      }
      
      // 📤 UPLOAD DIRETO PARA GEMINI FILES API
      console.log('📤 Fazendo upload direto para Gemini Files API...');
      const uploadedFile = await this.genAI.fileManager.uploadFile({
        fileData: fileBuffer,
        mimeType: mimeType,
        displayName: fileName
      });
      
      console.log(`✅ Upload concluído! URI: ${uploadedFile.file.uri}`);
      
      // 🔄 AGUARDAR PROCESSAMENTO
      let fileStatus = uploadedFile.file;
      while (fileStatus.state === 'PROCESSING') {
        console.log('⏳ Aguardando processamento do arquivo...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        fileStatus = await this.genAI.fileManager.getFile(uploadedFile.file.name);
      }
      
      if (fileStatus.state === 'FAILED') {
        throw new Error('Falha no processamento do arquivo pelo Gemini');
      }
      
      console.log('✅ Arquivo processado com sucesso pelo Gemini!');
      return uploadedFile.file;
      
    } catch (error) {
      console.error('❌ Erro no processamento nativo:', error);
      throw error;
    }
  }

  /**
   * 🎯 DETECÇÃO AUTOMÁTICA DE MIME TYPE
   */
  private detectMimeType(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop();
    
    const mimeMap = {
      // Documentos
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'html': 'text/html',
      'css': 'text/css',
      'md': 'text/md',
      'csv': 'text/csv',
      'xml': 'text/xml',
      'rtf': 'text/rtf',
      'js': 'text/javascript',
      'py': 'text/x-python',
      
      // Imagens
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'webp': 'image/webp',
      
      // Vídeo
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime',
      'mpeg': 'video/mpeg',
      'mpg': 'video/mpg',
      '3gpp': 'video/3gpp',
      
      // Áudio
      'mp3': 'audio/mp3',
      'wav': 'audio/wav',
      'flac': 'audio/flac',
      'm4a': 'audio/m4a',
      'aac': 'audio/aac',
      'opus': 'audio/opus',
      
      // Office (parcialmente suportado)
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    
    return mimeMap[extension] || 'application/octet-stream';
  }

  /**
   * ✅ VERIFICAR SE FORMATO É SUPORTADO NATIVAMENTE
   */
  private isGeminiNativeFormat(mimeType: string): boolean {
    const supportedTypes = [
      // Documentos nativos
      'application/pdf',
      'text/plain',
      'text/html',
      'text/css',
      'text/md',
      'text/csv',
      'text/xml',
      'text/rtf',
      'text/javascript',
      'application/x-javascript',
      'text/x-python',
      'application/x-python',
      
      // Imagens
      'image/png',
      'image/jpeg',
      'image/webp',
      
      // Vídeo
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/mpeg',
      'video/mpg',
      'video/3gpp',
      'video/x-flv',
      'video/wmv',
      
      // Áudio
      'audio/mp3',
      'audio/wav',
      'audio/flac',
      'audio/m4a',
      'audio/aac',
      'audio/opus',
      'audio/mpeg',
      'audio/mpga',
      'audio/mp4',
      'audio/pcm',
      'audio/webm'
    ];
    
    return supportedTypes.includes(mimeType);
  }

  /**
   * 🧠 Análise médica completa
   */
  async analyzeMedicalCase(
    medicalCase: MedicalCase, 
    userId: string,
    userRole: string = 'student'
  ): Promise<PulseDiagnosis> {
    const startTime = Date.now();
    
    try {
      // Log da requisição
      await this.logger.logRequest('medical_analysis', userId, {
        hasPatientData: !!medicalCase.patient,
        category: medicalCase.category,
        specialties: medicalCase.specialties
      });

      // Validação de entrada
      this.validateMedicalCase(medicalCase);

      // Construir prompt personalizado
      const prompt = this.buildMedicalPrompt(medicalCase, userRole);
      
      // Fazer requisição para Gemini
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse da resposta
      const diagnosis = this.parseMedicalResponse(text);
      const responseTime = Date.now() - startTime;

      const pulseResponse: PulseDiagnosis = {
        success: true,
        content: text,
        confidence: diagnosis?.differentials[0]?.probability || 0.5,
        responseTime,
        diagnosis,
        tokensUsed: {
          input: response.usageMetadata?.promptTokenCount || 0,
          output: response.usageMetadata?.candidatesTokenCount || 0,
          total: response.usageMetadata?.totalTokenCount || 0
        },
        sessionId: this.generateSessionId(),
        timestamp: new Date().toISOString()
      };

      // Log da resposta
      await this.logger.logResponse('medical_analysis', userId, {
        success: true,
        responseTime,
        tokensUsed: pulseResponse.tokensUsed?.total || 0,
        confidence: pulseResponse.confidence
      });

      return pulseResponse;

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      // Log do erro
      await this.logger.logError('medical_analysis', userId, error.message, {
        responseTime
      });

      return {
        success: false,
        error: `PULSE AI: ${error.message}`,
        responseTime,
        sessionId: this.generateSessionId(),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 📚 Educação médica
   */
  async educateMedicalTopic(
    topic: string,
    specialty: string = '',
    complexity: 'básico' | 'intermediário' | 'avançado' = 'intermediário',
    userId: string = '',
    userRole: string = 'student'
  ): Promise<PulseEducation> {
    const startTime = Date.now();

    try {
      await this.logger.logRequest('medical_education', userId, {
        topic,
        specialty,
        complexity
      });

      const prompt = this.buildEducationPrompt(topic, complexity, userRole, specialty);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const education = this.parseEducationResponse(text);
      const responseTime = Date.now() - startTime;

      const pulseResponse: PulseEducation = {
        success: true,
        content: text,
        responseTime,
        education,
        tokensUsed: {
          input: response.usageMetadata?.promptTokenCount || 0,
          output: response.usageMetadata?.candidatesTokenCount || 0,
          total: response.usageMetadata?.totalTokenCount || 0
        },
        sessionId: this.generateSessionId(),
        timestamp: new Date().toISOString()
      };

      await this.logger.logResponse('medical_education', userId, {
        success: true,
        responseTime,
        tokensUsed: pulseResponse.tokensUsed?.total || 0
      });

      return pulseResponse;

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      await this.logger.logError('medical_education', userId, error.message, {
        responseTime
      });

      return {
        success: false,
        error: `PULSE AI Education: ${error.message}`,
        responseTime,
        sessionId: this.generateSessionId(),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * ⚡ Consulta rápida
   */
  async quickMedicalQuery(
    query: string,
    userId: string = '',
    userRole: string = 'student'
  ): Promise<PulseResponse> {
    const startTime = Date.now();

    try {
      await this.logger.logRequest('quick_query', userId, { query });

      const prompt = this.buildQuickQueryPrompt(query, userRole);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const responseTime = Date.now() - startTime;

      const pulseResponse: PulseResponse = {
        success: true,
        content: text,
        responseTime,
        tokensUsed: {
          input: response.usageMetadata?.promptTokenCount || 0,
          output: response.usageMetadata?.candidatesTokenCount || 0,
          total: response.usageMetadata?.totalTokenCount || 0
        },
        sessionId: this.generateSessionId(),
        timestamp: new Date().toISOString()
      };

      await this.logger.logResponse('quick_query', userId, {
        success: true,
        responseTime,
        tokensUsed: pulseResponse.tokensUsed?.total || 0
      });

      return pulseResponse;

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      await this.logger.logError('quick_query', userId, error.message, {
        responseTime
      });

      return {
        success: false,
        error: `PULSE AI Quick: ${error.message}`,
        responseTime,
        sessionId: this.generateSessionId(),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 📝 Explicar resposta de questão
   */
  async explainQuestionAnswer(
    question: string,
    alternatives: string[],
    correctAnswer: string,
    userAnswer?: string,
    specialty?: string,
    userId: string = '',
    userRole: string = 'student'
  ): Promise<PulseResponse & {
    explanation?: {
      correctAnswerExplanation: string;
      wrongAnswersExplanation: string[];
      studyTips: string[];
      keyPoints: string[];
      difficulty: 'básica' | 'intermediária' | 'avançada';
      timeToReview: string;
    }
  }> {
    const startTime = Date.now();

    try {
      await this.logger.logRequest('question_explanation', userId, {
        questionLength: question.length,
        alternativesCount: alternatives.length,
        hasUserAnswer: !!userAnswer,
        specialty
      });

      const prompt = this.buildQuestionExplanationPrompt(
        question, 
        alternatives, 
        correctAnswer, 
        userAnswer, 
        specialty, 
        userRole
      );
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const responseTime = Date.now() - startTime;

      let explanation;
      try {
        const cleanText = text
          .replace(/```json\n?|```/g, '')
          .replace(/[\u0000-\u001F\u007F]/g, ' ')
          .replace(/\\n|\\r|\\t/g, ' ')
          .replace(/[\n\r\t]/g, ' ')
          .replace(/\u[0-9a-fA-F]{4}/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim();
        explanation = JSON.parse(cleanText);
      } catch (parseError) {
        console.warn('Erro ao parsear explicação da questão:', parseError);
      }

      const pulseResponse = {
        success: true,
        content: text,
        responseTime,
        explanation,
        tokensUsed: {
          input: response.usageMetadata?.promptTokenCount || 0,
          output: response.usageMetadata?.candidatesTokenCount || 0,
          total: response.usageMetadata?.totalTokenCount || 0
        },
        sessionId: this.generateSessionId(),
        timestamp: new Date().toISOString()
      };

      await this.logger.logResponse('question_explanation', userId, {
        success: true,
        responseTime,
        tokensUsed: pulseResponse.tokensUsed?.total || 0,
        difficulty: explanation?.difficulty || 'intermediária'
      });

      return pulseResponse;

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      await this.logger.logError('question_explanation', userId, error.message, {
        responseTime
      });

      return {
        success: false,
        error: `PULSE AI Explanation: ${error.message}`,
        responseTime,
        sessionId: this.generateSessionId(),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 📄 Extrair questões de conteúdo médico (PDFs, textos) - PROCESSAMENTO EM LOTES
   */
  async extractQuestionsFromContent(
    content: string,
    options: {
      specialty?: string;
      difficulty?: 'básica' | 'intermediária' | 'avançada';
      questionType?: 'multiple_choice' | 'true_false' | 'essay';
      maxQuestions?: number;
      includeExplanations?: boolean;
    } = {},
    userId: string = '',
    userRole: string = 'admin'
  ): Promise<PulseResponse & {
    questions?: Array<{
      question: string;
      alternatives: string[];
      correctAnswer: string;
      explanation: string;
      specialty: string;
      difficulty: 'básica' | 'intermediária' | 'avançada';
      topics: string[];
      references: string[];
      estimatedTime: number;
      bloomLevel: 'conhecimento' | 'compreensão' | 'aplicação' | 'análise' | 'síntese' | 'avaliação';
    }>;
    metadata?: {
      totalQuestions: number;
      averageDifficulty: string;
      topTopics: string[];
      qualityScore: number;
    };
  }> {
    const startTime = Date.now();

    try {
      await this.logger.logRequest('question_extraction', userId, {
        contentLength: content.length,
        specialty: options.specialty,
        processingMethod: 'batch_processing'
      });

      console.log('🚀 PULSE AI: Iniciando extração em lotes para TODAS as questões...');
      console.log('🔍 PULSE AI - Dados de entrada:');
      console.log('  - Tamanho do conteúdo:', content.length);
      console.log('  - Primeira linha:', content.split('\n')[0]);
      console.log('  - Contém "QUESTÃO":', content.includes('QUESTÃO'));
      console.log('  - Primeiras ocorrências de "QUESTÃO":');
      
      // Encontrar as primeiras 3 ocorrências de "QUESTÃO"
      let lastIndex = 0;
      for (let i = 0; i < 3; i++) {
        const index = content.indexOf('QUESTÃO', lastIndex);
        if (index === -1) break;
        console.log(`    - Posição ${index}: "${content.substring(index, index + 50)}..."`);
        lastIndex = index + 1;
      }
      
      // Processar em lotes para evitar JSON malformado
      const allQuestions = await this.extractQuestionsInBatches(content, options, userRole);
      const responseTime = Date.now() - startTime;

             const metadata = {
         totalQuestions: allQuestions.length,
         averageDifficulty: 'intermediária',
         topTopics: ['medicina_geral'],
         qualityScore: 0.9
       };

      console.log(`✅ PULSE AI: Extração completa! ${allQuestions.length} questões processadas em lotes`);

      const pulseResponse = {
        success: true,
        content: `PULSE AI extraiu ${allQuestions.length} questões em processamento de lotes`,
        responseTime,
        questions: allQuestions,
        metadata,
        tokensUsed: {
          input: 0, // Será calculado pelos lotes
          output: 0,
          total: 0
        },
        sessionId: this.generateSessionId(),
        timestamp: new Date().toISOString()
      };

      await this.logger.logResponse('question_extraction', userId, {
        success: true,
        responseTime,
        tokensUsed: 0,
        questionsExtracted: allQuestions.length
      });

      return pulseResponse;

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      await this.logger.logError('question_extraction', userId, error.message, {
        responseTime
      });

      return {
        success: false,
        error: `PULSE AI Question Extraction: ${error.message}`,
        responseTime,
        sessionId: this.generateSessionId(),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 🔄 Processar questões em lotes para evitar JSON malformado
   */
  private async extractQuestionsInBatches(
    content: string,
    options: any,
    userRole: string
  ): Promise<any[]> {
    console.log('📋 PULSE AI - Dividindo conteúdo em lotes para processamento...');
    console.log('🔍 PULSE AI - Tamanho total do conteúdo:', content.length);
    console.log('🔍 PULSE AI - Amostra do conteúdo (primeiros 500 chars):', content.substring(0, 500));
    console.log('🔍 PULSE AI - Amostra do conteúdo (últimos 300 chars):', content.substring(content.length - 300));
    
    // Debug: Verificar se contém "QUESTÃO"
    const questaoCount = (content.match(/QUESTÃO/gi) || []).length;
    console.log(`🔍 PULSE AI - Contagem de "QUESTÃO" no texto: ${questaoCount}`);
    
    // Debug: Verificar diferentes variações
    const questaoMaiuscula = (content.match(/QUESTÃO\s+\d+/g) || []).length;
    const questaoMinuscula = (content.match(/questão\s+\d+/gi) || []).length;
    const questaoNumero = (content.match(/\d+\.\s*/g) || []).length;
    
    console.log(`🔍 PULSE AI - "QUESTÃO X" (maiúscula): ${questaoMaiuscula}`);
    console.log(`🔍 PULSE AI - "questão x" (qualquer caso): ${questaoMinuscula}`);
    console.log(`🔍 PULSE AI - "X." (numerado): ${questaoNumero}`);
    
    // Usar EXATAMENTE o mesmo regex que funciona na extração básica
    const questaoRegex = /QUESTÃO\s+(\d+)([\s\S]*?)(?=QUESTÃO\s+\d+|$)/g;
    const matches = Array.from(content.matchAll(questaoRegex));
    
    console.log(`🎯 PULSE AI - Usando regex da extração básica: ${matches.length} questões encontradas`);
    
    // Debug detalhado dos primeiros matches
    if (matches.length > 0) {
      console.log('🔍 PULSE AI - Primeira questão encontrada:');
      console.log('  - Número:', matches[0][1]);
      console.log('  - Início do conteúdo:', matches[0][2].substring(0, 200));
    } else {
      console.log('⚠️ PULSE AI - NENHUMA questão encontrada com regex principal!');
      
      // Debug: mostrar onde está a primeira ocorrência de "QUESTÃO"
      const firstQuestao = content.indexOf('QUESTÃO');
      if (firstQuestao >= 0) {
        console.log('🔍 PULSE AI - Primeira ocorrência de "QUESTÃO" em posição:', firstQuestao);
        console.log('🔍 PULSE AI - Contexto:', content.substring(Math.max(0, firstQuestao - 50), firstQuestao + 100));
      }
    }
    
    if (matches.length === 0) {
      console.log('⚠️ PULSE AI - Nenhuma questão encontrada com regex principal. Testando variações...');
      
      // Fallback patterns se o principal não funcionar
      const fallbackPatterns = [
        { name: 'minúsculo', pattern: /questão\s+(\d+)([\s\S]*?)(?=questão\s+\d+|$)/gi },
        { name: 'numerado simples', pattern: /(\d+)\.\s*([\s\S]*?)(?=\d+\.|$)/gi },
        { name: 'parênteses', pattern: /(\d+)\)\s*([\s\S]*?)(?=\d+\)|$)/gi },
        { name: 'questão sem acento', pattern: /questao\s+(\d+)([\s\S]*?)(?=questao\s+\d+|$)/gi },
        { name: 'QUESTAO sem acento', pattern: /QUESTAO\s+(\d+)([\s\S]*?)(?=QUESTAO\s+\d+|$)/g }
      ];
      
      let bestMatches: RegExpMatchArray[] = [];
      let bestPatternName = '';
      
      for (const { name, pattern } of fallbackPatterns) {
        const testMatches = Array.from(content.matchAll(pattern));
        console.log(`🔍 PULSE AI - Pattern "${name}": ${testMatches.length} questões`);
        
        if (testMatches.length > bestMatches.length) {
          bestMatches = testMatches;
          bestPatternName = name;
        }
      }
      
      if (bestMatches.length === 0) {
        console.log('❌ PULSE AI - Nenhuma questão encontrada em nenhum formato');
        console.log('🔍 PULSE AI - Últimas 10 linhas do conteúdo:');
        const lines = content.split('\n');
        const lastLines = lines.slice(-10);
        lastLines.forEach((line, i) => {
          console.log(`  ${lines.length - 10 + i}: "${line}"`);
        });
        return [];
      }
      
      console.log(`✅ PULSE AI - Usando pattern "${bestPatternName}" com ${bestMatches.length} questões`);
      
      // Processar os matches do fallback como se fossem do padrão principal
      const processedMatches = bestMatches.map(match => [
        match[0], // match completo
        match[1], // número da questão
        match[2] || match[0] // conteúdo da questão
      ]);
      
      return this.processFallbackMatches(processedMatches, bestPatternName);
    }

    const allQuestions: any[] = [];
    const batchSize = 3; // OTIMIZADO: Processar 3 questões por vez para evitar timeout
    
    for (let i = 0; i < matches.length; i += batchSize) {
      const batch = matches.slice(i, i + batchSize);
      console.log(`📦 Processando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(matches.length / batchSize)} (questões ${i + 1}-${Math.min(i + batchSize, matches.length)})`);
      
      try {
        // Criar conteúdo do lote com limpeza e verificação de tamanho
        const batchContent = batch.map(match => {
          let content = match[0];
          // Remover caracteres que podem quebrar JSON
          content = content.replace(/[\x00-\x1F\x7F]/g, ' '); // Caracteres de controle
          content = content.replace(/\s+/g, ' '); // Espaços múltiplos
          content = content.trim();
          return content;
        }).join('\n\n');
        
        const questoesEsperadas = batch.length;
        console.log(`📏 Lote ${Math.floor(i / batchSize) + 1} - ${questoesEsperadas} questões | ${batchContent.length} chars`);
        
        // Verificar tamanho do lote para evitar respostas muito longas
        if (batchContent.length > 15000) {
          console.log(`⚠️ Lote muito grande (${batchContent.length} chars), usando fallback manual`);
          const fallbackQuestions = this.extractBatchManually(batchContent, i + 1);
          allQuestions.push(...fallbackQuestions);
          continue;
        }
        
        const prompt = this.buildBatchExtractionPrompt(batchContent, options, userRole, i + 1);
        
        console.log(`🚀 Lote ${batchNumber} - Enviando para Gemini...`);
        const startTime = Date.now();
        
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        const processingTime = Date.now() - startTime;
        console.log(`⏱️ Lote ${batchNumber} - Processamento Gemini: ${processingTime}ms (${Math.round(processingTime/1000)}s)`);
        
                 // Parse do JSON do lote
         let batchQuestions = [];
         try {
           const cleanText = text
             .replace(/```json\n?|```/g, '')
             .replace(/[\u0000-\u001F\u007F]/g, ' ')
             .replace(/\\n|\\r|\\t/g, ' ')
             .replace(/[\n\r\t]/g, ' ')
             .replace(/\u[0-9a-fA-F]{4}/g, ' ')
             .replace(/\s{2,}/g, ' ')
             .trim();
           // LOG DETALHADO DO JSON BRUTO ANTES DO PARSE
           const fs = require('fs');
           const path = require('path');
           const logsDir = path.resolve(process.cwd(), 'logs');
           if (!fs.existsSync(logsDir)) {
             fs.mkdirSync(logsDir, { recursive: true });
           }
           const badJsonPath = path.join(logsDir, `bad_json_lote_${batchNumber}.txt`);
           fs.writeFileSync(badJsonPath, cleanText, { encoding: 'utf8' });
           console.log(`📝 JSON bruto do lote ${batchNumber} salvo em: ${badJsonPath}`);
           console.log(`🔍 Lote ${Math.floor(i / batchSize) + 1} - Resposta AI (primeiros 300 chars):`, cleanText.substring(0, 300));
           
           const parsed = JSON.parse(cleanText);
           batchQuestions = parsed.questions || [];
           
           // VALIDAÇÃO CRÍTICA: Verificar se todas as questões foram extraídas
           if (batchQuestions.length < questoesEsperadas) {
             console.log(`⚠️ ALERTA Lote ${Math.floor(i / batchSize) + 1}: AI extraiu apenas ${batchQuestions.length}/${questoesEsperadas} questões!`);
             console.log(`🔧 Tentando recuperar questões faltantes com fallback...`);
             
             // Fallback para questões faltantes
             const fallbackQuestions = this.extractBatchManually(batchContent, i + 1);
             if (fallbackQuestions.length > batchQuestions.length) {
               console.log(`✅ Fallback recuperou ${fallbackQuestions.length} questões, usando fallback`);
               batchQuestions = fallbackQuestions;
             }
           } else {
             console.log(`✅ Lote ${Math.floor(i / batchSize) + 1}: TODAS as ${batchQuestions.length}/${questoesEsperadas} questões extraídas!`);
           }
           
           // Garantir compatibilidade de campos
           batchQuestions = batchQuestions.map((q: any) => ({
             ...q,
             statement: q.statement || q.question || q.enunciado,
             enunciado: q.enunciado || q.question || q.statement,
             alternativas: q.alternativas || q.alternatives,
             explicacao: q.explicacao || q.explanation,
             dificuldade: q.dificuldade || q.difficulty,
             tags: q.tags || q.topics
           }));
           
           console.log(`✅ Lote ${Math.floor(i / batchSize) + 1}: ${batchQuestions.length} questões processadas e validadas`);
           
         } catch (parseError) {
           console.error(`❌ Erro no lote ${Math.floor(i / batchSize) + 1}:`, parseError);
           console.log(`🔍 Texto que causou erro:`, text.substring(0, 500));
           
           // Fallback: extrair manualmente para este lote
           batchQuestions = this.extractBatchManually(batchContent, i + 1);
           console.log(`🔧 Fallback lote ${Math.floor(i / batchSize) + 1}: ${batchQuestions.length} questões`);
         }
        
        allQuestions.push(...batchQuestions);
        
        // Delay otimizado entre lotes para estabilidade
        if (i + batchSize < matches.length) {
          console.log(`⏳ Aguardando 1.2 segundos antes do próximo lote de extração...`);
          await new Promise(resolve => setTimeout(resolve, 1200)); // 1.2 segundos para evitar timeout
        }
        
      } catch (error) {
        console.error(`❌ Erro no processamento do lote ${Math.floor(i / batchSize) + 1}:`, error);
        
        // Continuar com próximo lote mesmo se este falhar
        const fallbackQuestions = this.extractBatchManually(batch.map(m => m[0]).join('\n'), i + 1);
        allQuestions.push(...fallbackQuestions);
      }
    }
    
          console.log(`🎉 Extração concluída: ${allQuestions.length}/${matches.length} questões (${Math.round((allQuestions.length / matches.length) * 100)}%)`);
    
    return allQuestions;
  }

  /**
   * 🏷️ Categorização de questões (método compatível com controller)
   */
  async categorizeQuestions(
    questions: Array<{
      question: string;
      alternatives: string[];
      correctAnswer: string;
      explanation?: string;
    }>,
    availableFilters: Array<{
      id: string;
      name: string;
      subfilters?: Array<{
        id: string;
        name: string;
        children?: Array<{
          id: string;
          name: string;
        }>;
      }>;
      children?: Array<{
        id: string;
        name: string;
        children?: Array<{
          id: string;
          name: string;
        }>;
      }>;
    }>,
    userId: string = '',
    userRole: string = 'admin'
  ): Promise<any> {
    // Converter formato dos filtros para o formato esperado de forma recursiva
    const convertSubFiltersRecursively = (subfilters: any[], parentFilterId?: string): any[] => {
      return subfilters.map(sub => ({
        id: sub.id,
        name: sub.name,
        description: sub.description,
        parentId: sub.parentId,
        filterId: sub.filterId || parentFilterId, // ✅ NOVO: Garantir que filterId seja preservado
        level: sub.level || 1,
        children: sub.children && sub.children.length > 0 ? convertSubFiltersRecursively(sub.children, parentFilterId) : []
      }));
    };

    const filtersHierarchy = availableFilters.map(filter => {
      // ✅ CORREÇÃO: Aceitar tanto 'subfilters' quanto 'children' para compatibilidade
      const subFiltersData = filter.children || filter.subfilters || [];

      return {
        id: filter.id,
        name: filter.name,
        description: filter.description,
        category: filter.category || 'MEDICAL_SPECIALTY', // Usar categoria do filtro se disponível
        level: 0, // ✅ NOVO: Filtros principais são nível 0
        children: subFiltersData.length > 0 ? convertSubFiltersRecursively(subFiltersData, filter.id) : []
      };
    });

    // Converter formato das questões - MANTENDO tempId original
    const questionsFormatted = questions.map((q, index) => ({
      tempId: q.tempId || `temp-${index}`, // Manter tempId original se existir
      question: q.question,
      alternatives: q.alternatives,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation
    }));

    // Chamar método principal de categorização
    return await this.autoCategorizeMedicalQuestions(
      questionsFormatted,
      filtersHierarchy,
      userId,
      userRole
    );
  }

  /**
   * 🎯 Categorização Automática Inteligente - Mapeia questões para filtros/subfiltros hierárquicos
   */
  async autoCategorizeMedicalQuestions(
    questions: Array<{
      question: string;
      statement?: string;
      enunciado?: string;
      alternatives: string[];
      correctAnswer?: string;
      explanation?: string;
      tempId?: string;
    }>,
    filtersHierarchy: Array<{
      id: string;
      name: string;
      description?: string;
      category?: string;
      children?: Array<{
        id: string;
        name: string;
        description?: string;
        parentId?: string;
        children?: Array<{
          id: string;
          name: string;
          description?: string;
          parentId?: string;
          children?: any[];
        }>;
      }>;
    }>,
    userId: string = '',
    userRole: string = 'admin'
  ): Promise<PulseResponse & {
    categorizedQuestions?: Array<{
      tempId?: string;
      question: string;
      alternatives: string[];
      correctAnswer?: string;
      explanation?: string;
      suggestedFilterIds: string[];
      suggestedSubFilterIds: string[];
      categoryPath: Array<{
        id: string;
        name: string;
        level: number;
        confidence: number;
        reasoning: string;
      }>;
      medicalSpecialty: string;
      difficulty: 'básica' | 'intermediária' | 'avançada';
      keywords: string[];
      topicHierarchy: string[];
    }>;
    summary?: {
      totalQuestions: number;
      categorizedQuestions: number;
      uncategorizedQuestions: number;
      topCategories: Array<{ path: string; count: number }>;
      averageConfidence: number;
    };
  }> {
    const startTime = Date.now();

    try {
      // Processar TODAS as questões em lotes OTIMIZADOS com tokens maximizados
      const batchSize = 3; // CONSERVADOR: 3 questões por lote para evitar JSON truncado, ainda otimizado (34→17 lotes)
      
      console.log(`🚀 PULSE AI - Categorizando ${questions.length} questões em ${Math.ceil(questions.length / batchSize)} lotes`);
      
      await this.logger.logRequest('question_categorization', userId, {
        questionsCount: questions.length,
        hierarchyNodesCount: filtersHierarchy.length
      });
              const allCategorizedQuestions: any[] = [];
        const totalBatches = Math.ceil(questions.length / batchSize);
      
      for (let i = 0; i < questions.length; i += batchSize) {
        const batch = questions.slice(i, i + batchSize);
        const loteNum = Math.floor(i / batchSize) + 1;
        const questoesProcessadas = i + batch.length;
        
        console.log(`📦 Lote ${loteNum}/${totalBatches} (${batch.length} questões) - ${Math.round((questoesProcessadas / questions.length) * 100)}%`);
      
        try {
          const batchResult = await this.processMedicalCategorizationBatch(batch, filtersHierarchy, userRole, loteNum);
          allCategorizedQuestions.push(...batchResult);
          
          // 📊 LOGS DE MONITORAMENTO DETALHADO
          const allFilterIds = new Set<string>();
          const allSubFilterIds = new Set<string>();

          batchResult.forEach(q => {
            (q.suggestedFilterIds || []).forEach(id => allFilterIds.add(id));
            (q.suggestedSubFilterIds || []).forEach(id => allSubFilterIds.add(id));
          });

          const filtersCount = batchResult.reduce((sum, q) => sum + (q.suggestedFilterIds?.length || 0) + (q.suggestedSubFilterIds?.length || 0), 0);

          console.log(`✅ Lote ${loteNum}: ${batchResult.length} questões, ${filtersCount} filtros atribuídos`);
          console.log(`🔍 Filtros [${Array.from(allFilterIds).join(', ')}]`);
          console.log(`🔍 Subfiltros [${Array.from(allSubFilterIds).join(', ')}]`);
        } catch (error) {
          console.error(`❌ Erro no lote ${loteNum}:`, error);
          // Adicionar questões sem filtros em caso de erro (para revisão manual)
          batch.forEach(q => {
            allCategorizedQuestions.push({
              tempId: q.tempId,
              question: q.question || q.statement || q.enunciado || '',
              alternatives: q.alternatives,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              suggestedFilterIds: [],
              suggestedSubFilterIds: [],
              suggestedNewFilters: []
            });
          });
        }
        
        // Delay AUMENTADO entre lotes para estabilidade e evitar rate limiting
        if (i + batchSize < questions.length) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 segundo entre lotes
        }
      }
      
      const responseTime = Date.now() - startTime;
      
      // Calcular estatísticas de atribuição de filtros
      const categorizedCount = allCategorizedQuestions.filter(q => 
        q.suggestedFilterIds?.length > 0 || q.suggestedSubFilterIds?.length > 0
      ).length;
      
      const newFiltersCount = allCategorizedQuestions.reduce((count, q) => 
        count + (q.suggestedNewFilters?.length || 0), 0
      );

                      const pulseResponse = {
          success: true,
          content: `PULSE AI atribuiu filtros a ${categorizedCount} de ${allCategorizedQuestions.length} questões`,
          responseTime,
          categorizedQuestions: allCategorizedQuestions,
          summary: {
            totalQuestions: questions.length,
            categorizedQuestions: categorizedCount,
            uncategorizedQuestions: questions.length - categorizedCount,
            newFiltersSeggested: newFiltersCount,
            topCategories: [],
            averageConfidence: 0
          },
          tokensUsed: {
            input: 0, // Será calculado pelos lotes
            output: 0,
            total: 0
          },
          sessionId: this.generateSessionId(),
          timestamp: new Date().toISOString()
        };

      await this.logger.logResponse('question_categorization', userId, {
        success: true,
        responseTime,
        tokensUsed: 0,
        questionsCategorized: categorizedCount
      });

      return pulseResponse;

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      await this.logger.logError('question_categorization', userId, error.message, {
        responseTime
      });

      return {
        success: false,
        error: `PULSE AI Smart Categorization: ${error.message}`,
        responseTime,
        sessionId: this.generateSessionId(),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 🛡️ Moderação de conteúdo médico
   */
  async moderateMedicalContent(
    content: string,
    userId: string = '',
    context?: string
  ): Promise<PulseResponse & {
    moderation?: {
      isAppropriate: boolean;
      severity: 'baixa' | 'média' | 'alta';
      issues: string[];
      recommendation: string;
      suggestedEdit?: string;
    }
  }> {
    const startTime = Date.now();

    try {
      await this.logger.logRequest('content_moderation', userId, {
        contentLength: content.length,
        hasContext: !!context
      });

      const prompt = this.buildModerationPrompt(content, context);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const responseTime = Date.now() - startTime;

      let moderation;
      try {
        // SANITIZAÇÃO EXTREMAMENTE ROBUSTA DO JSON
        const cleanText = text
          .replace(/```json\n?|```/g, '') // remove blocos markdown
          .replace(/[\u0000-\u001F\u007F]/g, ' ') // remove caracteres de controle
          .replace(/\\n|\\r|\\t/g, ' ') // remove \n, \r, \t escapados
          .replace(/[\n\r\t]/g, ' ') // remove quebras de linha/tab reais
          .replace(/\u[0-9a-fA-F]{4}/g, ' ') // remove unicode escapado
          .replace(/\s{2,}/g, ' ') // reduz múltiplos espaços
          .trim();
        moderation = JSON.parse(cleanText);
      } catch (parseError) {
        console.warn('Erro ao parsear resposta de moderação:', parseError);
      }

      const pulseResponse = {
        success: true,
        content: text,
        responseTime,
        moderation,
        tokensUsed: {
          input: response.usageMetadata?.promptTokenCount || 0,
          output: response.usageMetadata?.candidatesTokenCount || 0,
          total: response.usageMetadata?.totalTokenCount || 0
        },
        sessionId: this.generateSessionId(),
        timestamp: new Date().toISOString()
      };

      await this.logger.logResponse('content_moderation', userId, {
        success: true,
        responseTime,
        isAppropriate: moderation?.isAppropriate || true,
        severity: moderation?.severity || 'baixa'
      });

      return pulseResponse;

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      await this.logger.logError('content_moderation', userId, error.message, {
        responseTime
      });

      return {
        success: false,
        error: `PULSE AI Moderation: ${error.message}`,
        responseTime,
        sessionId: this.generateSessionId(),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 🔧 Métodos privados
   */

  private validateMedicalCase(medicalCase: MedicalCase): void {
    if (!medicalCase.question || medicalCase.question.trim().length < 10) {
      throw new Error('Pergunta médica deve ter pelo menos 10 caracteres');
    }

    if (medicalCase.question.length > 5000) {
      throw new Error('Pergunta médica muito longa (máximo 5000 caracteres)');
    }
  }

  private buildMedicalPrompt(medicalCase: MedicalCase, userRole: string): string {
    const roleContext = this.getRoleContext(userRole);
    
    let prompt = `
🩺 PULSE AI - Assistente Médico Especializado
${roleContext}

CASO CLÍNICO:
PERGUNTA: "${medicalCase.question}"
`;

    if (medicalCase.category) {
      prompt += `\nCATEGORIA: ${medicalCase.category}`;
    }

    if (medicalCase.specialties?.length) {
      prompt += `\nESPECIALIDADES: ${medicalCase.specialties.join(', ')}`;
    }

    if (medicalCase.patient) {
      prompt += `\nDADOS DO PACIENTE:`;
      if (medicalCase.patient.age) prompt += `\n- Idade: ${medicalCase.patient.age} anos`;
      if (medicalCase.patient.gender) prompt += `\n- Sexo: ${medicalCase.patient.gender}`;
      if (medicalCase.patient.symptoms?.length) {
        prompt += `\n- Sintomas: ${medicalCase.patient.symptoms.join(', ')}`;
      }
      if (medicalCase.patient.history?.length) {
        prompt += `\n- História: ${medicalCase.patient.history.join(', ')}`;
      }
      if (medicalCase.patient.urgency) {
        prompt += `\n- Urgência: ${medicalCase.patient.urgency}`;
      }
    }

    if (medicalCase.context) {
      prompt += `\nCONTEXTO ADICIONAL: ${medicalCase.context}`;
    }

    prompt += `

Como PULSE AI, forneça análise estruturada em JSON:
{
  "differentials": [
    {
      "condition": "Diagnóstico diferencial 1",
      "probability": 0.75,
      "reasoning": "Justificativa clínica detalhada"
    }
  ],
  "recommendedTests": ["Exame complementar 1", "Exame complementar 2"],
  "urgencyLevel": "baixa|média|alta|emergência",
  "specialty": "Especialidade mais adequada",
  "redFlags": ["Sinal de alerta 1", "Sinal de alerta 2"],
  "clinicalPearls": ["Dica clínica importante 1", "Dica clínica importante 2"],
  "disclaimer": "⚠️ Esta análise do PULSE AI é para fins educacionais. Sempre consulte um médico para diagnóstico e tratamento.",
  "pulseConfidence": 0.85,
  "educationalNote": "Nota educacional específica para ${userRole}"
}

IMPORTANTE: 
- PULSE AI é ferramenta EDUCACIONAL
- Sempre recomende avaliação médica presencial
- Mantenha rigor científico e ético
- Adapte linguagem para nível ${userRole}
`;

    return prompt;
  }

  private buildEducationPrompt(topic: string, complexity: string, userRole: string, specialty?: string): string {
    const roleContext = this.getRoleContext(userRole);
    
    return `
🩺 PULSE AI - Assistente Médico Educacional
${roleContext}

TÓPICO: "${topic}"
ESPECIALIDADE: ${specialty || 'Medicina Geral'}
NÍVEL: ${complexity}
USUÁRIO: ${userRole}

Como PULSE AI, forneça conteúdo educacional estruturado em JSON:
{
  "summary": "Resumo claro e objetivo do tópico",
  "keyPoints": [
    "Ponto-chave fundamental 1",
    "Ponto-chave fundamental 2",
    "Ponto-chave fundamental 3"
  ],
  "clinicalGuidelines": [
    "Diretriz clínica atual 1",
    "Diretriz clínica atual 2"
  ],
  "diagnosticCriteria": [
    "Critério diagnóstico 1",
    "Critério diagnóstico 2"
  ],
  "treatment": [
    "Opção terapêutica 1",
    "Opção terapêutica 2"
  ],
  "references": [
    "Referência científica atualizada 1",
    "Referência científica atualizada 2"
  ],
  "complexity": "${complexity}",
  "clinicalPearls": ["Dica prática importante"],
  "redFlags": ["Sinais de alerta importantes"],
  "educationalObjectives": ["Objetivo de aprendizado 1", "Objetivo de aprendizado 2"]
}

Use linguagem ${complexity === 'básico' ? 'simples e didática' : complexity === 'intermediário' ? 'técnica mas acessível' : 'avançada e especializada'}.
Foque em evidências científicas atualizadas e práticas baseadas em evidência.
`;
  }

  private buildQuickQueryPrompt(query: string, userRole: string): string {
    const roleContext = this.getRoleContext(userRole);
    
    return `
🩺 PULSE AI - Resposta Rápida
${roleContext}

PERGUNTA: "${query}"
USUÁRIO: ${userRole}

Como PULSE AI, forneça resposta CONCISA, PRECISA e ÚTIL.
- Máximo 3 parágrafos
- Linguagem adequada para ${userRole}
- Inclua disclaimer médico quando apropriado
- Cite evidências quando relevante
- Mantenha tom profissional e educativo

SEMPRE termine com: "⚠️ Esta informação é educacional. Consulte um médico para orientação específica."
`;
  }

  private buildQuestionExplanationPrompt(
    question: string, 
    alternatives: string[], 
    correctAnswer: string, 
    userAnswer?: string, 
    specialty?: string, 
    userRole: string = 'student'
  ): string {
    const roleContext = this.getRoleContext(userRole);
    
    let prompt = `
🩺 PULSE AI - Explicação de Questão Médica
${roleContext}

QUESTÃO: "${question}"

ALTERNATIVAS:
${alternatives.map((alt, index) => `${String.fromCharCode(65 + index)}) ${alt}`).join('\n')}

RESPOSTA OFICIAL CORRETA: ${correctAnswer}
${userAnswer ? `RESPOSTA DO USUÁRIO: ${userAnswer}` : ''}
${specialty ? `ESPECIALIDADE: ${specialty}` : ''}

IMPORTANTE: Você deve explicar POR QUE a resposta oficial "${correctAnswer}" está CORRETA segundo o gabarito.
NÃO gere uma nova resposta. EXPLIQUE a resposta que foi fornecida como correta.

Como PULSE AI, forneça explicação estruturada em JSON:
{
  "correctAnswerExplanation": "Explicação detalhada de POR QUE a resposta '${correctAnswer}' está correta, baseada em evidências científicas e diretrizes médicas atuais",
  "wrongAnswersExplanation": [
    "Explicação de por que alternativa A está incorreta (se não for a correta)",
    "Explicação de por que alternativa B está incorreta (se não for a correta)",
    "Explicação de por que alternativa C está incorreta (se não for a correta)"
  ],
  "studyTips": [
    "Dica de estudo específica sobre este tópico",
    "Como lembrar deste conceito",
    "Correlação clínica importante"
  ],
  "keyPoints": [
    "Conceito-chave principal 1",
    "Conceito-chave principal 2", 
    "Conceito-chave principal 3"
  ],
  "difficulty": "básica|intermediária|avançada",
  "timeToReview": "Sugestão de quando revisar este conteúdo novamente",
  "clinicalCorrelation": "Como este conhecimento se aplica na prática clínica",
  "references": ["Referência científica relevante 1", "Referência científica relevante 2"]
}

DIRETRIZES:
- SEMPRE valide a resposta oficial fornecida
- Explique a LÓGICA por trás da resposta correta
- Identifique ERROS conceituais nas alternativas incorretas
- Use linguagem adequada para ${userRole}
- Mantenha rigor científico e cite evidências
- Foque na EDUCAÇÃO, não apenas na correção
${userAnswer && userAnswer !== correctAnswer ? `- Explique especificamente onde o usuário errou e como corrigir` : ''}
`;

    return prompt;
  }

  private buildQuestionExtractionPrompt(
    content: string, 
    options: any, 
    userRole: string
  ): string {
    return `
Extraia até 10 questões de múltipla escolha do texto.

TEXTO:
"${content.substring(0, 8000)}"

INSTRUÇÕES:
1. Encontre questões que começam com "QUESTÃO X"
2. Para cada questão extraia: número, enunciado completo, 4 alternativas
3. Máximo 10 questões por resposta
4. JSON bem formado obrigatório

Responda em JSON válido:
{
  "questions": [
    {
      "questionNumber": "1", 
      "question": "Enunciado completo",
      "alternatives": ["A", "B", "C", "D"],
      "correctAnswer": "",
      "explanation": "",
      "specialty": "medicina_geral",
      "difficulty": "intermediária",
      "topics": [],
      "estimatedTime": 120,
      "bloomLevel": "aplicação"
    }
  ],
  "metadata": {
    "totalQuestionsFound": 1,
    "successfullyExtracted": 1,
    "qualityScore": 0.9
  }
}

CRÍTICO:
- Máximo 10 questões
- JSON bem formado
- Strings fechadas corretamente
- Enunciado completo mantido
`;
  }

  private buildBatchExtractionPrompt(
    batchContent: string,
    options: any,
    userRole: string,
    batchNumber: number
  ): string {
    // Contar quantas questões há no lote
    const questoesNoLote = (batchContent.match(/QUESTÃO\s+\d+/g) || []).length;
    
    return `
Extraia TODAS AS ${questoesNoLote} QUESTÕES do texto abaixo em JSON válido:

${batchContent}

IMPORTANTE: O texto contém EXATAMENTE ${questoesNoLote} questões. Extraia TODAS elas no JSON.

JSON com TODAS as ${questoesNoLote} questões:
{
  "questions": [
    {
      "questionNumber": "1",
      "question": "texto completo do enunciado da questão 1",
      "statement": "texto completo do enunciado da questão 1",
      "enunciado": "texto completo do enunciado da questão 1",
      "alternatives": ["A) texto", "B) texto", "C) texto", "D) texto"],
      "alternativas": ["A) texto", "B) texto", "C) texto", "D) texto"],
      "correctAnswer": "",
      "explanation": "breve",
      "explicacao": "breve",
      "specialty": "medicina_geral",
      "difficulty": "intermediária",
      "dificuldade": "intermediária",
      "topics": ["revalida"],
      "tags": ["revalida"]
    },
    {
      "questionNumber": "2",
      "question": "texto completo do enunciado da questão 2",
      "statement": "texto completo do enunciado da questão 2",
      "enunciado": "texto completo do enunciado da questão 2",
      "alternatives": ["A) texto", "B) texto", "C) texto", "D) texto"],
      "alternativas": ["A) texto", "B) texto", "C) texto", "D) texto"],
      "correctAnswer": "",
      "explanation": "breve",
      "explicacao": "breve",
      "specialty": "medicina_geral",
      "difficulty": "intermediária",
      "dificuldade": "intermediária",
      "topics": ["revalida"],
      "tags": ["revalida"]
    }
  ]
}

REGRAS CRÍTICAS:
- Extrair TODAS as ${questoesNoLote} questões (não pular nenhuma)
- Cada questão deve ter enunciado completo
- Cada questão deve ter exatamente 4 alternativas
- Explicações curtas (máximo 20 palavras)
- JSON bem formado com array de ${questoesNoLote} questões
- Se uma questão estiver incompleta, incluir mesmo assim
`;
  }

  /**
   * 🔧 Processar matches de fallback patterns
   */
  private processFallbackMatches(matches: any[], patternName: string): any[] {
    console.log(`🔧 PULSE AI - Processando ${matches.length} questões com pattern "${patternName}"`);
    
    const questions: any[] = [];
    
    matches.forEach((match, index) => {
      const questionNumber = match[1] || (index + 1).toString();
      const questionContent = match[2] || match[0] || '';
      
      // Tentar extrair alternativas básicas do conteúdo
      const altPattern = /([A-E])\)\s*([^\n\r]+)/g;
      const alternatives: string[] = [];
      let altMatch;
      
      while ((altMatch = altPattern.exec(questionContent)) !== null && alternatives.length < 5) {
        alternatives.push(altMatch[2].trim());
      }
      
      // Garantir pelo menos 4 alternativas
      while (alternatives.length < 4) {
        alternatives.push(`Alternativa ${String.fromCharCode(65 + alternatives.length)}`);
      }
      
      questions.push({
        questionNumber: questionNumber,
        question: `Questão ${questionNumber} (${patternName}) - ${questionContent.substring(0, 100)}...`,
        statement: `Questão ${questionNumber} (${patternName}) - ${questionContent.substring(0, 100)}...`,
        enunciado: `Questão ${questionNumber} (${patternName}) - ${questionContent.substring(0, 100)}...`,
        alternatives: alternatives.slice(0, 4),
        alternativas: alternatives.slice(0, 4),
        correctAnswer: "",
        explanation: `Extração com pattern "${patternName}" - revisar conteúdo`,
        explicacao: `Extração com pattern "${patternName}" - revisar conteúdo`,
        specialty: "medicina_geral",
        difficulty: "intermediária",
        dificuldade: "intermediária",
        topics: ["revalida", patternName],
        tags: ["revalida", patternName],
        references: [],
        estimatedTime: 120,
        bloomLevel: "aplicação"
      });
    });
    
    console.log(`✅ PULSE AI - ${questions.length} questões processadas com pattern "${patternName}"`);
    return questions;
  }

  private extractBatchManually(batchContent: string, batchNumber: number): any[] {
    console.log(`🔧 Fallback manual para lote ${batchNumber}`);
    
    const questions: any[] = [];
    const questionPattern = /QUESTÃO\s+(\d+)([\s\S]*?)(?=QUESTÃO\s+\d+|$)/gi;
    const matches = Array.from(batchContent.matchAll(questionPattern));
    
    if (matches && matches.length > 0) {
      console.log(`🔍 Fallback: encontradas ${matches.length} questões potenciais`);
      
      matches.forEach((match, index) => {
        const questionNumber = match[1];
        const questionContent = match[2] || '';
        
        // Extrair enunciado (texto antes das alternativas)
        const altStartPattern = /\n[A-E]\)/;
        const altStartMatch = questionContent.search(altStartPattern);
        const enunciado = altStartMatch > 0 ? 
          questionContent.substring(0, altStartMatch).trim() : 
          questionContent.substring(0, 200).trim() + '...';
        
        // Tentar extrair alternativas completas
        const altPattern = /([A-E])\)\s*([^\n\r]+)/g;
        const alternatives: string[] = [];
        let altMatch;
        
        while ((altMatch = altPattern.exec(questionContent)) !== null && alternatives.length < 4) {
          alternatives.push(`${altMatch[1]}) ${altMatch[2].trim()}`);
        }
        
        // Garantir 4 alternativas
        while (alternatives.length < 4) {
          alternatives.push(`${String.fromCharCode(65 + alternatives.length)}) Alternativa não encontrada`);
        }
        
        const fullQuestion = `QUESTÃO ${questionNumber}\n${enunciado}`;
        
        questions.push({
          questionNumber: questionNumber,
          question: fullQuestion,
          statement: fullQuestion,
          enunciado: fullQuestion,
          alternatives: alternatives.slice(0, 4),
          alternativas: alternatives.slice(0, 4),
          correctAnswer: "",
          explanation: "Extração manual - revisar conteúdo",
          explicacao: "Extração manual - revisar conteúdo",
          specialty: "medicina_geral",
          difficulty: "intermediária",
          dificuldade: "intermediária",
          topics: ["revalida"],
          tags: ["revalida"],
          references: [],
          estimatedTime: 120,
          bloomLevel: "aplicação"
        });
      });
    }
    
    console.log(`✅ Fallback lote ${batchNumber}: ${questions.length} questões extraídas`);
    return questions;
  }

  /**
   * 🔄 Processa um lote de questões para categorização médica inteligente
   */
  private async processMedicalCategorizationBatch(
    questions: any[],
    filtersHierarchy: any[],
    userRole: string,
    batchNumber: number
  ): Promise<any[]> {
    const prompt = this.buildSmartCategorizationPrompt(questions, filtersHierarchy, userRole, batchNumber);
    
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
          try {
        const cleanText = text
          .replace(/```json\n?|```/g, '')
          .replace(/[\u0000-\u001F\u007F]/g, ' ')
          .replace(/\\n|\\r|\\t/g, ' ')
          .replace(/[\n\r\t]/g, ' ')
          .replace(/\u[0-9a-fA-F]{4}/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim();
        
        // LOGS DETALHADOS para detectar problemas de JSON
        const isFirstBatch = batchNumber === 1;
        const openBraces = (cleanText.match(/\{/g) || []).length;
        const closeBraces = (cleanText.match(/\}/g) || []).length;
        const openBrackets = (cleanText.match(/\[/g) || []).length;
        const closeBrackets = (cleanText.match(/\]/g) || []).length;
        const isValidJSON = openBraces === closeBraces && openBrackets === closeBrackets;
        const hasProblems = text.length < 100 || !cleanText.includes('categorizedQuestions') || !isValidJSON;
        
                // Mostrar apenas se houver problemas
        if (hasProblems) {
          console.log(`❌ Lote ${batchNumber} - Problema JSON: ${text.length} chars, válido: ${isValidJSON}, contém questões: ${cleanText.includes('categorizedQuestions')}`);
          console.log(`🔍 Início:`, cleanText.substring(0, 300));
          console.log(`🔍 Final:`, cleanText.substring(Math.max(0, cleanText.length - 200)));
        }
      
              const parsed = JSON.parse(cleanText);
        const categorizedQuestions = parsed.categorizedQuestions || [];
        

        
        // 🔍 VALIDAÇÃO MELHORADA: Extrair todos os IDs válidos recursivamente
        const allValidIds = new Set<string>();
        const allValidNames = new Set<string>();
        const idToNameMap = new Map<string, string>();

        const extractValidIds = (items: any[], level: number = 0) => {
          items.forEach(item => {
            if (item.id && item.name) {
              allValidIds.add(item.id);
              allValidNames.add(item.name.toLowerCase());
              idToNameMap.set(item.id, item.name);

              // Log reduzido - apenas filtros principais (nível 0)
              if (batchNumber === 1 && level === 0) {
                console.log(`   📁 "${item.name}" (${item.id})`);
              }
            }

            // Buscar em children (estrutura nova)
            if (item.children && Array.isArray(item.children)) {
              extractValidIds(item.children, level + 1);
            }

            // Buscar em subfilters (estrutura legacy)
            if (item.subfilters && Array.isArray(item.subfilters)) {
              extractValidIds(item.subfilters, level + 1);
            }
          });
        };

        extractValidIds(filtersHierarchy);

        console.log(`🔍 Lote ${batchNumber} - Filtros carregados: ${allValidIds.size} IDs únicos`);

        // 🧠 SMART MATCHING: Função para encontrar filtros por similaridade
        const findFilterBySimilarity = (searchTerm: string): string | null => {
          const searchLower = searchTerm.toLowerCase().trim();

          // 1. Match exato por ID
          if (allValidIds.has(searchTerm)) {
            return searchTerm;
          }

          // 2. Match exato por nome
          for (const [id, name] of idToNameMap.entries()) {
            if (name.toLowerCase() === searchLower) {
              return id;
            }
          }

          // 3. Match parcial por nome (contém)
          for (const [id, name] of idToNameMap.entries()) {
            if (name.toLowerCase().includes(searchLower) || searchLower.includes(name.toLowerCase())) {
              return id;
            }
          }

          return null;
        };

        // 🔧 CORREÇÃO AUTOMÁTICA: Tentar corrigir IDs inválidos
        let correctionsMade = 0;
        categorizedQuestions.forEach((q: any, idx: number) => {
          const originalFilterIds = [...(q.suggestedFilterIds || [])];
          const originalSubFilterIds = [...(q.suggestedSubFilterIds || [])];

          // Corrigir filterIds
          q.suggestedFilterIds = originalFilterIds.map((id: string) => {
            if (allValidIds.has(id)) {
              return id; // ID válido
            }

            const correctedId = findFilterBySimilarity(id);
            if (correctedId) {
              console.log(`   🔧 Questão ${idx + 1}: "${id}" → "${correctedId}" (${idToNameMap.get(correctedId)})`);
              correctionsMade++;
              return correctedId;
            }

            console.log(`   ❌ Questão ${idx + 1}: "${id}" não encontrado (removendo)`);
            return null;
          }).filter(Boolean);

          // Corrigir subFilterIds
          q.suggestedSubFilterIds = originalSubFilterIds.map((id: string) => {
            if (allValidIds.has(id)) {
              return id; // ID válido
            }

            const correctedId = findFilterBySimilarity(id);
            if (correctedId) {
              console.log(`   🔧 Questão ${idx + 1}: subfiltro "${id}" → "${correctedId}" (${idToNameMap.get(correctedId)})`);
              correctionsMade++;
              return correctedId;
            }

            console.log(`   ❌ Questão ${idx + 1}: subfiltro "${id}" não encontrado (removendo)`);
            return null;
          }).filter(Boolean);
        });

        if (correctionsMade > 0) {
          console.log(`✅ Lote ${batchNumber} - ${correctionsMade} correções automáticas aplicadas`);
        }
      
             return categorizedQuestions.map((q: any, index: number) => {
         const originalQuestion = questions[index];
         const filterIds = q.suggestedFilterIds || [];
         const subFilterIds = q.suggestedSubFilterIds || [];
         const totalFilters = filterIds.length + subFilterIds.length;
         
         // Log apenas se sem filtros (problema)
         if (totalFilters === 0) {
           console.log(`❌ Questão ${index + 1} sem filtros: tempId="${originalQuestion?.tempId}"`);
         }
        
                 return {
           tempId: originalQuestion?.tempId,
           question: q.question || originalQuestion?.question || originalQuestion?.statement || originalQuestion?.enunciado || '',
           alternatives: q.alternatives || originalQuestion?.alternatives || [],
           correctAnswer: q.correctAnswer || originalQuestion?.correctAnswer,
           explanation: q.explanation || originalQuestion?.explanation,
           suggestedFilterIds: filterIds,
           suggestedSubFilterIds: subFilterIds,
           suggestedNewFilters: q.suggestedNewFilters || [],
           hierarchyPath: q.hierarchyPath || q.categoryPath || []
         };
      });
      
    } catch (parseError) {
      console.error(`❌ Erro ao parsear lote ${batchNumber}:`, parseError);
      console.log(`🔍 Texto que causou erro:`, text.substring(0, 500));
      // Salvar JSON bruto do erro
      try {
        const fs = require('fs');
        const path = require('path');
        const logsDir = path.resolve(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir, { recursive: true });
        }
        const badJsonPath = path.join(logsDir, `bad_json_lote_${batchNumber}_error.txt`);
        fs.writeFileSync(badJsonPath, text, { encoding: 'utf8' });
        console.log(`📝 JSON bruto do lote ${batchNumber} (erro) salvo em: ${badJsonPath}`);
      } catch (logError) {
        console.error('❌ Falha ao salvar JSON bruto do erro:', logError);
      }
      // 🔧 ESTRATÉGIA DE RECUPERAÇÃO PARA JSON TRUNCADO
      console.log(`🔧 Lote ${batchNumber} - Tentando recuperar JSON truncado...`);
      
      const recoveredQuestions = this.tryRecoverTruncatedJSON(text, questions, batchNumber);
      if (recoveredQuestions.length > 0) {
        console.log(`✅ Recuperação bem-sucedida: ${recoveredQuestions.length} questões salvas do JSON truncado`);
        return recoveredQuestions;
      }
      
      // 🔄 RETRY COM LOTE MENOR se truncamento continuo
      if (questions.length > 1) {
        console.log(`🔄 Lote ${batchNumber} - JSON truncado, tentando com lotes menores...`);
        return await this.retryBatchWithSmallerSize(questions, filtersHierarchy, userRole, batchNumber);
      }
      
      // 🧠 FALLBACK INTELIGENTE: Sugestão de filtros NOVOS que não existem
      console.log(`🔧 Lote ${batchNumber} - FALLBACK acionado (JSON parse error)`);
      
      // FUNÇÃO DE NORMALIZAÇÃO para comparação de filtros
      const normalizeText = (text: string): string => {
        return text
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove acentos
          .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
          .replace(/\s+/g, '_') // Substitui espaços por underscores
          .trim();
      };
      
      // Extrair TODOS os IDs existentes para verificação
      const existingFilterIds = new Set<string>();
      const extractExistingIds = (items: any[]) => {
        items.forEach(item => {
          existingFilterIds.add(item.id);
          if (item.children) extractExistingIds(item.children);
          if (item.subfilters) extractExistingIds(item.subfilters);
        });
      };
      extractExistingIds(filtersHierarchy);
      
      console.log(`🔍 Fallback - ${existingFilterIds.size} filtros existentes carregados para verificação`);
      
      return questions.map((q, index) => {
        console.log(`   🔧 Fallback questão ${index}: tempId="${q.tempId}"`);
        
        const questionText = (q.question || q.statement || q.enunciado || '').toLowerCase();
        const alternativesText = (q.alternatives || []).join(' ').toLowerCase();
        const fullText = `${questionText} ${alternativesText}`;
        
        // CATEGORIZAÇÃO BÁSICA INTELIGENTE - filtros existentes
        const suggestedFilterIds: string[] = [];
        const suggestedSubFilterIds: string[] = [];
        
        // Lista de filtros NOVOS para sugerir (não existentes no banco)
        const suggestedNewFilters: any[] = [];
        
        console.log(`      🔍 Analisando para categorização básica: "${fullText.substring(0, 100)}..."`);
        
        // === CATEGORIZAÇÃO BÁSICA COM FILTROS EXISTENTES ===
        
        // CARDIOLOGIA - Palavras-chave
        if (fullText.includes('cardíac') || fullText.includes('cardiac') || 
            fullText.includes('arritmia') || fullText.includes('bradicardia') || fullText.includes('taquicardia') ||
            fullText.includes('ecg') || fullText.includes('eletrocardiograma') ||
            fullText.includes('infarto') || fullText.includes('angina') || fullText.includes('hipertensão') ||
            fullText.includes('pressão arterial') || fullText.includes('frequência cardíaca') ||
            fullText.includes('marca-passo') || fullText.includes('atropina') || fullText.includes('dopamina')) {
          
          suggestedFilterIds.push('clinica_medica');
          suggestedSubFilterIds.push('cardiologia');
          
          if (fullText.includes('arritmia') || fullText.includes('bradicardia') || fullText.includes('taquicardia') || 
              fullText.includes('ecg') || fullText.includes('eletrocardiograma')) {
            suggestedSubFilterIds.push('arritmias_cardiacas');
          }
          
          if (fullText.includes('bradicardia') || (fullText.includes('frequência cardíaca') && fullText.includes('45')) ||
              fullText.includes('marca-passo') || fullText.includes('atropina')) {
            suggestedSubFilterIds.push('bradiarritmias');
          }
          
          console.log(`      💓 CARDIOLOGIA detectada`);
        }
        
        // GINECOLOGIA - Palavras-chave
        else if (fullText.includes('diu') || fullText.includes('contraceptiv') || fullText.includes('anticoncepcional') ||
                 fullText.includes('menstruação') || fullText.includes('menstrual') || fullText.includes('sangramento uterino') ||
                 fullText.includes('ginecológ') || fullText.includes('ginecolog') || fullText.includes('parto') ||
                 fullText.includes('pós-parto') || fullText.includes('puerpério') || fullText.includes('planejamento familiar') ||
                 fullText.includes('útero') || fullText.includes('endométrio') || fullText.includes('ovário')) {
          
          suggestedFilterIds.push('ginecologia');
          
          if (fullText.includes('diu') || fullText.includes('contraceptiv') || fullText.includes('anticoncepcional') ||
              fullText.includes('planejamento familiar')) {
            suggestedSubFilterIds.push('planejamento_familiar');
            suggestedSubFilterIds.push('metodos_contraceptivos');
          }
          
          if (fullText.includes('sangramento') || fullText.includes('menstrual') || fullText.includes('menstruação')) {
            suggestedSubFilterIds.push('sangramento_uterino_anormal');
          }
          
          console.log(`      🚺 GINECOLOGIA detectada`);
        }
        
        // PEDIATRIA - Palavras-chave
        else if (fullText.includes('criança') || fullText.includes('menino') || fullText.includes('menina') ||
                 fullText.includes('anos') && (fullText.includes(' 1 ') || fullText.includes(' 2 ') || fullText.includes(' 3 ') ||
                 fullText.includes(' 4 ') || fullText.includes(' 5 ') || fullText.includes(' 6 ') || fullText.includes(' 7 ') ||
                 fullText.includes(' 8 ') || fullText.includes(' 9 ') || fullText.includes(' 10 ') || fullText.includes(' 11 ') ||
                 fullText.includes(' 12 ') || fullText.includes(' 13 ') || fullText.includes(' 14 ') || fullText.includes(' 15 ')) ||
                 fullText.includes('pediátr') || fullText.includes('pediatr') || fullText.includes('vacinação') ||
                 fullText.includes('vacina') || fullText.includes('crescimento') || fullText.includes('desenvolvimento')) {
          
          suggestedFilterIds.push('pediatria');
          
          if (fullText.includes('vacina') || fullText.includes('vacinação') || fullText.includes('imunização')) {
            suggestedSubFilterIds.push('vacinas');
          }
          
          if (fullText.includes('emergência') || fullText.includes('urgência') || fullText.includes('pronto')) {
            suggestedSubFilterIds.push('emergencias_pediatricas');
          }
          
          console.log(`      👶 PEDIATRIA detectada`);
        }
        
        // CIRURGIA - Palavras-chave  
        else if (fullText.includes('cirurgia') || fullText.includes('cirúrgic') || fullText.includes('operação') ||
                 fullText.includes('apendicite') || fullText.includes('hérnia') || fullText.includes('trauma') ||
                 fullText.includes('abdome agudo') || fullText.includes('laparoscopia') || fullText.includes('sutura') ||
                 fullText.includes('pós-operatório') || fullText.includes('anestesia')) {
          
          suggestedFilterIds.push('cirurgia');
          suggestedSubFilterIds.push('cirurgia_geral');
          
          if (fullText.includes('emergência') || fullText.includes('urgência') || fullText.includes('trauma') ||
              fullText.includes('abdome agudo') || fullText.includes('apendicite')) {
            suggestedSubFilterIds.push('urgencias_cirurgicas');
          }
          
          console.log(`      🔪 CIRURGIA detectada`);
        }
        
        // MEDICINA PREVENTIVA - Palavras-chave
        else if (fullText.includes('ubs') || fullText.includes('unidade básica') || fullText.includes('atenção primária') ||
                 fullText.includes('prevenção') || fullText.includes('rastreamento') || fullText.includes('epidemiologia') ||
                 fullText.includes('saúde coletiva') || fullText.includes('medicina de família') ||
                 fullText.includes('promoção da saúde')) {
          
          suggestedFilterIds.push('medicina_preventiva');
          suggestedSubFilterIds.push('medicina_de_familia_e_comunidade');
          suggestedSubFilterIds.push('saude_coletiva_atencao_primaria_a_saude');
          
          console.log(`      🏥 MEDICINA PREVENTIVA detectada`);
        }
        
        // CLÍNICA MÉDICA GERAL - fallback para casos médicos gerais
        else if (fullText.includes('paciente') || fullText.includes('médico') || fullText.includes('diagnóstico') ||
                 fullText.includes('tratamento') || fullText.includes('sintoma') || fullText.includes('exame') ||
                 fullText.includes('hospital') || fullText.includes('pronto')) {
          
          suggestedFilterIds.push('clinica_medica');
          console.log(`      ⚕️ CLÍNICA MÉDICA GERAL detectada`);
        }
        
        // === FILTROS NOVOS ESPECÍFICOS ===
        
        // BAVT (Bloqueio Atrioventricular Total) - específico
        if (fullText.includes('bavt') || (fullText.includes('bloqueio') && fullText.includes('atrioventricular'))) {
          const bavtFilterId = normalizeText('bloqueio_atrioventricular_total_bavt');
          
          if (!existingFilterIds.has(bavtFilterId)) {
            suggestedNewFilters.push({
              id: bavtFilterId,
              name: 'Bloqueio Atrioventricular Total (BAVT)',
              parentId: 'bradiarritmias',
              level: 5,
              category: 'MEDICAL_SPECIALTY',
              description: 'Bloqueio completo da condução entre átrios e ventrículos',
              shouldCreate: true
            });
            console.log(`      🆕 NOVO FILTRO: ${bavtFilterId}`);
          }
          
          // Tratamento de BAVT
          const tratamentoBavtId = normalizeText('tratamento_bavt');
          if (!existingFilterIds.has(tratamentoBavtId)) {
            suggestedNewFilters.push({
              id: tratamentoBavtId,
              name: 'Tratamento de BAVT',
              parentId: bavtFilterId,
              level: 6,
              category: 'MEDICAL_SPECIALTY',
              description: 'Manejo terapêutico do bloqueio atrioventricular total',
              shouldCreate: true
            });
            console.log(`      🆕 NOVO FILTRO: ${tratamentoBavtId}`);
          }
        }
        
        // DELIRIUM TREMENS - específico
        if (fullText.includes('delirium') && (fullText.includes('tremor') || fullText.includes('tremens'))) {
          const deliriumId = normalizeText('delirium_tremens');
          
          if (!existingFilterIds.has(deliriumId)) {
            suggestedNewFilters.push({
              id: deliriumId,
              name: 'Delirium Tremens',
              parentId: 'sindrome_abstinencia_alcoolica',
              level: 5,
              category: 'MEDICAL_SPECIALTY',
              description: 'Forma severa de síndrome de abstinência alcoólica',
              shouldCreate: true
            });
            console.log(`      🆕 NOVO FILTRO: ${deliriumId}`);
          }
        }
        
        // PUBERDADE PRECOCE - específico
        if (fullText.includes('puberdade') || fullText.includes('telarca') || fullText.includes('broto mamário')) {
          const puberdadePrecoceId = normalizeText('puberdade_precoce_central');
          
          if (!existingFilterIds.has(puberdadePrecoceId)) {
            suggestedNewFilters.push({
              id: puberdadePrecoceId,
              name: 'Puberdade Precoce Central',
              parentId: 'puberdade',
              level: 4,
              category: 'MEDICAL_SPECIALTY',
              description: 'Desenvolvimento sexual prematuro de origem central',
              shouldCreate: true
            });
            console.log(`      🆕 NOVO FILTRO: ${puberdadePrecoceId}`);
          }
        }
        
        // TÉCNICAS CIRÚRGICAS específicas
        if (fullText.includes('laparoscopia') || fullText.includes('laparoscópica')) {
          const laparoscopiaId = normalizeText('tecnica_laparoscopica');
          
          if (!existingFilterIds.has(laparoscopiaId)) {
            suggestedNewFilters.push({
              id: laparoscopiaId,
              name: 'Técnica Laparoscópica',
              parentId: 'cirurgia_geral',
              level: 6,
              category: 'MEDICAL_SPECIALTY',
              description: 'Técnica cirúrgica minimamente invasiva',
              shouldCreate: true
            });
            console.log(`      🆕 NOVO FILTRO: ${laparoscopiaId}`);
          }
        }
        
        console.log(`      ✅ Fallback: ${suggestedFilterIds.length} filtros principais + ${suggestedSubFilterIds.length} subfiltros + ${suggestedNewFilters.length} novos`);
        
        return {
          tempId: q.tempId, // PRESERVAR tempId original no fallback
          question: q.question || q.statement || q.enunciado || '',
          alternatives: q.alternatives || [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          suggestedFilterIds, // FILTROS EXISTENTES categorizados automaticamente
          suggestedSubFilterIds, // SUBFILTROS EXISTENTES categorizados automaticamente
          suggestedNewFilters, // Filtros NOVOS específicos (BAVT, etc.)
          fallbackUsed: true, // Flag para debug
          fallbackReason: 'JSON parse error - intelligent basic categorization applied'
        };
      });
    }
  }

  /**
   * 📊 Calcula estatísticas das categorias mais usadas
   */
  private buildTopCategories(categorizedQuestions: any[]): Array<{ path: string; count: number }> {
    const categoryCount: { [key: string]: number } = {};
    
    categorizedQuestions.forEach(q => {
      if (q.categoryPath && q.categoryPath.length > 0) {
        const path = q.categoryPath.map((c: any) => c.name).join(' > ');
        categoryCount[path] = (categoryCount[path] || 0) + 1;
      }
    });
    
    return Object.entries(categoryCount)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * 📈 Calcula confiança média das categorizações
   */
  private buildAverageConfidence(categorizedQuestions: any[]): number {
    const questionsWithConfidence = categorizedQuestions.filter(q => 
      q.categoryPath && q.categoryPath.length > 0
    );
    
    if (questionsWithConfidence.length === 0) return 0;
    
    const totalConfidence = questionsWithConfidence.reduce((sum, q) => {
      const avgConfidence = q.categoryPath.reduce((cSum: number, c: any) => cSum + (c.confidence || 0), 0) / q.categoryPath.length;
      return sum + avgConfidence;
    }, 0);
    
    return totalConfidence / questionsWithConfidence.length;
  }

  /**
   * 🎯 Prompt direto para categorização automática - HIERARQUIAS COMPLETAS OBRIGATÓRIAS
   */
  private buildSmartCategorizationPrompt(
    questions: any[],
    filtersHierarchy: any[],
    userRole: string,
    batchNumber: number
  ): string {
    // Construir mapa hierárquico COMPLETO com todos os 6 níveis
    const buildHierarchyMap = (items: any[], parentPath: string = '', level: number = 0): string => {
      let hierarchyText = '';
      
      items.forEach(item => {
        const currentPath = parentPath ? `${parentPath} → ${item.name}` : item.name;
        const indent = '  '.repeat(level);
        
        hierarchyText += `${indent}📁 NÍVEL ${level}: "${item.id}" (${item.name})\n`;
        
        if (item.children && item.children.length > 0) {
          hierarchyText += buildHierarchyMap(item.children, currentPath, level + 1);
        }
      });
      
      return hierarchyText;
    };

    // Extrair todos os IDs válidos organizados por nível
    const allValidIds: string[] = [];
    const idsByLevel: { [level: number]: string[] } = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };
    const hierarchyPaths: { [id: string]: string } = {};
    
    const extractAllIdsRecursively = (items: any[], level: number = 0, parentPath: string = '') => {
      items.forEach(item => {
        allValidIds.push(item.id);
        idsByLevel[level].push(item.id);
        
        const currentPath = parentPath ? `${parentPath} → ${item.name}` : item.name;
        hierarchyPaths[item.id] = currentPath;
        
        if (item.children && item.children.length > 0) {
          extractAllIdsRecursively(item.children, level + 1, currentPath);
        }
      });
    };
    
    extractAllIdsRecursively(filtersHierarchy);
    
    // Construir exemplos de navegação hierárquica
    const hierarchyExamples = `
🎯 EXEMPLOS DE NAVEGAÇÃO HIERÁRQUICA CORRETA:

📌 EXEMPLO 1 - Questão de Cardiologia (BAVT):
Questão: "Paciente com bloqueio atrioventricular total, FC 30bpm"
✅ NAVEGAÇÃO COMPLETA:
- NÍVEL 0: ["ClinicaMedica"] (filtro principal)
- NÍVEL 1+: ["Cardiologia", "Arritmias_Cardiacas", "Bradiarritmias", "Bloqueio_AV_Total"]
❌ ERRADO: apenas ["ClinicaMedica"] + ["Cardiologia"]
✅ CORRETO: desceu até o nível mais específico!

📌 EXEMPLO 2 - Questão de Pediatria (Vacinação):
Questão: "Criança de 2 anos, calendário vacinal"
✅ NAVEGAÇÃO COMPLETA:
- NÍVEL 0: ["Pediatria"] (filtro principal)  
- NÍVEL 1+: ["Medicina_Preventiva_Pediatrica", "Imunizacoes", "Calendario_Vacinal_Infantil"]
❌ ERRADO: apenas ["Pediatria"] + ["Medicina_Preventiva"]
✅ CORRETO: explorou toda a árvore até o final!

📌 EXEMPLO 3 - Questão de Ginecologia (DIU):
Questão: "Paciente solicita DIU como método contraceptivo"
✅ NAVEGAÇÃO COMPLETA:
- NÍVEL 0: ["Ginecologia"] (filtro principal)
- NÍVEL 1+: ["Planejamento_Familiar", "Metodos_Contraceptivos", "DIU", "Insercao_DIU"]
❌ ERRADO: apenas ["Ginecologia"] + ["Planejamento_Familiar"]  
✅ CORRETO: navegou até o método específico!
`;

    return `
🩺 PULSE AI - Categorização Médica HIERÁRQUICA COMPLETA (Lote ${batchNumber})

🎯 MISSÃO CRÍTICA: Navegar pela ÁRVORE HIERÁRQUICA COMPLETA até o nível mais específico possível!

QUESTÕES PARA CATEGORIZAR:
${questions.map((q, i) => `
QUESTÃO ${i + 1}:
Enunciado: ${q.question || q.statement || q.enunciado || ''}
Alternativas: ${q.alternatives ? q.alternatives.join(' | ') : 'N/A'}
TempId: ${q.tempId || `temp-${i}`}
`).join('\n')}

🌳 ESTRUTURA HIERÁRQUICA COMPLETA (6 NÍVEIS):
${buildHierarchyMap(filtersHierarchy)}

📊 IDs ORGANIZADOS POR NÍVEL:
- 🏢 NÍVEL 0 (Filtros Principais): ${idsByLevel[0].join(', ')}
- 🏗️ NÍVEL 1 (Especialidades): ${idsByLevel[1].slice(0, 10).join(', ')}${idsByLevel[1].length > 10 ? '...' : ''}
- 🏭 NÍVEL 2 (Subáreas): ${idsByLevel[2].slice(0, 10).join(', ')}${idsByLevel[2].length > 10 ? '...' : ''}
- 🏘️ NÍVEL 3 (Tópicos): ${idsByLevel[3].slice(0, 10).join(', ')}${idsByLevel[3].length > 10 ? '...' : ''}
- 🏠 NÍVEL 4 (Subtópicos): ${idsByLevel[4].slice(0, 10).join(', ')}${idsByLevel[4].length > 10 ? '...' : ''}
- 🏡 NÍVEL 5 (Específicos): ${idsByLevel[5].slice(0, 10).join(', ')}${idsByLevel[5].length > 10 ? '...' : ''}

${hierarchyExamples}

🚨 REGRAS OBRIGATÓRIAS DE NAVEGAÇÃO:

1. 🎯 **NAVEGAR ATÉ O FINAL DISPONÍVEL**: Para cada questão, navegue pela árvore hierárquica até o nível mais específico que existe para aquele caminho
2. 🔍 **BUSCAR PALAVRAS-CHAVE**: Procure termos específicos na questão que correspondam a níveis mais profundos
3. 📚 **USAR CONHECIMENTO MÉDICO**: Use seu conhecimento para associar sintomas/condições aos filtros mais específicos disponíveis
4. 🌳 **INCLUIR CAMINHO COMPLETO**: Se encontrar um filtro no nível 4, inclua também os níveis 1, 2 e 3 que levam até ele
5. ⚡ **MÚLTIPLOS CAMINHOS RELEVANTES**: Uma questão pode ter múltiplos caminhos hierárquicos quando realmente aplicável
6. 🎯 **QUALIDADE SOBRE QUANTIDADE**: Prefira filtros específicos e relevantes ao invés de muitos filtros genéricos
7. 🔄 **EXPLORAÇÃO INTELIGENTE**: Explore especialidades secundárias apenas quando realmente relevantes

📝 ALGORITMO DE CATEGORIZAÇÃO INTELIGENTE:

Para cada questão:
1️⃣ Identifique o(s) filtro(s) principal(is) (NÍVEL 0)
2️⃣ Identifique a especialidade médica (NÍVEL 1)
3️⃣ Se existir, procure subáreas específicas (NÍVEL 2)
4️⃣ Se existir, procure tópicos específicos (NÍVEL 3)
5️⃣ Se existir, procure subtópicos específicos (NÍVEL 4)
6️⃣ Se existir, procure aspectos muito específicos (NÍVEL 5)
7️⃣ Inclua TODOS os IDs do caminho hierárquico em suggestedSubFilterIds
8️⃣ Explore especialidades SECUNDÁRIAS apenas se realmente relevantes
9️⃣ Adicione filtros de MÉTODOS DIAGNÓSTICOS apenas se mencionados
🔟 Adicione filtros de TRATAMENTO apenas se mencionados

🎯 OBJETIVO: Navegar até o nível mais profundo DISPONÍVEL para cada caminho relevante

🎯 PALAVRAS-CHAVE PARA NAVEGAÇÃO PROFUNDA:

**CARDIOLOGIA:**
- "bradicardia" → Cardiologia → Arritmias → Bradiarritmias
- "BAVT" → Cardiologia → Arritmias → Bradiarritmias → Bloqueio_AV_Total
- "marca-passo" → Cardiologia → Arritmias → Bradiarritmias → Tratamento_Bradiarritmias
- "atropina" → Cardiologia → Farmacologia → Medicamentos_Cardiacos

**GINECOLOGIA:**
- "DIU" → Ginecologia → Planejamento_Familiar → Metodos_Contraceptivos → DIU
- "sangramento" → Ginecologia → Sangramento_Uterino → Causas_Sangramento
- "contraceptivo" → Ginecologia → Planejamento_Familiar → Metodos_Contraceptivos

**PEDIATRIA:**
- "vacina" → Pediatria → Medicina_Preventiva → Imunizacoes → Calendario_Vacinal
- "desenvolvimento" → Pediatria → Crescimento_Desenvolvimento → Marcos_Desenvolvimento
- "criança + anos" → Pediatria → Faixas_Etarias → [idade específica]

📋 FORMATO JSON OBRIGATÓRIO:
{
  "categorizedQuestions": [
    {
      "tempId": "ID_DA_QUESTAO",
      "question": "texto da questao",
      "alternatives": ["A", "B", "C", "D"],
      "suggestedFilterIds": ["FILTRO_PRINCIPAL_NIVEL_0"],
      "suggestedSubFilterIds": [
        "ESPECIALIDADE_NIVEL_1",
        "SUBAREA_NIVEL_2", 
        "TOPICO_NIVEL_3",
        "SUBTOPICO_NIVEL_4",
        "ESPECIFICO_NIVEL_5"
      ],
      "medicalSpecialty": "Nome da Especialidade",
      "difficulty": "basica|intermediaria|avancada"
    }
  ]
}

🚨 IMPORTANTE:
- Use TODOS os IDs válidos listados acima
- Navegue até o nível mais específico DISPONÍVEL para cada caminho
- Inclua o caminho hierárquico COMPLETO em suggestedSubFilterIds
- Uma questão pode ter múltiplos caminhos hierárquicos quando relevante
- Foque na QUALIDADE e RELEVÂNCIA dos filtros, não na quantidade
- Explore especialidades secundárias apenas quando realmente aplicáveis

📊 EXEMPLO DE RESPOSTA INTELIGENTE:
{
  "tempId": "temp-123",
  "suggestedFilterIds": ["ClinicaMedica"],
  "suggestedSubFilterIds": [
    "ClinicaMedica_Cardiologia",
    "ClinicaMedica_Cardiologia_Arritmias",
    "ClinicaMedica_Cardiologia_Arritmias_Bradiarritmias",
    "ClinicaMedica_Cardiologia_Arritmias_Bradiarritmias_BAVT",
    "ClinicaMedica_Cardiologia_Arritmias_Bradiarritmias_Tratamento",
    "ClinicaMedica_Cardiologia_Farmacologia_Atropina",
    "ClinicaMedica_Cardiologia_Dispositivos_Marcapasso",
    "ClinicaMedica_Emergencia_Urgencias_Cardiacas",
    "ClinicaMedica_Diagnostico_ECG_Interpretacao"
  ]
}

🎯 OBJETIVO: Explorar TODA a profundidade da árvore hierárquica para máxima especificidade!
`;
  }

  private buildModerationPrompt(content: string, context?: string): string {
    return `
🩺 PULSE AI - Moderador Médico

Analise o seguinte conteúdo médico:
"${content}"

${context ? `CONTEXTO: ${context}` : ''}

Verifique:
1. Ética médica e profissional
2. Informações potencialmente perigosas ou incorretas
3. Linguagem apropriada para ambiente médico
4. Compliance com diretrizes médicas
5. Possível desinformação médica

Responda em JSON:
{
  "isAppropriate": true/false,
  "severity": "baixa|média|alta",
  "issues": ["problema específico 1", "problema específico 2"],
  "recommendation": "ação recomendada detalhada",
  "suggestedEdit": "versão corrigida se necessário",
  "medicalAccuracy": "alta|média|baixa",
  "ethicalConcerns": ["preocupação ética 1"],
  "riskLevel": "baixo|médio|alto"
}
`;
  }

  private getRoleContext(userRole: string): string {
    const contexts = {
      'student': 'CONTEXTO: Usuário é estudante de medicina. Use linguagem educativa e didática.',
      'resident': 'CONTEXTO: Usuário é médico residente. Use linguagem técnica intermediária.',
      'physician': 'CONTEXTO: Usuário é médico formado. Use linguagem técnica avançada.',
      'nurse': 'CONTEXTO: Usuário é profissional de enfermagem. Foque em cuidados de enfermagem.',
      'admin': 'CONTEXTO: Usuário é administrador. Forneça análise completa e detalhada.'
    };
    
    return contexts[userRole as keyof typeof contexts] || contexts['student'];
  }

  private parseMedicalResponse(text: string): PulseDiagnosis['diagnosis'] {
    try {
      const cleanText = text
        .replace(/```json\n?|```/g, '')
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .replace(/\\n|\\r|\\t/g, ' ')
        .replace(/[\n\r\t]/g, ' ')
        .replace(/\u[0-9a-fA-F]{4}/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      const parsed = JSON.parse(cleanText);
      
      return {
        differentials: parsed.differentials || [],
        recommendedTests: parsed.recommendedTests || [],
        urgencyLevel: parsed.urgencyLevel || 'média',
        specialty: parsed.specialty || 'Medicina Geral',
        redFlags: parsed.redFlags || [],
        disclaimer: parsed.disclaimer || '⚠️ Esta análise é para fins educacionais.',
        clinicalPearls: parsed.clinicalPearls || [],
        educationalNote: parsed.educationalNote || ''
      };
    } catch (error) {
      console.warn('PULSE AI - Erro ao processar resposta:', error);
      return {
        differentials: [],
        recommendedTests: [],
        urgencyLevel: 'média',
        specialty: 'Medicina Geral',
        redFlags: [],
        disclaimer: '⚠️ Esta análise é para fins educacionais.',
        clinicalPearls: [],
        educationalNote: ''
      };
    }
  }

  private parseEducationResponse(text: string): PulseEducation['education'] {
    try {
      const cleanText = text
        .replace(/```json\n?|```/g, '')
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .replace(/\\n|\\r|\\t/g, ' ')
        .replace(/[\n\r\t]/g, ' ')
        .replace(/\u[0-9a-fA-F]{4}/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      const parsed = JSON.parse(cleanText);
      
      return {
        summary: parsed.summary || '',
        keyPoints: parsed.keyPoints || [],
        guidelines: parsed.clinicalGuidelines || [],
        references: parsed.references || [],
        complexity: parsed.complexity || 'intermediário',
        clinicalPearls: parsed.clinicalPearls || [],
        redFlags: parsed.redFlags || [],
        educationalObjectives: parsed.educationalObjectives || []
      };
    } catch (error) {
      return {
        summary: 'Conteúdo educacional gerado pelo PULSE AI',
        keyPoints: [],
        guidelines: [],
        references: [],
        complexity: 'intermediário',
        clinicalPearls: [],
        redFlags: [],
        educationalObjectives: []
      };
    }
  }

  private extractQuestionsManually(text: string): any[] {
    // Fallback: extrair questões de forma manual quando JSON falha
    const questions: any[] = [];
    const questionPattern = /QUESTÃO\s+(\d+)/gi;
    let matches = text.match(questionPattern);
    
    if (matches && matches.length > 0) {
      console.log(`🔧 Fallback manual: encontradas ${matches.length} questões potenciais`);
      
      // Retornar estrutura básica
      for (let i = 0; i < Math.min(matches.length, 10); i++) {
        questions.push({
          questionNumber: (i + 1).toString(),
          question: `Questão ${i + 1} extraída manualmente - JSON malformado`,
          alternatives: ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"],
          correctAnswer: "",
          explanation: "Extração manual - revisar conteúdo",
          specialty: "medicina_geral",
          difficulty: "intermediária",
          topics: [],
          estimatedTime: 120,
          bloomLevel: "aplicação"
        });
      }
    }
    
    return questions;
  }

  private generateSessionId(): string {
    return `pulse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 🔧 Tenta recuperar questões de JSON truncado
   */
  private tryRecoverTruncatedJSON(truncatedText: string, originalQuestions: any[], batchNumber: number): any[] {
    console.log(`🔧 Recuperação JSON - Analisando ${truncatedText.length} chars...`);
    
    try {
      const cleanText = truncatedText
        .replace(/```json\n?|```/g, '')
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .replace(/\\n|\\r|\\t/g, ' ')
        .replace(/[\n\r\t]/g, ' ')
        .replace(/\u[0-9a-fA-F]{4}/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      
      // Tentar extrair questões completas antes do truncamento
      const questionsStartIndex = cleanText.indexOf('"categorizedQuestions"');
      if (questionsStartIndex === -1) {
        console.log(`❌ Não encontrou início das questões categorizadas`);
        return [];
      }
      
      // Procurar por questões individuais completas usando regex
      const questionPattern = /\{\s*"tempId":\s*"[^"]+",[\s\S]*?\}/g;
      const matches = cleanText.match(questionPattern);
      
      if (!matches || matches.length === 0) {
        console.log(`❌ Nenhuma questão completa encontrada no JSON truncado`);
        return [];
      }
      
      console.log(`🔍 Encontradas ${matches.length} questões potencialmente completas`);
      
      const recoveredQuestions: any[] = [];
      
      matches.forEach((questionJson, index) => {
        try {
          const question = JSON.parse(questionJson);
          const originalQuestion = originalQuestions[index];
          
          // Mapear questão recuperada preservando tempId
          const mappedQuestion = {
            tempId: question.tempId || originalQuestion?.tempId,
            question: question.question || originalQuestion?.question,
            alternatives: question.alternatives || originalQuestion?.alternatives || [],
            correctAnswer: question.correctAnswer || originalQuestion?.correctAnswer,
            explanation: question.explanation || originalQuestion?.explanation,
            suggestedFilterIds: question.suggestedFilterIds || [],
            suggestedSubFilterIds: question.suggestedSubFilterIds || [],
            suggestedNewFilters: question.suggestedNewFilters || [],
            hierarchyPath: question.hierarchyPath || [],
            recoveredFromTruncation: true // Flag para debug
          };
          
          recoveredQuestions.push(mappedQuestion);
          console.log(`✅ Questão ${index + 1} recuperada: tempId="${mappedQuestion.tempId}"`);
          
        } catch (questionParseError) {
          console.log(`❌ Erro ao parsear questão ${index + 1}: ${questionParseError.message}`);
        }
      });
      
      console.log(`🎯 Recuperação final: ${recoveredQuestions.length} questões salvas`);
      return recoveredQuestions;
      
    } catch (error) {
      console.log(`❌ Erro na recuperação JSON: ${error.message}`);
      return [];
    }
  }

  /**
   * 🔄 Retry com lotes menores em caso de truncamento
   */
  private async retryBatchWithSmallerSize(
    questions: any[], 
    filtersHierarchy: any[], 
    userRole: string, 
    batchNumber: number
  ): Promise<any[]> {
    console.log(`🔄 Retry lote ${batchNumber} - Dividindo ${questions.length} questões em lotes de 1`);
    
    const allResults: any[] = [];
    
    for (let i = 0; i < questions.length; i++) {
      const singleQuestion = [questions[i]];
      console.log(`🔄 Processando questão individual ${i + 1}/${questions.length} (tempId: ${singleQuestion[0].tempId})`);
      
      try {
        const result = await this.processMedicalCategorizationBatch(
          singleQuestion, 
          filtersHierarchy, 
          userRole, 
          `${batchNumber}.${i + 1}`
        );
        allResults.push(...result);
        
        // Delay mínimo entre questões individuais
        if (i < questions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 0.5s entre questões
        }
        
      } catch (singleError) {
        console.error(`❌ Erro na questão individual ${i + 1}:`, singleError.message);
        
        // Fallback para questão individual
        allResults.push({
          tempId: singleQuestion[0].tempId,
          question: singleQuestion[0].question || '',
          alternatives: singleQuestion[0].alternatives || [],
          correctAnswer: singleQuestion[0].correctAnswer,
          explanation: singleQuestion[0].explanation,
          suggestedFilterIds: [],
          suggestedSubFilterIds: [],
          suggestedNewFilters: [],
          fallbackUsed: true,
          fallbackReason: `Individual retry failed: ${singleError.message}`
        });
      }
    }
    
    console.log(`✅ Retry concluído: ${allResults.length}/${questions.length} questões processadas`);
    return allResults;
  }

  /**
   * 📊 Métodos de status e configuração
   */
  
  getStatus() {
    return {
      name: 'PULSE AI',
      version: '1.0.0',
      model: this.config.defaultModel || 'gemini-2.5-flash-lite-preview-06-17',
      ready: !!this.config.apiKey,
      configuration: {
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens
      }
    };
  }

  updateConfiguration(newConfig: Partial<PulseConfiguration>) {
    this.config = { ...this.config, ...newConfig };
    
    // Recriar modelo se necessário
    if (newConfig.defaultModel || newConfig.temperature || newConfig.maxTokens) {
      this.model = this.genAI.getGenerativeModel({
        model: this.config.defaultModel || 'gemini-2.5-flash-lite-preview-06-17', // Modelo configurado no .env
        generationConfig: {
          temperature: this.config.temperature || 0.3,
          topP: this.config.topP || 0.8,
          topK: this.config.topK || 40,
          maxOutputTokens: this.config.maxTokens || 65535, // MÁXIMO: 65535 tokens (limite real)
        }
      });
    }
  }

  /**
   * 📄 Converter documento para Markdown estruturado usando IA
   */
  async convertDocumentToMarkdown(
    content: string,
    documentType: 'html' | 'pdf' | 'docx',
    options: {
      extractImages?: boolean;
      extractTables?: boolean;
      maxQuestions?: number;
      includeFormula?: boolean;
    } = {},
    userId: string = '',
    userRole: string = 'admin'
  ): Promise<PulseResponse & {
    markdown?: string;
    questionsPreview?: Array<{
      numero: string;
      enunciado: string;
      alternativas: string[];
    }>;
    metadata?: {
      totalQuestions: number;
      imagesDetected: number;
      tablesDetected: number;
      contentLength: number;
    };
  }> {
    const startTime = Date.now();

    try {
      await this.logger.logRequest('document_to_markdown', userId, {
        documentType,
        contentLength: content.length,
        options
      });

      console.log('📄 Iniciando conversão de documento para Markdown...');
      console.log(`📊 Tamanho do conteúdo: ${content.length} caracteres`);

      // Dividir em chunks se o conteúdo for muito grande
      const maxChunkSize = 30000; // 30KB por chunk para não exceder o limite do Gemini
      const chunks = this.splitContentIntoChunks(content, maxChunkSize);
      
      console.log(`📦 Dividindo em ${chunks.length} chunks`);

      let fullMarkdown = '';
      let totalQuestions = 0;
      let imagesDetected = 0;
      let tablesDetected = 0;
      const questionsPreview: any[] = [];

      // Processar cada chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`🔄 Processando chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);

        const prompt = this.buildDocumentToMarkdownPrompt(chunk, documentType, options, i + 1, chunks.length);
        
        try {
          const result = await this.model.generateContent(prompt);
          const response = await result.response;
          const markdownChunk = response.text();

          // Extrair estatísticas do chunk
          const chunkStats = this.extractChunkStatistics(markdownChunk);
          totalQuestions += chunkStats.questions;
          imagesDetected += chunkStats.images;
          tablesDetected += chunkStats.tables;

          // Extrair preview de questões (apenas dos primeiros chunks)
          if (questionsPreview.length < 5) {
            const previewQuestions = this.extractQuestionsPreview(markdownChunk);
            questionsPreview.push(...previewQuestions.slice(0, 5 - questionsPreview.length));
          }

          fullMarkdown += markdownChunk + '\n\n---\n\n';

        } catch (chunkError: any) {
          console.error(`❌ Erro processando chunk ${i + 1}:`, chunkError.message);
          // Continuar com os outros chunks
        }
      }

      const responseTime = Date.now() - startTime;

      console.log('✅ Conversão concluída:', {
        markdownSize: fullMarkdown.length,
        questionsDetected: totalQuestions,
        imagesDetected,
        tablesDetected,
        responseTime
      });

      const pulseResponse = {
        success: true,
        content: 'Documento convertido para Markdown estruturado com sucesso',
        markdown: fullMarkdown,
        questionsPreview,
        metadata: {
          totalQuestions,
          imagesDetected,
          tablesDetected,
          contentLength: content.length
        },
        responseTime,
        tokensUsed: {
          input: Math.floor(content.length / 4), // Estimativa
          output: Math.floor(fullMarkdown.length / 4),
          total: Math.floor((content.length + fullMarkdown.length) / 4)
        },
        sessionId: this.generateSessionId(),
        timestamp: new Date().toISOString()
      };

      await this.logger.logResponse('document_to_markdown', userId, {
        success: true,
        responseTime,
        markdownSize: fullMarkdown.length,
        questionsDetected: totalQuestions
      });

      return pulseResponse;

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      await this.logger.logError('document_to_markdown', userId, error.message, {
        responseTime,
        documentType,
        contentLength: content.length
      });

      return {
        success: false,
        error: `PULSE AI Document Conversion: ${error.message}`,
        responseTime,
        sessionId: this.generateSessionId(),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 📦 Dividir conteúdo em chunks menores
   */
  private splitContentIntoChunks(content: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    
    // Tentar dividir por questões primeiro
    const questionSeparators = [
      /QUESTÃO\s+\d+/gi,
      /Question\s+\d+/gi,
      /<span[^>]*class[^>]*s1[^>]*>QUESTÃO/gi
    ];
    
    let bestSplit: string[] = [];
    
    // Tentar cada separador
    for (const separator of questionSeparators) {
      const split = content.split(separator);
      if (split.length > bestSplit.length) {
        bestSplit = split;
      }
    }
    
    // Se encontrou divisões por questão, usar essas
    if (bestSplit.length > 1) {
      console.log(`📚 Dividindo por questões: ${bestSplit.length} partes`);
      
      let currentChunk = '';
      for (let i = 0; i < bestSplit.length; i++) {
        const part = (i > 0 ? 'QUESTÃO ' + i + ' ' : '') + bestSplit[i];
        
        if (currentChunk.length + part.length <= maxChunkSize) {
          currentChunk += part;
        } else {
          if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
          }
          currentChunk = part;
        }
      }
      
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
    } else {
      // Divisão simples por tamanho
      console.log(`📏 Dividindo por tamanho: chunks de ${maxChunkSize} chars`);
      
      for (let i = 0; i < content.length; i += maxChunkSize) {
        chunks.push(content.slice(i, i + maxChunkSize));
      }
    }
    
    return chunks.filter(chunk => chunk.trim().length > 50); // Filtrar chunks muito pequenos
  }

  /**
   * 🏗️ Construir prompt para conversão de documento para Markdown
   */
  private buildDocumentToMarkdownPrompt(
    content: string,
    documentType: string,
    options: any,
    chunkNumber: number,
    totalChunks: number
  ): string {
    return `
Você é um especialista em conversão de documentos médicos para Markdown estruturado.

**TAREFA:** Converter este ${documentType.toUpperCase()} de questões médicas para Markdown bem estruturado.

**CHUNK:** ${chunkNumber}/${totalChunks}

**FORMATO DE SAÍDA OBRIGATÓRIO:**

Para cada questão encontrada, use EXATAMENTE este formato:

\`\`\`markdown
## QUESTÃO [NÚMERO]

### Enunciado
[Texto do enunciado completo, incluindo dados clínicos, exames, etc.]

### Imagem (se houver)
![Descrição da imagem](data:image/[tipo];base64,[dados])

### Tabela (se houver)
| Parâmetro | Valor | Referência |
|-----------|-------|------------|
| [dados da tabela] | | |

### Alternativas
A) [Alternativa A]
B) [Alternativa B]  
C) [Alternativa C]
D) [Alternativa D]
E) [Alternativa E]

---
\`\`\`

**INSTRUÇÕES ESPECÍFICAS:**

${options.extractImages ? '🖼️ **IMAGENS:** Extrair todas as imagens (ECGs, radiografias, exames) preservando os dados base64' : '❌ **IMAGENS:** Ignorar imagens'}

${options.extractTables ? '📊 **TABELAS:** Converter todas as tabelas para formato Markdown' : '❌ **TABELAS:** Ignorar tabelas'}

${options.includeFormula ? '🧮 **FÓRMULAS:** Preservar fórmulas matemáticas em LaTeX' : '❌ **FÓRMULAS:** Converter para texto simples'}

**REGRAS IMPORTANTES:**
1. Manter numeração original das questões
2. Preservar TODO o texto do enunciado 
3. Separar claramente enunciado de alternativas
4. NÃO misturar texto do enunciado com alternativas
5. Manter formatação de dados clínicos e exames
6. Extrair imagens de dentro de elementos SVG se presentes
7. Converter tabelas HTML para Markdown table format

**CONTEÚDO A CONVERTER:**

${content}

**ATENÇÃO:** Responda APENAS com o Markdown estruturado, sem explicações adicionais.
`;
  }

  /**
   * 📊 Extrair estatísticas do chunk de Markdown
   */
  private extractChunkStatistics(markdownChunk: string): { questions: number; images: number; tables: number } {
    const questions = (markdownChunk.match(/## QUESTÃO \d+/g) || []).length;
    const images = (markdownChunk.match(/!\[.*?\]\(/g) || []).length;
    const tables = (markdownChunk.match(/\|.*?\|/g) || []).length / 3; // Aproximação
    
    return { questions: Math.floor(questions), images, tables: Math.floor(tables) };
  }

  /**
   * 👀 Extrair preview de questões do Markdown
   */
  private extractQuestionsPreview(markdownChunk: string): Array<{ numero: string; enunciado: string; alternativas: string[] }> {
    const preview: any[] = [];
    
    // Regex para capturar questões
    const questionRegex = /## QUESTÃO (\d+)\s*### Enunciado\s*(.*?)\s*### Alternativas\s*(.*?)(?=##|$)/gs;
    
    let match;
    while ((match = questionRegex.exec(markdownChunk)) !== null && preview.length < 3) {
      const numero = match[1];
      const enunciado = match[2].trim().substring(0, 200) + '...';
      const alternativasText = match[3];
      
      // Extrair alternativas
      const alternativas = alternativasText.match(/[A-E]\)\s*.*$/gm) || [];
      
      preview.push({
        numero,
        enunciado,
        alternativas: alternativas.slice(0, 5)
      });
    }
    
    return preview;
  }

  /**
   * 🔥 EXTRAÇÃO REVOLUCIONÁRIA DE QUESTÕES
   * Usa Files API + Gemini Pro para máxima precisão
   */
  async extractQuestionsFromFile(fileBuffer: Buffer, fileName: string): Promise<any[]> {
    try {
      console.log(`🎯 INICIANDO EXTRAÇÃO DE QUESTÕES: ${fileName}`);
      
      // 📤 STEP 1: Upload do arquivo para Gemini Files API
      const uploadedFile = await this.processDocumentWithGeminiNative(fileBuffer, fileName);
      
      // 🧠 STEP 2: Prompt otimizado para extração de questões
      const extractionPrompt = `
🎯 MISSÃO: Extrair questões de exame médico de forma PERFEITA

📄 DOCUMENTO: Analise completamente este arquivo e extraia TODAS as questões encontradas.

🎯 FORMATO DE SAÍDA: Para cada questão encontrada, retorne um objeto JSON com:

{
  "numero": "número da questão (ex: '1', '2', etc.)",
  "enunciado": "texto completo do enunciado da questão",
  "alternativas": [
    "A) texto da alternativa A",
    "B) texto da alternativa B", 
    "C) texto da alternativa C",
    "D) texto da alternativa D"
  ],
  "temImagem": false,
  "temTabela": false,
  "categoria": "área médica detectada",
  "dificuldade": "básica|intermediária|avançada"
}

📋 INSTRUÇÕES CRÍTICAS:
1. 🔍 Procure por padrões como "QUESTÃO X", "X)", "X.", números seguidos de texto
2. 📝 Capture o enunciado COMPLETO de cada questão
3. 🅰️ Identifique alternativas nos formatos: "A)", "A.", "A texto", "A) texto"
4. 🖼️ Detecte se há menção a imagens, figuras, tabelas, gráficos
5. 🎯 Classifique por área médica (cardiologia, neurologia, etc.)
6. ⚡ Se não conseguir identificar alternativas claramente, marque como []

🚀 IMPORTANTE: Retorne uma lista JSON válida com TODAS as questões encontradas.

🔥 EXEMPLO DE SAÍDA:
[
  {
    "numero": "1",
    "enunciado": "Paciente de 65 anos apresenta dor torácica...",
    "alternativas": [
      "A) Infarto agudo do miocárdio",
      "B) Angina estável", 
      "C) Pericardite",
      "D) Embolia pulmonar"
    ],
    "temImagem": false,
    "temTabela": false,
    "categoria": "cardiologia",
    "dificuldade": "intermediária"
  }
]

COMECE A ANÁLISE AGORA:
`;

      // 🎯 STEP 3: Enviar prompt com arquivo anexado
      console.log('🧠 Enviando para análise do Gemini Pro...');
      
      const result = await this.model.generateContent([
        {
          fileData: {
            mimeType: uploadedFile.mimeType,
            fileUri: uploadedFile.uri
          }
        },
        { text: extractionPrompt }
      ]);

      const response = await result.response;
      let extractedText = response.text();
      
      console.log('📋 Resposta bruta do Gemini:', extractedText.substring(0, 500) + '...');
      
      // 🔧 STEP 4: Parsing inteligente da resposta
      const questions = this.parseGeminiResponse(extractedText);
      
      // 🎯 STEP 5: Limpeza do arquivo temporário
      try {
        await this.genAI.fileManager.deleteFile(uploadedFile.name);
        console.log('🗑️ Arquivo temporário removido');
      } catch (deleteError) {
        console.warn('⚠️ Erro ao remover arquivo temporário:', deleteError);
      }
      
      console.log(`✅ EXTRAÇÃO CONCLUÍDA: ${questions.length} questões encontradas`);
      return questions;
      
    } catch (error) {
      console.error('❌ ERRO NA EXTRAÇÃO:', error);
      throw new Error(`Falha na extração de questões: ${error.message}`);
    }
  }

  /**
   * 🔧 PARSING INTELIGENTE DA RESPOSTA DO GEMINI
   */
  private parseGeminiResponse(text: string): any[] {
    try {
      console.log('🔧 Fazendo parsing da resposta...');
      
      // 🎯 STEP 1: Tentar extrair JSON diretamente
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log(`✅ JSON válido encontrado: ${parsed.length} questões`);
            return parsed;
          }
        } catch (jsonError) {
          console.warn('⚠️ JSON malformado, tentando parsing alternativo...');
        }
      }
      
      // 🎯 STEP 2: Parsing manual se JSON falhar
      const questions = [];
      const lines = text.split('\n');
      let currentQuestion = null;
      let alternatives = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Detectar início de questão
        const questionMatch = line.match(/^(\d+)[.)]\s*(.+)|questão\s*(\d+)/i);
        if (questionMatch) {
          // Salvar questão anterior se existir
          if (currentQuestion) {
            questions.push({
              numero: currentQuestion.numero,
              enunciado: currentQuestion.enunciado,
              alternativas: alternatives,
              temImagem: false,
              temTabela: false,
              categoria: 'medicina',
              dificuldade: 'intermediária'
            });
          }
          
          // Iniciar nova questão
          const numero = questionMatch[1] || questionMatch[3];
          const enunciado = questionMatch[2] || '';
          currentQuestion = { numero, enunciado };
          alternatives = [];
        }
        
        // Detectar alternativas
        const altMatch = line.match(/^([A-D])[.)]\s*(.+)/i);
        if (altMatch && currentQuestion) {
          alternatives.push(`${altMatch[1].toUpperCase()}) ${altMatch[2]}`);
        }
        
        // Adicionar ao enunciado se não for alternativa
        if (currentQuestion && !altMatch && !questionMatch && line.length > 0) {
          currentQuestion.enunciado += ' ' + line;
        }
      }
      
      // Adicionar última questão
      if (currentQuestion) {
        questions.push({
          numero: currentQuestion.numero,
          enunciado: currentQuestion.enunciado,
          alternativas: alternatives,
          temImagem: false,
          temTabela: false,
          categoria: 'medicina',
          dificuldade: 'intermediária'
        });
      }
      
      console.log(`✅ Parsing manual concluído: ${questions.length} questões`);
      return questions;
      
    } catch (error) {
      console.error('❌ Erro no parsing:', error);
      return []; // Retornar array vazio em caso de erro
    }
  }
}