'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
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

  if (!shouldRender) return null;

  const modalContent = (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-[500px] bg-surface-light dark:bg-surface-dark shadow-2xl dark:shadow-dark-2xl z-[10000] transform transition-transform duration-300 ease-out ${isAnimating ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-emerald-500">help_outline</span>
              <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">Como Jogar</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-surface-light dark:hover:bg-surface-dark rounded-xl transition-all duration-200 hover:scale-110 group"
            >
              <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary group-hover:text-emerald-500 transition-colors">close</span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Regras */}
            <ul className="space-y-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span>Leia o texto ao lado do caça-palavras - ele explica uma <strong>atualização importante</strong> em protocolos médicos.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span>As palavras destacadas no texto são as que você precisa encontrar no caça-palavras.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span>Clique e arraste (ou toque e arraste no celular) sobre as letras para selecionar.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span>Solte para confirmar a seleção. Se a palavra estiver correta, ela ficará verde.</span>
              </li>
            </ul>

            {/* Direções */}
            <div>
              <h3 className="font-bold text-base mb-4 text-text-light-primary dark:text-text-dark-primary">Direções válidas</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <span className="material-symbols-outlined text-emerald-500">arrow_forward</span>
                  <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Horizontal</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <span className="material-symbols-outlined text-emerald-500">arrow_downward</span>
                  <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Vertical</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <span className="material-symbols-outlined text-emerald-500">south_east</span>
                  <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Diagonal ↘</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <span className="material-symbols-outlined text-emerald-500">north_east</span>
                  <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Diagonal ↗</span>
                </div>
              </div>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-3">
                ⚠️ Palavras de trás pra frente não são aceitas!
              </p>
            </div>

            {/* Exemplo visual */}
            <div>
              <h3 className="font-bold text-base mb-4 text-text-light-primary dark:text-text-dark-primary">Exemplo</h3>
              <div className="space-y-4">
                {/* Grid exemplo */}
                <div className="flex gap-1">
                  {['A', 'T', 'L', 'S'].map((letter, i) => (
                    <div
                      key={i}
                      className="w-9 h-9 flex items-center justify-center text-sm font-bold rounded-md bg-emerald-500 text-white"
                    >
                      {letter}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-emerald-500 rounded-sm"></div>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    Palavra <strong className="text-emerald-500">ATLS</strong> encontrada corretamente!
                  </p>
                </div>
              </div>
            </div>

            {/* Info sobre atualizações */}
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
              <h3 className="font-bold text-base mb-2 text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-500">school</span>
                Aprenda jogando
              </h3>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Cada caça-palavras traz uma atualização importante de protocolos médicos. Enquanto encontra as palavras, você absorve o conteúdo!
              </p>
            </div>

            {/* Info adicional */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-border-light dark:border-border-dark">
              <h3 className="font-bold text-base mb-2 text-text-light-primary dark:text-text-dark-primary">Um jogo por dia</h3>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Um novo caça-palavras é liberado diariamente à meia-noite.
              </p>
            </div>

            {/* Legenda */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 border border-border-light dark:border-border-dark">
              <h3 className="font-bold text-base mb-3 text-text-light-primary dark:text-text-dark-primary">Legenda</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-md shadow-md"></div>
                  <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Selecionando letras</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500 rounded-md shadow-md"></div>
                  <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Palavra encontrada</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border-light dark:border-border-dark">
            <button
              onClick={onClose}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Entendi!
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
