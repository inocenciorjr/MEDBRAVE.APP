import { Counter, Gauge, Histogram } from 'prom-client';
import { AlertConfig, Alert } from './alertService';

declare namespace Monitoring {
  interface MetricsService {
    incrementRequestCount(method: string, route: string, statusCode: number): void;
    incrementErrorCount(code: string, message: string, isOperational: boolean): void;
    incrementAuthErrorCount(type: string, userId?: string): void;
    incrementDbOperationCount(
      operation: string,
      collection: string,
      status: 'success' | 'error'
    ): void;
    observeResponseTime(
      method: string,
      route: string,
      statusCode: number,
      timeInSeconds: number
    ): void;
    observeDbQueryTime(operation: string, collection: string, timeInSeconds: number): void;
    observeRequestSize(sizeInBytes: number): void;
    setActiveConnections(count: number): void;
    setActiveUsers(count: number): void;
    getMetrics(): Promise<string>;
    resetMetrics(): void;
  }

  interface HealthCheckService {
    start(): void;
    stop(): void;
    checkAll(): Promise<import('./healthCheckService').HealthCheckResult>;
    getHealth(): import('./healthCheckService').HealthCheckResult;
  }

  interface AlertService {
    configure(config: Partial<AlertConfig>): void;
    alert(
      message: string,
      severity: import('./alertService').AlertSeverity,
      source: string,
      details?: Record<string, unknown>,
      context?: string
    ): string;
    info(message: string, source: string, details?: Record<string, unknown>): string;
    warning(message: string, source: string, details?: Record<string, unknown>): string;
    error(message: string, source: string, details?: Record<string, unknown>): string;
    critical(message: string, source: string, details?: Record<string, unknown>): string;
    resolveAlert(alertId: string, resolution?: string): boolean;
    getActiveAlerts(): Alert[];
    getAlertHistory(limit?: number): Alert[];
  }

  interface MonitoringAPI {
    metrics: MetricsService;
    health: HealthCheckService;
    alerts: AlertService;
    initialize: () => void;
    shutdown: () => void;
  }
}

export = Monitoring; 