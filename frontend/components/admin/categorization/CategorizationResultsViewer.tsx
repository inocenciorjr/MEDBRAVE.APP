'use client';

import React, { useState } from 'react';

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
  error?: string;
}

export interface CategorizationResultsViewerProps {
  results: CategorizationResult[];
  onAccept: (result: CategorizationResult) => void;
  onReject: (result: CategorizationResult) => void;
  onModify: (result: CategorizationResult) => void;
}

export const CategorizationResultsViewer: React.FC<CategorizationResultsViewerProps> = ({
  results,
  onAccept,
  onReject,
  onModify,
}) => {
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [acceptedResults, setAcceptedResults] = useState<Set<string>>(new Set());
  const [processingAll, setProcessingAll] = useState(false);

  const toggleExpanded = (questionId: string) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedResults(newExpanded);
  };

  const handleAcceptAll = async () => {
    setProcessingAll(true);
    const validResults = results.filter(r => r.status !== 'failed');
    
    for (const result of validResults) {
      await onAccept(result);
      setAcceptedResults(prev => new Set(prev).add(result.questionId));
    }
    
    setProcessingAll(false);
  };

  const handleAcceptSingle = async (result: CategorizationResult) => {
    await onAccept(result);
    setAcceptedResults(prev => new Set(prev).add(result.questionId));
  };

  const getStatusIcon = (status: CategorizationResult['status']) => {
    switch (status) {
      case 'success':
        return <span className="material-symbols-outlined text-green-600">check_circle</span>;
      case 'failed':
        return <span className="material-symbols-outlined text-red-600">cancel</span>;
      case 'ambiguous':
      case 'manual_review':
        return <span className="material-symbols-outlined text-yellow-600">warning</span>;
    }
  };

  const getStatusColor = (status: CategorizationResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'failed':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'ambiguous':
      case 'manual_review':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 dark:text-green-400';
    if (confidence >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Nenhum resultado para exibir
      </div>
    );
  }

  const validResultsCount = results.filter(r => r.status !== 'failed').length;

  return (
    <div className="space-y-4">
      {/* Botão Aceitar Todos */}
      {validResultsCount > 0 && (
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {validResultsCount} {validResultsCount === 1 ? 'sugestão disponível' : 'sugestões disponíveis'}
            </div>
            <button
              onClick={handleAcceptAll}
              disabled={processingAll}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
            >
              {processingAll ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  Processando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">done_all</span>
                  Aceitar Todos
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {results.map((result, index) => {
        const resultKey = result.questionId || result.questionNumber || `result-${index}`;
        const isExpanded = expandedResults.has(result.questionId);
        const isAccepted = acceptedResults.has(result.questionId);

        // Não mostrar questões já aceitas
        if (isAccepted) {
          return null;
        }

        return (
          <div
            key={resultKey}
            className={`border rounded-lg overflow-hidden transition-all ${getStatusColor(result.status)}`}
          >
            {/* Header */}
            <div
              className="p-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              onClick={() => toggleExpanded(result.questionId)}
            >
              <div className="flex items-start gap-3">
                {getStatusIcon(result.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Questão {result.questionNumber}
                    </h4>
                    <span className={`text-sm font-medium ${getConfidenceColor(result.overallConfidence)}`}>
                      {result.overallConfidence}% confiança
                    </span>
                  </div>
                  {result.hierarchyChain.length > 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {result.hierarchyChain.map(node => node.name).join(' > ')}
                    </p>
                  )}
                  {result.error && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      Erro: {result.error}
                    </p>
                  )}
                </div>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <span className="material-symbols-outlined">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                </button>
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
                {/* Filters */}
                {result.suggestedFilters.length > 0 && (
                  <div>
                    <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Filtros Sugeridos
                    </h5>
                    <div className="space-y-2">
                      {result.suggestedFilters.map((filter, index) => (
                        <div
                          key={`${result.questionId}-filter-${filter.filterId}-${index}`}
                          className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {filter.filterName}
                            </span>
                            <span className={`text-sm font-medium ${getConfidenceColor(filter.confidence)}`}>
                              {filter.confidence}%
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {filter.reasoning}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subfilters */}
                {result.suggestedSubfilters.length > 0 && (
                  <div>
                    <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Subfiltros Sugeridos
                    </h5>
                    <div className="space-y-2">
                      {result.suggestedSubfilters.map((subfilter, index) => (
                        <div
                          key={`${result.questionId}-subfilter-${subfilter.subfilterId}-${index}`}
                          className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {subfilter.subfilterName}
                            </span>
                            <span className={`text-sm font-medium ${getConfidenceColor(subfilter.confidence)}`}>
                              {subfilter.confidence}%
                            </span>
                          </div>
                          {subfilter.parentPath.length > 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">
                              Caminho: {subfilter.parentPath.join(' > ')}
                            </p>
                          )}
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {subfilter.reasoning}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Explanation */}
                {result.aiExplanation && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 flex-shrink-0">info</span>
                      <div>
                        <h5 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
                          Explicação da IA
                        </h5>
                        <p className="text-xs text-blue-800 dark:text-blue-400">
                          {result.aiExplanation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Image Analysis */}
                {result.imageAnalysis?.detected && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                    <h5 className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-1">
                      Análise de Imagem
                    </h5>
                    <p className="text-xs text-purple-800 dark:text-purple-400">
                      Tipo: {result.imageAnalysis.imageType} | Relevância: {result.imageAnalysis.relevance}%
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleAcceptSingle(result)}
                    disabled={result.status === 'failed'}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Aceitar
                  </button>
                  <button
                    onClick={() => onModify(result)}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Modificar
                  </button>
                  <button
                    onClick={() => onReject(result)}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Rejeitar
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
