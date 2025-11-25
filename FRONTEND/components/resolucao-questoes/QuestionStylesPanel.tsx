'use client';

import { useState, useEffect } from 'react';
import {
  toggleQuestionStyleVote,
  toggleQuestionReaction,
  getQuestionStyleStats,
  getQuestionReactionStats,
  QuestionStyleType,
  QuestionStyleStats,
  QuestionReactionStats,
} from '@/lib/api/questionInteractions';
import { useAuth } from '@/lib/contexts/AuthContext';

interface QuestionStylesPanelProps {
  questionId: string;
  isAnswered: boolean;
}

const STYLE_OPTIONS: { type: QuestionStyleType; label: string; icon: string }[] = [
  { type: 'conduta', label: 'Conduta', icon: 'medical_services' },
  { type: 'diagnostico', label: 'Diagnóstico', icon: 'stethoscope' },
  { type: 'classificacao', label: 'Classificação', icon: 'category' },
  { type: 'decoreba', label: 'Decoreba', icon: 'menu_book' },
  { type: 'tratamento', label: 'Tratamento', icon: 'medication' },
  { type: 'prognostico', label: 'Prognóstico', icon: 'trending_up' },
  { type: 'epidemiologia', label: 'Epidemiologia', icon: 'public' },
  { type: 'fisiopatologia', label: 'Fisiopatologia', icon: 'science' },
];

export function QuestionStylesPanel({ questionId, isAnswered }: QuestionStylesPanelProps) {
  const { user } = useAuth();
  const [styleStats, setStyleStats] = useState<QuestionStyleStats>({
    userVotes: [],
    conduta: { count: 0, percentage: 0 },
    diagnostico: { count: 0, percentage: 0 },
    classificacao: { count: 0, percentage: 0 },
    decoreba: { count: 0, percentage: 0 },
    tratamento: { count: 0, percentage: 0 },
    prognostico: { count: 0, percentage: 0 },
    epidemiologia: { count: 0, percentage: 0 },
    fisiopatologia: { count: 0, percentage: 0 },
  });
  const [reactionStats, setReactionStats] = useState<QuestionReactionStats>({
    likes: 0,
    dislikes: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAnswered) {
      loadStats();
    }
  }, [questionId, isAnswered]);

  const loadStats = async () => {
    try {
      const [styles, reactions] = await Promise.all([
        getQuestionStyleStats(questionId),
        getQuestionReactionStats(questionId),
      ]);
      setStyleStats(styles);
      setReactionStats(reactions);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleStyleToggle = async (styleType: QuestionStyleType) => {
    if (!user || loading) return;

    try {
      setLoading(true);
      const newStats = await toggleQuestionStyleVote(questionId, styleType);
      setStyleStats(newStats);
    } catch (error) {
      console.error('Erro ao votar em estilo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReactionToggle = async (reactionType: 'like' | 'dislike') => {
    if (!user || loading) return;

    try {
      setLoading(true);
      const newStats = await toggleQuestionReaction(questionId, reactionType);
      setReactionStats(newStats);
    } catch (error) {
      console.error('Erro ao reagir:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAnswered) return null;

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-lg dark:shadow-dark-xl p-6">
      {/* Likes/Dislikes */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
          Avalie a questão:
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleReactionToggle('like')}
            disabled={!user || loading}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border ${
              reactionStats.userReaction === 'like'
                ? 'bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark shadow-sm'
                : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark hover:bg-background-light dark:hover:bg-background-dark'
            }`}
          >
            <span className="material-symbols-outlined text-base text-text-light-secondary dark:text-text-dark-secondary" style={{ fontVariationSettings: reactionStats.userReaction === 'like' ? '"FILL" 1' : '"FILL" 0' }}>
              thumb_up
            </span>
            <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{reactionStats.likes}</span>
          </button>

          <button
            onClick={() => handleReactionToggle('dislike')}
            disabled={!user || loading}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border ${
              reactionStats.userReaction === 'dislike'
                ? 'bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark shadow-sm'
                : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark hover:bg-background-light dark:hover:bg-background-dark'
            }`}
          >
            <span className="material-symbols-outlined text-base text-text-light-secondary dark:text-text-dark-secondary" style={{ fontVariationSettings: reactionStats.userReaction === 'dislike' ? '"FILL" 1' : '"FILL" 0' }}>
              thumb_down
            </span>
            <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{reactionStats.dislikes}</span>
          </button>
        </div>
        {!user && (
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-2">
            Faça login para avaliar
          </p>
        )}
      </div>

      {/* Estilos da Questão */}
      <div>
        <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
          Qual o tipo dessa questão?
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {STYLE_OPTIONS.map((style) => {
            const isVoted = styleStats.userVotes.includes(style.type);
            const stats = styleStats[style.type];

            return (
              <button
                key={style.type}
                onClick={() => handleStyleToggle(style.type)}
                disabled={!user || loading}
                className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border ${
                  isVoted
                    ? 'bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark shadow-sm'
                    : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark hover:bg-background-light dark:hover:bg-background-dark'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="material-symbols-outlined flex-shrink-0 text-text-light-secondary dark:text-text-dark-secondary" style={{ fontSize: '16px', fontVariationSettings: isVoted ? '"FILL" 1' : '"FILL" 0' }}>
                    {style.icon}
                  </span>
                  <span className="text-[11px] font-medium text-text-light-primary dark:text-text-dark-primary whitespace-nowrap">{style.label}</span>
                </div>
                {stats && stats.count > 0 && (
                  <span className="text-[11px] font-semibold text-text-light-secondary dark:text-text-dark-secondary flex-shrink-0">
                    {stats.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {!user && (
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-2">
            Faça login para classificar
          </p>
        )}
      </div>
    </div>
  );
}
