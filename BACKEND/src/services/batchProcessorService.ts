/**
 * Batch Processor Service
 * Orchestrates batch processing with extraction, categorization, and draft creation
 * Uses SSE for real-time progress updates
 */
import { Response } from 'express';
import { draftService, DraftService } from './draftService';
import scraperService from './scraperService';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface BatchProcessOptions {
  delayBetweenUrls?: number;
  maxRetries?: number;
  autoCategorize?: boolean;
}

export interface UrlConfig {
  saveAsOfficial?: boolean;
  officialExamData?: any;
}

export interface BatchProcessResult {
  url: string;
  status: 'success' | 'failed';
  draftId?: string;
  questionsExtracted?: number;
  questionsCategorized?: number;
  error?: string;
  duration: number;
}

export class BatchProcessorService {
  private draftService: DraftService;

  constructor(draftServiceInstance?: DraftService) {
    this.draftService = draftServiceInstance || draftService;
  }

  /**
   * Process batch with SSE streaming
   */
  async processBatch(
    urls: string[],
    _configs: Record<string, UrlConfig>,
    res: Response,
    options: BatchProcessOptions = {}
  ): Promise<void> {
    const jobId = uuidv4();
    const results: BatchProcessResult[] = [];

    // Setup SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send batch start event
    this.sendSSE(res, {
      type: 'batch_start',
      jobId,
      total: urls.length,
      timestamp: new Date().toISOString(),
    });

    // Process each URL
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      // const config = configs[url] || {};
      const startTime = Date.now();

      try {
        // Send URL start event
        this.sendSSE(res, {
          type: 'url_start',
          url,
          index: i + 1,
          total: urls.length,
          timestamp: new Date().toISOString(),
        });

        // Step 1: Extract questions
        const extractionResult = await this.extractWithProgress(url, res);

        if (!extractionResult.success || !extractionResult.questions) {
          throw new Error(extractionResult.error || 'Extraction failed');
        }

        let questions = extractionResult.questions;

        // Send extraction complete
        this.sendSSE(res, {
          type: 'extraction_complete',
          url,
          questionsCount: questions.length,
          timestamp: new Date().toISOString(),
        });

        // Step 2: Categorize questions (if enabled)
        let categorizationResults: any[] = [];
        if (options.autoCategorize !== false) {
          const categorizationResult = await this.categorizeWithProgress(
            questions,
            res,
            url
          );

          if (categorizationResult.success) {
            categorizationResults = categorizationResult.results || [];
          }

          // Send categorization complete
          this.sendSSE(res, {
            type: 'categorization_complete',
            url,
            categorizedCount: categorizationResults.length,
            timestamp: new Date().toISOString(),
          });

          // ✅ APLICAR CATEGORIZAÇÃO ÀS QUESTÕES
          if (categorizationResults.length > 0) {
            logger.info(`[BatchProcessor] Applying categorization to ${categorizationResults.length} questions`);
            
            // DEBUG: Mostrar IDs dos resultados
            logger.info(`[BatchProcessor] Categorization result IDs:`, categorizationResults.map((r: any) => r.questionId));
            logger.info(`[BatchProcessor] Question IDs:`, questions.map((q: any) => ({ numero: q.numero, tempId: q.tempId, id: q.id })));
            
            // Criar mapa de resultados por questionId/tempId
            const resultsMap = new Map();
            categorizationResults.forEach((result: any) => {
              if (result.questionId) {
                resultsMap.set(result.questionId, result);
                logger.info(`[BatchProcessor] Added to map: ${result.questionId} -> ${result.suggestedFilters?.length || 0} filters`);
              }
            });
            
            const updatedQuestions = questions.map((q: any) => {
              // Buscar resultado por tempId ou id
              const result = resultsMap.get(q.tempId) || resultsMap.get(q.id);
              
              logger.info(`[BatchProcessor] Question ${q.numero}: tempId=${q.tempId}, id=${q.id}, found result=${!!result}`);
              
              if (result) {
                const filterIds = result.suggestedFilters?.map((f: any) => f.filterId) || [];
                const subFilterIds = result.suggestedSubfilters?.map((sf: any) => sf.subfilterId) || [];
                
                logger.info(`[BatchProcessor] Applying to question ${q.numero}: ${filterIds.length} filters, ${subFilterIds.length} subfilters`);
                
                return {
                  ...q,
                  filterIds,
                  subFilterIds,
                };
              } else {
                logger.warn(`[BatchProcessor] No categorization result for question ${q.numero} (tempId=${q.tempId}, id=${q.id})`);
              }
              
              return q;
            });
            questions = updatedQuestions;
            
            const categorizedCount = questions.filter((q: any) => q.filterIds && q.filterIds.length > 0).length;
            logger.info(`[BatchProcessor] Categorization applied: ${categorizedCount}/${questions.length} questions have filters`);
          }
        }

        // Step 3: Create draft
        const draft = await this.draftService.create({
          jobId,
          url,
          title: extractionResult.metadata?.title || `Prova - ${url}`,
          questions, // ✅ Agora com filterIds e subFilterIds aplicados
          categorizationResults,
          metadata: {
            url,
            totalQuestions: questions.length,
            categorizedQuestions: categorizationResults.filter((r: any) => r.status === 'success').length,
            extractionDuration: extractionResult.duration,
            categorizationDuration: 0, // TODO: track this
            status: 'completed',
          },
        });

        // Send draft created event
        this.sendSSE(res, {
          type: 'draft_created',
          draftId: draft.id,
          url,
          link: `/admin/questions/bulk?draftId=${draft.id}`,
          questionsCount: questions.length,
          timestamp: new Date().toISOString(),
        });

        // Record success
        results.push({
          url,
          status: 'success',
          draftId: draft.id,
          questionsExtracted: questions.length,
          questionsCategorized: categorizationResults.length,
          duration: Date.now() - startTime,
        });

        // Send URL complete
        this.sendSSE(res, {
          type: 'url_complete',
          url,
          draftId: draft.id,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        });

      } catch (error) {
        logger.error(`[BatchProcessor] Error processing ${url}:`, error);

        // Send error event
        this.sendSSE(res, {
          type: 'url_error',
          url,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });

        // Record failure
        results.push({
          url,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - startTime,
        });
      }

      // Delay between URLs
      if (i < urls.length - 1 && options.delayBetweenUrls) {
        await new Promise(resolve => setTimeout(resolve, options.delayBetweenUrls));
      }
    }

