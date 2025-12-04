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
              <span className="material-symbols-outlined text-2xl text-primary">help_outline</span>
              <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">Como Jogar</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-surface-light dark:hover:bg-surface-dark rounded-xl transition-all duration-200 hover:scale-110 group"
            >
              <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary group-hover:text-primary transition-colors">close</span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Regras */}
            <ul className="space-y-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
              <li className="flex items-start gap-3">
                <span className="text-primary mt-0.5">•</span>
                <span>Escreva a palavra e pressione "Enter" para confirmar sua tentativa.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-0.5">•</span>
                <span>A cada tentativa, as cores indicam o quão perto você está da resposta.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-0.5">•</span>
                <span>Acentos não precisam ser incluídos.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-0.5">•</span>
                <span>Você tem 6 tentativas para descobrir o termo médico do dia.</span>
              </li>
            </ul>

            {/* Exemplos */}
            <div>
              <h3 className="font-bold text-base mb-4 text-text-light-primary dark:text-text-dark-primary">Exemplos</h3>
              <div className="space-y-6">
                {/* Exemplo 1 - Letra correta */}
                <div className="space-y-3">
                  <div className="flex gap-1.5">
                    <div className="w-10 h-10 flex items-center justify-center bg-emerald-500 text-white text-xl font-bold rounded-md shadow-md">F</div>
                    <div className="w-10 h-10 flex items-center justify-center border-2 border-border-light dark:border-border-dark text-xl font-bold rounded-md text-text-light-primary dark:text-text-dark-primary">E</div>
                    <div className="w-10 h-10 flex items-center justify-center border-2 border-border-light dark:border-border-dark text-xl font-bold rounded-md text-text-light-primary dark:text-text-dark-primary">B</div>
                    <div className="w-10 h-10 flex items-center justify-center border-2 border-border-light dark:border-border-dark text-xl font-bold rounded-md text-text-light-primary dark:text-text-dark-primary">R</div>
                    <div className="w-10 h-10 flex items-center justify-center border-2 border-border-light dark:border-border-dark text-xl font-bold rounded-md text-text-light-primary dark:text-text-dark-primary">E</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 flex items-center justify-center bg-emerald-500 text-white text-sm font-bold rounded-sm">F</div>
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">A letra <strong className="text-emerald-500">F</strong> está na palavra e na posição correta.</p>
                  </div>
                </div>

                {/* Exemplo 2 - Letra presente */}
                <div className="space-y-3">
                  <div className="flex gap-1.5">
                    <div className="w-10 h-10 flex items-center justify-center border-2 border-border-light dark:border-border-dark text-xl font-bold rounded-md text-text-light-primary dark:text-text-dark-primary">T</div>
                    <div className="w-10 h-10 flex items-center justify-center bg-primary/20 border-2 border-primary text-xl font-bold rounded-md text-primary">U</div>
                    <div className="w-10 h-10 flex items-center justify-center border-2 border-border-light dark:border-border-dark text-xl font-bold rounded-md text-text-light-primary dark:text-text-dark-primary">M</div>
                    <div className="w-10 h-10 flex items-center justify-center border-2 border-border-light dark:border-border-dark text-xl font-bold rounded-md text-text-light-primary dark:text-text-dark-primary">O</div>
                    <div className="w-10 h-10 flex items-center justify-center border-2 border-border-light dark:border-border-dark text-xl font-bold rounded-md text-text-light-primary dark:text-text-dark-primary">R</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 flex items-center justify-center bg-primary text-white text-sm font-bold rounded-sm">U</div>
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">A letra <strong className="text-primary">U</strong> está na palavra, mas na posição errada.</p>
                  </div>
                </div>

                {/* Exemplo 3 - Letra ausente */}
                <div className="space-y-3">
                  <div className="flex gap-1.5">
                    <div className="w-10 h-10 flex items-center justify-center border-2 border-border-light dark:border-border-dark text-xl font-bold rounded-md text-text-light-primary dark:text-text-dark-primary">P</div>
                    <div className="w-10 h-10 flex items-center justify-center border-2 border-border-light dark:border-border-dark text-xl font-bold rounded-md text-text-light-primary dark:text-text-dark-primary">U</div>
                    <div className="w-10 h-10 flex items-center justify-center border-2 border-border-light dark:border-border-dark text-xl font-bold rounded-md text-text-light-primary dark:text-text-dark-primary">L</div>
                    <div className="w-10 h-10 flex items-center justify-center bg-slate-500 text-white text-xl font-bold rounded-md">S</div>
                    <div className="w-10 h-10 flex items-center justify-center border-2 border-border-light dark:border-border-dark text-xl font-bold rounded-md text-text-light-primary dark:text-text-dark-primary">O</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 flex items-center justify-center bg-slate-500 text-white text-sm font-bold rounded-sm">S</div>
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">A letra <strong className="text-slate-500">S</strong> não existe na palavra.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Info adicional */}
            <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-4 border border-primary/20">
              <h3 className="font-bold text-base mb-2 text-text-light-primary dark:text-text-dark-primary">Um jogo por dia</h3>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Um novo termo médico é liberado diariamente à meia-noite. Por isso, só é possível jogar uma vez por dia. Volte amanhã para um novo desafio!
              </p>
            </div>

            {/* Legenda de cores */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 border border-border-light dark:border-border-dark">
              <h3 className="font-bold text-base mb-3 text-text-light-primary dark:text-text-dark-primary">Legenda</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500 rounded-md shadow-md"></div>
                  <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Letra correta na posição correta</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-md shadow-md"></div>
                  <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Letra correta na posição errada</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-500 rounded-md shadow-md"></div>
                  <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Letra não existe na palavra</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border-light dark:border-border-dark">
            <button
              onClick={onClose}
              className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300"
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
