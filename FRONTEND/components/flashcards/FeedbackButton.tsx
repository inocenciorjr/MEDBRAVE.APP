'use client';

import { useState } from 'react';

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    setIsOpen(true);
    // TODO: Implement feedback modal
    console.log('Open feedback modal');
  };

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 transform z-40">
      <button
        onClick={handleClick}
        className="bg-primary text-white py-2 px-3 rounded-l-lg shadow-lg hover:shadow-xl flex items-center [writing-mode:vertical-rl] text-sm font-medium hover:bg-primary/90 transition-all"
        aria-label="Enviar feedback"
      >
        <span className="material-symbols-outlined text-base transform -rotate-90 mb-2">
          feedback
        </span>
        Feedback
      </button>
    </div>
  );
}
