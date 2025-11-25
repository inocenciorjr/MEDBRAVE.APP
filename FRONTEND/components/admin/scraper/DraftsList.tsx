/**
 * DraftsList Component
 * Displays list of drafts created by batch processing with real-time updates
 */
'use client';

import React, { useState, useEffect } from 'react';

export interface DraftItem {
  draftId: string;
  url: string;
  link: string;
  questionsCount: number;
  status: 'extracting' | 'categorizing' | 'completed' | 'error';
  timestamp: string;
  error?: string;
  progress?: {
    phase: 'extraction' | 'categorization';
    current: number;
    total: number;
    percentage: number;
    message: string;
  };
}

interface DraftsListProps {
  jobId?: string;
  onDraftCreated?: (draft: DraftItem) => void;
}

export const DraftsList: React.FC<DraftsListProps> = ({ jobId, onDraftCreated }) => {
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Load existing drafts if jobId provided
    if (jobId) {
      loadExistingDrafts(jobId);
    }
  }, [jobId]);

  const loadExistingDrafts = async (jobId: string) => {
    try {
      const { draftService } = await import('@/services/draftService');
      const existingDrafts = await draftService.listDrafts(jobId);
      
      const draftItems: DraftItem[] = existingDrafts.map(draft => ({
        draftId: draft.id,
        url: draft.url,
        link: `/admin/questions/bulk?draftId=${draft.id}`,
        questionsCount: draft.metadata.totalQuestions,
        status: 'completed' as const,
        timestamp: draft.created_at,
      }));

      setDrafts(draftItems);
    } catch (error) {
      console.error('Error loading existing drafts:', error);
    }
  };

  const addDraft = (draft: DraftItem) => {
    setDrafts(prev => {
      // Check if draft already exists
      const exists = prev.some(d => d.draftId === draft.draftId);
      if (exists) {
        // Update existing draft
        return prev.map(d => d.draftId === draft.draftId ? draft : d);
      }
      // Add new draft
      return [...prev, draft];
    });

    if (onDraftCreated) {
      onDraftCreated(draft);
    }
  };

  const updateDraftStatus = (draftId: string, status: DraftItem['status'], error?: string) => {
    setDrafts(prev => prev.map(d => 
      d.draftId === draftId ? { ...d, status, error } : d
    ));
  };

  const removeDraft = (draftId: string) => {
    setDrafts(prev => prev.filter(d => d.draftId !== draftId));
  };

  const getStatusIcon = (status: DraftItem['status']) => {
    switch (status) {
      case 'extracting':
        return (
          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></span>
        );
      case 'categorizing':
        return (
          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></span>
        );
      case 'completed':
        return (
          <span className="material-symbols-outlined text-green-600 text-xl">check_circle</span>
        );
      case 'error':
        return (
          <span className="material-symbols-outlined text-red-600 text-xl">error</span>
        );
    }
  };

  const getStatusColor = (status: DraftItem['status']) => {
    switch (status) {
      case 'extracting':
        return 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
      case 'categorizing':
        return 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800';
      case 'completed':
        return 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800';
    }
  };

  const getStatusLabel = (status: DraftItem['status']) => {
    switch (status) {
      case 'extracting':
        return 'Extraindo';
      case 'categorizing':
        return 'Categorizando';
      case 'completed':
        return 'Concluído';
      case 'error':
        return 'Erro';
    }
  };

  if (drafts.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
          Drafts Criados
        </h3>
        {isConnected && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
            Conectado
          </div>
        )}
      </div>

      <div className="space-y-2">
        {drafts.map((draft) => (
          <div
            key={draft.draftId}
            className={`p-4 border rounded-lg transition-all ${getStatusColor(draft.status)}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {getStatusIcon(draft.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-text-light-primary dark:text-text-dark-primary truncate">
                      {draft.url}
                    </span>
                    <span className="px-2 py-0.5 bg-white dark:bg-gray-800 rounded text-xs font-medium">
                      {getStatusLabel(draft.status)}
                    </span>
                  </div>
                  
                  {/* Progress Bar for extracting/categorizing */}
                  {(draft.status === 'extracting' || draft.status === 'categorizing') && draft.progress && (
                    <div className="mt-2 mb-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-text-light-secondary dark:text-text-dark-secondary">
                          {draft.progress.message}
                        </span>
                        <span className="font-medium">
                          {draft.progress.current}/{draft.progress.total}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            draft.status === 'extracting' ? 'bg-blue-600' : 'bg-purple-600'
                          }`}
                          style={{ width: `${draft.progress.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Completed info */}
                  {draft.status === 'completed' && (
                    <div className="flex items-center gap-2 text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                      <span>{draft.questionsCount} questões</span>
                      <span>•</span>
                      <span>{new Date(draft.timestamp).toLocaleString('pt-BR')}</span>
                    </div>
                  )}

                  {draft.error && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {draft.error}
                    </p>
                  )}
                </div>
              </div>

              {draft.status === 'completed' && (
                <a
                  href={draft.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  Revisar
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Export helper function to be used by parent component
export const useDraftsList = () => {
  const [draftsListRef, setDraftsListRef] = useState<{
    addDraft: (draft: DraftItem) => void;
    updateDraftStatus: (draftId: string, status: DraftItem['status'], error?: string) => void;
    removeDraft: (draftId: string) => void;
  } | null>(null);

  return { draftsListRef, setDraftsListRef };
};
