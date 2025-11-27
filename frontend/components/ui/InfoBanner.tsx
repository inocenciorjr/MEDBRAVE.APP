'use client';

import { useState } from 'react';

interface InfoBannerProps {
  title: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export default function InfoBanner({
  title,
  message,
  dismissible = true,
  onDismiss,
}: InfoBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <div className="bg-primary/10 border border-primary/20 text-primary p-4 rounded-lg flex items-center justify-between shadow-sm dark:shadow-dark-lg animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined flex-shrink-0">info</span>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm">
            {message}
            <span className="material-symbols-outlined text-sm align-middle ml-1">
              trending_flat
            </span>
          </p>
        </div>
      </div>
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="font-semibold text-primary px-4 py-2 rounded-lg hover:bg-primary/20 transition-colors flex-shrink-0"
        >
          Fechar
        </button>
      )}
    </div>
  );
}
