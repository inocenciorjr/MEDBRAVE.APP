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
          className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          Ver todos
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </Link>
      </div>

      {/* Games Grid - 3 colunas */}
      <div className="grid grid-cols-3 gap-4">
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
