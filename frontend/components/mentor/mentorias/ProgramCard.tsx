'use client';

import { MentorProgram, ProgramStatus } from '@/lib/services/mentorProgramService';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Users, Calendar, Play, Send, Trash2, DollarSign } from 'lucide-react';

interface ProgramCardProps {
  program: MentorProgram;
  onAction?: (programId: string, action: 'submit' | 'activate' | 'close' | 'delete') => Promise<void>;
  showActions?: boolean;
  variant?: 'mentor' | 'public';
}

export function ProgramCard({ program, onAction, showActions = true, variant = 'mentor' }: ProgramCardProps) {
  const router = useRouter();
  const [isActioning, setIsActioning] = useState(false);

  const handleNavigate = () => {
    if (variant === 'mentor') {
      router.push(`/mentor/mentorias/${program.id}`);
    } else {
      router.push(`/mentorias/${program.id}`);
    }
  };

  const handleAction = async (e: React.MouseEvent, action: 'submit' | 'activate' | 'close' | 'delete') => {
    e.stopPropagation();
    if (!onAction || isActioning) return;
    
    if (action === 'delete' && !confirm('Tem certeza que deseja excluir este programa?')) return;
    
    setIsActioning(true);
    try {
      await onAction(program.id, action);
    } finally {
      setIsActioning(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusConfig = (status: ProgramStatus) => {
    const config: Record<ProgramStatus, { label: string; className: string; icon: string }> = {
      draft: { 
        label: 'Rascunho', 
        className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        icon: 'edit_note'
      },
      pending_approval: { 
        label: 'Aguardando', 
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        icon: 'pending'
      },
      approved: { 
        label: 'Aprovado', 
        className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        icon: 'check_circle'
      },
      rejected: { 
        label: 'Rejeitado', 
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        icon: 'cancel'
      },
      active: { 
        label: 'Ativo', 
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        icon: 'play_circle'
      },
      closed: { 
        label: 'Encerrado', 
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
        icon: 'lock'
      },
    };
    return config[status];
  };

  const statusConfig = getStatusConfig(program.status);

  return (
    <div
      onClick={handleNavigate}
      className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-lg 
        hover:shadow-2xl dark:shadow-dark-xl dark:hover:shadow-dark-2xl 
        transition-all duration-300 flex flex-col
        border border-border-light dark:border-border-dark 
        hover:border-primary/40 dark:hover:border-primary/40
        hover:-translate-y-2 hover:z-20 cursor-pointer
        min-h-[420px] overflow-hidden group"
    >
      {/* Thumbnail/Cover */}
      <div className="relative w-full aspect-square bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden flex-shrink-0">
        {program.coverImageUrl ? (
          <img
            src={program.coverImageUrl}
            alt={program.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-6xl text-primary/30">
              school
            </span>
          </div>
        )}
        
        {/* Status Badge Overlay */}
        <div className="absolute top-3 right-3">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 
            backdrop-blur-sm shadow-sm ${statusConfig.className}`}>
            <span className="material-symbols-outlined text-sm">{statusConfig.icon}</span>
            {statusConfig.label}
          </span>
        </div>

        {/* Price Badge */}
        {!program.isFree && program.price && (
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold 
              bg-emerald-500 text-white shadow-sm flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              R$ {program.price}
            </span>
          </div>
        )}
        {program.isFree && (
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold 
              bg-blue-500 text-white shadow-sm">
              Gratuito
            </span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        {/* Title */}
        <h3 className="font-bold text-lg text-text-light-primary dark:text-text-dark-primary 
          mb-2 line-clamp-2 min-h-[3.5rem] group-hover:text-primary transition-colors duration-200">
          {program.title}
        </h3>

        {/* Description */}
        {program.description && (
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary 
            mb-4 line-clamp-2 flex-shrink-0">
            {program.description}
          </p>
        )}

        {/* Stats Chips */}
        <div className="flex gap-2 items-center mb-4 flex-wrap">
          {/* Participants */}
          <span className="relative group/tooltip text-sm bg-background-light dark:bg-surface-dark 
            text-text-light-primary dark:text-text-dark-primary px-3 py-1.5 rounded-lg 
            flex items-center gap-1.5 font-semibold border border-border-light dark:border-border-dark">
            <Users className="w-4 h-4 text-primary" />
            {program.activeParticipantsCount}/{program.maxParticipants || '∞'}
            {/* Tooltip */}
            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 
              bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 
              text-xs font-semibold rounded-lg whitespace-nowrap 
              opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 
              pointer-events-none z-[9999] shadow-xl">
              {program.activeParticipantsCount} de {program.maxParticipants || '∞'} participantes
              <span className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-[2px]
                w-0 h-0 border-l-[6px] border-l-transparent 
                border-r-[6px] border-r-transparent 
                border-t-[6px] border-t-slate-900 dark:border-t-slate-100"></span>
            </span>
          </span>

          {/* Date */}
          {program.startDate && (
            <span className="relative group/tooltip text-sm bg-background-light dark:bg-surface-dark 
              text-text-light-primary dark:text-text-dark-primary px-3 py-1.5 rounded-lg 
              flex items-center gap-1.5 font-semibold border border-border-light dark:border-border-dark">
              <Calendar className="w-4 h-4 text-primary" />
              {formatDate(program.startDate)}
              {/* Tooltip */}
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 
                bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 
                text-xs font-semibold rounded-lg whitespace-nowrap 
                opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 
                pointer-events-none z-[9999] shadow-xl">
                {formatDate(program.startDate)} - {formatDate(program.endDate) || 'Sem fim'}
                <span className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-[2px]
                  w-0 h-0 border-l-[6px] border-l-transparent 
                  border-r-[6px] border-r-transparent 
                  border-t-[6px] border-t-slate-900 dark:border-t-slate-100"></span>
              </span>
            </span>
          )}
        </div>

        {/* Rejection Reason */}
        {program.status === 'rejected' && program.rejectionReason && (
          <div className="mb-4 p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-xs text-red-600 dark:text-red-400 line-clamp-2">
              <strong>Motivo:</strong> {program.rejectionReason}
            </p>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action Buttons */}
        {showActions && (
          <div className="mt-auto pt-4 border-t border-border-light dark:border-border-dark space-y-2.5">
            {program.status === 'draft' && (
              <>
                <button
                  onClick={(e) => handleAction(e, 'submit')}
                  disabled={isActioning}
                  className="w-full py-2.5 px-4 bg-primary text-white rounded-xl text-sm font-semibold 
                    transition-all duration-200 flex items-center justify-center gap-2 
                    hover:bg-primary/90 hover:shadow-md active:scale-[0.98]
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  Enviar para Aprovação
                </button>
                <button
                  onClick={(e) => handleAction(e, 'delete')}
                  disabled={isActioning}
                  className="w-full py-2.5 px-4 border-2 border-red-200 dark:border-red-800 rounded-xl 
                    text-sm font-semibold text-red-600 dark:text-red-400
                    hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700
                    transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir Rascunho
                </button>
              </>
            )}

            {program.status === 'approved' && (
              <button
                onClick={(e) => handleAction(e, 'activate')}
                disabled={isActioning}
                className="w-full py-2.5 px-4 bg-emerald-600 text-white rounded-xl text-sm font-semibold 
                  transition-all duration-200 flex items-center justify-center gap-2 
                  hover:bg-emerald-700 hover:shadow-md active:scale-[0.98]
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" />
                Ativar Programa
              </button>
            )}

            {program.status === 'active' && (
              <button
                onClick={handleNavigate}
                className="w-full py-2.5 px-4 border-2 border-primary/30 dark:border-primary/40 rounded-xl 
                  text-sm font-semibold text-primary
                  hover:bg-primary/10 dark:hover:bg-primary/20 hover:border-primary 
                  transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-base">visibility</span>
                Ver Detalhes
              </button>
            )}

            {program.status === 'pending_approval' && (
              <div className="text-center py-2 text-sm text-amber-600 dark:text-amber-400 font-medium">
                <span className="material-symbols-outlined text-base align-middle mr-1">hourglass_top</span>
                Aguardando aprovação do admin
              </div>
            )}

            {(program.status === 'closed' || program.status === 'rejected') && (
              <button
                onClick={handleNavigate}
                className="w-full py-2.5 px-4 border-2 border-primary/30 dark:border-primary/40 rounded-xl 
                  text-sm font-semibold text-primary
                  hover:bg-primary/10 dark:hover:bg-primary/20 hover:border-primary 
                  transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-base">visibility</span>
                Ver Detalhes
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
