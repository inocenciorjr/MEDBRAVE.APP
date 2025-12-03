'use client';

import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';

interface MentorSidebarProps {
  isExpanded: boolean;
  isMobile: boolean;
  onClose: () => void;
  mentorProfile: any;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/mentor' },
  { id: 'mentees', label: 'Mentorados', icon: 'groups', href: '/mentor/mentorados' },
  { id: 'billing', label: 'Cobranças', icon: 'payments', href: '/mentor/cobrancas' },
  { id: 'report', label: 'Relatório Financeiro', icon: 'monitoring', href: '/mentor/relatorio-financeiro' },
  { id: 'simulados', label: 'Simulados', icon: 'quiz', href: '/mentor/simulados' },
  { id: 'messages', label: 'Recados', icon: 'mail', href: '/mentor/recados' },
  { id: 'meetings', label: 'Reuniões', icon: 'event', href: '/mentor/reunioes' },
  { id: 'analytics', label: 'Análises', icon: 'analytics', href: '/mentor/analises' },
  { id: 'settings', label: 'Configurações', icon: 'settings', href: '/mentor/configuracoes' },
];

export default function MentorSidebar({ isExpanded, isMobile, onClose, mentorProfile }: MentorSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigation = (href: string) => {
    router.push(href);
    if (isMobile) onClose();
  };

  const isActive = (href: string) => {
    if (href === '/mentor') return pathname === '/mentor';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`h-full bg-surface-light dark:bg-surface-dark border-r border-border-light dark:border-border-dark
        flex flex-col transition-all duration-300 ease-out
        ${isExpanded || isMobile ? 'w-64' : 'w-20'}
        shadow-xl dark:shadow-dark-xl
      `}
    >
      {/* Logo */}
      <div className="p-4 border-b border-border-light dark:border-border-dark">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex-shrink-0">
            <Image
              src="/medbravelogo.png"
              alt="MedBrave"
              fill
              sizes="40px"
              className="object-contain dark:hidden"
            />
            <Image
              src="/medbravelogo-dark.png"
              alt="MedBrave"
              fill
              sizes="40px"
              className="object-contain hidden dark:block"
            />
          </div>
          <div className={`transition-opacity duration-200 ${isExpanded || isMobile ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
            <span className="font-display font-bold text-lg text-primary">Mentor</span>
          </div>
        </div>
      </div>

      {/* Profile Mini */}
      <div className={`p-4 border-b border-border-light dark:border-border-dark ${isExpanded || isMobile ? '' : 'flex justify-center'}`}>
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex-shrink-0 ring-2 ring-primary/20">
            {mentorProfile?.avatar ? (
              <Image src={mentorProfile.avatar} alt={mentorProfile.name || 'Mentor'} fill sizes="40px" className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-xl">person</span>
              </div>
            )}
          </div>
          <div className={`transition-opacity duration-200 min-w-0 ${isExpanded || isMobile ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
            <p className="font-semibold text-sm text-text-light-primary dark:text-text-dark-primary truncate">
              {mentorProfile?.name || 'Mentor'}
            </p>
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary truncate">
              {mentorProfile?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const active = isActive(item.href);
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.href)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                ${active
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-primary/5 dark:hover:bg-primary/10 hover:text-primary'
                }
                ${isExpanded || isMobile ? '' : 'justify-center'}
              `}
            >
              <span className={`material-symbols-outlined text-xl ${active ? 'filled' : ''}`}>
                {item.icon}
              </span>
              <span className={`font-medium text-sm transition-opacity duration-200 ${isExpanded || isMobile ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border-light dark:border-border-dark">
        <button
          onClick={() => router.push('/')}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
            text-text-light-secondary dark:text-text-dark-secondary hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600
            ${isExpanded || isMobile ? '' : 'justify-center'}
          `}
        >
          <span className="material-symbols-outlined text-xl">logout</span>
          <span className={`font-medium text-sm transition-opacity duration-200 ${isExpanded || isMobile ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
            Voltar ao App
          </span>
        </button>
      </div>
    </aside>
  );
}
