import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

export interface CategorizationOptions {
  batchSize?: number;
  includeExplanations?: boolean;
  confidenceThreshold?: number;
  forceRecategorization?: boolean;
}

export interface CategorizationResult {
  questionId: string;
  questionNumber: string;
  status: 'success' | 'failed' | 'ambiguous' | 'manual_review';
  suggestedFilters: Array<{
    filterId: string;
    filterName: string;
    confidence: number;
    reasoning: string;
  }>;
  suggestedSubfilters: Array<{
    subfilterId: string;
    subfilterName: string;
    parentPath: string[];
    confidence: number;
    reasoning: string;
  }>;
  hierarchyChain: Array<{
    id: string;
    name: string;
    level: number;
  }>;
  aiExplanation: string;
  processingTime: number;
  imageAnalysis?: {
    detected: boolean;
    imageType: string;
    relevance: number;
  };
  overallConfidence: number;
  depthMetrics?: {
    maxDepth: number;
    avgDepth: number;
    minDepth: number;
  };
  error?: string;
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

export class CategorizationService {
  private static instance: CategorizationService;
  private baseUrl = (() => {
    const isDev = process.env.NODE_ENV === 'development';
    const backendUrl = isDev 
      ? 'http://localhost:5000' 
      : (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://medbraveapp-production.up.railway.app');
    return `${backendUrl}/api/categorization`;
  })();

  public static getInstance(): CategorizationService {
    if (!CategorizationService.instance) {
      CategorizationService.instance = new CategorizationService();
    }
    return CategorizationService.instance;
  }

  /**
   * Start a categorization job with draft questions
   */
  async startCategorization(
    questions: any[],
    options: CategorizationOptions = {}
  ): Promise<{
    success: boolean;
    jobId: string;
    totalQuestions: number;
    estimatedTime: number;
    status: string;
  }> {
    try {
      const response = await fetchWithAuth(`${this.baseUrl}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions,
          options,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return result;
    } catch (error: any) {
      console.error('❌ Error starting categorization:', error);
      throw new Error(`Error starting categorization: ${error.message}`);
    }
  }

  /**
   * Stream progress updates via WebSocket (usar useJobProgress hook)
   * @deprecated Use o hook useJobProgress para progresso em tempo real
   */
  streamProgress(
    jobId: string,
    onProgress: (progress: CategorizationProgress) => void,
    onComplete: (results: CategorizationResult[]) => void,
    onError: (error: string) => void
  ): () => void {
    console.warn('streamProgress está deprecated. Use o hook useJobProgress para WebSocket.');
    return () => {};
  }

  /**
   * Apply categorization to a question
   */
  async applyCategorization(
    questionId: string,
    categorization: CategorizationResult
  ): Promise<void> {
    try {
      const response = await fetchWithAuth(`${this.baseUrl}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId,
          categorization,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      console.error('❌ Error applying categorization:', error);
      throw new Error(`Error applying categorization: ${error.message}`);
    }
  }

  /**
   * Log feedback for manual correction
   */
  async logFeedback(
    questionId: string,
    originalCategorization: CategorizationResult,
    correctedCategorization: CategorizationResult,
    reason?: string
  ): Promise<void> {
    try {
      const response = await fetchWithAuth(`${this.baseUrl}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId,
          originalCategorization,
          correctedCategorization,
          reason,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      console.error('❌ Error logging feedback:', error);
      throw new Error(`Error logging feedback: ${error.message}`);
    }
  }

  /**
   * Get categorization metrics
   */
  async getMetrics(): Promise<any> {
    try {
      const response = await fetchWithAuth(`${this.baseUrl}/metrics`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return result.metrics;
    } catch (error: any) {
      console.error('❌ Error getting metrics:', error);
      throw new Error(`Error getting metrics: ${error.message}`);
    }
  }
}

// Export singleton instance
export const categorizationService = CategorizationService.getInstance();
