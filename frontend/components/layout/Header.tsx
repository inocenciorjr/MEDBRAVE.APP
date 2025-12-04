'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import ThemeToggle from '../ui/ThemeToggle';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';
import { useUser } from '@/contexts/UserContext';

interface HeaderProps {
  userName?: string;
  userAvatar?: string;
  notificationCount?: number;
  showGreeting?: boolean;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

const motivationalQuotes = [
  'Não pare agora! Sua resiliência vai te levar ao topo. Estude e brilhe!',
  'Que bom te ver de volta! Cada vez que você retorna, você prova pra si mesmo que tá realmente comprometido. Continue, seu progresso tá acontecendo bem na sua frente.',
  'Quando você se dedica de verdade, o conteúdo começa a fazer sentido, a mente engrena e o caminho fica mais leve. Mantém essa vibração, ela puxa você adiante.',
  'Tem dias que o estudo flui, tem dias que exige força mental. Nos dois casos, você cresce. Essa capacidade de seguir independente do humor é o que constrói excelência.',
  'A jornada fica bem mais clara quando você lembra do porquê começou. Cada sessão focada entrega uma versão mais preparada de você mesmo.',
  'Nada supera a sua vontade de vencer. Com essa mentalidade, você vai entregar tudo o que precisa.',
  'Aperta o ritmo. Essa prova não vai ter chance contra você.',
  'Tem muita coisa boa te esperando lá na frente. Continua com esse cuidado e essa dedicação.',
  'Você se cobra muito, mas olha quanta coisa já superou. Usa essa força a seu favor hoje.',
  'Hoje é dia de treinar o cérebro no máximo: repete, ajusta, corrige e evolui. É assim que se fica forte.',
  'Quando o dia estiver pesado, lembra: já teve dias assim e venceu todos eles.',
  'Descansar faz parte do plano. Quem recupera bem, rende melhor.',
  'Hidrata, respira, organiza! Pequenas atitudes que deixam o estudo muito mais leve.',
];

export default function Header({ userName: propUserName, userAvatar: propUserAvatar, notificationCount = 0, showGreeting = true, onMenuClick, showMenuButton = false }: HeaderProps) {
  const { user, loading: userLoading } = useUser();
  const [quote, setQuote] = useState('');
  const [userName, setUserName] = useState(propUserName || 'Usuário');
  const [userAvatar, setUserAvatar] = useState(propUserAvatar || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Seleciona uma frase aleatória quando o componente monta
    const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    setQuote(randomQuote);
    
    if (propUserName && propUserAvatar) {
       setUserName(propUserName);
       setUserAvatar(propUserAvatar);
       setLoading(false);
       return;
    }

    if (user) {
       setUserName(user.displayName || 'Usuário');
       setUserAvatar(user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=6366f1&color=fff`);
       setLoading(false);
    } else if (!userLoading) {
       setLoading(false);
    }
  }, [propUserName, propUserAvatar, user, userLoading]);

  // Fallback de segurança: se user estiver null mas temos token no localStorage, tentar buscar (redundância)
  useEffect(() => {
     if (!user && !loading && typeof window !== 'undefined' && localStorage.getItem('authToken')) {
        const fetchProfile = async () => {
           try {
             const response = await fetchWithAuth('/user/me');
             if (response.ok) {
               const data = await response.json();
               setUserName(data.displayName || 'Usuário');
               setUserAvatar(data.photoURL || '');
             }
           } catch(e) {}
        };
        fetchProfile();
     }
  }, [user, loading]);

  return (
    <header className="mb-4 md:mb-8">
      {/* Top Row - Always horizontal */}
      <div className="flex items-center justify-between gap-3 mb-3 md:mb-0">
        {/* Left: Menu + Name */}
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          {/* Mobile Menu Button */}
          {showMenuButton && onMenuClick && (
            <button
              onClick={onMenuClick}
              className="p-2 rounded-lg hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark text-text-light-secondary dark:text-text-dark-secondary transition-colors flex-shrink-0"
              aria-label="Abrir menu"
            >
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
          )}

          {showGreeting && (
            <h1 className="text-base md:text-2xl lg:text-3xl font-semibold text-slate-700 dark:text-slate-200 truncate">
              {loading ? (
                <span className="inline-block w-32 md:w-48 h-6 md:h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></span>
              ) : (
                `Olá, ${userName}`
              )}
            </h1>
          )}
        </div>

        {/* Right: Icons */}
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          {/* Theme Toggle Button */}
          <ThemeToggle />

          {/* Notifications */}
          <div className="relative">
            <button className="text-text-light-secondary dark:text-text-dark-secondary hover:text-primary dark:hover:text-primary transition-colors p-1">
              <span className="material-symbols-outlined filled text-xl md:text-2xl">notifications</span>
            </button>
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
            )}
          </div>

          {/* User Avatar */}
          {loading ? (
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
          ) : (
            <img
              src={userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=6366f1&color=fff`}
              alt={`Avatar de ${userName}`}
              className="w-8 h-8 md:w-10 md:h-10 rounded-full cursor-pointer hover:ring-2 hover:ring-primary transition-all object-cover"
              onError={(e) => {
                // Evitar loop infinito de erro
                if (!e.currentTarget.dataset.fallback) {
                  e.currentTarget.dataset.fallback = 'true';
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=6366f1&color=fff`;
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Quote Row - Below on mobile */}
      {showGreeting && (
        <div className="mt-2 md:mt-0">
          <p className="text-xs md:text-sm lg:text-base font-light text-text-light-secondary dark:text-text-dark-secondary italic">
            {quote}
          </p>
        </div>
      )}
    </header>
  );
}
