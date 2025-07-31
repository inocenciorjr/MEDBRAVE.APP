/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { PulseAuditLog, PulseActionType } from '../types/PulseAITypes';
import { Firestore } from 'firebase-admin/firestore';

export class PulseAILogger {
  private logs: PulseAuditLog[] = [];
  private maxLogs: number = 10000; // Máximo de logs em memória
  private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';

  constructor(logLevel?: 'debug' | 'info' | 'warn' | 'error') {
    if (logLevel) {
      this.logLevel = logLevel;
    }
  }

  /**
   * 📝 Log de requisição
   */
  async logRequest(
    action: PulseActionType,
    userId: string,
    input: any,
    metadata?: any
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
        topic: this.sanitizeInput(input.topic)
      },
      output: {
        success: false, // Será atualizado na resposta
        responseTime: 0,
      },
      metadata: {
        model: metadata?.model || 'gemini-1.5-flash',
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        sessionId: metadata?.sessionId || this.generateSessionId()
      }
    };

    this.addLog(logEntry);
    
    // Log de debug
    if (this.logLevel === 'debug') {
      console.debug('🩺 PULSE AI Request:', {
        action,
        userId: this.anonymizeUserId(userId),
        inputType: typeof input,
        timestamp: logEntry.timestamp
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
    }
  ): Promise<void> {
    // Encontrar o log de requisição correspondente
    const requestLog = this.logs
      .filter(log => log.userId === userId && log.action === action)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (requestLog) {
      // Atualizar o log existente
      requestLog.output = {
        ...requestLog.output,
        ...output
      };
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
          sessionId: this.generateSessionId()
        }
      };
      this.addLog(logEntry);
    }

    // Log baseado no nível
    if (output.success) {
      this.logInfo(`✅ PULSE AI Success: ${action}`, {
        userId: this.anonymizeUserId(userId),
        responseTime: output.responseTime,
        tokensUsed: output.tokensUsed
      });
         } else {
       await this.logError(action, userId, output.error || 'Unknown error', {
         responseTime: output.responseTime
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
    metadata?: any
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
        error: this.sanitizeError(error)
      },
      metadata: {
        model: metadata?.model || 'gemini-1.5-flash',
        sessionId: metadata?.sessionId || this.generateSessionId()
      }
    };

    this.addLog(errorLog);

    // Log de erro sempre aparece
    console.error('🚨 PULSE AI Error:', {
      action,
      userId: this.anonymizeUserId(userId),
      error: this.sanitizeError(error),
      timestamp: errorLog.timestamp
    });

    // Alertas para erros críticos
    if (this.isCriticalError(error)) {
      await this.sendCriticalAlert(errorLog);
    }
  }

  /**
   * 📊 Obter estatísticas
   */
  getStatistics(timeRange?: { start: Date; end: Date }) {
    let filteredLogs = this.logs;

    if (timeRange) {
      filteredLogs = this.logs.filter(log => {
        const logTime = new Date(log.timestamp);
        return logTime >= timeRange.start && logTime <= timeRange.end;
      });
    }

    const totalRequests = filteredLogs.length;
    const successfulRequests = filteredLogs.filter(log => log.output.success).length;
    const totalTokens = filteredLogs.reduce((sum, log) => sum + (log.output.tokensUsed || 0), 0);
    const totalResponseTime = filteredLogs.reduce((sum, log) => sum + log.output.responseTime, 0);

    const actionCounts = filteredLogs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorTypes = filteredLogs
      .filter(log => !log.output.success)
      .reduce((acc, log) => {
        const errorType = this.categorizeError(log.output.error || '');
        acc[errorType] = (acc[errorType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalRequests,
      successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
      errorRate: totalRequests > 0 ? ((totalRequests - successfulRequests) / totalRequests) * 100 : 0,
      averageResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
      totalTokens,
      averageTokensPerRequest: totalRequests > 0 ? totalTokens / totalRequests : 0,
      topActions: Object.entries(actionCounts)
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count),
      errorTypes: Object.entries(errorTypes)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      timeRange: timeRange || {
        start: filteredLogs[0]?.timestamp,
        end: filteredLogs[filteredLogs.length - 1]?.timestamp
      }
    };
  }

  /**
   * 🔍 Buscar logs
   */
  searchLogs(filters: {
    userId?: string;
    action?: PulseActionType;
    success?: boolean;
    timeRange?: { start: Date; end: Date };
    sessionId?: string;
  }) {
    return this.logs.filter(log => {
      if (filters.userId && log.userId !== filters.userId) return false;
      if (filters.action && log.action !== filters.action) return false;
      if (filters.success !== undefined && log.output.success !== filters.success) return false;
      if (filters.sessionId && log.metadata?.sessionId !== filters.sessionId) return false;
      
      if (filters.timeRange) {
        const logTime = new Date(log.timestamp);
        if (logTime < filters.timeRange.start || logTime > filters.timeRange.end) return false;
      }

      return true;
    });
  }

  /**
   * 🗑️ Limpar logs antigos
   */
  cleanupOldLogs(olderThanDays: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const initialCount = this.logs.length;
    this.logs = this.logs.filter(log => new Date(log.timestamp) > cutoffDate);
    const removedCount = initialCount - this.logs.length;

    if (removedCount > 0) {
      this.logInfo(`🗑️ PULSE AI Cleanup: Removed ${removedCount} old logs`);
    }

    return removedCount;
  }

  /**
   * 📤 Exportar logs
   */
  exportLogs(format: 'json' | 'csv' = 'json', filters?: any) {
    const logs = filters ? this.searchLogs(filters) : this.logs;

    if (format === 'csv') {
      return this.convertToCSV(logs);
    }

    return JSON.stringify(logs, null, 2);
  }

  /**
   * 🔧 Métodos privados
   */

  private addLog(log: PulseAuditLog) {
    this.logs.push(log);

    // Manter limite de logs em memória
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove o mais antigo
    }
  }

  private generateLogId(): string {
    return `pulse_log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      // Remove informações sensíveis
      return input
        .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN-REDACTED]')
        .replace(/\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, '[CARD-REDACTED]')
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL-REDACTED]');
    }
    return input;
  }

  private sanitizeError(error: string): string {
    // Remove stack traces e informações sensíveis dos erros
    return error
      .replace(/at .+:\d+:\d+/g, '[STACK-TRACE-REDACTED]')
      .replace(/API[_\s]?KEY[_\s]?[A-Za-z0-9]+/gi, '[API-KEY-REDACTED]')
      .substring(0, 500); // Limita tamanho do erro
  }

  private anonymizeUserId(userId: string): string {
    // Hash simples para anonimizar user ID nos logs
    if (!userId) return 'anonymous';
    return 'user_' + userId.substring(0, 8) + '***';
  }

  private categorizeError(error: string): string {
    error = error.toLowerCase();
    
    if (error.includes('api') || error.includes('key')) return 'api_error';
    if (error.includes('network') || error.includes('timeout')) return 'network_error';
    if (error.includes('rate') || error.includes('limit')) return 'rate_limit_error';
    if (error.includes('validation') || error.includes('invalid')) return 'validation_error';
    if (error.includes('permission') || error.includes('unauthorized')) return 'auth_error';
    if (error.includes('medical') || error.includes('clinical')) return 'medical_error';
    
    return 'unknown_error';
  }

  private isCriticalError(error: string): boolean {
    const criticalTerms = [
      'medical emergency',
      'patient safety',
      'critical condition',
      'life threatening',
      'cardiac arrest',
      'respiratory failure'
    ];

    return criticalTerms.some(term => 
      error.toLowerCase().includes(term.toLowerCase())
    );
  }

  private async sendCriticalAlert(log: PulseAuditLog) {
    // Implementar alertas críticos (email, SMS, webhook, etc.)
    console.warn('🚨 CRITICAL PULSE AI ALERT:', {
      logId: log.id,
      action: log.action,
      error: log.output.error,
      timestamp: log.timestamp
    });

    // Aqui você pode integrar com sistemas de alerta
    // - Webhook para Slack/Teams
    // - Email para equipe médica
    // - SMS para plantão
    // - Integração com sistemas de monitoramento
  }

  private convertToCSV(logs: PulseAuditLog[]): string {
    const headers = [
      'ID',
      'Timestamp',
      'UserId',
      'Action',
      'Success',
      'ResponseTime',
      'TokensUsed',
      'Error',
      'Model'
    ];

    const rows = logs.map(log => [
      log.id,
      log.timestamp,
      this.anonymizeUserId(log.userId),
      log.action,
      log.output.success,
      log.output.responseTime,
      log.output.tokensUsed || 0,
      log.output.error || '',
      log.metadata?.model || ''
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  private logInfo(message: string, data?: any) {
    if (['debug', 'info'].includes(this.logLevel)) {
      console.info(message, data || '');
    }
  }

  private logWarn(message: string, data?: any) {
    if (['debug', 'info', 'warn'].includes(this.logLevel)) {
      console.warn(message, data || '');
    }
  }

  /**
   * 📊 Métodos públicos adicionais
   */

  setLogLevel(level: 'debug' | 'info' | 'warn' | 'error') {
    this.logLevel = level;
    this.logInfo(`📊 PULSE AI Log level set to: ${level}`);
  }

  getLogLevel(): string {
    return this.logLevel;
  }

  getTotalLogs(): number {
    return this.logs.length;
  }

  getRecentLogs(limit: number = 10): PulseAuditLog[] {
    return this.logs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  clearAllLogs() {
    const count = this.logs.length;
    this.logs = [];
    this.logInfo(`🗑️ PULSE AI: Cleared ${count} logs`);
    return count;
  }
} 