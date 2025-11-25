'use client';

import { useState, useEffect } from 'react';
import ThemeToggle from '../ui/ThemeToggle';

interface HeaderProps {
  userName: string;
  userAvatar: string;
  notificationCount?: number;
  showGreeting?: boolean;
}

const motivationalQuotes = [
  'Quem tem coragem de aprender tem o poder de mudar o próprio destino.',
  'Estudar com coragem é plantar hoje o que o futuro colherá com orgulho.',
  'Ouse aprender, mude a história. Estude firme, floresça o futuro.',
  'Coragem é virar a página mesmo quando o capítulo é difícil.',
  'Viva com propósito, lute com fé, vença com persistência.',
];

export default function Header({ userName, userAvatar, notificationCount = 0, showGreeting = true }: HeaderProps) {
  const [quote, setQuote] = useState('');

  useEffect(() => {
    // Seleciona uma frase aleatória quando o componente monta
    const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    setQuote(randomQuote);
  }, []);

  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
      {showGreeting && (
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-700 dark:text-slate-200 mb-2">
            Olá, Dr. Inocêncio Jr.
          </h1>
          <p className="text-sm md:text-base font-light text-text-light-secondary dark:text-text-dark-secondary italic">
            {quote}
          </p>
        </div>
      )}
      
      <div className={`flex items-center gap-3 md:gap-6 ${!showGreeting ? 'ml-auto' : ''}`}>
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
        <img
          src={userAvatar}
          alt="User avatar"
          className="w-10 h-10 rounded-full cursor-pointer hover:ring-2 hover:ring-primary transition-all"
        />
      </div>
    </header>
  );
}
