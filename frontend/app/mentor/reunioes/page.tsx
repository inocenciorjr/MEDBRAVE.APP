'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { TabGroup } from '@/components/ui/TabGroup';
import { format, isToday, isTomorrow, isPast, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ScheduleMeetingModal from '@/components/mentor/reunioes/ScheduleMeetingModal';

interface Meeting {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  duration: number;
  type: 'individual' | 'group';
  status: 'scheduled' | 'completed' | 'cancelled';
  participants: { id: string; name: string; avatar?: string }[];
  meetingLink?: string;
}

type TabId = 'upcoming' | 'past' | 'all';

export default function ReunioesPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('upcoming');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    const loadMeetings = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // TODO: Implementar chamada real à API
        setMeetings([]);
      } catch (error) {
        console.error('Erro ao carregar reuniões:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMeetings();
  }, []);

  const filteredMeetings = useMemo(() => {
    const now = new Date();
    return meetings.filter(meeting => {
      const meetingDate = new Date(`${meeting.date}T${meeting.time}`);
      if (activeTab === 'upcoming') return isFuture(meetingDate);
      if (activeTab === 'past') return isPast(meetingDate);
      return true;
    });
  }, [meetings, activeTab]);

  const counts = useMemo(() => {
    const now = new Date();
    return {
      upcoming: meetings.filter(m => isFuture(new Date(`${m.date}T${m.time}`))).length,
      past: meetings.filter(m => isPast(new Date(`${m.date}T${m.time}`))).length,
      all: meetings.length,
    };
  }, [meetings]);

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  };

  const getStatusBadge = (status: Meeting['status']) => {
    const styles = {
      scheduled: 'bg-primary/10 text-primary',
      completed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
      cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    };
    const labels = { scheduled: 'Agendada', completed: 'Concluída', cancelled: 'Cancelada' };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Mentor', icon: 'school', href: '/mentor' },
          { label: 'Reuniões', icon: 'event', href: '/mentor/reunioes' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-text-light-primary dark:text-text-dark-primary">
            Reuniões
          </h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Agende e gerencie sessões de mentoria
          </p>
        </div>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="px-5 py-2.5 bg-primary text-white rounded-xl font-semibold
            hover:bg-primary/90 transition-all duration-200
            shadow-lg hover:shadow-xl shadow-primary/30
            hover:scale-105 active:scale-[0.98]
            flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          Agendar Reunião
        </button>
      </div>

      {/* Info card */}
      <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-900/10
        rounded-2xl p-5 border border-amber-200/50 dark:border-amber-800/50">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">
              calendar_month
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
              Sincronização com Planner
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              As reuniões agendadas são automaticamente sincronizadas com o planner dos seus mentorados,
              garantindo que eles não percam nenhuma sessão.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <TabGroup
        tabs={[
          { id: 'upcoming', label: `Próximas (${counts.upcoming})`, icon: 'upcoming' },
          { id: 'past', label: `Passadas (${counts.past})`, icon: 'history' },
          { id: 'all', label: `Todas (${counts.all})`, icon: 'list' },
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
      />

      {/* Lista de reuniões */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5
              border border-border-light dark:border-border-dark animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-1/3 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-12
          border border-border-light dark:border-border-dark text-center">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-amber-500/20 rounded-2xl blur-xl" />
            <div className="relative p-5 bg-amber-100 dark:bg-amber-900/30 rounded-2xl">
              <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-5xl">
                event
              </span>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
            {activeTab === 'upcoming' ? 'Nenhuma reunião agendada' : 'Nenhuma reunião encontrada'}
          </h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-6 max-w-md mx-auto">
            {activeTab === 'upcoming' 
              ? 'Agende sessões de mentoria com seus alunos para acompanhar o progresso deles.'
              : 'Não há reuniões nesta categoria.'
            }
          </p>
          {activeTab === 'upcoming' && (
            <button
              onClick={() => setShowScheduleModal(true)}
              className="px-6 py-3 bg-primary text-white rounded-xl font-semibold
                hover:bg-primary/90 transition-all duration-200
                shadow-lg hover:shadow-xl shadow-primary/30
                hover:scale-105 active:scale-[0.98]
                inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined">add</span>
              Agendar Primeira Reunião
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMeetings.map((meeting) => (
            <div
              key={meeting.id}
              className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5
                border border-border-light dark:border-border-dark
                hover:border-primary/30 hover:shadow-lg dark:hover:shadow-dark-lg
                transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-start gap-4">
                {/* Data */}
                <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-bold text-primary">
                    {format(new Date(meeting.date), 'd')}
                  </span>
                  <span className="text-xs text-primary uppercase">
                    {format(new Date(meeting.date), 'MMM', { locale: ptBR })}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary
                      group-hover:text-primary transition-colors truncate">
                      {meeting.title}
                    </h3>
                    {getStatusBadge(meeting.status)}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary mb-2">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      {meeting.time} ({meeting.duration}min)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">
                        {meeting.type === 'individual' ? 'person' : 'groups'}
                      </span>
                      {meeting.type === 'individual' ? 'Individual' : 'Grupo'}
                    </span>
                  </div>

                  {meeting.description && (
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary line-clamp-1">
                      {meeting.description}
                    </p>
                  )}

                  {/* Participantes */}
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex -space-x-2">
                      {meeting.participants.slice(0, 3).map((p, i) => (
                        <div
                          key={p.id}
                          className="w-8 h-8 rounded-full bg-primary/10 border-2 border-surface-light dark:border-surface-dark
                            flex items-center justify-center"
                          style={{ zIndex: 3 - i }}
                        >
                          <span className="material-symbols-outlined text-primary text-sm">person</span>
                        </div>
                      ))}
                      {meeting.participants.length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-surface-light dark:border-surface-dark
                          flex items-center justify-center text-xs font-semibold text-text-light-secondary dark:text-text-dark-secondary">
                          +{meeting.participants.length - 3}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                      {meeting.participants.length} participante(s)
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {meeting.meetingLink && meeting.status === 'scheduled' && (
                    <a
                      href={meeting.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium
                        hover:bg-primary/90 transition-all duration-200
                        flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-lg">videocam</span>
                      Entrar
                    </a>
                  )}
                  <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary
                    group-hover:text-primary group-hover:translate-x-1 transition-all duration-200">
                    chevron_right
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <ScheduleMeetingModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSuccess={() => {
          setShowScheduleModal(false);
          // Recarregar lista
        }}
      />
    </div>
  );
}
