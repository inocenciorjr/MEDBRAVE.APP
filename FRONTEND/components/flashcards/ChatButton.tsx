'use client';

import { useState } from 'react';

export function ChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    setIsOpen(true);
    // TODO: Implement chat interface
    console.log('Open chat');
  };

  return (
    <div className="fixed bottom-8 right-8 z-40">
      <button
        onClick={handleClick}
        className="bg-[#084D7B] text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:bg-[#07446d] transition-all hover:scale-110"
        aria-label="Abrir chat de suporte"
      >
        <span className="material-symbols-outlined text-3xl">chat</span>
      </button>
    </div>
  );
}
