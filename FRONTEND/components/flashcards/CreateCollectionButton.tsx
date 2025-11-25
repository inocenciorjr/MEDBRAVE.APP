'use client';

import { useState } from 'react';

export function CreateCollectionButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    setIsModalOpen(true);
    // TODO: Implement modal
    console.log('Open create collection modal');
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all hover:scale-105"
      aria-label="Criar nova coleção"
    >
      <span className="material-symbols-outlined text-base">add_circle</span>
      Criar coleção
    </button>
  );
}
