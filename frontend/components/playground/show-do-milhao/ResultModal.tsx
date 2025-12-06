'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import { formatPrize } from './types';
import { resultOverlayVariants, resultModalVariants, correctCelebrationVariants } from './animations';

interface ResultModalProps {
  isOpen: boolean;
  status: 'won' | 'lost' | 'stopped';
  finalPrize: number;
  guaranteedPrize: number;
  totalCorrect: number;
  totalQuestions: number;
  onPlayAgain: () => void;
  onExit: () => void;
  onFatality?: () => void; // Modo Fatality
  fatalityMode?: boolean;
  fatalityMultiplier?: number;
  fatalityCorrect?: number;
}

export function ResultModal({
  isOpen,
  status,
  finalPrize,
  guaranteedPrize,
  totalCorrect,
  totalQuestions,
  onPlayAgain,
  onExit,
  onFatality,
  fatalityMode = false,
  fatalityMultiplier = 1,
  fatalityCorrect = 0,
}: ResultModalProps) {
  const confettiTriggered = useRef(false);

  useEffect(() => {
    if (isOpen && !confettiTriggered.current) {
      confettiTriggered.current = true;

      if (status === 'won') {
        const duration = 5000;
        const end = Date.now() + duration;

        const frame = () => {
          confetti({
            particleCount: 7,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.7 },
            colors: ['#a855f7', '#c084fc', '#e9d5ff', '#fbbf24', '#f59e0b'],
          });
          confetti({
            particleCount: 7,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.7 },
            colors: ['#a855f7', '#c084fc', '#e9d5ff', '#fbbf24', '#f59e0b'],
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();
      } else if (status === 'stopped' && finalPrize > 0) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#a855f7', '#c084fc', '#fbbf24'],
        });
      }
    }

    return () => {
      confettiTriggered.current = false;
    };
  }, [isOpen, status, finalPrize]);

  if (!isOpen) return null;

  const getStatusConfig = () => {
    // Se perdeu no modo Fatality
    if (fatalityMode && status === 'lost') {
      return {
        icon: '💀',
        title: 'FATALITY!',
        subtitle: fatalityCorrect > 0 
          ? `Você acertou ${fatalityCorrect} questão(ões) no modo Fatality!` 
          : 'O modo Fatality te derrotou!',
        borderColor: 'rgba(239,68,68,0.8)',
        glowColor: 'rgba(239,68,68,0.5)',
      };
    }

    switch (status) {
      case 'won':
        return {
          icon: '🏆',
          title: 'PARABÉNS!',
          subtitle: 'Você é um MILIONÁRIO!',
          borderColor: 'rgba(251,191,36,0.6)',
          glowColor: 'rgba(251,191,36,0.3)',
        };
      case 'stopped':
        return {
          icon: '🎯',
          title: 'Você parou!',
          subtitle: finalPrize > 0 ? 'Boa decisão! Você garantiu:' : 'Você saiu sem prêmio',
          borderColor: 'rgba(168,85,247,0.6)',
          glowColor: 'rgba(168,85,247,0.3)',
        };
      case 'lost':
        return {
          icon: '😢',
          title: 'Que pena!',
          subtitle: guaranteedPrize > 0 ? 'Você leva o prêmio garantido:' : 'Você não ganhou nada',
          borderColor: 'rgba(239,68,68,0.6)',
          glowColor: 'rgba(239,68,68,0.3)',
        };
    }
  };

  const config = getStatusConfig();
  const displayPrize = status === 'lost' ? guaranteedPrize : finalPrize;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            variants={resultOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md"
          />

          <motion.div
            variants={resultModalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          >
            <div 
              className="w-full max-w-md backdrop-blur-xl rounded-2xl sm:rounded-3xl overflow-hidden mx-2 sm:mx-0"
              style={{
                background: 'linear-gradient(180deg, rgba(30,10,60,0.95) 0%, rgba(20,5,40,0.98) 100%)',
                border: `2px solid ${config.borderColor}`,
                boxShadow: `0 0 50px ${config.glowColor}`,
              }}
            >
              {/* Borda superior brilhante */}
              <div 
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{
                  background: status === 'won' 
                    ? 'linear-gradient(90deg, transparent, #fbbf24, #fef3c7, #fbbf24, transparent)'
                    : status === 'stopped'
                      ? 'linear-gradient(90deg, transparent, #a855f7, #e9d5ff, #a855f7, transparent)'
                      : 'linear-gradient(90deg, transparent, #ef4444, #fca5a5, #ef4444, transparent)',
                }}
              />

              <div className="p-4 sm:p-6 md:p-8">
                {/* Ícone - RESPONSIVO */}
                <motion.div
                  variants={correctCelebrationVariants}
                  initial="hidden"
                  animate="visible"
                  className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto mb-4 sm:mb-6 rounded-full flex items-center justify-center"
                  style={{
                    background: status === 'won' 
                      ? 'linear-gradient(180deg, rgba(251,191,36,0.2) 0%, rgba(180,83,9,0.3) 100%)'
                      : status === 'stopped'
                        ? 'linear-gradient(180deg, rgba(168,85,247,0.2) 0%, rgba(88,28,135,0.3) 100%)'
                        : 'linear-gradient(180deg, rgba(239,68,68,0.2) 0%, rgba(185,28,28,0.3) 100%)',
                    border: `2px solid ${config.borderColor}`,
                    boxShadow: `0 0 30px ${config.glowColor}`,
                  }}
                >
                  <span className="text-4xl sm:text-5xl md:text-6xl">{config.icon}</span>
                </motion.div>

                {/* Título - RESPONSIVO */}
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl sm:text-3xl font-bold text-center mb-1 sm:mb-2"
                  style={{ 
                    color: '#e9d5ff', 
                    textShadow: '0 0 20px rgba(168,85,247,0.5)' 
                  }}
                >
                  {config.title}
                </motion.h2>

                {/* Subtítulo - RESPONSIVO */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-center mb-4 sm:mb-6 text-sm sm:text-base"
                  style={{ color: 'rgba(168,85,247,0.7)' }}
                >
                  {config.subtitle}
                </motion.p>

                {/* Prêmio - RESPONSIVO */}
                {displayPrize > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
                    className="text-center mb-4 sm:mb-6"
                  >
                    <div 
                      className="inline-block px-5 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-xl"
                      style={{
                        background: status === 'won' 
                          ? 'linear-gradient(180deg, #fef3c7 0%, #fbbf24 50%, #d97706 100%)'
                          : status === 'stopped'
                            ? 'linear-gradient(180deg, rgba(168,85,247,0.8) 0%, rgba(88,28,135,1) 100%)'
                            : 'linear-gradient(180deg, rgba(60,30,90,0.8) 0%, rgba(40,20,60,1) 100%)',
                        border: status === 'won' ? '2px solid #fbbf24' : '2px solid rgba(168,85,247,0.5)',
                        boxShadow: status === 'won' 
                          ? '0 0 30px rgba(251,191,36,0.5)' 
                          : '0 0 20px rgba(168,85,247,0.3)',
                      }}
                    >
                      <span 
                        className="text-2xl sm:text-3xl md:text-4xl font-bold"
                        style={{ color: status === 'won' ? '#78350f' : '#e9d5ff' }}
                      >
                        {formatPrize(displayPrize)}
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Estatísticas - RESPONSIVO */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6"
                >
                  <div 
                    className="rounded-lg sm:rounded-xl p-2.5 sm:p-4 text-center"
                    style={{
                      background: 'rgba(40,20,70,0.5)',
                      border: '1px solid rgba(168,85,247,0.3)',
                    }}
                  >
                    <p className="text-xl sm:text-2xl font-bold" style={{ color: '#e9d5ff' }}>{totalCorrect}</p>
                    <p className="text-[10px] sm:text-xs" style={{ color: 'rgba(168,85,247,0.6)' }}>Acertos</p>
                  </div>
                  <div 
                    className="rounded-lg sm:rounded-xl p-2.5 sm:p-4 text-center"
                    style={{
                      background: 'rgba(40,20,70,0.5)',
                      border: '1px solid rgba(168,85,247,0.3)',
                    }}
                  >
                    <p className="text-xl sm:text-2xl font-bold" style={{ color: '#e9d5ff' }}>
                      {totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0}%
                    </p>
                    <p className="text-[10px] sm:text-xs" style={{ color: 'rgba(168,85,247,0.6)' }}>Aproveitamento</p>
                  </div>
                </motion.div>

                {/* Botão Fatality (só aparece quando ganhou 1 milhão) - RESPONSIVO */}
                {status === 'won' && onFatality && !fatalityMode && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.55, type: 'spring' }}
                    className="mb-3 sm:mb-4"
                  >
                    <button
                      onClick={onFatality}
                      className="w-full py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg transition-all hover:scale-105 relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(180deg, #dc2626 0%, #7f1d1d 100%)',
                        border: '2px solid #ef4444',
                        color: '#fff',
                        boxShadow: '0 0 30px rgba(239,68,68,0.6), inset 0 0 20px rgba(0,0,0,0.3)',
                      }}
                    >
                      {/* Efeito de pulso */}
                      <motion.div
                        className="absolute inset-0"
                        animate={{ 
                          boxShadow: [
                            'inset 0 0 20px rgba(239,68,68,0.3)',
                            'inset 0 0 40px rgba(239,68,68,0.5)',
                            'inset 0 0 20px rgba(239,68,68,0.3)',
                          ]
                        }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <span className="relative flex items-center justify-center gap-1.5 sm:gap-2">
                        <span className="text-xl sm:text-2xl">💀</span>
                        <span className="text-sm sm:text-base">MODO FATALITY</span>
                        <span className="text-xl sm:text-2xl">💀</span>
                      </span>
                      <span className="relative block text-[10px] sm:text-xs mt-1 opacity-80">
                        Tudo ou nada! Sem ajudas. Quanto você aguenta?
                      </span>
                    </button>
                  </motion.div>
                )}

                {/* Multiplicador Fatality (se perdeu no modo fatality) */}
                {fatalityMode && fatalityCorrect > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center mb-4"
                  >
                    <div 
                      className="inline-block px-6 py-3 rounded-xl"
                      style={{
                        background: 'linear-gradient(180deg, rgba(239,68,68,0.3) 0%, rgba(127,29,29,0.5) 100%)',
                        border: '2px solid rgba(239,68,68,0.5)',
                      }}
                    >
                      <span className="text-red-400 text-sm">Multiplicador alcançado</span>
                      <p className="text-3xl font-bold text-red-300">{fatalityMultiplier}x</p>
                    </div>
                  </motion.div>
                )}

                {/* Botões - RESPONSIVO */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex flex-col sm:flex-row gap-2 sm:gap-3"
                >
                  <button
                    onClick={onPlayAgain}
                    className="flex-1 py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all hover:scale-105"
                    style={{
                      background: 'linear-gradient(180deg, rgba(168,85,247,0.8) 0%, rgba(88,28,135,1) 100%)',
                      border: '2px solid #a855f7',
                      color: '#fff',
                      boxShadow: '0 0 20px rgba(168,85,247,0.4)',
                    }}
                  >
                    Jogar Novamente
                  </button>
                  <button
                    onClick={onExit}
                    className="flex-1 py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all"
                    style={{
                      background: 'rgba(40,20,70,0.5)',
                      border: '2px solid rgba(168,85,247,0.3)',
                      color: '#c4b5fd',
                    }}
                  >
                    Sair
                  </button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
