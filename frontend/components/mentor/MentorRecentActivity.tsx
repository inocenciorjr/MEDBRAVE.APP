'use client';

import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Activity {
  id: string;
  type: 'mentee_added' | 'simulado_created' | 'message_sent' | 'meeting_scheduled' | 'simulado_completed';
  title: string;
  description?: string;
  timestamp: string;
  metadata?: {
    menteeName?: string;
    simuladoName?: string;
    meetingDate?: string;
  };
}

interface MentorRecentActivityProps {
  activities: Activity[];
}

const activityConfig = {
  mentee_added: {
    icon: 'person_add',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  simulado_created: {
    icon: 'quiz',
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
  },
  message_sent: {
    icon: 'mail',
    color: 'text-primary',
    bg: 'bg-primary/10 dark:bg-primary/20',
  },
  meeting_scheduled: {
    icon: 'event',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
  },
  simulado_completed: {
    icon: 'task_alt',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-100 dark:bg-violet-900/30',
  },
};

function ActivityItem({ activity }: { activity: Activity }) {
  const config = activityConfig[activity.type];
  
  const timeAgo = formatDistanceToNow(new Date(activity.timestamp), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl
      hover:bg-background-light dark:hover:bg-background-dark
      transition-colors duration-200 group cursor-pointer">
      <div className={`p-2.5 rounded-xl ${config.bg} flex-shrink-0
        group-hover:scale-110 transition-transform duration-200`}>
        <span className={`material-symbols-outlined text-lg ${config.color}`}>
          {config.icon}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary line-clamp-2">
          {activity.title}
        </p>
        {activity.description && (
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-0.5 line-clamp-1">
            {activity.description}
          </p>
        )}
        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
          {timeAgo}
        </p>
      </div>
    </div>
  );
}

export default function MentorRecentActivity({ activities }: MentorRecentActivityProps) {
  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-2xl overflow-hidden
      border border-border-light dark:border-border-dark
      shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
      transition-all duration-300 h-full">
      {/* Header */}
      <div className="p-5 md:p-6 border-b border-border-light dark:border-border-dark
        bg-gradient-to-r from-background-light to-transparent dark:from-background-dark">
        <h2 className="text-lg font-display font-semibold text-text-light-primary dark:text-text-dark-primary">
          Atividade Recente
        </h2>
      </div>

      {/* Content */}
      <div className="p-3 md:p-4">
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <div className="relative inline-block mb-3">
              <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 rounded-xl blur-lg opacity-50" />
              <div className="relative p-4 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-3xl">
                  history
                </span>
              </div>
            </div>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Nenhuma atividade recente
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {activities.slice(0, 6).map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
