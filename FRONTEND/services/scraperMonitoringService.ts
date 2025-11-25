/**
 * Scraper Monitoring Service
 * 
 * Serviço para monitoramento e estatísticas do scraper.
 */

import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

export interface ScraperStats {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
  avgDuration: number;
  totalQuestionsExtracted: number;
  totalQuestionsSaved: number;
}

export interface ScraperLog {
  id: string;
  jobId?: string;
  url: string;
  status: 'success' | 'failed';
  questionsExtracted?: number;
  questionsSaved?: number;
  missingQuestions?: number[];
  duration?: number;
  errorMessage?: string;
  stackTrace?: string;
  htmlSnapshot?: string;
  createdAt: Date;
}

export interface LogFilters {
  jobId?: string;
  status?: 'success' | 'failed';
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

class ScraperMonitoringService {
  private baseUrl = '/api/admin/scraper';

  /**
   * Obter estatísticas do scraper
   */
  async getStats(filters?: {
    jobId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ScraperStats> {
    const params = new URLSearchParams();
    if (filters?.jobId) params.append('jobId', filters.jobId);
    if (filters?.startDate) params.append('startDate', filters.startDate.toISOString());
    if (filters?.endDate) params.append('endDate', filters.endDate.toISOString());

    const response = await fetchWithAuth(`${this.baseUrl}/stats?${params.toString()}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Obter logs do scraper
   */
  async getLogs(filters?: LogFilters): Promise<{
    logs: ScraperLog[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const params = new URLSearchParams();
    if (filters?.jobId) params.append('jobId', filters.jobId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate.toISOString());
    if (filters?.endDate) params.append('endDate', filters.endDate.toISOString());
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    const response = await fetchWithAuth(`${this.baseUrl}/logs?${params.toString()}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return {
      logs: result.data.logs.map((log: any) => ({
        ...log,
        createdAt: new Date(log.createdAt),
      })),
      pagination: result.data.pagination,
    };
  }

  /**
   * Exportar logs para CSV
   */
  async exportLogsToCSV(filters?: LogFilters): Promise<void> {
    const { logs } = await this.getLogs({ ...filters, limit: 1000 });
    
    let csv = 'Data,URL,Status,Questões Extraídas,Questões Salvas,Duração (ms),Erro\n';
    
    logs.forEach(log => {
      const row = [
        log.createdAt.toISOString(),
        `"${log.url}"`,
        log.status,
        log.questionsExtracted || 0,
        log.questionsSaved || 0,
        log.duration || 0,
        `"${(log.errorMessage || '').replace(/"/g, '""')}"`,
      ].join(',');
      csv += row + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scraper-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const scraperMonitoringService = new ScraperMonitoringService();
