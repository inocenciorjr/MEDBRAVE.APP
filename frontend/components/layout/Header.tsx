'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import ThemeToggle from '../ui/ThemeToggle';

interface HeaderProps {
  userName?: string;
  userAvatar?: string;
  notificationCount?: number;
  showGreeting?: boolean;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

const motivationalQuotes = [
  'Quem tem coragem de aprender tem o poder de mudar o próprio destino.',
  'Estudar com coragem é plantar hoje o que o futuro colherá com orgulho.',
  'Ouse aprender, mude a história. Estude firme, floresça o futuro.',
  'Coragem é virar a página mesmo quando o capítulo é difícil.',
  'Viva com propósito, lute com fé, vença com persistência.',
];

export default function Header({ userName: propUserName, userAvatar: propUserAvatar, notificationCount = 0, showGreeting = true, onMenuClick, showMenuButton = false }: HeaderProps) {
  const [quote, setQuote] = useState('');
  const [userName, setUserName] = useState(propUserName || 'Usuário');
  const [userAvatar, setUserAvatar] = useState(propUserAvatar || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Seleciona uma frase aleatória quando o componente monta
    const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    setQuote(randomQuote);

    // Busca dados do usuário se não foram fornecidos via props
    if (!propUserName || !propUserAvatar) {
      loadUserData();
    } else {
      setLoading(false);
    }
  }, [propUserName, propUserAvatar]);

  const loadUserData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Busca perfil do usuário
        const { data: profile } = await supabase
          .from('users')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single();

        const name = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
        const avatar = profile?.avatar_url || user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`;

        setUserName(name);
        setUserAvatar(avatar);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-8 gap-4">
      <div className="flex items-center gap-4 w-full md:w-auto">
        {/* Mobile Menu Button */}
        {showMenuButton && onMenuClick && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark text-text-light-secondary dark:text-text-dark-secondary transition-colors"
            aria-label="Abrir menu"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
        )}

        {showGreeting && (
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-semibold text-slate-700 dark:text-slate-200 mb-1 md:mb-2">
            {loading ? (
              <span className="inline-block w-48 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></span>
            ) : (
              `Olá, ${userName}`
            )}
          </h1>
            <p className="text-xs md:text-sm lg:text-base font-light text-text-light-secondary dark:text-text-dark-secondary italic line-clamp-2 md:line-clamp-none">
              {quote}
            </p>
          </div>
        )}
      </div>
      
      <div className={`flex items-center gap-3 md:gap-6 ${!showGreeting && !showMenuButton ? 'ml-auto' : 'ml-auto md:ml-0'}`}>
        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* Notifications */}
        <div className="relative">
          <button className="text-text-light-secondary dark:text-text-dark-secondary hover:text-primary dark:hover:text-primary transition-colors p-1">
            <span className="material-symbols-outlined filled text-2xl">notifications</span>
          </button>
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
          )}
        </div>

        {/* User Avatar */}
        {loading ? (
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
        ) : (
          <img
            src={userAvatar}
            alt={`Avatar de ${userName}`}
            className="w-10 h-10 rounded-full cursor-pointer hover:ring-2 hover:ring-primary transition-all"
            onError={(e) => {
              // Fallback se a imagem falhar
              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=6366f1&color=fff`;
            }}
          />
        )}
      </div>
    </header>
  );
}
