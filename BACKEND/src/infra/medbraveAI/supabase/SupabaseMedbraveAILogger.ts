/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import {
  PulseAuditLog,
  PulseActionType,
} from '../../../domain/medbraveAI/types/MedbraveAITypes';
import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../../../config/supabaseAdmin';

const PULSE_LOGS_TABLE = 'pulse_ai_logs';

export class SupabaseMedbraveAILogger {
  private logs: PulseAuditLog[] = [];
  private maxLogs: number = 10000; // Máximo de logs em memória
  private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';
  private supabaseClient: SupabaseClient;

  constructor(logLevel?: 'debug' | 'info' | 'warn' | 'error') {
    if (logLevel) {
      this.logLevel = logLevel;
    }
    this.supabaseClient = supabase;
  }

  /**
   * 📝 Log de requisição
   */
  async logRequest(
    action: PulseActionType,
    userId: string,
    input: any,
    metadata?: any,
  ): Promise<void> {
    const logEntry: PulseAuditLog = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      userId,
      userRole: metadata?.userRole,
      action,
      input: {
        ...input,
        query: this.sanitizeInput(input.query),
        topic: this.sanitizeInput(input.topic),
      },
      output: {
        success: false, // Será atualizado na resposta
        responseTime: 0,
      },
      metadata: {
        model: metadata?.model || 'gemini-1.5-flash',
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        sessionId: metadata?.sessionId || this.generateSessionId(),
      },
    };

    this.addLog(logEntry);

    // Salvar no Supabase
    try {
      await this.saveLogToSupabase(logEntry);
    } catch (error) {
      console.error('Erro ao salvar log no Supabase:', error);
    }

