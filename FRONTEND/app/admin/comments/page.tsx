'use client';

import { useEffect, useState } from 'react';
import { getQuestionComments, deleteComment } from '@/lib/api/comments';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/contexts/ToastContext';

interface Comment {
  id: string;
  user_id: string;
  content_id: string;
  content: string;
  is_staff_reply: boolean;
  like_count: number;
  reply_count: number;
  created_at: string;
  user_name?: string;
  user_photo?: string;
  replies: Comment[];
}

export default function AdminCommentsPage() {
  const router = useRouter();
  const toast = useToast();
  const [questionId, setQuestionId] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const loadComments = async () => {
    if (!questionId.trim()) {
      toast.warning('Campo obrigatório', 'Digite o ID da questão');
      return;
    }

    try {
      setLoading(true);
      setSearched(true);
      const data = await getQuestionComments(questionId);
      setComments(data);
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
      toast.error('Erro ao carregar', 'Verifique o ID da questão');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Tem certeza que deseja deletar este comentário?')) return;

    try {
      await deleteComment(commentId);
      loadComments();
      toast.success('Excluído!', 'Comentário excluído com sucesso');
    } catch (error) {
      console.error('Erro ao deletar comentário:', error);
      toast.error('Erro ao excluir', 'Não foi possível excluir o comentário');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      loadComments();
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 mb-2">
            Gerenciar Comentários
          </h1>
          <p className="text-text-light-secondary dark:text-text-dark-secondary">
            Busque comentários por questão e gerencie-os
          </p>
        </div>

        {/* Busca por Questão */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 shadow-md mb-6">
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
            ID da Questão
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={questionId}
              onChange={(e) => setQuestionId(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite o ID da questão..."
              className="flex-1 px-4 py-3 border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <button
              onClick={loadComments}
              disabled={loading || !questionId.trim()}
              className="px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Buscando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">search</span>
                  Buscar
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-2">
            Todos os comentários são aprovados automaticamente. Você pode deletar comentários inadequados.
          </p>
        </div>

        {/* Resultados */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : searched && comments.length === 0 ? (
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-md p-12 text-center">
            <span className="material-symbols-outlined text-6xl text-text-light-secondary dark:text-text-dark-secondary mb-4">
              forum
            </span>
            <p className="text-text-light-secondary dark:text-text-dark-secondary">
              Nenhum comentário encontrado para esta questão
            </p>
          </div>
        ) : comments.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                {comments.length} comentário(s) encontrado(s)
              </p>
            </div>
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 shadow-md hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      {comment.user_photo ? (
                        <img
                          src={comment.user_photo}
                          alt={comment.user_name}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : comment.is_staff_reply ? (
                        <img
                          src="/medbravelogo.png"
                          alt="MedBrave"
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <span className="material-symbols-outlined">person</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center text-sm mb-1">
                        <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                          {comment.is_staff_reply ? 'Equipe MedBrave' : comment.user_name || 'Usuário Anônimo'}
                        </span>
                        {comment.is_staff_reply && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">
                            Staff
                          </span>
                        )}
                        <span className="text-text-light-secondary dark:text-text-dark-secondary ml-2">
                          {new Date(comment.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-text-light-primary dark:text-text-dark-primary whitespace-pre-wrap">
                        {comment.content}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                        <span>{comment.like_count} curtidas</span>
                        <span>{comment.reply_count} respostas</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all hover:scale-110 active:scale-95"
                    title="Deletar comentário"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>

                {/* Respostas */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-4 ml-12 space-y-3 border-l-2 border-border-light dark:border-border-dark pl-4">
                    <p className="text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary">
                      Respostas:
                    </p>
                    {comment.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 shadow-sm hover:shadow-md transition-all flex items-start justify-between"
                      >
                        <div className="flex-1">
                          <div className="flex items-center text-sm mb-1">
                            <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                              {reply.is_staff_reply ? 'Equipe MedBrave' : reply.user_name || 'Usuário Anônimo'}
                            </span>
                            {reply.is_staff_reply && (
                              <span className="ml-2 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">
                                Staff
                              </span>
                            )}
                            <span className="text-text-light-secondary dark:text-text-dark-secondary ml-2">
                              {new Date(reply.created_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                            {reply.content}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDelete(reply.id)}
                          className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all hover:scale-110 active:scale-95 ml-2"
                          title="Deletar resposta"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
