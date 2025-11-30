'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ListCreatedSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
  listName: string;
  questionCount: number;
}

export function ListCreatedSuccessModal({ 
  isOpen, 
  onClose, 
  listId, 
  listName, 
  questionCount 
}: ListCreatedSuccessModalProps) {
  const router = useRouter();
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = 'hidden';
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
        document.body.style.overflow = 'unset';
      }, 300);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleAnswerList = () => {
    router.push(`/lista-questoes/${listId}`);
    onClose();
  };

  const handleGoToLists = () => {
    router.push('/lista-questoes/minhas-listas');
    onClose();
  };

  if (!shouldRender) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl dark:shadow-dark-2xl z-[9999] transition-all duration-300 ${
          isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <div className="p-6 md:p-8">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-5xl">
                check_circle
              </span>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-slate-100 mb-3">
            Lista Criada com Sucesso!
          </h2>

          {/* Description */}
          <p className="text-center text-text-light-secondary dark:text-text-dark-secondary mb-6">
            Sua lista <span className="font-semibold text-slate-700 dark:text-slate-200">{listName}</span> foi criada com{' '}
            <span className="font-semibold text-primary">{questionCount} questões</span>.
          </p>

          {/* Info Card */}
          <div className="bg-background-light dark:bg-background-dark rounded-xl p-4 mb-6 border border-border-light dark:border-border-dark">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-xl mt-0.5">
                lightbulb
              </span>
              <div className="flex-1">
                <p className="text-sm text-slate-700 dark:text-slate-200 font-medium mb-1">
                  O que você gostaria de fazer agora?
                </p>
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                  Você pode começar a responder imediatamente ou acessar suas listas depois.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleAnswerList}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl shadow-lg shadow-primary/30"
            >
              <span className="material-symbols-outlined">play_arrow</span>
              <span>Responder Lista</span>
            </button>

            <button
              onClick={handleGoToLists}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-background-light dark:bg-background-dark text-slate-700 dark:text-slate-200 rounded-xl font-semibold border-2 border-border-light dark:border-border-dark hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
            >
              <span className="material-symbols-outlined">folder_open</span>
              <span>Ir para Minhas Listas</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
