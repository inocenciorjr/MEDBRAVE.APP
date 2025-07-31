/**
 * 🔍 MIDDLEWARE DE MONITORAMENTO DE REQUISIÇÕES
 * 
 * Este middleware intercepta todas as requisições HTTP e registra:
 * - Dados da requisição (método, URL, IP, user-agent)
 * - Informações do usuário (se autenticado)
 * - Tempo de resposta
 * - Status da resposta
 * - Tamanho da resposta
 * - Erros (se houver)
 */

import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';

// Interface para dados de monitoramento
interface RequestMonitorData {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  fullUrl: string;
  ip: string;
  userAgent: string;
  userId?: string;
  userRole?: string;
  userEmail?: string;
  requestSize: number;
  responseSize: number;
  responseTime: number;
  statusCode: number;
  success: boolean;
  error?: string;
  headers: Record<string, string>;
  query: Record<string, any>;
  body?: any;
  sessionId?: string;
  source?: 'backend' | 'frontend';
}

interface PageViewData {
  id: string;
  timestamp: string;
  sessionId: string;
  userId?: string;
  userRole?: string;
  path: string;
  referrer?: string;
  userAgent: string;
}

interface UserActionData {
  id: string;
  timestamp: string;
  sessionId: string;
  userId?: string;
  userRole?: string;
  action: string;
  data: any;
}

// Interface para estatísticas
interface MonitoringStats {
  totalRequests: number;
  errorRequests: number;
  errorRate: number;
  avgResponseTime: number;
  requestsByMethod: Record<string, number>;
  requestsByEndpoint: Record<string, number>;
  requestsByUser: Record<string, number>;
  requestsByStatus: Record<string, number>;
  requestsBySource: Record<string, number>;
  errorsByType: Record<string, number>;
  slowestEndpoints: Array<{ endpoint: string; avgResponseTime: number; requestCount: number }>;
  totalPageViews: number;
  pageViewsByPath: Record<string, number>;
  totalUserActions: number;
  actionsByType: Record<string, number>;
  timeRange: { start: string; end: string };
}

class RequestMonitor {
  private requests: RequestMonitorData[] = [];
  private pageViews: PageViewData[] = [];
  private userActions: UserActionData[] = [];
  private maxRequests = 10000; // Limite para evitar vazamento de memória
  private logDirectory = path.join(process.cwd(), 'logs', 'monitoring');
  private isEnabled = true;

  constructor() {
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeBody(body: any): any {
    if (!body) return undefined;
    
    const sanitized = { ...body };
    
    // Remover campos sensíveis
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
    
    const removeSensitiveData = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      const cleaned = { ...obj };
      
      for (const key in cleaned) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          cleaned[key] = '[REDACTED]';
        } else if (typeof cleaned[key] === 'object') {
          cleaned[key] = removeSensitiveData(cleaned[key]);
        }
      }
      
