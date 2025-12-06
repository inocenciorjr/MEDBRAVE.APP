'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  comment: string | null | undefined;
  onNext?: () => void;
  showNextButton?: boolean;
  hideCloseButton?: boolean; // Para modo skip - esconde botão fechar e força avançar
}

export function CommentModal({ isOpen, onClose, comment, onNext, showNextButton = true, hideCloseButton = false }: CommentModalProps) {
  if (!isOpen) return null;

  const handleNext = () => {
    onClose();
    if (onNext) onNext();
  };

  // Se hideCloseButton está ativo, clicar fora também avança
  const handleOverlayClick = () => {
    if (hideCloseButton && onNext) {
      handleNext();
    } else {
      onClose();
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleOverlayClick}
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm"
          />

          {/* Modal - Slide do lado direito - RESPONSIVO (fullscreen em mobile) */}
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 sm:inset-auto sm:top-0 sm:right-0 sm:bottom-0 w-full sm:max-w-md md:max-w-lg z-[10000] shadow-2xl overflow-hidden flex flex-col"
            style={{
              background: 'linear-gradient(180deg, rgba(30,10,60,0.98) 0%, rgba(20,5,40,1) 100%)',
              borderLeft: '2px solid rgba(168,85,247,0.5)',
              boxShadow: '-10px 0 50px rgba(168,85,247,0.3)',
            }}
          >
            {/* Header - RESPONSIVO */}
            <div 
              className="flex items-center justify-between p-3 sm:p-4 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(168,85,247,0.3)' }}
            >
              <h2 
                className="text-base sm:text-lg md:text-xl font-bold flex items-center gap-1.5 sm:gap-2"
                style={{ color: '#e9d5ff', textShadow: '0 0 10px rgba(168,85,247,0.5)' }}
              >
                <span className="material-symbols-outlined text-lg sm:text-xl md:text-2xl" style={{ color: '#10b981' }}>school</span>
                <span className="hidden sm:inline">Comentário da Questão</span>
                <span className="sm:hidden">Comentário</span>
              </h2>
              {!hideCloseButton && (
                <button
                  onClick={onClose}
                  className="p-1.5 sm:p-2 rounded-lg transition-colors hover:bg-purple-500/20"
                  style={{ background: 'rgba(40,20,70,0.5)' }}
                >
                  <span className="material-symbols-outlined text-xl sm:text-2xl" style={{ color: '#a78bfa' }}>close</span>
                </button>
              )}
            </div>

            {/* Conteúdo com scroll - RESPONSIVO */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              {comment ? (
                <div 
                  className="prose prose-invert max-w-none"
                  style={{ 
                    color: 'rgba(233,213,255,0.9)',
                  }}
                >
                  <div 
                    className="p-3 sm:p-4 rounded-lg sm:rounded-xl"
                    style={{
                      background: 'linear-gradient(180deg, rgba(16,185,129,0.1) 0%, rgba(5,150,105,0.15) 100%)',
                      border: '1px solid rgba(16,185,129,0.3)',
                    }}
                  >
                    <div 
                      className="text-xs sm:text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: comment }}
                      style={{
                        color: 'rgba(233,213,255,0.85)',
                      }}
                    />
                  </div>
                  
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-8 sm:py-12">
                  <span 
                    className="material-symbols-outlined text-5xl sm:text-6xl mb-3 sm:mb-4" 
                    style={{ color: 'rgba(168,85,247,0.3)' }}
                  >
                    comment
                  </span>
                  <p className="text-sm sm:text-base" style={{ color: 'rgba(168,85,247,0.6)' }}>
                    Esta questão não possui comentário disponível.
                  </p>
                </div>
              )}
            </div>

            {/* Footer - RESPONSIVO */}
            <div 
              className="p-3 sm:p-4 flex-shrink-0 flex flex-col sm:flex-row gap-2 sm:gap-3"
              style={{ borderTop: '1px solid rgba(168,85,247,0.3)' }}
            >
              {!hideCloseButton && (
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all hover:scale-[1.02]"
                  style={{
                    background: 'rgba(40,20,70,0.5)',
                    border: '2px solid rgba(168,85,247,0.4)',
                    color: '#a78bfa',
                  }}
                >
                  Fechar
                </button>
              )}
              {showNextButton && onNext && (
                <button
                  onClick={handleNext}
                  className="flex-1 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all hover:scale-[1.02] flex items-center justify-center gap-1.5 sm:gap-2"
                  style={{
                    background: 'linear-gradient(180deg, rgba(168,85,247,0.8) 0%, rgba(88,28,135,1) 100%)',
                    border: '2px solid #a855f7',
                    color: '#fff',
                    boxShadow: '0 0 15px rgba(168,85,247,0.4)',
                  }}
                >
                  <span className="hidden sm:inline">Próxima Questão</span>
                  <span className="sm:hidden">Próxima</span>
                  <span className="material-symbols-outlined text-lg sm:text-xl">arrow_forward</span>
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
