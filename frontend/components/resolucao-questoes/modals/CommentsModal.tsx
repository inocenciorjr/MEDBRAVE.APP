'use client';

import { useEffect, useState } from 'react';
import { getQuestionComments, createComment, likeComment, deleteComment } from '@/lib/api/comments';
import { useAuth } from '@/lib/contexts/AuthContext';
import { QuestionExplanation } from '../QuestionExplanation';
import { useToast } from '@/lib/contexts/ToastContext';

interface Comment {
  id: string;
  user_id: string;
  content: string;
  is_staff_reply: boolean;
  like_count: number;
  reply_count: number;
  created_at: string;
  user_name?: string;
  user_photo?: string;
  replies: Comment[];
}

interface CommentsModalProps {
  questionId: string;
  professorComment?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CommentsModal({ questionId, professorComment, isOpen, onClose }: CommentsModalProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [filter, setFilter] = useState<'all' | 'my'>('all');
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = 'hidden';
      // Pequeno delay para permitir a animação
      setTimeout(() => setIsAnimating(true), 10);
      loadComments();
    } else {
      setIsAnimating(false);
      // Aguardar animação terminar antes de desmontar
      const timer = setTimeout(() => {
        setShouldRender(false);
        document.body.style.overflow = 'unset';
      }, 300);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, questionId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const data = await getQuestionComments(questionId);
      setComments(data);
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    try {
      await createComment({
        content_id: questionId,
        content_type: 'question',
        content: newComment,
      });
      setNewComment('');
      loadComments();
    } catch (error) {
      console.error('Erro ao criar comentário:', error);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim()) return;

    try {
      await createComment({
        content_id: questionId,
        content_type: 'question',
        parent_id: parentId,
        content: replyContent,
      });
      setReplyContent('');
      setReplyingTo(null);
      loadComments();
    } catch (error) {
      console.error('Erro ao criar resposta:', error);
    }
  };

