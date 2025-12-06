'use client';

import Link from 'next/link';
import { GameCardCompact } from '@/components/playground/GameCardCompact';

const games = [
  {
    id: 'show-do-milhao',
    title: 'Show do Milhão',
    description: 'O jogo de perguntas e respostas MEDBRAVE!',
    imageUrl: '/images/playground/showdomilhao.png',
    href: '/playground/show-do-milhao',
    status: 'available' as const,
  },
  {
    id: 'med-termooo',
    title: 'MED TERMOOOO',
    description: 'Descubra o termo médico do dia em 6 tentativas´',
    imageUrl: '/images/playground/medtermooo.png',
    href: '/playground/med-termooo',
    status: 'available' as const,
  },
  {
    id: 'word-search',
    title: 'Caça-Palavras',
    description: 'O tradicional jogo de caça-palavras sobre atualizações médicas!',
    imageUrl: '/images/playground/caca-palavras-atualizacoes.png',
    href: '/playground/word-search',
    status: 'available' as const,
  },
];

export default function PlaygroundSection() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">sports_esports</span>
          <h2 className="text-base font-display font-semibold text-text-light-primary dark:text-text-dark-primary">
            Playground
          </h2>
        </div>
        <Link 
          href="/playground"
          className="group px-3 py-1.5 rounded-lg text-sm font-display font-medium 
                     bg-primary/10 dark:bg-primary/20 text-primary 
                     hover:bg-primary hover:text-white
                     border border-primary/20 hover:border-primary
                     shadow-sm hover:shadow-md hover:shadow-primary/20
                     transition-all duration-300 flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-base">sports_esports</span>
          Ver todos
          <span className="material-symbols-outlined text-base transition-transform duration-300 group-hover:translate-x-0.5">
            chevron_right
          </span>
        </Link>
      </div>

      {/* Games Grid - responsivo para mobile, tablet e desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
        {games.map((game) => (
          <GameCardCompact
            key={game.id}
            title={game.title}
            description={game.description}
            imageUrl={game.imageUrl}
            href={game.href}
            status={game.status}
          />
        ))}
      </div>
    </div>
  );
}
