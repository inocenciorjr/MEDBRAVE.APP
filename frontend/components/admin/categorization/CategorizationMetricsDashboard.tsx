'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { categorizationService } from '@/services/categorizationService';

interface PrecisionMetrics {
  totalCategorizations: number;
  acceptedCategorizations: number;
  correctedCategorizations: number;
  acceptanceRate: number;
  correctionRate: number;
  averageConfidence: number;
  confidenceByStatus: Record<string, number>;
}

export const CategorizationMetricsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PrecisionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await categorizationService.getMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Erro ao carregar métricas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <XCircle className="w-5 h-5" />
          <span>Erro ao carregar métricas: {error}</span>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-500 dark:text-gray-400">Nenhuma métrica disponível</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-600" />
            Métricas de Categorização
          </h2>
          <button
            onClick={loadMetrics}
            className="px-3 py-1.5 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
          >
            Atualizar
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300">Total</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {metrics.totalCategorizations}
                </p>
              </div>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Categorizações realizadas
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-700 dark:text-green-300">Taxa de Aceitação</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {metrics.acceptanceRate.toFixed(1)}%
                </p>
              </div>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400">
              {metrics.acceptedCategorizations} aceitas
            </p>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">Taxa de Correção</p>
                <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                  {metrics.correctionRate.toFixed(1)}%
                </p>
              </div>
            </div>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              {metrics.correctedCategorizations} corrigidas
            </p>
          </div>
        </div>

        {/* Average Confidence */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Confiança Média
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all"
                  style={{ width: `${metrics.averageConfidence}%` }}
                />
              </div>
            </div>
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {metrics.averageConfidence.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Confidence by Status */}
        {Object.keys(metrics.confidenceByStatus).length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Confiança por Status
            </h3>
            <div className="space-y-3">
              {Object.entries(metrics.confidenceByStatus).map(([status, confidence]) => (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                      {status.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {confidence.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-purple-600 transition-all"
                      style={{ width: `${confidence}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