  const handleLike = async (commentId: string) => {
    try {
      await likeComment(commentId);
      loadComments();
    } catch (error) {
      console.error('Erro ao curtir comentário:', error);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Tem certeza que deseja deletar este comentário?')) return;

    try {
      await deleteComment(commentId);
      loadComments();
    } catch (error) {
      console.error('Erro ao deletar comentário:', error);
      toast.error('Erro ao deletar comentário');
    }
  };

  if (!shouldRender) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-end transition-all duration-300 ${
        isAnimating ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/0'
      }`}
      onClick={onClose}
    >
      {/* Modal lateral direito */}
      <div 
        className={`h-full w-full max-w-2xl bg-surface-light dark:bg-surface-dark shadow-[0_0_50px_rgba(0,0,0,0.3)] dark:shadow-[0_0_50px_rgba(0,0,0,0.6)] flex flex-col transition-transform duration-300 ease-out ${
          isAnimating ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão de fechar flutuante */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-surface-light dark:bg-surface-dark hover:bg-background-light dark:hover:bg-background-dark transition-all hover:scale-110 active:scale-95 shadow-md"
          aria-label="Fechar comentários"
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>

        {/* Lista de comentários */}
        <div className="flex-1 overflow-y-auto p-6 pt-16 space-y-6">
          {/* Explicação da Questão */}
          {professorComment && (
            <QuestionExplanation 
              questionId={questionId}
              professorComment={professorComment}
            />
          )}

          {/* Filtros de comentários */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all hover:scale-105 active:scale-95 ${
                filter === 'all'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary hover:bg-background-light dark:hover:bg-background-dark hover:shadow-sm border border-border-light dark:border-border-dark'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter('my')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all hover:scale-105 active:scale-95 ${
                filter === 'my'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary hover:bg-background-light dark:hover:bg-background-dark hover:shadow-sm border border-border-light dark:border-border-dark'
              }`}
            >
              Meus comentários
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-6xl text-text-light-secondary dark:text-text-dark-secondary mb-4">
                forum
              </span>
              <p className="text-text-light-secondary dark:text-text-dark-secondary">
                Nenhum comentário ainda. Seja o primeiro a comentar!
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="space-y-4">
                {/* Comentário principal */}
                <div className={`p-4 rounded-lg shadow-sm hover:shadow-md transition-all ${
                  comment.is_staff_reply
                    ? 'bg-primary/5 border-l-4 border-primary'
                    : 'bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark'
                }`}>
                  <div className="flex items-start space-x-3">
                    <div className="h-10 w-10 rounded-full bg-background-light dark:bg-background-dark flex items-center justify-center flex-shrink-0 border border-border-light dark:border-border-dark">
                      {comment.user_photo ? (
                        <img
                          src={comment.user_photo}
                          alt={comment.user_name}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">
                          person
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center text-sm mb-1">
                        <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                          {comment.is_staff_reply ? 'Equipe MedBrave' : comment.user_name || 'Usuário Anônimo'}
                        </span>
                        <span className="text-text-light-secondary dark:text-text-dark-secondary ml-2">
                          {new Date(comment.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary whitespace-pre-wrap">
                        {comment.content}
                      </p>
                      <div className="flex items-center text-xs mt-2 space-x-4">
                        <button
                          onClick={() => handleLike(comment.id)}
                          className="font-semibold text-primary hover:text-primary/80 transition-all hover:scale-110 active:scale-95"
                        >
                          curtir
                        </button>
                        <span className="text-text-light-secondary dark:text-text-dark-secondary">
                          {comment.like_count} curtidas
                        </span>
                        <button
                          onClick={() => setReplyingTo(comment.id)}
                          className="font-semibold text-primary hover:text-primary/80 transition-all hover:scale-110 active:scale-95"
                        >
                          responder
                        </button>
                        {user && comment.user_id === user.uid && (
                          <button
                            onClick={() => handleDelete(comment.id)}
                            className="font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-all hover:scale-110 active:scale-95"
                          >
                            deletar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Respostas */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-11 space-y-4">
                    {comment.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className={`p-4 rounded-lg shadow-sm hover:shadow-md transition-all ${
                          reply.is_staff_reply
                            ? 'bg-primary/5 border-l-4 border-primary'
                            : 'bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="h-8 w-8 rounded-full bg-background-light dark:bg-background-dark flex items-center justify-center flex-shrink-0 border border-border-light dark:border-border-dark">
                            {reply.user_photo ? (
                              <img
                                src={reply.user_photo}
                                alt={reply.user_name}
                                className="h-8 w-8 rounded-full"
                              />
                            ) : reply.is_staff_reply ? (
                              <img
                                src="/medbravelogo.png"
                                alt="MedBrave"
                                className="h-8 w-8 rounded-full"
                              />
                            ) : (
                              <span className="material-symbols-outlined text-sm">person</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center text-sm mb-1">
                              <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                                {reply.is_staff_reply ? 'Equipe MedBrave' : reply.user_name || 'Usuário Anônimo'}
                              </span>
                              <span className="text-text-light-secondary dark:text-text-dark-secondary ml-2">
                                {new Date(reply.created_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary whitespace-pre-wrap">
                              {reply.content}
                            </p>
                            <div className="flex items-center text-xs mt-2 space-x-4">
                              <button
                                onClick={() => handleLike(reply.id)}
                                className="font-semibold text-primary hover:text-primary/80 transition-all hover:scale-110 active:scale-95"
                              >
                                curtir
                              </button>
                              <span className="text-text-light-secondary dark:text-text-dark-secondary">
                                {reply.like_count} curtidas
                              </span>
                              {user && reply.user_id === user.uid && (
                                <button
                                  onClick={() => handleDelete(reply.id)}
                                  className="font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-all hover:scale-110 active:scale-95"
                                >
                                  deletar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Campo de resposta */}
                {replyingTo === comment.id && (
                  <div className="ml-11">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Digite sua resposta..."
                      className="w-full px-4 py-3 border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                      rows={3}
                    />
                    <div className="flex justify-end space-x-2 mt-2">
                      <button
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContent('');
                        }}
                        className="px-4 py-2 text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-all hover:scale-105 active:scale-95"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleSubmitReply(comment.id)}
                        disabled={!replyContent.trim()}
                        className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        Responder
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Campo de novo comentário */}
          <div className="mt-8 pt-6 border-t border-border-light dark:border-border-dark">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Digitar comentário..."
              className="w-full px-4 py-3 border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
              rows={4}
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={handleSubmitComment}
                disabled={!newComment.trim()}
                className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">send</span>
                Enviar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
