'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { helpButtonVariants } from './animations';

interface HelpButtonsProps {
  cardsUsed: boolean;
  universityUsed: boolean;
  skipsRemaining: number;
  medbraveUsed: boolean;
  disabled: boolean;
  onUseCards: () => void;
  onUseUniversity: () => void;
  onUseSkip: () => void;
  onUseMedbrave: () => void;
}

export function HelpButtons({
  cardsUsed,
  universityUsed,
  skipsRemaining,
  medbraveUsed,
  disabled,
  onUseCards,
  onUseUniversity,
  onUseSkip,
  onUseMedbrave,
}: HelpButtonsProps) {
  const baseStyle = {
    background: 'linear-gradient(180deg, rgba(30,10,60,0.8) 0%, rgba(20,5,40,0.9) 100%)',
    border: '2px solid rgba(168,85,247,0.4)',
  };

  const disabledStyle = {
    background: 'rgba(40,20,70,0.3)',
    border: '2px solid rgba(100,50,150,0.2)',
    boxShadow: 'none',
  };

  const activeStyle = {
    ...baseStyle,
    boxShadow: '0 4px 20px rgba(168,85,247,0.3), 0 8px 32px rgba(88,28,135,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 flex-wrap">
      {/* Cartas - RESPONSIVO */}
      <motion.button
        variants={helpButtonVariants}
        initial="idle"
        whileHover={!cardsUsed && !disabled ? 'hover' : undefined}
        whileTap={!cardsUsed && !disabled ? 'tap' : undefined}
        animate={cardsUsed ? 'disabled' : 'idle'}
        onClick={onUseCards}
        disabled={cardsUsed || disabled}
        className="relative flex flex-col items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 xl:w-32 xl:h-32 rounded-xl sm:rounded-2xl transition-all duration-300 group"
        style={{
          ...(cardsUsed ? disabledStyle : activeStyle),
          cursor: cardsUsed || disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {/* Efeito de hover */}
        {!cardsUsed && !disabled && (
          <div 
            className="absolute inset-0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: 'linear-gradient(180deg, rgba(168,85,247,0.1) 0%, rgba(88,28,135,0.2) 100%)',
            }}
          />
        )}
        
        <span 
          className={`material-symbols-outlined text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-0.5 sm:mb-1 md:mb-2 transition-all duration-300 ${cardsUsed ? 'opacity-30' : 'group-hover:scale-110'}`}
          style={{ 
            color: cardsUsed ? 'rgba(168,85,247,0.3)' : '#a855f7',
            fontVariationSettings: "'FILL' 1",
          }}
        >
          playing_cards
        </span>
        <span 
          className="text-[9px] sm:text-[10px] md:text-xs lg:text-sm font-semibold"
          style={{ color: cardsUsed ? 'rgba(168,85,247,0.3)' : '#c4b5fd' }}
        >
          Cartas
        </span>

        {cardsUsed && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center"
            style={{ 
              background: 'linear-gradient(180deg, rgba(60,30,90,0.9) 0%, rgba(40,20,60,0.95) 100%)', 
              border: '2px solid rgba(100,50,150,0.4)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <span className="material-symbols-outlined text-xs sm:text-sm" style={{ color: 'rgba(168,85,247,0.5)' }}>close</span>
          </motion.div>
        )}
      </motion.button>

      {/* Universitários - RESPONSIVO */}
      <motion.button
        variants={helpButtonVariants}
        initial="idle"
        whileHover={!universityUsed && !disabled ? 'hover' : undefined}
        whileTap={!universityUsed && !disabled ? 'tap' : undefined}
        animate={universityUsed ? 'disabled' : 'idle'}
        onClick={onUseUniversity}
        disabled={universityUsed || disabled}
        className="relative flex flex-col items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 xl:w-32 xl:h-32 rounded-xl sm:rounded-2xl transition-all duration-300 group"
        style={{
          ...(universityUsed ? disabledStyle : activeStyle),
          cursor: universityUsed || disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {/* Efeito de hover */}
        {!universityUsed && !disabled && (
          <div 
            className="absolute inset-0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: 'linear-gradient(180deg, rgba(168,85,247,0.1) 0%, rgba(88,28,135,0.2) 100%)',
            }}
          />
        )}
        
        <span 
          className={`material-symbols-outlined text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-0.5 sm:mb-1 md:mb-2 transition-all duration-300 ${universityUsed ? 'opacity-30' : 'group-hover:scale-110'}`}
          style={{ 
            color: universityUsed ? 'rgba(168,85,247,0.3)' : '#a855f7',
            fontVariationSettings: "'FILL' 1",
          }}
        >
          school
        </span>
        <span 
          className="text-[8px] sm:text-[9px] md:text-[10px] lg:text-xs xl:text-sm font-semibold"
          style={{ color: universityUsed ? 'rgba(168,85,247,0.3)' : '#c4b5fd' }}
        >
          <span className="hidden sm:inline">Universitários</span>
          <span className="sm:hidden">Univ.</span>
        </span>

        {universityUsed && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center"
            style={{ 
              background: 'linear-gradient(180deg, rgba(60,30,90,0.9) 0%, rgba(40,20,60,0.95) 100%)', 
              border: '2px solid rgba(100,50,150,0.4)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <span className="material-symbols-outlined text-xs sm:text-sm" style={{ color: 'rgba(168,85,247,0.5)' }}>close</span>
          </motion.div>
        )}
      </motion.button>

      {/* Opinião MedBrave - RESPONSIVO */}
      <motion.button
        variants={helpButtonVariants}
        initial="idle"
        whileHover={!medbraveUsed && !disabled ? 'hover' : undefined}
        whileTap={!medbraveUsed && !disabled ? 'tap' : undefined}
        animate={medbraveUsed ? 'disabled' : 'idle'}
        onClick={onUseMedbrave}
        disabled={medbraveUsed || disabled}
        className="relative flex flex-col items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 xl:w-32 xl:h-32 rounded-xl sm:rounded-2xl transition-all duration-300 group"
        style={{
          ...(medbraveUsed ? disabledStyle : activeStyle),
          cursor: medbraveUsed || disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {/* Efeito de hover */}
        {!medbraveUsed && !disabled && (
          <div 
            className="absolute inset-0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: 'linear-gradient(180deg, rgba(168,85,247,0.1) 0%, rgba(88,28,135,0.2) 100%)',
            }}
          />
        )}
        
        <div className={`relative w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 mb-0.5 sm:mb-1 transition-all duration-300 ${medbraveUsed ? 'opacity-30 grayscale' : 'group-hover:scale-110'}`}>
          <Image
            src="/images/show-do-milhao/medbrave-milhao.PNG"
            alt="MedBrave"
            fill
            className="object-contain"
          />
        </div>
        <span 
          className="text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] text-center leading-tight font-azonix"
          style={{ 
            color: medbraveUsed ? 'rgba(168,85,247,0.3)' : '#c4b5fd',
          }}
        >
          <span className="hidden sm:inline">Opinião</span>
        </span>
        <span 
          className="text-[8px] sm:text-[9px] md:text-[10px] lg:text-xs text-center leading-tight font-azonix"
          style={{ 
            color: medbraveUsed ? 'rgba(168,85,247,0.3)' : '#c4b5fd',
          }}
        >
          <span className="sm:hidden">MB</span>
          <span className="hidden sm:inline">MEDBRAVE</span>
        </span>

        {medbraveUsed && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center"
            style={{ 
              background: 'linear-gradient(180deg, rgba(60,30,90,0.9) 0%, rgba(40,20,60,0.95) 100%)', 
              border: '2px solid rgba(100,50,150,0.4)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <span className="material-symbols-outlined text-xs sm:text-sm" style={{ color: 'rgba(168,85,247,0.5)' }}>close</span>
          </motion.div>
        )}
      </motion.button>

      {/* Pular - RESPONSIVO */}
      <motion.button
        variants={helpButtonVariants}
        initial="idle"
        whileHover={skipsRemaining > 0 && !disabled ? 'hover' : undefined}
        whileTap={skipsRemaining > 0 && !disabled ? 'tap' : undefined}
        animate={skipsRemaining === 0 ? 'disabled' : 'idle'}
        onClick={onUseSkip}
        disabled={skipsRemaining === 0 || disabled}
        className="relative flex flex-col items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 xl:w-32 xl:h-32 rounded-xl sm:rounded-2xl transition-all duration-300 group"
        style={{
          ...(skipsRemaining === 0 ? disabledStyle : activeStyle),
          cursor: skipsRemaining === 0 || disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {/* Efeito de hover */}
        {skipsRemaining > 0 && !disabled && (
          <div 
            className="absolute inset-0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: 'linear-gradient(180deg, rgba(168,85,247,0.1) 0%, rgba(88,28,135,0.2) 100%)',
            }}
          />
        )}
        
        <span 
          className={`material-symbols-outlined text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-0.5 sm:mb-1 md:mb-2 transition-all duration-300 ${skipsRemaining === 0 ? 'opacity-30' : 'group-hover:scale-110'}`}
          style={{ 
            color: skipsRemaining === 0 ? 'rgba(168,85,247,0.3)' : '#a855f7',
            fontVariationSettings: "'FILL' 1",
          }}
        >
          skateboarding
        </span>
        <span 
          className="text-[9px] sm:text-[10px] md:text-xs lg:text-sm font-semibold"
          style={{ color: skipsRemaining === 0 ? 'rgba(168,85,247,0.3)' : '#c4b5fd' }}
        >
          <span className="hidden sm:inline">Pular</span> ({skipsRemaining})
        </span>

        {skipsRemaining > 0 && (
          <motion.div
            key={skipsRemaining}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center"
            style={{ 
              background: 'linear-gradient(180deg, #a855f7 0%, #7c3aed 100%)', 
              boxShadow: '0 2px 10px rgba(168,85,247,0.5)',
              border: '2px solid rgba(196,181,253,0.3)',
            }}
          >
            <span className="text-white text-[10px] sm:text-xs font-bold">{skipsRemaining}</span>
          </motion.div>
        )}

        {skipsRemaining === 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center"
            style={{ 
              background: 'linear-gradient(180deg, rgba(60,30,90,0.9) 0%, rgba(40,20,60,0.95) 100%)', 
              border: '2px solid rgba(100,50,150,0.4)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <span className="material-symbols-outlined text-xs sm:text-sm" style={{ color: 'rgba(168,85,247,0.5)' }}>close</span>
          </motion.div>
        )}
      </motion.button>
    </div>
  );
}
