'use client';

import { useRouter } from 'next/navigation';

interface GameCardProps {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  href: string;
  status: 'available' | 'coming_soon';
  difficulty?: 'easy' | 'medium' | 'hard';
  stats?: {
    players?: number;
    yourBest?: string;
  };
}

const difficultyConfig = {
  easy: { 
    label: 'Fácil', 
    className: 'bg-emerald-500 text-white',
    icon: 'sentiment_satisfied'
  },
  medium: { 
    label: 'Médio', 
    className: 'bg-amber-500 text-white',
    icon: 'sentiment_neutral'
  },
  hard: { 
    label: 'Difícil', 
    className: 'bg-red-500 text-white',
    icon: 'local_fire_department'
  },
};

export function GameCard({ 
  id, 
  title, 
  description, 
  imageUrl, 
  href, 
  status, 
  difficulty,
  stats 
}: GameCardProps) {
  const router = useRouter();

  const handleNavigate = () => {
    if (status === 'available') {
      router.push(href);
    }
  };

  const isAvailable = status === 'available';

  return (
    <div
      onClick={handleNavigate}
      className={`bg-surface-light dark:bg-surface-dark rounded-2xl shadow-lg 
        hover:shadow-2xl dark:shadow-dark-xl dark:hover:shadow-dark-2xl 
        transition-all duration-300 flex flex-col
        border border-border-light dark:border-border-dark 
        ${isAvailable ? 'hover:border-primary/40 dark:hover:border-primary/40 hover:-translate-y-2 hover:z-20 cursor-pointer' : 'opacity-70 cursor-not-allowed'}
        min-h-[420px] overflow-hidden group`}
    >
      {/* Thumbnail/Cover */}
      <div className="relative w-full aspect-square bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden flex-shrink-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className={`w-full h-full object-cover transition-transform duration-500 ${isAvailable ? 'group-hover:scale-110' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
            <span className="material-symbols-outlined text-6xl text-primary/30">
              sports_esports
            </span>
          </div>
        )}
        


        {/* Gradient Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 ${isAvailable ? 'group-hover:opacity-100' : ''} transition-opacity duration-300`} />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        {/* Title */}
        <h3 className={`font-bold text-lg text-text-light-primary dark:text-text-dark-primary 
          mb-2 line-clamp-2 min-h-[3.5rem] ${isAvailable ? 'group-hover:text-primary' : ''} transition-colors duration-200`}>
          {title}
        </h3>

        {/* Description */}
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary 
          mb-4 line-clamp-2 flex-shrink-0">
          {description}
        </p>

        {/* Stats Chips */}
        {stats && (
          <div className="flex gap-2 items-center mb-4 flex-wrap">
            {stats.players !== undefined && (
              <span className="text-sm bg-background-light dark:bg-surface-dark 
                text-text-light-primary dark:text-text-dark-primary px-3 py-1.5 rounded-lg 
                flex items-center gap-1.5 font-semibold border border-border-light dark:border-border-dark">
                <span className="material-symbols-outlined text-base text-primary">group</span>
                {stats.players}/∞
              </span>
            )}
            {stats.yourBest && (
              <span className="text-sm bg-background-light dark:bg-surface-dark 
                text-text-light-primary dark:text-text-dark-primary px-3 py-1.5 rounded-lg 
                flex items-center gap-1.5 font-semibold border border-border-light dark:border-border-dark">
                <span className="material-symbols-outlined text-base text-primary">emoji_events</span>
                {stats.yourBest}
              </span>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action Button */}
        <div className="mt-auto pt-4 border-t border-border-light dark:border-border-dark">
          {isAvailable ? (
            <button
              className="w-full py-2.5 px-4 bg-primary text-white rounded-xl text-sm font-semibold 
                transition-all duration-200 flex items-center justify-center gap-2 
                hover:bg-primary/90 hover:shadow-md active:scale-[0.98]
                shadow-lg shadow-primary/30"
            >
              <span className="material-symbols-outlined text-lg">play_arrow</span>
              Jogar Agora
            </button>
          ) : (
            <div className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 rounded-xl 
              text-sm font-semibold text-slate-500 dark:text-slate-400
              flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-lg">lock</span>
              Em Desenvolvimento
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
