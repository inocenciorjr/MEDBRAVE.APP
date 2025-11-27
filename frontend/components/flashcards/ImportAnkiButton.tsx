'use client';

import { useState } from 'react';
import { ImportAnkiModal } from './ImportAnkiModal';

export function ImportAnkiButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="bg-primary text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
      >
        <span className="material-symbols-outlined text-base">
          upload
        </span>
        Importar Anki
      </button>

      <ImportAnkiModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          // Recarregar a página ou atualizar a lista de coleções
          window.location.reload();
        }}
      />
    </>
  );
}
