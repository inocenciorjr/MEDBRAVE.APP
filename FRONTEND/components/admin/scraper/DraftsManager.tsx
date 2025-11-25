/**
 * DraftsManager Component
 * Manages all existing drafts with actions to access, view details, or delete
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { draftService, Draft } from '@/services/draftService';
import Checkbox from '@/components/ui/Checkbox';
import { useToast } from '@/lib/contexts/ToastContext';

interface DraftsManagerProps {
  onLoadDraft?: (draftId: string) => void;
}

export const DraftsManager: React.FC<DraftsManagerProps> = ({ onLoadDraft }) => {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'questions'>('date');
  const [expandedDraft, setExpandedDraft] = useState<string | null>(null);
  const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set());

  // Load drafts on mount
  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    setLoading(true);
    setError(null);
    try {
      const allDrafts = await draftService.listDrafts();
      setDrafts(allDrafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar drafts');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (!window.confirm('Tem certeza que deseja deletar este draft?')) {
      return;
    }

    try {
      await draftService.deleteDraft(draftId);
      setDrafts(prev => prev.filter(d => d.id !== draftId));
      toast.success('Draft deletado com sucesso!');
    } catch (err) {
      toast.error(`Erro ao deletar draft: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  };

  const handleAccessDraft = (draftId: string) => {
    // Abre em página dedicada (sem estrutura de jobs/extração)
    window.open(`/admin/questions/draft/${draftId}`, '_blank');
  };

  const handleToggleSelect = (draftId: string) => {
    setSelectedDrafts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(draftId)) {
        newSet.delete(draftId);
      } else {
        newSet.add(draftId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedDrafts.size === filteredDrafts.length) {
      setSelectedDrafts(new Set());
    } else {
      setSelectedDrafts(new Set(filteredDrafts.map(d => d.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedDrafts.size === 0) {
      toast.warning('Selecione pelo menos um draft para deletar');
      return;
    }

    if (!window.confirm(`⚠️ ATENÇÃO: Isso vai deletar ${selectedDrafts.size} draft(s) selecionado(s). Tem certeza?`)) {
      return;
    }

    setLoading(true);
    try {
      const deletePromises = Array.from(selectedDrafts).map(id => draftService.deleteDraft(id));
      await Promise.all(deletePromises);
      setDrafts(prev => prev.filter(d => !selectedDrafts.has(d.id)));
      setSelectedDrafts(new Set());
      toast.success(`${deletePromises.length} draft(s) deletado(s) com sucesso!`);
    } catch (err) {
      toast.error(`Erro ao deletar drafts: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm(`⚠️ ATENÇÃO: Isso vai deletar TODOS os ${drafts.length} drafts. Tem certeza?`)) {
      return;
    }

    setLoading(true);
    try {
      const deletePromises = drafts.map(d => draftService.deleteDraft(d.id));
      await Promise.all(deletePromises);
      setDrafts([]);
      setSelectedDrafts(new Set());
      toast.success(`${deletePromises.length} drafts deletados com sucesso!`);
    } catch (err) {
      toast.error(`Erro ao deletar drafts: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort drafts
  const filteredDrafts = drafts
    .filter(draft => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        draft.title.toLowerCase().includes(search) ||
        draft.url.toLowerCase().includes(search) ||
        draft.id.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        return b.metadata.totalQuestions - a.metadata.totalQuestions;
      }
    });

  // Calculate statistics
  const stats = {
    total: drafts.length,
    totalQuestions: drafts.reduce((sum, d) => sum + d.metadata.totalQuestions, 0),
    categorized: drafts.filter(d => d.metadata.categorizedQuestions > 0).length,
    avgQuestions: drafts.length > 0 
      ? Math.round(drafts.reduce((sum, d) => sum + d.metadata.totalQuestions, 0) / drafts.length)
      : 0,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'partial':
        return 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'failed':
        return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'check_circle';
      case 'partial':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'help';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const formatExpiresAt = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays < 0) return 'Expirado';
    if (diffDays === 0) return 'Expira hoje';
    if (diffDays === 1) return 'Expira amanhã';
    if (diffDays < 7) return `Expira em ${diffDays} dias`;
    return `Expira em ${Math.floor(diffDays / 7)} semanas`;
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl">draft</span>
            Gerenciar Rascunhos
          </h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Visualize e gerencie todos os drafts de questões extraídas
          </p>
        </div>
        <button
          onClick={loadDrafts}
          disabled={loading}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Atualizar
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</div>
          <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">Total de Drafts</div>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalQuestions}</div>
          <div className="text-sm text-green-700 dark:text-green-300 mt-1">Total de Questões</div>
        </div>
        <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.categorized}</div>
          <div className="text-sm text-purple-700 dark:text-purple-300 mt-1">Categorizados</div>
        </div>
        <div className="p-4 bg-orange-50 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-800">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.avgQuestions}</div>
          <div className="text-sm text-orange-700 dark:text-orange-300 mt-1">Média por Draft</div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, URL ou ID..."
            className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'date' | 'questions')}
          className="px-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="date">Mais Recentes</option>
          <option value="questions">Mais Questões</option>
        </select>
        {selectedDrafts.size > 0 && (
          <button
            onClick={handleDeleteSelected}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
            Deletar Selecionados ({selectedDrafts.size})
          </button>
        )}
        {drafts.length > 0 && (
          <button
            onClick={handleDeleteAll}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">delete_forever</span>
            Deletar Todos
          </button>
        )}
      </div>

      {/* Select All Checkbox */}
      {filteredDrafts.length > 0 && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-800">
          <Checkbox
            checked={selectedDrafts.size === filteredDrafts.length && filteredDrafts.length > 0}
            onChange={handleSelectAll}
            label={`Selecionar todos (${filteredDrafts.length})`}
          />
          {selectedDrafts.size > 0 && (
            <span className="ml-auto text-sm text-primary font-medium">
              {selectedDrafts.size} selecionado(s)
            </span>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined">error</span>
            {error}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && drafts.length === 0 && (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">draft</span>
          <p className="text-text-light-secondary dark:text-text-dark-secondary">
            Nenhum draft encontrado
          </p>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-2">
            Extraia questões usando o scraper batch para criar drafts
          </p>
        </div>
      )}

      {/* Drafts List */}
      {!loading && !error && filteredDrafts.length > 0 && (
        <div className="space-y-3">
          {filteredDrafts.map((draft) => (
            <div
              key={draft.id}
              className={`border rounded-lg transition-all ${getStatusColor(draft.metadata.status)}`}
            >
              {/* Draft Header */}
              <div className="p-4">
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <div className="flex items-center pt-1" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedDrafts.has(draft.id)}
                      onChange={() => handleToggleSelect(draft.id)}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-xl">
                        {getStatusIcon(draft.metadata.status)}
                      </span>
                      <h4 className="font-semibold text-text-light-primary dark:text-text-dark-primary truncate">
                        {draft.title}
                      </h4>
                      <span className="px-2 py-0.5 bg-white dark:bg-gray-800 rounded text-xs font-medium">
                        {draft.metadata.totalQuestions} questões
                      </span>
                    </div>
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary truncate mb-2">
                      {draft.url}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">schedule</span>
                        {formatDate(draft.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">event</span>
                        {formatExpiresAt(draft.expires_at)}
                      </span>
                      {draft.metadata.categorizedQuestions > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">label</span>
                          {draft.metadata.categorizedQuestions} categorizadas
                        </span>
                      )}
                      {/* ✅ Indicador de comentários faltantes */}
                      {draft.metadata.commentsFailed !== undefined && draft.metadata.commentsFailed > 0 && (
                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                          <span className="material-symbols-outlined text-xs">warning</span>
                          {draft.metadata.commentsFailed} sem comentário
                        </span>
                      )}
                      {draft.metadata.commentsGenerated !== undefined && draft.metadata.commentsFailed === 0 && (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                          <span className="material-symbols-outlined text-xs">check_circle</span>
                          Todos com comentário
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccessDraft(draft.id)}
                      className="px-3 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
                      title="Abrir draft em nova aba (visualização)"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      Abrir
                    </button>
                    <button
                      onClick={() => {
                        if (onLoadDraft) {
                          // Se está dentro da página bulk, usa o callback
                          onLoadDraft(draft.id);
                        } else {
                          // Se está em outra página, navega
                          router.push(`/admin/questions/bulk?draftId=${draft.id}`);
                        }
                      }}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
                      title="Editar no Bulk (criação em massa)"
                    >
                      <span className="material-symbols-outlined text-sm">edit_note</span>
                      Editar no Bulk
                    </button>
                    <button
                      onClick={() => setExpandedDraft(expandedDraft === draft.id ? null : draft.id)}
                      className="px-3 py-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-text-light-primary dark:text-text-dark-primary rounded-lg transition-colors flex items-center gap-1 text-sm"
                      title="Ver detalhes"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {expandedDraft === draft.id ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                    <button
                      onClick={() => handleDeleteDraft(draft.id)}
                      className="px-3 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg transition-colors flex items-center gap-1 text-sm"
                      title="Deletar draft"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedDraft === draft.id && (
                <div className="px-4 pb-4 border-t border-current/20">
                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                        ID do Draft:
                      </div>
                      <code className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded font-mono">
                        {draft.id}
                      </code>
                    </div>
                    {draft.job_id && (
                      <div>
                        <div className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                          Job ID:
                        </div>
                        <code className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded font-mono">
                          {draft.job_id}
                        </code>
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                        URL Completa:
                      </div>
                      <a
                        href={draft.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline break-all"
                      >
                        {draft.url}
                      </a>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                          Duração da Extração:
                        </div>
                        <div className="text-sm">
                          {draft.metadata.extractionDuration 
                            ? `${(draft.metadata.extractionDuration / 1000).toFixed(1)}s`
                            : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                          Duração da Categorização:
                        </div>
                        <div className="text-sm">
                          {draft.metadata.categorizationDuration 
                            ? `${(draft.metadata.categorizationDuration / 1000).toFixed(1)}s`
                            : 'N/A'}
                        </div>
                      </div>
                    </div>
                    {/* ✅ Detalhes de comentários */}
                    {draft.metadata.commentsGenerated !== undefined && (
                      <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
                          Comentários da IA:
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            ✅ {draft.metadata.commentsGenerated} gerados
                          </span>
                          {draft.metadata.commentsFailed !== undefined && draft.metadata.commentsFailed > 0 && (
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              ⚠️ {draft.metadata.commentsFailed} falharam
                            </span>
                          )}
                        </div>
                        {draft.metadata.missingCommentQuestions && draft.metadata.missingCommentQuestions.length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer hover:underline">
                              Ver questões sem comentário ({draft.metadata.missingCommentQuestions.length})
                            </summary>
                            <div className="mt-2 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                              {draft.metadata.missingCommentQuestions.join(', ')}
                            </div>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Filtered Results Info */}
      {!loading && !error && filteredDrafts.length > 0 && searchTerm && (
        <div className="mt-4 text-sm text-text-light-secondary dark:text-text-dark-secondary text-center">
          Mostrando {filteredDrafts.length} de {drafts.length} drafts
        </div>
      )}
    </div>
  );
};
