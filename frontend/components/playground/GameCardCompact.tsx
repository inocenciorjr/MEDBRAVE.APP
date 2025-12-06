'use client';

import { useRouter } from 'next/navigation';

interface GameCardCompactProps {
  title: string;
  description: string;
  imageUrl?: string;
  href: string;
  status: 'available' | 'coming_soon';
}

export function GameCardCompact({ 
  title, 
  description, 
  imageUrl, 
  href, 
  status, 
}: GameCardCompactProps) {
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
      className={`bg-surface-light dark:bg-surface-dark rounded-xl shadow-md 
        hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl 
        transition-all duration-300 flex flex-col
        border border-border-light dark:border-border-dark 
        ${isAvailable ? 'hover:border-primary/40 dark:hover:border-primary/40 hover:-translate-y-1 cursor-pointer' : 'opacity-70 cursor-not-allowed'}
        overflow-hidden group`}
    >
      {/* Thumbnail - imagem separada */}
      <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden flex-shrink-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className={`w-full h-full object-cover transition-transform duration-500 ${isAvailable ? 'group-hover:scale-110' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
            <span className="material-symbols-outlined text-5xl text-primary/30">
              sports_esports
            </span>
          </div>
        )}

        {/* Gradient Overlay sutil */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 ${isAvailable ? 'group-hover:opacity-100' : ''} transition-opacity duration-300`} />
      </div>

      {/* Content - separado da imagem */}
      <div className="flex flex-col flex-1 p-4">
        {/* Description */}
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary 
          mb-3 line-clamp-2 flex-1">
          {description}
        </p>
        
        {/* Action Button */}
        {isAvailable ? (
          <button
            className="w-full py-2 px-4 bg-primary text-white rounded-lg text-sm font-semibold 
              transition-all duration-200 flex items-center justify-center gap-2 
              hover:bg-primary/90 active:scale-[0.98]
              shadow-md shadow-primary/30"
          >
            <span className="material-symbols-outlined text-lg">play_arrow</span>
            Jogar
          </button>
        ) : (
          <div className="w-full py-2 px-4 bg-slate-100 dark:bg-slate-800 rounded-lg 
            text-sm font-semibold text-slate-500 dark:text-slate-400
            flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-lg">lock</span>
            Em breve
          </div>
        )}
      </div>
    </div>
  );
}
