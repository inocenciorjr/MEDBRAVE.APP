import { CommentRewriteService, QuestionForRewrite, RewriteResult } from './commentRewriteService';

export interface RewriteProgressCallback {
  (progress: {
    currentBatch: number;
    totalBatches: number;
    processedQuestions: number;
    totalQuestions: number;
    percentage: number;
  }): void;
}

export interface RewriteBatchOptions {
  batchSize?: number;
  includeExplanations?: boolean;
  jobId?: string;
  examMetadata?: {
    source?: string;
    year?: number;
    provaCodigo?: string;
    examName?: string;
  };
}

export class CommentRewriteBatchProcessor {
  constructor(
    private rewriteService: CommentRewriteService
  ) {}

  /**
   * Processa questões em batches
   */
  async processBatches(
    questions: QuestionForRewrite[],
    options: RewriteBatchOptions = {},
    onProgress?: RewriteProgressCallback
  ): Promise<RewriteResult[]> {
    const batchSize = options.batchSize || 5;
    const totalQuestions = questions.length;
    const totalBatches = Math.ceil(totalQuestions / batchSize);

    console.log(`[CommentRewriteBatchProcessor] Processing ${totalQuestions} questions in ${totalBatches} batches of ${batchSize}`);
    
    // Emit event if jobId is provided
    if (options.jobId) {
      const { jobProgressEmitter } = await import('./jobProgressEmitter');
      jobProgressEmitter.emitRewrite(
        options.jobId,
        'starting',
        `Iniciando reescrita de ${totalQuestions} comentários em ${totalBatches} lotes`,
        0,
        totalQuestions
      );
    }

    const allResults: RewriteResult[] = [];

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, totalQuestions);
      const batch = questions.slice(start, end);

      console.log(`[CommentRewriteBatchProcessor] Processing batch ${i + 1}/${totalBatches} (questions ${start + 1}-${end})`);
      
      // Emit progress event
      if (options.jobId) {
        const { jobProgressEmitter } = await import('./jobProgressEmitter');
        jobProgressEmitter.emitRewrite(
          options.jobId,
          'rewriting',
          `Reescrevendo lote ${i + 1}/${totalBatches} (questões ${start + 1}-${end})`,
          start,
          totalQuestions
        );
      }

      try {
        const batchResult = await this.rewriteService.processBatch(batch, {
          includeExplanations: options.includeExplanations,
          jobId: options.jobId,
          examMetadata: options.examMetadata,
        });

        allResults.push(...batchResult.results);

        // Callback de progresso
        if (onProgress) {
          onProgress({
            currentBatch: i + 1,
            totalBatches,
            processedQuestions: end,
            totalQuestions,
            percentage: Math.round((end / totalQuestions) * 100),
          });
        }

        console.log(`[CommentRewriteBatchProcessor] Batch ${i + 1}/${totalBatches} completed`);

      } catch (error) {
        console.error(`[CommentRewriteBatchProcessor] Error in batch ${i + 1}:`, error);
        
        // Adicionar erros para questões do batch
        batch.forEach(q => {
          allResults.push({
            questionId: q.id || q.tempId || '',
            hasComment: !!q.professorComment,
            error: (error as Error).message,
          });
        });
      }
    }

    console.log(`[CommentRewriteBatchProcessor] All batches completed - ${allResults.length} results`);

    return allResults;
  }
}

/**
 * Factory function
 */
export function createCommentRewriteBatchProcessor(
  rewriteService: CommentRewriteService
): CommentRewriteBatchProcessor {
  return new CommentRewriteBatchProcessor(rewriteService);
}
