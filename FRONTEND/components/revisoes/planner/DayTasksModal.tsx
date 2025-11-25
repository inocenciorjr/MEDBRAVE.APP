'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TaskSource } from './types';

interface Task {
  id: string;
  title: string;
  color: string;
  content_type?: 'QUESTION' | 'FLASHCARD' | 'ERROR_NOTEBOOK';
  count?: number;
  reviewIds?: string[];
  source: TaskSource;
  taskType?: string;
  status?: 'pending' | 'completed';
  completed_count?: number;
  total_count?: number;
}

interface DayTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  tasks: Task[];
  onTaskAction?: (task: Task) => void;
}

export function DayTasksModal({ isOpen, onClose, date, tasks, onTaskAction }: DayTasksModalProps) {
  if (!isOpen) return null;

  const getIconByContentType = (contentType?: 'QUESTION' | 'FLASHCARD' | 'ERROR_NOTEBOOK'): string => {
    if (!contentType) return 'menu_book';
    switch (contentType) {
      case 'QUESTION': return 'list_alt';
      case 'FLASHCARD': return 'layers';
      case 'ERROR_NOTEBOOK': return 'book';
    }
  };

  const getColorClasses = (color: string) => {
    // Safelist para Tailwind
    const classes: Record<string, string> = {
      cyan: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-900 dark:text-cyan-100 border-l-4 border-cyan-500',
      purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-900 dark:text-purple-100 border-l-4 border-purple-500',
      red: 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100 border-l-4 border-red-500',
      blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border-l-4 border-blue-500',
      orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-100 border-l-4 border-orange-500',
      pink: 'bg-pink-50 dark:bg-pink-900/20 text-pink-900 dark:text-pink-100 border-l-4 border-pink-500',
      yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100 border-l-4 border-yellow-500',
      green: 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100 border-l-4 border-green-500',
      gray: 'bg-gray-50 dark:bg-gray-900/20 text-gray-900 dark:text-gray-100 border-l-4 border-gray-500',
    };
    return classes[color] || 'bg-gray-50 dark:bg-gray-900/20 text-gray-900 dark:text-gray-100 border-l-4 border-gray-500';
  };

  const getSourceBadge = (source: TaskSource) => {
    if (source === 'mentor') {
      return (
        <span className="text-xs px-2 py-1 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg font-bold shadow-md">
          Mentor
        </span>
      );
    }
    if (source === 'admin') {
      return (
        <span className="text-xs px-2 py-1 bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-lg font-bold shadow-md">
          Admin
        </span>
      );
    }
    if (source === 'system') {
      return (
        <span className="text-xs px-2 py-1 bg-gradient-to-br from-primary to-primary/80 text-white rounded-lg font-bold shadow-md">
          Sistema
        </span>
      );
    }
    return (
      <span className="text-xs px-2 py-1 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg font-bold shadow-md">
        Você
      </span>
    );
  };

  const getTaskTitle = (task: Task): string => {
    if (task.content_type) {
      switch (task.content_type) {
        case 'FLASHCARD': return 'Flashcards';
        case 'QUESTION': return 'Questões';
        case 'ERROR_NOTEBOOK': return 'Caderno de Erros';
      }
    }
    return task.title || 'Sem título';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl dark:shadow-dark-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden pointer-events-auto animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b-2 border-border-light dark:border-border-dark bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 dark:to-transparent">
            <div className="flex-1">
              <h2 className="text-2xl font-display font-bold text-text-light-primary dark:text-text-dark-primary">
                Tarefas do Dia
              </h2>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1 font-medium">
                {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-surface-light dark:hover:bg-surface-dark rounded-xl transition-all duration-200 hover:scale-110 group"
            >
              <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary group-hover:text-primary transition-colors text-2xl">
                close
              </span>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)] custom-scrollbar">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-5xl text-primary">
                    event_available
                  </span>
                </div>
                <p className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                  Nenhuma tarefa para este dia
                </p>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Clique no dia para criar uma nova tarefa
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task, index) => {
                  const isReview = 'content_type' in task && task.content_type;
                  const icon = isReview 
                    ? getIconByContentType(task.content_type)
                    : 'menu_book';
                  const displayTitle = getTaskTitle(task);
                  const isCompleted = task.status === 'completed';
                  const hasProgress = isReview && task.completed_count !== undefined && task.total_count !== undefined && task.total_count > 0;
                  const progressPercent = hasProgress ? (task.completed_count! / task.total_count!) * 100 : 0;

                  return (
                    <div
                      key={task.id}
                      className={`relative flex items-center justify-between p-4 rounded-xl ${getColorClasses(task.color)} shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl gap-4 transition-all duration-300 hover:scale-[1.02] cursor-pointer group overflow-hidden`}
                      style={{
                        animationDelay: `${index * 50}ms`,
                      }}
                    >
                      {/* Barra de progresso (se houver) */}
                      {hasProgress && progressPercent > 0 && (
                        <div 
                          className="absolute left-0 top-0 bottom-0 transition-all duration-500 rounded-l-xl overflow-hidden"
                          style={{ width: `${progressPercent}%` }}
                        >
                          <div className={`absolute inset-0 ${
                            task.color === 'red' ? 'bg-progress-bar-red-light dark:bg-progress-bar-red-dark' :
                            task.color === 'purple' ? 'bg-progress-bar-purple-light dark:bg-progress-bar-purple-dark' :
                            task.color === 'cyan' ? 'bg-progress-bar-cyan-light dark:bg-progress-bar-cyan-dark' :
                            task.color === 'blue' ? 'bg-progress-bar-blue-light dark:bg-progress-bar-blue-dark' :
                            task.color === 'orange' ? 'bg-progress-bar-orange-light dark:bg-progress-bar-orange-dark' :
                            task.color === 'pink' ? 'bg-progress-bar-pink-light dark:bg-progress-bar-pink-dark' :
                            task.color === 'yellow' ? 'bg-yellow-600/40 dark:bg-yellow-500/30' :
                            task.color === 'green' ? 'bg-green-600/40 dark:bg-green-500/30' :
                            'bg-gray-600/40 dark:bg-gray-500/30'
                          }`} />
                        </div>
                      )}
                      
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 pointer-events-none" />
                      
                      <div className="flex items-center gap-3 min-w-0 flex-1 relative z-10">
                        {/* Ícone */}
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-md transition-all duration-200 ${
                          isCompleted 
                            ? 'bg-white/60 dark:bg-white/40' 
                            : 'bg-white/40 dark:bg-white/20 group-hover:scale-110 group-hover:bg-white/60 dark:group-hover:bg-white/30'
                        }`}>
                          <span className={`material-symbols-outlined text-2xl ${isCompleted ? 'filled' : ''}`}>
                            {isCompleted ? 'check_circle' : icon}
                          </span>
                        </div>
                        
                        {/* Título e descrição */}
                        <div className="min-w-0 flex-1">
                          <h3 className={`font-bold text-base truncate ${isCompleted ? 'line-through' : ''}`}>
                            {displayTitle}
                          </h3>
                          {isReview && task.count && !isCompleted && (
                            <p className="text-sm opacity-80 mt-0.5">
                              {task.count} {task.count === 1 ? 'item' : 'itens'} para revisar
                            </p>
                          )}
                          {isCompleted && (
                            <p className="text-sm opacity-80 mt-0.5 font-semibold">
                              Concluída ✓
                            </p>
                          )}
                          {hasProgress && !isCompleted && (
                            <p className="text-sm opacity-80 mt-0.5">
                              {task.completed_count} de {task.total_count} concluídos ({Math.round(progressPercent)}%)
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Botão de ação */}
                      <div className="flex items-center gap-2 flex-shrink-0 relative z-10">
                        {(() => {
                          // Verificar se é data futura para revisões do sistema
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const taskDate = new Date(date);
                          taskDate.setHours(0, 0, 0, 0);
                          const isFuture = taskDate > today;
                          const isSystemReview = task.source === 'system';
                          const isDisabled = isFuture && isSystemReview;
                          
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isDisabled) {
                                  alert('Não é possível iniciar revisões de datas futuras. Aguarde até o dia da revisão.');
                                  return;
                                }
                                if (onTaskAction) {
                                  onTaskAction(task);
                                }
                              }}
                              disabled={isDisabled}
                              title={isDisabled ? 'Revisões futuras não podem ser iniciadas' : ''}
                              className={`px-4 py-2 rounded-lg font-semibold shadow-md flex items-center gap-1 transition-all duration-200 ${
                                isDisabled
                                  ? 'bg-gray-400 dark:bg-gray-600 text-gray-200 dark:text-gray-400 cursor-not-allowed opacity-60'
                                  : 'bg-primary text-white hover:shadow-lg hover:bg-primary/90 hover:scale-105'
                              }`}
                            >
                              <span className="material-symbols-outlined !text-base">
                                {isSystemReview ? 'play_arrow' : (isCompleted ? 'restart_alt' : 'check_circle')}
                              </span>
                              <span className="text-sm">
                                {isSystemReview ? (isDisabled ? 'Bloqueado' : 'Revisar') : (isCompleted ? 'Desmarcar' : 'Concluir')}
                              </span>
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end p-6 border-t-2 border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl hover:bg-primary/90 transition-all duration-200 hover:scale-105"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.3);
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.5);
        }
      `}</style>
    </>
  );
}
