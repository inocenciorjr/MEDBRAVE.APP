/**
 * Scraper Service
 * 
 * Serviço para integração com o scraper de questões médicas.
 * Fornece métodos para extração manual e automática de questões via URL.
 */

import { post, get, del } from './admin/baseService';

export interface ScraperOptions {
  timeout?: number;        // Timeout em segundos (padrão: 300)
  limit?: number;          // Limite de questões (padrão: 0 = todas)
  downloadImages?: boolean; // Download de imagens (padrão: true)
}

export interface ExtractedQuestionsResult {
  questions: any[];
  metadata: {
    source: string;
    institution?: string;
    year?: number;
    totalQuestions: number;
    extractionTime: number; // ms
  };
  stats: {
    questionsExtracted: number;
    questionsWithAnswers: number;
    imagesFound: number;
  };
}

export interface BatchJobConfig {
  saveAsOfficial: boolean;
  officialExamData?: {
    examName: string;
    examYear: number;
    examEdition?: string;
    institution?: string;
    examType: 'revalida' | 'enare' | 'residencia' | 'concurso' | 'outro';
    title: string;
    description?: string;
    instructions?: string;
    applicationDate?: string;
    timeLimitMinutes?: number;
    passingScore?: number;
    tags?: string[];
  };
}

export interface BatchJobResult {
  jobId: string;
  status: 'pending';
  totalUrls: number;
  estimatedTime: number; // segundos
}

export interface JobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    failed: number;
    percentage: number;
  };
  currentUrl?: string;
  results: Array<{
    url: string;
    status: 'success' | 'failed';
    questionsExtracted?: number;
    questionsSaved?: number;
    missingQuestions?: number[];
    error?: string;
    officialExamId?: string;
  }>;
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // ms
}

class ScraperService {
  private baseUrl = '/api/admin/scraper';

  /**
   * Extrai questões de uma URL única (modo manual)
   */
  async extractFromUrl(
    url: string,
    options?: ScraperOptions
  ): Promise<ExtractedQuestionsResult> {
    const result = await post<ExtractedQuestionsResult>(`${this.baseUrl}/extract`, { url, options });
    return result;
  }

  /**
   * Extrai questões com feedback em tempo real via SSE
   */
  async extractFromUrlWithProgress(
    url: string,
    options: ScraperOptions | undefined,
    onProgress: (progress: any) => void
  ): Promise<ExtractedQuestionsResult> {
    return new Promise((resolve, reject) => {
      // Get Supabase token from localStorage
      const keys = Object.keys(localStorage);
      const supabaseKey = keys.find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
      let token = null;
      
      if (supabaseKey) {
        const authData = localStorage.getItem(supabaseKey);
        if (authData) {
          const parsed = JSON.parse(authData);
          token = parsed.access_token;
        }
      }
      
      fetch(`/api/admin/scraper/extract-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ url, options }),
      }).then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        let buffer = '';
        let currentEvent = '';
        
        function readStream(): any {
          return reader?.read().then(({ done, value }) => {
            if (done) {
              return;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            
            // Manter a última linha incompleta no buffer
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim()) {
                currentEvent = '';
                continue;
              }
              
              if (line.startsWith('event:')) {
                currentEvent = line.substring(6).trim();
                continue;
              }

              if (line.startsWith('data:')) {
                try {
                  const data = JSON.parse(line.substring(5).trim());
                  
                  if (process.env.NODE_ENV === 'development') {
                    console.log('[SSE] Event:', currentEvent, 'Data:', data);
                  }
                  
                  // Se o evento é 'complete', resolver com os dados
                  if (currentEvent === 'complete') {
                    if (process.env.NODE_ENV === 'development') {
                      console.log('[SSE] Complete event received');
                    }
                    if (process.env.NODE_ENV === 'development') {
                      console.log('[SSE] Full data:', JSON.stringify(data, null, 2));
                    }
                    if (process.env.NODE_ENV === 'development') {
                      console.log('[SSE] data.data:', data.data);
                    }
                    if (process.env.NODE_ENV === 'development') {
                      console.log('[SSE] data.data.questions:', data.data?.questions);
                    }
                    resolve(data.data || data);
                    return;
                  }

                  // Se o evento é 'error', rejeitar
                  if (currentEvent === 'error' || data.code) {
                    reject(new Error(data.message || 'Erro desconhecido'));
                    return;
                  }

                  // É um evento de progresso
                  onProgress(data);
                } catch (e) {
                  console.error('Error parsing SSE data:', e, 'Line:', line);
                }
              }
            }

            return readStream();
          });
        }

        return readStream();
      }).catch(error => {
        reject(error);
      });
    });
  }

  /**
   * Cria job de processamento em lote
   */
  async createBatchJob(
    urls: string[],
    configs: Record<string, BatchJobConfig>,
    options?: {
      delayBetweenUrls?: number;
      maxRetries?: number;
    }
  ): Promise<BatchJobResult> {
    const result = await post<BatchJobResult>(`${this.baseUrl}/batch`, { urls, configs, options });
    return result;
  }

  /**
   * Obtém status de um job
   */
  async getJobStatus(jobId: string): Promise<JobStatus> {
    const result = await get<JobStatus>(`${this.baseUrl}/batch/${jobId}`);
    return result;
  }

  /**
   * Cancela job em execução
   */
  async cancelJob(jobId: string): Promise<void> {
    await del(`${this.baseUrl}/batch/${jobId}`);
  }

  /**
   * Lista jobs do usuário
   */
  async listJobs(filters?: {
    status?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{
    jobs: any[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    const result = await get<{
      jobs: any[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`${this.baseUrl}/jobs?${params.toString()}`);
    return result;
  }
}

export const scraperService = new ScraperService();