    // Send batch complete
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    this.sendSSE(res, {
      type: 'batch_complete',
      jobId,
      summary: {
        total: urls.length,
        success: successCount,
        failed: failedCount,
        results,
      },
      timestamp: new Date().toISOString(),
    });

    // Close SSE connection
    res.end();
  }

  /**
   * Extract questions with progress updates
   * Reuses the same logic as /extract-stream endpoint
   */
  private async extractWithProgress(
    url: string,
    res: Response
  ): Promise<any> {
    try {
      const startTime = Date.now();

      // Send extraction start event
      this.sendSSE(res, {
        type: 'extraction_start',
        url,
        message: 'Iniciando extração...',
        timestamp: new Date().toISOString(),
      });

      // Use the same extraction method as the manual endpoint
      // This sends SSE progress events automatically
      const result = await scraperService.extractFromUrlWithProgress(
        url,
        {
          timeout: 300,
          downloadImages: true,
        },
        (progress) => {
          // Forward detailed progress events via SSE (like manual scraper)
          this.sendSSE(res, {
            type: 'extraction_progress',
            url,
            currentQuestion: progress.currentQuestion || 0,
            totalQuestions: progress.totalQuestions || 0,
            status: progress.status,
            message: progress.message,
            questionsExtracted: progress.currentQuestion || 0,
            questionsWithImages: progress.questionsWithImages || 0,
            questionsWithErrors: progress.questionsWithErrors || 0,
            timestamp: new Date().toISOString(),
          });
        }
      );

      // Convert to bulk format - EXACTLY like manual does
      const questions = result.questions;
      logger.info(`📊 Total de questões extraídas: ${questions.length}`);
      
      const formattedQuestions = questions.map((q: any, index: number) => ({
        numero: q.numero || `Q${index + 1}`,
        enunciado: q.enunciado || '',
        alternativas: q.alternativas || [],
        correta: q.correta,
        dificuldade: q.dificuldade || 'Média',
        tags: [...(q.tags || []), 'scraper'],
        filterIds: q.filterIds || [],
        subFilterIds: q.subFilterIds || [],
        explicacao: q.explicacao || '',
        imagem: q.imagem || undefined,
        tempId: `temp-scraper-${Date.now()}-${index}`,
        aiGenerated: false,
        isAnnulled: false,
        isOutdated: false,
        status: 'Publicada',
      }));

      return {
        success: true,
        questions: formattedQuestions,
        metadata: result.metadata,
        duration: Date.now() - startTime,
      };

    } catch (error) {
      logger.error('[BatchProcessor] Extraction error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Extraction failed',
      };
    }
  }

  /**
   * Categorize questions with progress updates
   */
  private async categorizeWithProgress(
    questions: any[],
    res: Response,
    url: string
  ): Promise<any> {
    try {
      // Send categorization start event
      this.sendSSE(res, {
        type: 'categorization_start',
        url,
        totalQuestions: questions.length,
        message: 'Iniciando categorização...',
        timestamp: new Date().toISOString(),
      });

      // Import categorization services
      const { createCategorizationService } = await import('./categorizationService');
      const { createFilterHierarchyManager } = await import('./filterHierarchyManager');
      const { createOpenRouterClient } = await import('./openRouterClient');
      const { createGeminiClient } = await import('./geminiClient');

      const supabaseUrl = process.env.SUPABASE_URL || '';
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      const useGemini = process.env.USE_GEMINI === 'true';

      // Choose AI provider
      let aiClient: any;
      if (useGemini) {
        const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
        aiClient = createGeminiClient(geminiApiKey);
      } else {
        const openRouterApiKey = process.env.OPENROUTER_API_KEY || '';
        aiClient = createOpenRouterClient(openRouterApiKey);
      }

      const filterHierarchyManager = createFilterHierarchyManager(supabaseUrl, supabaseKey);
      const categorizationService = createCategorizationService(
        supabaseUrl,
        supabaseKey,
        aiClient,
        filterHierarchyManager
      );

      // Format questions for categorization - same format as manual (page.tsx linha 1410)
      const formattedQuestions = questions.map((q: any) => ({
        id: q.tempId || q.id || '',
        tempId: q.tempId,
        numero: q.numero,
        enunciado: q.enunciado,
        alternativas: q.alternativas,
        correta: q.correta,
        imagem: q.imagem,
      }));

      // Categorize using backend service with progress updates
      
      const results = await categorizationService.categorizeBatch(formattedQuestions, {
        batchSize: 5,
        includeExplanations: true,
        confidenceThreshold: 60,
        onProgress: (progress: number, current: number, total: number) => {
          // Send detailed progress like manual categorization
          this.sendSSE(res, {
            type: 'categorization_progress',
            url,
            currentQuestion: current,
            totalQuestions: total,
            percentage: progress,
            message: `Categorizando questão ${current}/${total}...`,
            timestamp: new Date().toISOString(),
          });
        },
      });

      // Send progress complete
      this.sendSSE(res, {
        type: 'categorization_progress',
        url,
        currentQuestion: questions.length,
        totalQuestions: questions.length,
        percentage: 100,
        message: 'Categorização concluída!',
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        results,
      };

    } catch (error) {
      logger.error('[BatchProcessor] Categorization error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Categorization failed',
      };
    }
  }

  /**
   * Send SSE event
   */
  private sendSSE(res: Response, data: any): void {
    try {
      console.log('[BatchProcessor SSE] Sending:', data.type);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      (res as any).flush?.();
    } catch (error) {
      logger.error('[BatchProcessor] Error sending SSE:', error);
    }
  }
}

// Export singleton instance
export const batchProcessorService = new BatchProcessorService();
