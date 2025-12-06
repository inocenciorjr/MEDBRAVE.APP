'use client';

import { motion } from 'framer-motion';
import { optionVariants, suspenseGlowVariants } from './animations';

interface OptionButtonProps {
  letter: string; // Letra dinâmica (A, B, C, D, E, F, ...)
  text: string;
  index: number;
  isSelected: boolean;
  isEliminated: boolean;
  isCorrect: boolean | null;
  isRevealing: boolean;
  correctIndex: number;
  disabled: boolean;
  isFatality?: boolean;
  onClick: () => void;
}

// Estilos de cor baseados no modo
const getLetterStyle = (isFatality: boolean) => ({
  bg: isFatality 
    ? 'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)'
    : 'linear-gradient(180deg, #a855f7 0%, #7c3aed 100%)',
  glow: isFatality 
    ? 'rgba(239,68,68,0.5)'
    : 'rgba(168,85,247,0.5)',
});

export function OptionButton({
  letter,
  text,
  index,
  isSelected,
  isEliminated,
  isCorrect,
  isRevealing,
  correctIndex,
  disabled,
  isFatality = false,
  onClick,
}: OptionButtonProps) {
  const letterStyle = getLetterStyle(isFatality);
  const getAnimationState = () => {
    if (isEliminated) return 'eliminated';
    if (isRevealing && isCorrect !== null) {
      if (index === correctIndex) return 'correct';
      if (isSelected && !isCorrect) return 'wrong';
    }
    if (isSelected && !isRevealing) return 'selected';
    return 'visible';
  };

  const isThisCorrect = index === correctIndex;
  const showAsCorrect = isRevealing && isThisCorrect;
  const showAsWrong = isRevealing && isSelected && !isThisCorrect;

  // Estilos dinâmicos baseados no estado
  const getContainerStyle = () => {
    if (isEliminated) {
      return {
        background: isFatality ? 'rgba(60,20,20,0.3)' : 'rgba(40,20,70,0.3)',
        border: isFatality ? '2px solid rgba(150,50,50,0.2)' : '2px solid rgba(100,50,150,0.2)',
        boxShadow: 'none',
      };
    }
    if (showAsCorrect) {
      return {
        background: 'linear-gradient(90deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.3) 100%)',
        border: '2px solid #10b981',
        boxShadow: '0 0 20px rgba(16,185,129,0.4), inset 0 0 20px rgba(16,185,129,0.1)',
      };
    }
    if (showAsWrong) {
      return {
        background: 'linear-gradient(90deg, rgba(239,68,68,0.2) 0%, rgba(185,28,28,0.3) 100%)',
        border: '2px solid #ef4444',
        boxShadow: '0 0 20px rgba(239,68,68,0.4), inset 0 0 20px rgba(239,68,68,0.1)',
      };
    }
    if (isSelected && !isRevealing) {
      return isFatality ? {
        background: 'linear-gradient(90deg, rgba(239,68,68,0.3) 0%, rgba(127,29,29,0.4) 100%)',
        border: '2px solid #ef4444',
        boxShadow: '0 0 20px rgba(239,68,68,0.4), inset 0 0 20px rgba(239,68,68,0.1)',
      } : {
        background: 'linear-gradient(90deg, rgba(168,85,247,0.3) 0%, rgba(88,28,135,0.4) 100%)',
        border: '2px solid #a855f7',
        boxShadow: '0 0 20px rgba(168,85,247,0.4), inset 0 0 20px rgba(168,85,247,0.1)',
      };
    }
    return isFatality ? {
      background: 'linear-gradient(90deg, rgba(60,10,10,0.7) 0%, rgba(40,5,5,0.8) 100%)',
      border: '2px solid rgba(239,68,68,0.3)',
      boxShadow: '0 0 10px rgba(239,68,68,0.1)',
    } : {
      background: 'linear-gradient(90deg, rgba(30,10,60,0.7) 0%, rgba(40,20,70,0.8) 100%)',
      border: '2px solid rgba(168,85,247,0.3)',
      boxShadow: '0 0 10px rgba(168,85,247,0.1)',
    };
  };

  return (
    <motion.button
      variants={optionVariants}
      initial="hidden"
      animate={getAnimationState()}
      whileHover={!disabled && !isEliminated ? 'hover' : undefined}
      whileTap={!disabled && !isEliminated ? 'tap' : undefined}
      onClick={onClick}
      disabled={disabled || isEliminated}
      className="relative w-full p-2.5 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 md:gap-4 transition-all duration-300 backdrop-blur-sm group"
      style={{
        ...getContainerStyle(),
        cursor: disabled || isEliminated ? 'not-allowed' : 'pointer',
      }}
    >
      {/* Efeito de brilho durante suspense */}
      {isSelected && !isRevealing && (
        <motion.div
          variants={suspenseGlowVariants}
          initial="initial"
          animate="glow"
          className="absolute inset-0 rounded-xl sm:rounded-2xl pointer-events-none"
          style={{ boxShadow: isFatality ? '0 0 30px rgba(239,68,68,0.5)' : '0 0 30px rgba(168,85,247,0.5)' }}
        />
      )}

      {/* Letra da alternativa - estilo cápsula com cor do jogo - RESPONSIVO */}
      <div 
        className="relative flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-sm sm:text-lg md:text-xl text-white transition-all duration-300"
        style={{
          background: isEliminated ? 'rgba(60,30,90,0.5)' 
            : showAsCorrect ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)'
            : showAsWrong ? 'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)'
            : letterStyle.bg,
          boxShadow: isEliminated ? 'none' 
            : showAsCorrect ? '0 0 15px rgba(16,185,129,0.5)'
            : showAsWrong ? '0 0 15px rgba(239,68,68,0.5)'
            : `0 0 15px ${letterStyle.glow}`,
          filter: isEliminated ? 'grayscale(1)' : 'none',
        }}
      >
        <span className="relative z-10">{letter}</span>
      </div>

      {/* Texto da alternativa - RESPONSIVO */}
      <span 
        className="flex-1 text-left text-xs sm:text-sm md:text-base font-medium transition-colors duration-300"
        style={{
          color: isEliminated 
            ? (isFatality ? 'rgba(239,68,68,0.6)' : 'rgba(168,85,247,0.6)')
            : showAsCorrect ? '#6ee7b7'
            : showAsWrong ? '#fca5a5'
            : (isFatality ? '#fecaca' : '#e9d5ff'),
          textDecoration: isEliminated ? 'line-through' : 'none',
        }}
      >
        {text}
      </span>

      {/* Indicadores de resultado - RESPONSIVO */}
      {showAsCorrect && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
            boxShadow: '0 0 15px rgba(16,185,129,0.5)',
          }}
        >
          <span className="material-symbols-outlined text-white text-lg sm:text-xl md:text-2xl">check</span>
        </motion.div>
      )}

      {showAsWrong && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)',
            boxShadow: '0 0 15px rgba(239,68,68,0.5)',
          }}
        >
          <span className="material-symbols-outlined text-white text-lg sm:text-xl md:text-2xl">close</span>
        </motion.div>
      )}

      {/* Indicador de seleção - RESPONSIVO */}
      {isSelected && !isRevealing && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center"
          style={{
            background: isFatality 
              ? 'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)'
              : 'linear-gradient(180deg, #a855f7 0%, #7c3aed 100%)',
            boxShadow: isFatality 
              ? '0 0 10px rgba(239,68,68,0.5)'
              : '0 0 10px rgba(168,85,247,0.5)',
          }}
        >
          <span className="material-symbols-outlined text-white text-sm sm:text-base md:text-lg">radio_button_checked</span>
        </motion.div>
      )}

      {/* Indicador de eliminação (X pequeno à direita) - RESPONSIVO */}
      {isEliminated && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(239,68,68,0.2)',
            border: '2px solid rgba(239,68,68,0.4)',
          }}
        >
          <span className="material-symbols-outlined text-lg sm:text-xl md:text-2xl" style={{ color: '#f87171' }}>close</span>
        </motion.div>
      )}
    </motion.button>
  );
}
