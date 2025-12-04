'use client';

import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

interface GameCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  color: string;
  bgGradient: string;
  status: 'available' | 'coming_soon';
  difficulty?: 'easy' | 'medium' | 'hard';
}

const games: GameCard[] = [
  {
    id: 'med-termooo',
    title: 'MED TERMOOOO',
    description: 'Descubra o termo médico do dia em 6 tentativas. Teste seu vocabulário médico!',
    icon: 'spellcheck',
    href: '/aquecimento/med-termooo',
    color: 'text-primary',
    bgGradient: 'from-primary/20 via-primary/10 to-primary/5',
    status: 'available',
    difficulty: 'medium',
  },
  {
    id: 'word-search',
    title: 'Caça-Palavras Atualizações',
    description: 'Fique por dentro das mudanças em protocolos médicos enquanto encontra palavras-chave!',
    icon: 'search',
    href: '/aquecimento/word-search',
    color: 'text-emerald-500',
    bgGradient: 'from-emerald-500/20 via-emerald-500/10 to-emerald-500/5',
    status: 'available',
    difficulty: 'easy',
  },
  {
    id: 'quiz-rapido',
    title: 'Quiz Rápido',
    description: 'Responda questões rápidas de múltipla escolha para aquecer o cérebro.',
    icon: 'bolt',
    href: '/aquecimento/quiz-rapido',
    color: 'text-amber-500',
    bgGradient: 'from-amber-500/20 via-amber-500/10 to-amber-500/5',
    status: 'coming_soon',
    difficulty: 'easy',
  },
  {
    id: 'conexoes-medicas',
    title: 'Conexões Médicas',
    description: 'Encontre as conexões entre termos médicos e agrupe-os corretamente.',
    icon: 'hub',
    href: '/aquecimento/conexoes',
    color: 'text-cyan-500',
    bgGradient: 'from-cyan-500/20 via-cyan-500/10 to-cyan-500/5',
    status: 'coming_soon',
    difficulty: 'hard',
  },
];

const difficultyConfig = {
  easy: { label: 'Fácil', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  medium: { label: 'Médio', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  hard: { label: 'Difícil', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

export default function AquecimentoPage() {
  const router = useRouter();

  const getCardClassName = (status: 'available' | 'coming_soon') => {
    const base = 'relative group bg-surface-light dark:bg-surface-dark rounded-2xl overflow-hidden border border-border-light dark:border-border-dark shadow-lg hover:shadow-2xl dark:shadow-dark-lg dark:hover:shadow-dark-2xl transition-all duration-300 animate-fadeIn';
    if (status === 'available') {
      return `${base} cursor-pointer hover:-translate-y-2 hover:border-primary/40`;
    }
    return `${base} cursor-not-allowed opacity-70`;
  };

  return (
    <>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: 'Aquecimento', icon: 'sports_esports', href: '/aquecimento' }
          ]}
        />
      </div>

      <div className="w-full py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
                Jogos de Raciocínio
              </h1>
              <p className="text-xs sm:text-sm font-inter text-text-light-secondary dark:text-text-dark-secondary">
                Aqueça o cérebro com jogos rápidos e divertidos antes de estudar
              </p>
            </div>
          </div>

          {/* Games Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {games.map((game, index) => (
              <div
                key={game.id}
                onClick={() => game.status === 'available' && router.push(game.href)}
                className={getCardClassName(game.status)}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${game.bgGradient} opacity-50`} />
                
                {/* Content */}
                <div className="relative p-4 sm:p-6 flex flex-col h-full min-h-[240px] sm:min-h-[280px]">
                  {/* Header with Icon */}
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br ${game.bgGradient} shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}>
                      <span className={`material-symbols-outlined text-3xl sm:text-4xl ${game.color}`}>
                        {game.icon}
                      </span>
                    </div>
                    
                    {/* Status Badge */}
                    {game.status === 'coming_soon' ? (
                      <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        Em breve
                      </span>
                    ) : game.difficulty && (
                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${difficultyConfig[game.difficulty].color}`}>
                        {difficultyConfig[game.difficulty].label}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-lg sm:text-xl font-display font-bold mb-2 text-text-light-primary dark:text-text-dark-primary group-hover:text-primary transition-colors duration-200">
                    {game.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-text-light-secondary dark:text-text-dark-secondary mb-4 sm:mb-6 flex-1">
                    {game.description}
                  </p>

                  {/* Action Button */}
                  <div className="mt-auto">
                    {game.status === 'available' ? (
                      <button className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-primary text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-200 group-hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-lg">play_arrow</span>
                        Jogar Agora
                      </button>
                    ) : (
                      <div className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-lg">lock</span>
                        Em Desenvolvimento
                      </div>
                    )}
                  </div>
                </div>

                {/* Hover Overlay Effect */}
                {game.status === 'available' && (
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                )}
              </div>
            ))}
          </div>

          {/* Info Section */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-border-light dark:border-border-dark shadow-lg dark:shadow-dark-lg">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-primary/10 rounded-lg sm:rounded-xl flex-shrink-0">
                <span className="material-symbols-outlined text-primary text-xl sm:text-2xl">lightbulb</span>
              </div>
              <div>
                <h3 className="font-display font-semibold text-sm sm:text-base text-text-light-primary dark:text-text-dark-primary mb-1">
                  Por que aquecer o cérebro?
                </h3>
                <p className="text-xs sm:text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Estudos mostram que atividades de aquecimento cognitivo antes de estudar podem melhorar 
                  a retenção de informações em até 20%. Jogue alguns minutos antes de começar suas revisões!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
