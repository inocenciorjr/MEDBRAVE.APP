'use client';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { GameCard } from '@/components/playground/GameCard';

interface GameData {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  href: string;
  status: 'available' | 'coming_soon';
  difficulty?: 'easy' | 'medium' | 'hard';
}

const games: GameData[] = [
  {
    id: 'show-do-milhao',
    title: 'Show do Milhão',
    description: 'O jogo de perguntas e respostas MEDBRAVE!',
    imageUrl: '/images/playground/showdomilhao.png',
    href: '/playground/show-do-milhao',
    status: 'available',
    difficulty: 'hard',
  },
  {
    id: 'med-termooo',
    title: 'MED TERMOOOO',
    description: 'Descubra o termo médico do dia em 6 tentativas´',
    imageUrl: '/images/playground/medtermooo.png',
    href: '/playground/med-termooo',
    status: 'available',
    difficulty: 'medium',
  },
  {
    id: 'word-search',
    title: 'Caça-Palavras Atualizações',
    description: 'O tradicional jogo de caça-palavras sobre atualizações médicas!',
    imageUrl: '/images/playground/caca-palavras-atualizacoes.png',
    href: '/playground/word-search',
    status: 'available',
    difficulty: 'easy',
  },
];

export default function PlaygroundPage() {
  return (
    <>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: 'Playground', icon: 'sports_esports', href: '/playground' }
          ]}
        />
      </div>

      <div className="w-full py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
                Playground
              </h1>
              <p className="text-xs sm:text-sm font-inter text-text-light-secondary dark:text-text-dark-secondary">
                Que tal aquecer o cérebro antes do estudo começar?
              </p>
            </div>
          </div>

          {/* Games Grid - 3 por linha */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game, index) => (
              <div
                key={game.id}
                className="animate-fadeIn"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <GameCard
                  id={game.id}
                  title={game.title}
                  description={game.description}
                  imageUrl={game.imageUrl}
                  href={game.href}
                  status={game.status}
                  difficulty={game.difficulty}
                />
              </div>
            ))}
          </div>


        </div>
      </div>
    </>
  );
}