      return cleaned;
    };
    
    return removeSensitiveData(sanitized);
  }

  private getRequestSize(req: Request): number {
    const contentLength = req.headers['content-length'];
    if (contentLength) {
      return parseInt(contentLength, 10);
    }
    
    // Estimar tamanho baseado no body
    if (req.body) {
      try {
        return JSON.stringify(req.body).length;
      } catch {
        return 0;
      }
    }
    
    return 0;
  }

  private getResponseSize(res: Response): number {
    const contentLength = res.get('content-length');
    if (contentLength) {
      return parseInt(contentLength, 10);
    }
    return 0;
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.isEnabled) {
        console.log('⚠️ [DEBUG] Monitoramento desabilitado, pulando requisição:', req.method, req.url);
        return next();
      }
      
      console.log('📊 [DEBUG] Interceptando requisição:', req.method, req.url);

      const startTime = performance.now();
      const requestId = this.generateRequestId();
      
      // Dados iniciais da requisição
      const requestData: Partial<RequestMonitorData> = {
        id: requestId,
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.path,
        fullUrl: req.originalUrl,
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        requestSize: this.getRequestSize(req),
        headers: {
          'content-type': req.headers['content-type'] || '',
          'accept': req.headers['accept'] || '',
          'origin': req.headers['origin'] || '',
          'referer': req.headers['referer'] || ''
        },
        query: req.query,
        body: this.sanitizeBody(req.body),
        sessionId: req.headers['x-session-id'] as string || undefined
      };

      // Adicionar dados do usuário se autenticado
      if ((req as any).user) {
        const user = (req as any).user;
        requestData.userId = user.id;
        requestData.userRole = user.role;
        requestData.userEmail = user.email;
      }

      // Interceptar o final da resposta
      const originalSend = res.send;
      const originalJson = res.json;
      
      res.send = function(body) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        const finalData: RequestMonitorData = {
          ...requestData,
          responseSize: requestMonitor.getResponseSize(res),
          responseTime: Math.round(responseTime * 100) / 100, // 2 casas decimais
          statusCode: res.statusCode,
          success: res.statusCode < 400
        } as RequestMonitorData;

        // Adicionar erro se status >= 400
        if (res.statusCode >= 400) {
          try {
            const errorBody = typeof body === 'string' ? JSON.parse(body) : body;
            finalData.error = errorBody?.error || errorBody?.message || `HTTP ${res.statusCode}`;
          } catch {
            finalData.error = `HTTP ${res.statusCode}`;
          }
        }

        requestMonitor.addRequest(finalData);
        return originalSend.call(this, body);
      };

      res.json = function(body) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        const finalData: RequestMonitorData = {
          ...requestData,
          responseSize: requestMonitor.getResponseSize(res),
          responseTime: Math.round(responseTime * 100) / 100,
          statusCode: res.statusCode,
          success: res.statusCode < 400
        } as RequestMonitorData;

        if (res.statusCode >= 400) {
          finalData.error = body?.error || body?.message || `HTTP ${res.statusCode}`;
        }

        requestMonitor.addRequest(finalData);
        return originalJson.call(this, body);
      };

      next();
    };
  }

  private addRequest(data: RequestMonitorData): void {
    this.requests.push(data);
    
    // Limitar número de requisições em memória
    if (this.requests.length > this.maxRequests) {
      this.requests = this.requests.slice(-this.maxRequests / 2);
    }

    // Log em tempo real para requisições problemáticas (removido para reduzir logs)
    // if (!data.success || data.responseTime > 5000) {
    //   console.warn(`🚨 [Monitor] ${data.method} ${data.url} - ${data.statusCode} - ${data.responseTime}ms${data.userId ? ` - User: ${data.userId}` : ''}`);
    // }
  }

  // Adicionar requisição do frontend
  public addFrontendRequest(data: any): void {
    if (!this.isEnabled) return;
    
    const requestData: RequestMonitorData = {
      id: data.id || this.generateRequestId(),
      timestamp: data.timestamp || new Date().toISOString(),
      method: data.method,
      url: data.url,
      fullUrl: data.fullUrl || data.url,
      ip: data.ip || 'frontend',
      userAgent: data.userAgent,
      userId: data.userId,
      userRole: data.userRole,
      userEmail: data.userEmail,
      responseTime: data.responseTime || 0,
      statusCode: data.statusCode || 200,
      success: data.success !== undefined ? data.success : (data.statusCode || 200) < 400,
      requestSize: 0,
      responseSize: data.responseSize || 0,
      error: data.error,
      headers: data.headers || {},
      query: data.query || {},
      body: this.sanitizeBody(data.body),
      source: 'frontend',
      sessionId: data.sessionId
    };
    
    this.addRequest(requestData);
  }

  // Adicionar visualização de página
  public addPageView(data: PageViewData): void {
    if (!this.isEnabled) return;
    
    this.pageViews.push(data);
    
    // Limitar o número de page views em memória
    if (this.pageViews.length > this.maxRequests) {
      this.pageViews = this.pageViews.slice(-this.maxRequests / 2);
    }
  }

  // Adicionar ação do usuário
  public addUserAction(data: UserActionData): void {
    if (!this.isEnabled) return;
    
    this.userActions.push(data);
    
    // Limitar o número de ações em memória
    if (this.userActions.length > this.maxRequests) {
      this.userActions = this.userActions.slice(-this.maxRequests / 2);
    }
  }

  public getStatistics(timeRange?: { start: Date; end: Date }): MonitoringStats {
    // Debug: verificar se há dados
    console.log('🔍 [DEBUG] Dados no sistema de monitoramento:');
    console.log('- Total de requests:', this.requests.length);
    console.log('- Total de page views:', this.pageViews.length);
    console.log('- Total de user actions:', this.userActions.length);
    console.log('- Monitoramento habilitado:', this.isEnabled);
    
    let filteredRequests = this.requests;
    let filteredPageViews = this.pageViews;
    let filteredUserActions = this.userActions;
    
    if (timeRange) {
      filteredRequests = this.requests.filter(req => {
        const reqTime = new Date(req.timestamp);
        return reqTime >= timeRange.start && reqTime <= timeRange.end;
      });
      
      filteredPageViews = this.pageViews.filter(view => {
        const viewTime = new Date(view.timestamp);
        return viewTime >= timeRange.start && viewTime <= timeRange.end;
      });
      
      filteredUserActions = this.userActions.filter(action => {
        const actionTime = new Date(action.timestamp);
        return actionTime >= timeRange.start && actionTime <= timeRange.end;
      });
    }

    const totalRequests = filteredRequests.length;
    const errorRequests = filteredRequests.filter(req => !req.success).length;
    const errorRate = totalRequests > 0 ? Math.round((errorRequests / totalRequests) * 10000) / 100 : 0;
    const totalResponseTime = filteredRequests.reduce((sum, req) => sum + req.responseTime, 0);
    const avgResponseTime = totalRequests > 0 ? Math.round((totalResponseTime / totalRequests) * 100) / 100 : 0;

    // Estatísticas por método
    const requestsByMethod: Record<string, number> = {};
    filteredRequests.forEach(req => {
      requestsByMethod[req.method] = (requestsByMethod[req.method] || 0) + 1;
    });

    // Estatísticas por endpoint
    const requestsByEndpoint: Record<string, number> = {};
    filteredRequests.forEach(req => {
      const endpoint = req.url.split('?')[0]; // Remove query params
      requestsByEndpoint[endpoint] = (requestsByEndpoint[endpoint] || 0) + 1;
    });

    // Estatísticas por usuário
    const requestsByUser: Record<string, number> = {};
    filteredRequests.forEach(req => {
      if (req.userId) {
        requestsByUser[req.userId] = (requestsByUser[req.userId] || 0) + 1;
      }
    });

    // Estatísticas por status
    const requestsByStatus: Record<string, number> = {};
    filteredRequests.forEach(req => {
      const statusRange = `${Math.floor(req.statusCode / 100)}xx`;
      requestsByStatus[statusRange] = (requestsByStatus[statusRange] || 0) + 1;
    });

    // Tipos de erro
    const errorsByType: Record<string, number> = {};
    filteredRequests.filter(req => !req.success).forEach(req => {
      const errorType = req.error || 'Unknown Error';
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
    });

    // Endpoints mais lentos
    const endpointTimes: Record<string, { total: number; count: number }> = {};
    filteredRequests.forEach(req => {
      const endpoint = req.url.split('?')[0];
      if (!endpointTimes[endpoint]) {
        endpointTimes[endpoint] = { total: 0, count: 0 };
      }
      endpointTimes[endpoint].total += req.responseTime;
      endpointTimes[endpoint].count += 1;
    });

    const slowestEndpoints = Object.entries(endpointTimes)
      .map(([endpoint, data]) => ({
        endpoint,
        avgResponseTime: Math.round((data.total / data.count) * 100) / 100,
        requestCount: data.count
      }))
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, 10);

    // Estatísticas de page views
    const pageViewsByPath: Record<string, number> = {};
    filteredPageViews.forEach(view => {
      pageViewsByPath[view.path] = (pageViewsByPath[view.path] || 0) + 1;
    });

    // Estatísticas de ações do usuário
    const actionsByType: Record<string, number> = {};
    filteredUserActions.forEach(action => {
      actionsByType[action.action] = (actionsByType[action.action] || 0) + 1;
    });

    // Separar requisições por fonte
    const requestsBySource: Record<string, number> = {};
    filteredRequests.forEach(req => {
      const source = req.source || 'backend';
      requestsBySource[source] = (requestsBySource[source] || 0) + 1;
    });

    return {
      totalRequests,
      errorRequests,
      errorRate,
      avgResponseTime,
      requestsByMethod,
      requestsByEndpoint,
      requestsByUser,
      requestsByStatus,
      requestsBySource,
      errorsByType,
      slowestEndpoints,
      totalPageViews: filteredPageViews.length,
      pageViewsByPath,
      totalUserActions: filteredUserActions.length,
      actionsByType,
      timeRange: {
        start: filteredRequests[0]?.timestamp || new Date().toISOString(),
        end: filteredRequests[filteredRequests.length - 1]?.timestamp || new Date().toISOString()
      }
    };
  }

  public exportToFile(filename?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultFilename = `monitoring-report-${timestamp}.json`;
    const filepath = path.join(this.logDirectory, filename || defaultFilename);
    
    const report = {
      generatedAt: new Date().toISOString(),
      statistics: this.getStatistics(),
      requests: this.requests.slice(-1000) // Últimas 1000 requisições
    };
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    
    console.log(`📊 [Monitor] Relatório exportado para: ${filepath}`);
    return filepath;
  }

  public exportStatsToCsv(filename?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultFilename = `monitoring-stats-${timestamp}.csv`;
    const filepath = path.join(this.logDirectory, filename || defaultFilename);
    
    const stats = this.getStatistics();
    
    let csv = 'Timestamp,Method,URL,User ID,User Role,Response Time (ms),Status Code,Success,Error\n';
    
    this.requests.slice(-1000).forEach(req => {
      csv += `${req.timestamp},${req.method},"${req.url}",${req.userId || ''},${req.userRole || ''},${req.responseTime},${req.statusCode},${req.success},"${req.error || ''}"\n`;
    });
    
    fs.writeFileSync(filepath, csv);
    
    console.log(`📊 [Monitor] Estatísticas CSV exportadas para: ${filepath}`);
    return filepath;
  }

  public clearData(): void {
    this.requests = [];
    // Dados de monitoramento limpos
  }

  public enable(): void {
    this.isEnabled = true;
    // Monitoramento habilitado
  }

  public disable(): void {
    this.isEnabled = false;
    // Monitoramento desabilitado
  }

  public getRecentRequests(limit = 100): RequestMonitorData[] {
    return this.requests.slice(-limit);
  }

  public getRequestsByUser(userId: string, limit = 100): RequestMonitorData[] {
    return this.requests
      .filter(req => req.userId === userId)
      .slice(-limit);
  }

  public getErrorRequests(limit = 100): RequestMonitorData[] {
    return this.requests
      .filter(req => !req.success)
      .slice(-limit);
  }

  public getSlowRequests(threshold = 1000, limit = 100): RequestMonitorData[] {
    return this.requests
      .filter(req => req.responseTime > threshold)
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, limit);
  }
}

// Instância singleton
const requestMonitor = new RequestMonitor();

export { requestMonitor, RequestMonitorData, MonitoringStats };
export default requestMonitor.middleware();