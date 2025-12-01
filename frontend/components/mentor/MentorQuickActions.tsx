'use client';

import { useRouter } from 'next/navigation';

interface QuickActionProps {
  title: string;
  description: string;
  icon: string;
  href: string;
  color: 'primary' | 'cyan' | 'emerald' | 'amber';
}

const colorClasses = {
  primary: {
    bg: 'bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10',
    hover: 'hover:from-primary/20 hover:to-primary/10 dark:hover:from-primary/30 dark:hover:to-primary/20',
    icon: 'text-primary',
    border: 'border-primary/20 hover:border-primary/40',
  },
  cyan: {
    bg: 'bg-gradient-to-br from-cyan-100/50 to-cyan-50/30 dark:from-cyan-900/30 dark:to-cyan-900/10',
    hover: 'hover:from-cyan-100 hover:to-cyan-50 dark:hover:from-cyan-900/40 dark:hover:to-cyan-900/20',
    icon: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-200/50 dark:border-cyan-800/50 hover:border-cyan-400/50',
  },
  emerald: {
    bg: 'bg-gradient-to-br from-emerald-100/50 to-emerald-50/30 dark:from-emerald-900/30 dark:to-emerald-900/10',
    hover: 'hover:from-emerald-100 hover:to-emerald-50 dark:hover:from-emerald-900/40 dark:hover:to-emerald-900/20',
    icon: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200/50 dark:border-emerald-800/50 hover:border-emerald-400/50',
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-100/50 to-amber-50/30 dark:from-amber-900/30 dark:to-amber-900/10',
    hover: 'hover:from-amber-100 hover:to-amber-50 dark:hover:from-amber-900/40 dark:hover:to-amber-900/20',
    icon: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200/50 dark:border-amber-800/50 hover:border-amber-400/50',
  },
};

function QuickActionCard({ title, description, icon, href, color }: QuickActionProps) {
  const router = useRouter();
  const colors = colorClasses[color];

  return (
    <button
      onClick={() => router.push(href)}
      className={`w-full p-5 rounded-2xl border-2 ${colors.bg} ${colors.hover} ${colors.border}
        shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
        transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
        text-left group`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl bg-white/50 dark:bg-black/20 shadow-md
          group-hover:scale-110 transition-transform duration-300`}>
          <span className={`material-symbols-outlined text-2xl ${colors.icon}`}>
            {icon}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
            {title}
          </h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary line-clamp-2">
            {description}
          </p>
        </div>
        <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary
          group-hover:translate-x-1 transition-transform duration-200">
          arrow_forward
        </span>
      </div>
    </button>
  );
}

export default function MentorQuickActions() {
  const actions: QuickActionProps[] = [
    {
      title: 'Adicionar Mentorado',
      description: 'Inclua novos alunos na sua lista de mentorados',
      icon: 'person_add',
      href: '/mentor/mentorados?action=add',
      color: 'primary',
    },
    {
      title: 'Criar Simulado',
      description: 'Monte um simulado personalizado para seus alunos',
      icon: 'quiz',
      href: '/mentor/simulados/criar',
      color: 'cyan',
    },
    {
      title: 'Enviar Recado',
      description: 'Deixe uma mensagem para seus mentorados',
      icon: 'mail',
      href: '/mentor/recados/novo',
      color: 'emerald',
    },
    {
      title: 'Agendar Reunião',
      description: 'Marque uma sessão de mentoria',
      icon: 'event',
      href: '/mentor/reunioes/agendar',
      color: 'amber',
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-display font-semibold text-text-light-primary dark:text-text-dark-primary">
        Ações Rápidas
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action) => (
          <QuickActionCard key={action.title} {...action} />
        ))}
      </div>
    </div>
  );
}
