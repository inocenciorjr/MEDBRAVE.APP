'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ReviewInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReviewInfoModal({ isOpen, onClose }: ReviewInfoModalProps) {
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

  if (!shouldRender || typeof window === 'undefined') return null;

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'
          }`}
        style={{ zIndex: 99999 }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-[600px] bg-surface-light dark:bg-surface-dark 
                   shadow-2xl dark:shadow-dark-2xl transform transition-transform duration-300 ease-out ${isAnimating ? 'translate-x-0' : 'translate-x-full'
          }`}
        style={{ zIndex: 100000 }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
            <div>
              <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary font-display">
                Agenda de Revisão Programada MedBRAVE
              </h2>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1 font-inter">
                Entenda como funciona nosso sistema inteligente
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-surface-light dark:hover:bg-surface-dark rounded-xl 
                       transition-all duration-200 hover:scale-110 group"
            >
              <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary 
                             group-hover:text-primary transition-colors">
                close
              </span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-text-light-secondary dark:text-text-dark-secondary font-inter">
            <div className="bg-background-light dark:bg-background-dark rounded-lg p-4 shadow-lg dark:shadow-dark-lg">
              <p className="text-sm leading-relaxed">
                A <strong className="text-text-light-primary dark:text-text-dark-primary">Agenda de Revisão Programada MedBRAVE</strong> utiliza um algoritmo próprio que
                analisa suas avaliações e ajusta automaticamente o intervalo de revisão. O sistema considera
                sua performance histórica, a dificuldade do conteúdo para você e seu padrão de estudos,
                calculando o momento ideal para revisar cada flashcard.
              </p>
            </div>

            <div className="bg-primary/10 dark:bg-primary/20 rounded-lg p-4 space-y-3 shadow-lg dark:shadow-dark-lg">
              <div className="flex items-center gap-2 pb-2 border-b-2 border-primary/30">
                <span className="material-symbols-outlined text-primary text-xl">touch_app</span>
                <p className="font-semibold text-text-light-primary dark:text-text-dark-primary font-display">
                  Como utilizar os botões de avaliação
                </p>
              </div>

              <div className="space-y-3">
                {/* Não lembrei */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 border-2 border-border-light dark:border-border-dark
                              shadow-lg dark:shadow-dark-lg hover:shadow-xl dark:hover:shadow-dark-xl
                              hover:scale-[1.02] transition-all duration-200 cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-red-600 dark:bg-red-600 text-white p-2 rounded-lg flex items-center justify-center shadow-md">
                      <span className="material-symbols-outlined text-xl">refresh</span>
                    </div>
                    <p className="font-semibold text-text-light-primary dark:text-text-dark-primary font-display">
                      Não lembrei!
                    </p>
                  </div>
                  <p className="text-sm pl-11 leading-relaxed">
                    Escolha essa opção se não conseguiu lembrar ou errou completamente. O sistema programará
                    uma revisão em <strong className="text-text-light-primary dark:text-text-dark-primary">aproximadamente 1 dia</strong> para reforçar esse conteúdo rapidamente.
                  </p>
                </div>

                {/* Difícil */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 border-2 border-border-light dark:border-border-dark
                              shadow-lg dark:shadow-dark-lg hover:shadow-xl dark:hover:shadow-dark-xl
                              hover:scale-[1.02] transition-all duration-200 cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-gray-600 dark:bg-gray-700 text-white p-2 rounded-lg flex items-center justify-center shadow-md">
                      <span className="material-symbols-outlined text-xl">trending_flat</span>
                    </div>
                    <p className="font-semibold text-text-light-primary dark:text-text-dark-primary font-display">
                      Lembrei, mas achei difícil!
                    </p>
                  </div>
                  <p className="text-sm pl-11 leading-relaxed">
                    Use essa opção caso tenha pensado muito para acertar ou se lembrou apenas após ver a resposta.
                    O intervalo será <strong className="text-text-light-primary dark:text-text-dark-primary">menor que o normal</strong>, garantindo revisão antes de esquecer.
                  </p>
                </div>

                {/* Bom */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 border-2 border-border-light dark:border-border-dark
                              shadow-lg dark:shadow-dark-lg hover:shadow-xl dark:hover:shadow-dark-xl
                              hover:scale-[1.02] transition-all duration-200 cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-purple-500 dark:bg-purple-500 text-white p-2 rounded-lg flex items-center justify-center shadow-md">
                      <span className="material-symbols-outlined text-xl">trending_up</span>
                    </div>
                    <p className="font-semibold text-text-light-primary dark:text-text-dark-primary font-display">
                      Quase consolidado na mente...
                    </p>
                  </div>
                  <p className="text-sm pl-11 leading-relaxed">
                    Considere essa opção se lembra da resposta mas é alguma decoreba, ou acha que pode esquecer
                    com mais facilidade. O sistema usará o <strong className="text-text-light-primary dark:text-text-dark-primary">intervalo padrão</strong>, aumentando
                    gradualmente o tempo entre revisões.
                  </p>
                </div>

                {/* Fácil */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 border-2 border-border-light dark:border-border-dark
                              shadow-lg dark:shadow-dark-lg hover:shadow-xl dark:hover:shadow-dark-xl
                              hover:scale-[1.02] transition-all duration-200 cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-purple-800 dark:bg-purple-900 text-white p-2 rounded-lg flex items-center justify-center shadow-md">
                      <span className="material-symbols-outlined text-xl">check_circle</span>
                    </div>
                    <p className="font-semibold text-text-light-primary dark:text-text-dark-primary font-display">
                      Acertei com confiança!
                    </p>
                  </div>
                  <p className="text-sm pl-11 leading-relaxed">
                    Selecione essa opção quando lembrar rapidamente e com total segurança da resposta.
                    O intervalo será <strong className="text-text-light-primary dark:text-text-dark-primary">maior que o normal</strong>, otimizando o tempo de estudo.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-background-light dark:bg-background-dark rounded-lg p-4 space-y-3 shadow-lg dark:shadow-dark-lg">
              <div className="flex items-center gap-2 pb-2 border-b border-border-light dark:border-border-dark">
                <span className="material-symbols-outlined text-primary text-xl">schedule</span>
                <p className="font-semibold text-text-light-primary dark:text-text-dark-primary font-display">
                  Revisões fora do tempo programado
                </p>
              </div>
              <p className="text-sm leading-relaxed">
                O algoritmo de revisão MedBRAVE consegue distinguir revisões feitas fora do tempo programado,
                impedindo que estudos repetidos afetem negativamente a agenda. Quando a opção "Não lembrei"
                é marcada, o sistema entenderá que é necessário rever o conteúdo antes do previsto e ajustará
                automaticamente o intervalo para reforçar esse conhecimento.
              </p>
            </div>

            <div className="bg-background-light dark:bg-background-dark rounded-lg p-4 space-y-3 shadow-lg dark:shadow-dark-lg">
              <div className="flex items-center gap-2 pb-2 border-b border-border-light dark:border-border-dark">
                <span className="material-symbols-outlined text-primary text-xl">tune</span>
                <p className="font-semibold text-text-light-primary dark:text-text-dark-primary font-display">
                  Personalização do tempo de revisão
                </p>
              </div>
              <p className="text-sm leading-relaxed">
                O tempo de revisão é ajustado automaticamente com base no modo de estudo selecionado
                e no tempo até a prova configurada, garantindo que o aprendizado seja otimizado para
                seus objetivos específicos.
              </p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border-2 border-yellow-200 dark:border-yellow-800 shadow-lg dark:shadow-dark-lg">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-xl flex-shrink-0">
                  info
                </span>
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-yellow-800 dark:text-yellow-200 font-display">
                    Ajuste manual de revisões
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-300 leading-relaxed">
                    Se o intervalo de alguma revisão não estiver adequado, é possível removê-la no
                    gerenciador de revisões e iniciar o estudo dela novamente com um novo intervalo.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-primary text-white rounded-lg font-semibold font-display hover:bg-primary/90 
                       transition-all duration-200 hover:scale-[1.02] shadow-lg hover:shadow-xl
                       focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Entendi
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
