import { CategorizationService, Question, CategorizationResult, CategorizationOptions } from './categorizationService';

export interface BatchConfig {
  batchSize: number;
  delayBetweenBatches: number;
  maxConcurrentBatches: number;
  enableProgressUpdates: boolean;
}

export interface CategorizationProgress {
  totalQuestions: number;
  processedQuestions: number;
  successCount: number;
  failureCount: number;
  ambiguousCount: number;
  currentBatch: number;
  totalBatches: number;
  estimatedTimeRemaining: number;
  currentQuestion?: {
    numero: string;
    status: 'processing' | 'success' | 'failed' | 'ambiguous';
  };
  percentage: number;
}

export class BatchProcessor {
  private categorizationService: CategorizationService;
  private config: BatchConfig;
  private startTime: number = 0;

  constructor(
    categorizationService: CategorizationService,
    config: BatchConfig
  ) {
    this.categorizationService = categorizationService;
    this.config = config;
  }

  async processBatches(
    questions: Question[],
    options: CategorizationOptions,
    onProgress: (progress: CategorizationProgress) => void
  ): Promise<CategorizationResult[]> {
    this.startTime = Date.now();
    const allResults: CategorizationResult[] = [];

    // Create batches - use options.batchSize if provided, otherwise use config
    const batchSize = options.batchSize || this.config.batchSize;
    const batches = this.createBatches(questions, batchSize);
    const totalBatches = batches.length;

    console.log(`Processing ${questions.length} questions in ${totalBatches} batches`);

    // Process batches with concurrency control
    const maxConcurrent = this.config.maxConcurrentBatches;
    for (let i = 0; i < batches.length; i += maxConcurrent) {
      const concurrentBatches = batches.slice(i, i + maxConcurrent);
      
      // Process concurrent batches
      const batchPromises = concurrentBatches.map((batch, idx) =>
        this.processSingleBatch(batch, i + idx, options)
      );

      const batchResults = await Promise.all(batchPromises);
      
      // Flatten results
      for (const results of batchResults) {
        allResults.push(...results);
      }

      // Calculate and send progress
      if (this.config.enableProgressUpdates) {
        const progress = this.calculateProgress(i + concurrentBatches.length, totalBatches, allResults, questions.length);
        onProgress(progress);
      }

      // Delay between batch groups (except for last group)
      if (i + maxConcurrent < batches.length && this.config.delayBetweenBatches > 0) {
        await this.delay(this.config.delayBetweenBatches);
      }
    }

    // Send final progress
    if (this.config.enableProgressUpdates) {
      const finalProgress = this.calculateProgress(totalBatches, totalBatches, allResults, questions.length);
      onProgress(finalProgress);
    }

    return allResults;
  }

  private createBatches(questions: Question[], batchSize: number): Question[][] {
    const batches: Question[][] = [];
    
    for (let i = 0; i < questions.length; i += batchSize) {
      batches.push(questions.slice(i, i + batchSize));
    }

    return batches;
  }

  private async processSingleBatch(
    batch: Question[],
    batchIndex: number,
    options: CategorizationOptions
  ): Promise<CategorizationResult[]> {
    const batchStartTime = Date.now();
    
    try {
      console.log(`Processing batch ${batchIndex + 1} (${batch.length} questions)`);
      
      const results = await this.categorizationService.categorizeBatch(batch, options);
      
      const batchDuration = Date.now() - batchStartTime;
      console.log(`Batch ${batchIndex + 1} completed in ${(batchDuration / 1000).toFixed(1)}s`);
      
      return results;
    } catch (error) {
      console.error(`Error processing batch ${batchIndex + 1}:`, error);
      
      // Return failed results for all questions in batch
      return batch.map(question => ({
        questionId: question.id || question.tempId || '',
        questionNumber: question.numero,
        status: 'failed' as const,
        suggestedFilters: [],
        suggestedSubfilters: [],
        hierarchyChain: [],
        aiExplanation: '',
        processingTime: Date.now() - batchStartTime,
        overallConfidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }

  private calculateProgress(
    processedBatches: number,
    totalBatches: number,
    results: CategorizationResult[],
    totalQuestions: number
  ): CategorizationProgress {
    const successCount = results.filter(r => r.status === 'success').length;
    const failureCount = results.filter(r => r.status === 'failed').length;
    const ambiguousCount = results.filter(r => r.status === 'ambiguous' || r.status === 'manual_review').length;
    
    const processedQuestions = results.length;
    const percentage = Math.round((processedQuestions / totalQuestions) * 100);

    // Estimate time remaining
    const elapsedTime = Date.now() - this.startTime;
    const avgTimePerQuestion = processedQuestions > 0 ? elapsedTime / processedQuestions : 0;
    const remainingQuestions = totalQuestions - processedQuestions;
    const estimatedTimeRemaining = Math.round(avgTimePerQuestion * remainingQuestions);

    // Get current question (last processed)
    const currentQuestion = results.length > 0 ? {
      numero: results[results.length - 1].questionNumber,
      status: results[results.length - 1].status as 'processing' | 'success' | 'failed' | 'ambiguous',
    } : undefined;

    return {
      totalQuestions,
      processedQuestions,
      successCount,
      failureCount,
      ambiguousCount,
      currentBatch: processedBatches,
      totalBatches,
      estimatedTimeRemaining,
      currentQuestion,
      percentage,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  updateConfig(config: Partial<BatchConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): BatchConfig {
    return { ...this.config };
  }
}

// Factory function
export function createBatchProcessor(
  categorizationService: CategorizationService,
  config?: Partial<BatchConfig>
): BatchProcessor {
  const defaultConfig: BatchConfig = {
    batchSize: 5,
    delayBetweenBatches: 0, // No delay - start next batch immediately
    maxConcurrentBatches: 1, // Process 1 batch at a time to avoid rate limits on free tier
    enableProgressUpdates: true,
  };

  return new BatchProcessor(categorizationService, { ...defaultConfig, ...config });
}