    // Log de debug
    if (this.logLevel === 'debug') {
      console.debug('🩺 PULSE AI Request:', {
        action,
        userId: this.anonymizeUserId(userId),
        inputType: typeof input,
        timestamp: logEntry.timestamp,
      });
    }
  }

  /**
   * ✅ Log de resposta
   */
  async logResponse(
    action: PulseActionType,
    userId: string,
    output: {
      success: boolean;
      responseTime: number;
      tokensUsed?: number;
      confidence?: number;
      error?: string;
      [key: string]: any;
    },
  ): Promise<void> {
    // Encontrar o log de requisição correspondente
    const requestLog = this.logs
      .filter((log) => log.userId === userId && log.action === action)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )[0];

    if (requestLog) {
      // Atualizar o log existente
      requestLog.output = {
        ...requestLog.output,
        ...output,
      };

      // Atualizar no Supabase
      try {
        await this.updateLogInSupabase(requestLog.id, {
          output: requestLog.output,
        });
      } catch (error) {
        console.error('Erro ao atualizar log no Supabase:', error);
      }
    } else {
      // Criar novo log se não encontrar a requisição
      const logEntry: PulseAuditLog = {
        id: this.generateLogId(),
        timestamp: new Date().toISOString(),
        userId,
        action,
        input: {},
        output,
        metadata: {
          model: 'gemini-1.5-flash',
          sessionId: this.generateSessionId(),
        },
      };
      this.addLog(logEntry);

      // Salvar no Supabase
      try {
        await this.saveLogToSupabase(logEntry);
      } catch (error) {
        console.error('Erro ao salvar log no Supabase:', error);
      }
    }

    // Log baseado no nível
    if (output.success) {
      this.logInfo(`✅ PULSE AI Success: ${action}`, {
        userId: this.anonymizeUserId(userId),
        responseTime: output.responseTime,
        tokensUsed: output.tokensUsed,
      });
    } else {
      await this.logError(action, userId, output.error || 'Unknown error', {
        responseTime: output.responseTime,
      });
    }
  }

  /**
   * 🚨 Log de erro
   */
  async logError(
    action: PulseActionType,
    userId: string,
    error: string,
    metadata?: any,
  ): Promise<void> {
    const errorLog: PulseAuditLog = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      userId,
      action,
      input: metadata?.input || {},
      output: {
        success: false,
        responseTime: metadata?.responseTime || 0,
        error: this.sanitizeError(error),
      },
      metadata: {
        model: metadata?.model || 'gemini-1.5-flash',
        sessionId: metadata?.sessionId || this.generateSessionId(),
      },
    };

    this.addLog(errorLog);

    // Salvar no Supabase
    try {
      await this.saveLogToSupabase(errorLog);
    } catch (error) {
      console.error('Erro ao salvar log de erro no Supabase:', error);
    }

    // Log de erro sempre aparece
    console.error('🚨 PULSE AI Error:', {
      action,
      userId: this.anonymizeUserId(userId),
      error: this.sanitizeError(error),
      timestamp: errorLog.timestamp,
    });

    // Alertas para erros críticos
    if (this.isCriticalError(error)) {
      await this.sendCriticalAlert(errorLog);
    }
  }

  /**
   * 💾 Salvar log no Supabase
   */
  private async saveLogToSupabase(log: PulseAuditLog): Promise<void> {
    const dbData = {
      id: log.id,
      timestamp: log.timestamp,
      user_id: log.userId,
      user_role: log.userRole,
      action: log.action,
      input: log.input,
      output: log.output,
      metadata: log.metadata,
    };

    const { error } = await this.supabaseClient
      .from(PULSE_LOGS_TABLE)
      .insert(dbData);

    if (error) {
      throw new Error(`Erro ao salvar log: ${error.message}`);
    }
  }

  /**
   * 🔄 Atualizar log no Supabase
   */
  private async updateLogInSupabase(
    logId: string,
    updates: any,
  ): Promise<void> {
    const { error } = await this.supabaseClient
      .from(PULSE_LOGS_TABLE)
      .update(updates)
      .eq('id', logId);

    if (error) {
      throw new Error(`Erro ao atualizar log: ${error.message}`);
    }
  }

  /**
   * 📊 Obter estatísticas
   */
  async getStatistics(timeRange?: { start: Date; end: Date }) {
    try {
      let query = this.supabaseClient.from(PULSE_LOGS_TABLE).select('*');

      if (timeRange) {
        query = query
          .gte('timestamp', timeRange.start.toISOString())
          .lte('timestamp', timeRange.end.toISOString());
      }

      const { data: logs, error } = await query;

      if (error) {
        throw new Error(`Erro ao buscar logs: ${error.message}`);
      }

      const filteredLogs = logs || [];
      const totalRequests = filteredLogs.length;
      const successfulRequests = filteredLogs.filter(
        (log) => log.output?.success,
      ).length;
      const totalTokens = filteredLogs.reduce(
        (sum, log) => sum + (log.output?.tokensUsed || 0),
        0,
      );
      const totalResponseTime = filteredLogs.reduce(
        (sum, log) => sum + (log.output?.responseTime || 0),
        0,
      );

      const actionCounts = filteredLogs.reduce(
        (acc, log) => {
          acc[log.action] = (acc[log.action] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const errorTypes = filteredLogs
        .filter((log) => !log.output?.success)
        .reduce(
          (acc, log) => {
            const errorType = this.categorizeError(log.output?.error || '');
            acc[errorType] = (acc[errorType] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );

      return {
        totalRequests,
        successRate:
          totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
        errorRate:
          totalRequests > 0
            ? ((totalRequests - successfulRequests) / totalRequests) * 100
            : 0,
        averageResponseTime:
          totalRequests > 0 ? totalResponseTime / totalRequests : 0,
        totalTokens,
        averageTokensPerRequest:
          totalRequests > 0 ? totalTokens / totalRequests : 0,
        topActions: Object.entries(actionCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([action, count]) => ({ action, count })),
        errorTypes,
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      // Fallback para logs em memória
      return this.getMemoryStatistics(timeRange);
    }
  }

  /**
   * 📊 Obter estatísticas da memória (fallback)
   */
  private getMemoryStatistics(timeRange?: { start: Date; end: Date }) {
    let filteredLogs = this.logs;

    if (timeRange) {
      filteredLogs = this.logs.filter((log) => {
        const logTime = new Date(log.timestamp);
        return logTime >= timeRange.start && logTime <= timeRange.end;
      });
    }

    const totalRequests = filteredLogs.length;
    const successfulRequests = filteredLogs.filter(
      (log) => log.output.success,
    ).length;
    const totalTokens = filteredLogs.reduce(
      (sum, log) => sum + (log.output.tokensUsed || 0),
      0,
    );
    const totalResponseTime = filteredLogs.reduce(
      (sum, log) => sum + log.output.responseTime,
      0,
    );

    const actionCounts = filteredLogs.reduce(
      (acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const errorTypes = filteredLogs
      .filter((log) => !log.output.success)
      .reduce(
        (acc, log) => {
          const errorType = this.categorizeError(log.output.error || '');
          acc[errorType] = (acc[errorType] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

    return {
      totalRequests,
      successRate:
        totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
      errorRate:
        totalRequests > 0
          ? ((totalRequests - successfulRequests) / totalRequests) * 100
          : 0,
      averageResponseTime:
        totalRequests > 0 ? totalResponseTime / totalRequests : 0,
      totalTokens,
      averageTokensPerRequest:
        totalRequests > 0 ? totalTokens / totalRequests : 0,
      topActions: Object.entries(actionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([action, count]) => ({ action, count })),
      errorTypes,
    };
  }

  /**
   * 🔍 Buscar logs
   */
  async searchLogs(filters: {
    userId?: string;
    action?: PulseActionType;
    success?: boolean;
    timeRange?: { start: Date; end: Date };
    sessionId?: string;
  }) {
    try {
      let query = this.supabaseClient.from(PULSE_LOGS_TABLE).select('*');

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.action) {
        query = query.eq('action', filters.action);
      }
      if (filters.success !== undefined) {
        query = query.eq('output->success', filters.success);
      }
      if (filters.timeRange) {
        query = query
          .gte('timestamp', filters.timeRange.start.toISOString())
          .lte('timestamp', filters.timeRange.end.toISOString());
      }
      if (filters.sessionId) {
        query = query.eq('metadata->sessionId', filters.sessionId);
      }

      const { data, error } = await query.order('timestamp', {
        ascending: false,
      });

      if (error) {
        throw new Error(`Erro ao buscar logs: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      // Fallback para logs em memória
      return this.logs.filter((log) => {
        if (filters.userId && log.userId !== filters.userId) {
return false;
}
        if (filters.action && log.action !== filters.action) {
return false;
}
        if (
          filters.success !== undefined &&
          log.output.success !== filters.success
        ) {
          return false;
        }
        if (
          filters.sessionId &&
          log.metadata?.sessionId !== filters.sessionId
        ) {
          return false;
        }
        if (filters.timeRange) {
          const logTime = new Date(log.timestamp);
          if (
            logTime < filters.timeRange.start ||
            logTime > filters.timeRange.end
          ) {
            return false;
          }
        }
        return true;
      });
    }
  }

  /**
   * 🧹 Limpar logs antigos
   */
  async cleanupOldLogs(olderThanDays: number = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const { error } = await this.supabaseClient
        .from(PULSE_LOGS_TABLE)
        .delete()
        .lt('timestamp', cutoffDate.toISOString());

      if (error) {
        throw new Error(`Erro ao limpar logs antigos: ${error.message}`);
      }

      // Limpar também da memória
      this.logs = this.logs.filter((log) => {
        const logTime = new Date(log.timestamp);
        return logTime >= cutoffDate;
      });
    } catch (error) {
      console.error('Erro ao limpar logs antigos:', error);
    }
  }

  /**
   * 📤 Exportar logs
   */
  async exportLogs(format: 'json' | 'csv' = 'json', filters?: any) {
    const logs = await this.searchLogs(filters || {});

    if (format === 'csv') {
      return this.convertToCSV(logs);
    }
    return JSON.stringify(logs, null, 2);
  }

  private addLog(log: PulseAuditLog) {
    this.logs.unshift(log);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
  }

  private generateLogId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private sanitizeInput(input: any): any {
    if (typeof input === 'string' && input.length > 1000) {
      return input.substring(0, 1000) + '...[truncated]';
    }
    return input;
  }

  private sanitizeError(error: string): string {
    // Remove informações sensíveis dos erros
    return error
      .replace(/api[_-]?key[s]?[\s]*[:=][\s]*[\w\-]+/gi, 'API_KEY=[REDACTED]')
      .replace(/token[s]?[\s]*[:=][\s]*[\w\-\.]+/gi, "TOKEN=[REDACTED]");
  }

  private anonymizeUserId(userId: string): string {
    if (userId.length <= 8) {
return userId;
}
    return userId.substring(0, 4) + '***' + userId.substring(userId.length - 4);
  }

  private categorizeError(error: string): string {
    if (error.includes('rate limit') || error.includes('quota'))
      {return "RATE_LIMIT";}
    if (error.includes('timeout') || error.includes('network'))
      {return "NETWORK";}
    if (error.includes('authentication') || error.includes('unauthorized'))
      {return "AUTH";}
    if (error.includes('validation') || error.includes('invalid'))
      {return "VALIDATION";}
    if (error.includes('model') || error.includes('generation')) {return "MODEL";}
    return 'UNKNOWN';
  }

  private isCriticalError(error: string): boolean {
    const criticalKeywords = [
      'authentication failed',
      'api key invalid',
      'service unavailable',
      'internal server error',
      'database connection',
      'critical system',
    ];
    return criticalKeywords.some((keyword) =>
      error.toLowerCase().includes(keyword),
    );
  }

  private async sendCriticalAlert(log: PulseAuditLog) {
    // Implementar alertas críticos (email, Slack, etc.)
    console.error('🚨 CRITICAL PULSE AI ERROR:', {
      logId: log.id,
      action: log.action,
      userId: this.anonymizeUserId(log.userId),
      error: log.output.error,
      timestamp: log.timestamp,
    });
  }

  private convertToCSV(logs: any[]): string {
    if (logs.length === 0) {
return '';
}

    const headers = [
      'id',
      'timestamp',
      'userId',
      'action',
      'success',
      'responseTime',
      'error',
    ];
    const csvRows = [headers.join(',')];

    logs.forEach((log) => {
      const row = [
        log.id,
        log.timestamp,
        this.anonymizeUserId(log.user_id || log.userId),
        log.action,
        log.output?.success || false,
        log.output?.responseTime || 0,
        (log.output?.error || '').replace(/,/g, ';'),
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  private logInfo(message: string, data?: any) {
    if (['debug', 'info'].includes(this.logLevel)) {
      console.info(message, data);
    }
  }

  private logWarn(message: string, data?: any) {
    if (['debug', 'info', 'warn'].includes(this.logLevel)) {
      console.warn(message, data);
    }
  }

  setLogLevel(level: 'debug' | 'info' | 'warn' | 'error') {
    this.logLevel = level;
  }

  getLogLevel(): string {
    return this.logLevel;
  }

  getTotalLogs(): number {
    return this.logs.length;
  }

  getRecentLogs(limit: number = 10): PulseAuditLog[] {
    return this.logs.slice(0, limit);
  }

  clearAllLogs() {
    this.logs = [];
  }
}

