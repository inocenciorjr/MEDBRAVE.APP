'use client';

import React, { useState, useEffect } from 'react';
import { scraperMonitoringService, ScraperStats, ScraperLog, LogFilters } from '@/services/scraperMonitoringService';
import { useToast } from '@/lib/contexts/ToastContext';

export default function ScraperMonitoringPage() {
  const toast = useToast();
  const [stats, setStats] = useState<ScraperStats | null>(null);
  const [logs, setLogs] = useState<ScraperLog[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LogFilters>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const [selectedLog, setSelectedLog] = useState<ScraperLog | null>(null);

  // Carregar dados
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Preparar filtros de data
      const dateFilters = {
        startDate: dateRange.startDate ? new Date(dateRange.startDate) : undefined,
        endDate: dateRange.endDate ? new Date(dateRange.endDate) : undefined,
      };

      // Carregar estatísticas
      const statsData = await scraperMonitoringService.getStats(dateFilters);
      setStats(statsData);

      // Carregar logs
      const logsData = await scraperMonitoringService.getLogs({
        ...filters,
        ...dateFilters,
      });
      setLogs(logsData.logs);
      setPagination(logsData.pagination);
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados ao montar e quando filtros mudarem
  useEffect(() => {
    loadData();
  }, [filters.page, filters.status, filters.sortBy, filters.sortOrder, dateRange.startDate, dateRange.endDate]);

  // Atualizar filtros
  const updateFilters = (newFilters: Partial<LogFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  // Exportar logs
  const handleExportLogs = async () => {
    try {
      const dateFilters = {
        startDate: dateRange.startDate ? new Date(dateRange.startDate) : undefined,
        endDate: dateRange.endDate ? new Date(dateRange.endDate) : undefined,
      };
      
      await scraperMonitoringService.exportLogsToCSV({
        ...filters,
        ...dateFilters,
      });
      
      toast.success('Logs exportados com sucesso!');
    } catch (err: any) {
      toast.error(`Erro ao exportar: ${err.message}`);
    }
  };

  // Formatar duração
  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Formatar data
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 mb-2">
            📊 Monitoramento do Scraper
          </h1>
          <p className="text-text-light-secondary dark:text-text-dark-secondary">
            Estatísticas e logs de execução do scraper de questões
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
            ❌ {error}
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">Total</p>
                  <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">{stats.total}</p>
                </div>
                <div className="text-3xl">📊</div>
              </div>
            </div>
            
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">Taxa de Sucesso</p>
                  <p className="text-2xl font-bold text-green-600">{stats.successRate.toFixed(1)}%</p>
                </div>
                <div className="text-3xl">✅</div>
              </div>
            </div>
            
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">Questões Extraídas</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalQuestionsExtracted}</p>
                </div>
                <div className="text-3xl">📝</div>
              </div>
            </div>
            
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">Tempo Médio</p>
                  <p className="text-2xl font-bold text-purple-600">{formatDuration(stats.avgDuration)}</p>
                </div>
                <div className="text-3xl">⏱️</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark mb-8">
          <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary mb-4">
            🔍 Filtros
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
                Data Inicial
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
                Data Final
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => updateFilters({ status: e.target.value as 'success' | 'failed' || undefined })}
                className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary"
              >
                <option value="">Todos</option>
                <option value="success">Sucesso</option>
                <option value="failed">Falha</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleExportLogs}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all"
              >
                📥 Exportar CSV
              </button>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">
                    URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">
                    Questões
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">
                    Duração
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-text-light-secondary dark:text-text-dark-secondary">
                      Carregando...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-text-light-secondary dark:text-text-dark-secondary">
                      Nenhum log encontrado
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light-primary dark:text-text-dark-primary">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-light-primary dark:text-text-dark-primary max-w-xs truncate">
                        {log.url}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          log.status === 'success'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {log.status === 'success' ? '✅ Sucesso' : '❌ Falha'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light-primary dark:text-text-dark-primary">
                        {log.questionsExtracted || 0} / {log.questionsSaved || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light-primary dark:text-text-dark-primary">
                        {formatDuration(log.duration)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-border-light dark:border-border-dark">
              <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} logs
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page! - 1) }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-border-light dark:border-border-dark rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Anterior
                </button>
                <span className="px-3 py-1 text-sm text-text-light-primary dark:text-text-dark-primary">
                  Página {pagination.page} de {pagination.totalPages}
                </span>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page! + 1) }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-1 border border-border-light dark:border-border-dark rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Log Details Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                    Detalhes do Log
                  </h3>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                      URL
                    </label>
                    <p className="text-sm text-text-light-primary dark:text-text-dark-primary break-all">
                      {selectedLog.url}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                        Status
                      </label>
                      <p className="text-sm text-text-light-primary dark:text-text-dark-primary">
                        {selectedLog.status === 'success' ? '✅ Sucesso' : '❌ Falha'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                        Duração
                      </label>
                      <p className="text-sm text-text-light-primary dark:text-text-dark-primary">
                        {formatDuration(selectedLog.duration)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                        Questões Extraídas
                      </label>
                      <p className="text-sm text-text-light-primary dark:text-text-dark-primary">
                        {selectedLog.questionsExtracted || 0}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                        Questões Salvas
                      </label>
                      <p className="text-sm text-text-light-primary dark:text-text-dark-primary">
                        {selectedLog.questionsSaved || 0}
                      </p>
                    </div>
                  </div>

                  {selectedLog.errorMessage && (
                    <div>
                      <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                        Erro
                      </label>
                      <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
                        {selectedLog.errorMessage}
                      </p>
                    </div>
                  )}

                  {selectedLog.stackTrace && (
                    <div>
                      <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                        Stack Trace
                      </label>
                      <pre className="text-xs text-text-light-primary dark:text-text-dark-primary bg-gray-50 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto">
                        {selectedLog.stackTrace}
                      </pre>
                    </div>
                  )}

                  {selectedLog.missingQuestions && selectedLog.missingQuestions.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                        Questões Faltantes
                      </label>
                      <p className="text-sm text-text-light-primary dark:text-text-dark-primary">
                        {selectedLog.missingQuestions.join(', ')}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-text-light-primary dark:text-text-dark-primary rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
