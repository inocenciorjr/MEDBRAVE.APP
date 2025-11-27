'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { draftService, Draft } from '@/services/draftService';
import { CommentWarningAlert } from '@/components/admin/scraper/CommentWarningAlert';

export default function DraftViewPage() {
  const params = useParams();
  const router = useRouter();
  const draftId = params.id as string;

  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDraft();
  }, [draftId]);

  const loadDraft = async () => {
    setLoading(true);
    setError(null);
    try {
      const draftData = await draftService.getDraft(draftId);
      setDraft(draftData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar draft');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (error || !draft) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center max-w-md">
          <span className="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
          <h1 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">
            Erro ao Carregar Draft
          </h1>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4">
            {error || 'Draft não encontrado'}
          </p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <div className="bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Voltar"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-700 dark:text-slate-200">
                  {draft.title}
                </h1>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  {draft.metadata.totalQuestions} questões • Criado em{' '}
                  {new Date(draft.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  router.push(`/admin/questions/bulk?draftId=${draftId}`);
                }}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Editar no Bulk
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ✅ Alerta de Comentários Faltantes */}
        <CommentWarningAlert
          commentsGenerated={draft.metadata.commentsGenerated}
          commentsFailed={draft.metadata.commentsFailed}
          missingCommentQuestions={draft.metadata.missingCommentQuestions}
          totalQuestions={draft.metadata.totalQuestions}
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface-light dark:bg-surface-dark rounded-lg p-4 border border-border-light dark:border-border-dark">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-3xl text-blue-500">quiz</span>
              <div>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Total de Questões
                </p>
                <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                  {draft.metadata.totalQuestions}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark rounded-lg p-4 border border-border-light dark:border-border-dark">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-3xl text-green-500">category</span>
              <div>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Categorizadas
                </p>
                <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                  {draft.metadata.categorizedQuestions}
                </p>
              </div>
            </div>
          </div>
          {/* ✅ Card de Questões Anuladas */}
          {draft.metadata.annulledQuestions !== undefined && draft.metadata.annulledQuestions > 0 && (
            <div className="bg-surface-light dark:bg-surface-dark rounded-lg p-4 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-3xl text-red-500">cancel</span>
                <div>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    Questões Anuladas
                  </p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {draft.metadata.annulledQuestions}
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="bg-surface-light dark:bg-surface-dark rounded-lg p-4 border border-border-light dark:border-border-dark">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-3xl text-purple-500">link</span>
              <div>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Fonte
                </p>
                <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary truncate">
                  {draft.url}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ Alerta de Questões Anuladas */}
        {draft.metadata.annulledQuestions !== undefined && draft.metadata.annulledQuestions > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-lg mb-6">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">
                cancel
              </span>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
                  🚫 Questões Anuladas Detectadas
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                  {draft.metadata.annulledQuestions} de {draft.metadata.totalQuestions} questões foram anuladas pela banca.
                </p>
                {draft.metadata.annulledQuestionNumbers && draft.metadata.annulledQuestionNumbers.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-sm font-medium text-red-800 dark:text-red-200 cursor-pointer hover:underline">
                      Ver questões anuladas ({draft.metadata.annulledQuestionNumbers.length})
                    </summary>
                    <div className="mt-2 pl-4 border-l-2 border-red-300 dark:border-red-700">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {draft.metadata.annulledQuestionNumbers.join(', ')}
                      </p>
                    </div>
                  </details>
                )}
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  💡 Questões anuladas podem ter múltiplas respostas corretas ou nenhuma resposta correta.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
            <span className="material-symbols-outlined">list</span>
            Questões do Draft
          </h2>
          {draft.questions.map((question: any, index: number) => (
            <div
              key={question.tempId || question.id || index}
              className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-2xl font-bold text-primary">
                    {question.numero || `Q${index + 1}`}
                  </span>
                  {question.filterIds && question.filterIds.length > 0 && (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                      {question.filterIds.length} filtros
                    </span>
                  )}
                  {/* ✅ Badge de Questão Anulada */}
                  {(question.isAnnulled || question.is_annulled) && (
                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full flex items-center gap-1 font-semibold">
                      <span className="material-symbols-outlined text-xs">cancel</span>
                      Anulada
                    </span>
                  )}
                  {/* ✅ Badge de Questão Desatualizada */}
                  {(question.isOutdated || question.is_outdated) && (
                    <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded-full flex items-center gap-1 font-semibold">
                      <span className="material-symbols-outlined text-xs">schedule</span>
                      Desatualizada
                    </span>
                  )}
                </div>
                {question.imagem && (
                  <span className="material-symbols-outlined text-blue-500" title="Questão com imagem">
                    image
                  </span>
                )}
              </div>

              {/* Enunciado */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary mb-2">
                  Enunciado:
                </h3>
                <div 
                  className="text-text-light-primary dark:text-text-dark-primary prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: question.enunciado }}
                />
              </div>

              {/* Imagem */}
              {question.imagem && (
                <div className="mb-4">
                  <img 
                    src={question.imagem} 
                    alt="Imagem da questão"
                    className="max-w-full h-auto rounded-lg border border-border-light dark:border-border-dark"
                  />
                </div>
              )}

              {/* Alternativas */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary mb-2">
                  Alternativas:
                </h3>
                <div className="space-y-2">
                  {question.alternativas?.map((alt: string, altIndex: number) => {
                    const isCorrect = question.correta === altIndex;
                    return (
                      <div
                        key={altIndex}
                        className={`p-3 rounded-lg border ${
                          isCorrect
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                            : 'bg-white dark:bg-gray-800 border-border-light dark:border-border-dark'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className={`font-bold ${isCorrect ? 'text-green-600' : 'text-text-light-secondary dark:text-text-dark-secondary'}`}>
                            {String.fromCharCode(65 + altIndex)})
                          </span>
                          <span className={isCorrect ? 'text-green-700 dark:text-green-300 font-medium' : 'text-text-light-primary dark:text-text-dark-primary'}>
                            {alt}
                          </span>
                          {isCorrect && (
                            <span className="material-symbols-outlined text-green-600 ml-auto">
                              check_circle
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Comentário do Professor */}
              {question.professorComment ? (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">school</span>
                    Comentário do Professor:
                  </h3>
                  <div 
                    className="text-sm text-blue-900 dark:text-blue-100 prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: question.professorComment }}
                  />
                </div>
              ) : (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <h3 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    Comentário Faltante
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Esta questão não possui comentário do professor. A IA não conseguiu gerar o comentário automaticamente.
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    💡 Você pode adicionar o comentário manualmente ao editar esta questão.
                  </p>
                </div>
              )}

              {/* Tags */}
              {question.tags && question.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {question.tags.map((tag: string, tagIndex: number) => (
                    <span
                      key={tagIndex}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
