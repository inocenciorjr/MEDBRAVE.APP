'use client';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: string;
  trend?: { value: number; isPositive: boolean };
  color: 'primary' | 'cyan' | 'emerald' | 'amber' | 'rose';
}

const colorClasses = {
  primary: {
    bg: 'bg-primary/10 dark:bg-primary/20',
    icon: 'text-primary',
    ring: 'ring-primary/20',
  },
  cyan: {
    bg: 'bg-cyan-100/50 dark:bg-cyan-900/30',
    icon: 'text-cyan-600 dark:text-cyan-400',
    ring: 'ring-cyan-500/20',
  },
  emerald: {
    bg: 'bg-emerald-100/50 dark:bg-emerald-900/30',
    icon: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-500/20',
  },
  amber: {
    bg: 'bg-amber-100/50 dark:bg-amber-900/30',
    icon: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-500/20',
  },
  rose: {
    bg: 'bg-rose-100/50 dark:bg-rose-900/30',
    icon: 'text-rose-600 dark:text-rose-400',
    ring: 'ring-rose-500/20',
  },
};

function StatCard({ title, value, icon, trend, color }: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5 md:p-6
      border border-border-light dark:border-border-dark
      shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
      transition-all duration-300 hover:scale-[1.02] group">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl md:text-4xl font-display font-bold text-text-light-primary dark:text-text-dark-primary">
              {value}
            </span>
            {trend && (
              <span className={`flex items-center text-xs font-semibold ${
                trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                <span className="material-symbols-outlined text-sm">
                  {trend.isPositive ? 'trending_up' : 'trending_down'}
                </span>
                {trend.value}%
              </span>
            )}
          </div>
        </div>
        <div className={`p-3 rounded-xl ${colors.bg} ring-1 ${colors.ring}
          group-hover:scale-110 transition-transform duration-300`}>
          <span className={`material-symbols-outlined text-2xl ${colors.icon}`}>
            {icon}
          </span>
        </div>
      </div>
    </div>
  );
}

interface MentorDashboardStatsProps {
  data: {
    totalMentees: number;
    activeMentorships: number;
    pendingRequests: number;
    completedSessions: number;
  } | null;
}

export default function MentorDashboardStats({ data }: MentorDashboardStatsProps) {
  const stats: StatCardProps[] = [
    {
      title: 'Total de Mentorados',
      value: data?.totalMentees || 0,
      icon: 'groups',
      color: 'primary',
      trend: { value: 12, isPositive: true },
    },
    {
      title: 'Mentorias Ativas',
      value: data?.activeMentorships || 0,
      icon: 'handshake',
      color: 'cyan',
    },
    {
      title: 'Solicitações Pendentes',
      value: data?.pendingRequests || 0,
      icon: 'pending_actions',
      color: 'amber',
    },
    {
      title: 'Sessões Concluídas',
      value: data?.completedSessions || 0,
      icon: 'task_alt',
      color: 'emerald',
      trend: { value: 8, isPositive: true },
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {stats.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </div>
  );
}
