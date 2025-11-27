/**
 * CommentWarningAlert Component
 * Exibe alerta sobre comentários faltantes em drafts
 */
import React from 'react';

interface CommentWarningAlertProps {
  commentsGenerated?: number;
  commentsFailed?: number;
  missingCommentQuestions?: string[];
  totalQuestions: number;
}

export const CommentWarningAlert: React.FC<CommentWarningAlertProps> = ({
  commentsGenerated = 0,
  commentsFailed = 0,
  missingCommentQuestions = [],
  totalQuestions,
}) => {
  // Se não há informação de comentários, não exibe nada
  if (commentsGenerated === 0 && commentsFailed === 0) {
    return null;
  }

  // Todos os comentários foram gerados com sucesso
  if (commentsFailed === 0 && commentsGenerated === totalQuestions) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded-lg mb-6">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-2xl">
            check_circle
          </span>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-1">
              ✅ Todos os comentários foram gerados com sucesso!
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              {commentsGenerated} de {totalQuestions} questões possuem comentários da IA.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Alguns comentários falharam
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-lg mb-6">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">
          warning
        </span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
            ⚠️ Atenção: Comentários Faltantes
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300 mb-2">
            {commentsFailed} de {totalQuestions} questões não tiveram comentários gerados pela IA.
          </p>
          {missingCommentQuestions.length > 0 && (
            <details className="mt-2">
              <summary className="text-sm font-medium text-red-800 dark:text-red-200 cursor-pointer hover:underline">
                Ver questões sem comentário ({missingCommentQuestions.length})
              </summary>
              <div className="mt-2 pl-4 border-l-2 border-red-300 dark:border-red-700">
                <p className="text-sm text-red-700 dark:text-red-300">
                  {missingCommentQuestions.join(', ')}
                </p>
              </div>
            </details>
          )}
          <p className="text-xs text-red-600 dark:text-red-400 mt-2">
            💡 Você pode revisar e adicionar os comentários manualmente antes de salvar as questões.
          </p>
        </div>
      </div>
    </div>
  );
};
