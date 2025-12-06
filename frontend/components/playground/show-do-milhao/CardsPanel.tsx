'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cardRevealVariants } from './animations';

interface CardsPanelProps {
  onEliminate: () => Promise<number>; // Retorna quantas alternativas foram eliminadas
  onClose: () => void;
}

export function CardsPanel({ onEliminate, onClose }: CardsPanelProps) {
  const [phase, setPhase] = useState<'shuffling' | 'drawing' | 'revealing' | 'done'>('shuffling');
  const [drawnCard, setDrawnCard] = useState<number | null>(null);

  useEffect(() => {
    const shuffleTimer = setTimeout(() => {
      setPhase('drawing');
    }, 1500);

    return () => clearTimeout(shuffleTimer);
  }, []);

  const handleDrawCard = async () => {
    setPhase('revealing');
    
    // Chamar o backend e obter quantas alternativas foram eliminadas
    const eliminatedCount = await onEliminate();
    setDrawnCard(eliminatedCount);
    
    setTimeout(() => {
      setPhase('done');
    }, 1500);
  };

  const cardColors: Record<number, { bg: string; border: string }> = {
    0: { bg: 'linear-gradient(180deg, #6b7280 0%, #4b5563 100%)', border: '#6b7280' },
    1: { bg: 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)', border: '#fbbf24' },
    2: { bg: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)', border: '#3b82f6' },
    3: { bg: 'linear-gradient(180deg, #10b981 0%, #059669 100%)', border: '#10b981' },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget && phase === 'done') {
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="w-full max-w-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl mx-2 sm:mx-0"
        style={{
          background: 'linear-gradient(180deg, rgba(30,10,60,0.95) 0%, rgba(20,5,40,0.98) 100%)',
          border: '2px solid rgba(251,191,36,0.5)',
          boxShadow: '0 0 40px rgba(251,191,36,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - RESPONSIVO */}
        <div className="text-center mb-4 sm:mb-6">
          <div 
            className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full mb-2 sm:mb-3"
            style={{
              background: 'linear-gradient(180deg, rgba(251,191,36,0.2) 0%, rgba(180,83,9,0.3) 100%)',
              border: '2px solid rgba(251,191,36,0.4)',
              boxShadow: '0 0 20px rgba(251,191,36,0.3)',
            }}
          >
            <span className="text-2xl sm:text-4xl">🃏</span>
          </div>
          <h2 
            className="text-lg sm:text-xl font-bold mb-1"
            style={{ color: '#e9d5ff', textShadow: '0 0 10px rgba(168,85,247,0.5)' }}
          >
            Cartas
          </h2>
          <p className="text-sm sm:text-base" style={{ color: 'rgba(168,85,247,0.7)' }}>
            {phase === 'shuffling' && 'Embaralhando as cartas...'}
            {phase === 'drawing' && 'Clique para sortear uma carta!'}
            {phase === 'revealing' && 'Revelando...'}
            {phase === 'done' && `${drawnCard} alternativa${drawnCard! > 1 ? 's' : ''} eliminada${drawnCard! > 1 ? 's' : ''}!`}
          </p>
        </div>

        {/* Área das cartas - RESPONSIVO */}
        <div className="relative h-40 sm:h-48 flex items-center justify-center">
          {/* Cartas embaralhando - RESPONSIVO */}
          {phase === 'shuffling' && (
            <div className="relative">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    x: [0, (i - 1) * 25, 0],
                    y: [0, -15, 0],
                    rotate: [0, (i - 1) * 12, 0],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                  className="absolute w-16 h-24 sm:w-24 sm:h-36 rounded-lg sm:rounded-xl shadow-xl"
                  style={{
                    left: i * 8,
                    top: i * 4,
                    background: 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)',
                    border: '2px solid #fbbf24',
                    boxShadow: '0 0 20px rgba(251,191,36,0.4)',
                  }}
                >
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-2xl sm:text-4xl">🃏</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Cartas para sortear - RESPONSIVO */}
          {phase === 'drawing' && (
            <div className="flex gap-2 sm:gap-4">
              {[1, 2, 3].map((cardValue) => (
                <motion.button
                  key={cardValue}
                  initial={{ y: 50, opacity: 0, rotateY: 180 }}
                  animate={{ y: 0, opacity: 1, rotateY: 180 }}
                  transition={{ delay: cardValue * 0.1 }}
                  whileHover={{ y: -10, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDrawCard}
                  className="w-14 h-20 sm:w-20 sm:h-28 rounded-lg sm:rounded-xl shadow-xl flex items-center justify-center cursor-pointer transition-all duration-200"
                  style={{
                    background: 'linear-gradient(180deg, rgba(40,20,70,0.8) 0%, rgba(30,10,60,0.9) 100%)',
                    border: '2px solid rgba(168,85,247,0.4)',
                    boxShadow: '0 0 15px rgba(168,85,247,0.2)',
                  }}
                >
                  <span className="text-xl sm:text-3xl">❓</span>
                </motion.button>
              ))}
            </div>
          )}

          {/* Carta revelada - RESPONSIVO */}
          {(phase === 'revealing' || phase === 'done') && drawnCard !== null && drawnCard > 0 && (
            <motion.div
              variants={cardRevealVariants}
              initial="hidden"
              animate="visible"
              className="w-24 h-32 sm:w-32 sm:h-44 rounded-xl sm:rounded-2xl shadow-2xl flex flex-col items-center justify-center relative overflow-hidden"
              style={{
                background: cardColors[drawnCard as keyof typeof cardColors].bg,
                border: `3px sm:4px solid ${cardColors[drawnCard as keyof typeof cardColors].border}`,
                boxShadow: `0 0 30px ${cardColors[drawnCard as keyof typeof cardColors].border}80`,
              }}
            >
              <motion.div
                animate={{
                  x: [-100, 200],
                  opacity: [0, 0.5, 0],
                }}
                transition={{
                  duration: 1,
                  repeat: phase === 'revealing' ? Infinity : 0,
                }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
              />

              <span className="text-3xl sm:text-5xl mb-1 sm:mb-2">🃏</span>
              <span className="text-3xl sm:text-4xl font-bold text-white">{drawnCard}</span>
              <span className="text-xs sm:text-sm text-white/80 mt-0.5 sm:mt-1">
                {drawnCard === 1 ? 'Elimina' : 'Eliminam'}
              </span>
            </motion.div>
          )}
        </div>

        {/* Mensagem de sucesso - RESPONSIVO */}
        <AnimatePresence>
          {phase === 'done' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-lg sm:rounded-xl"
              style={{
                background: 'linear-gradient(90deg, rgba(16,185,129,0.1) 0%, rgba(5,150,105,0.15) 100%)',
                border: '1px solid rgba(16,185,129,0.4)',
              }}
            >
              <p className="text-xs sm:text-sm text-center" style={{ color: '#34d399' }}>
                ✓ Alternativas erradas foram eliminadas!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botão de fechar - RESPONSIVO */}
        <AnimatePresence>
          {phase === 'done' && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={onClose}
              className="w-full mt-3 sm:mt-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-colors"
              style={{
                background: 'linear-gradient(180deg, rgba(168,85,247,0.8) 0%, rgba(88,28,135,1) 100%)',
                border: '2px solid #a855f7',
                color: '#fff',
                boxShadow: '0 0 15px rgba(168,85,247,0.4)',
              }}
            >
              Voltar ao jogo
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
