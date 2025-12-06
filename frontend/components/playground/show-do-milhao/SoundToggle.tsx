'use client';

import { motion } from 'framer-motion';

interface SoundToggleProps {
  isMuted: boolean;
  onToggle: () => void;
  className?: string;
  showMobileIndicator?: boolean;
}

export function SoundToggle({ isMuted, onToggle, className = '', showMobileIndicator = true }: SoundToggleProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onToggle}
      className={`relative p-2 rounded-lg hover:bg-white/10 transition-colors ${className}`}
      title={isMuted ? 'Ativar som' : 'Desativar som'}
    >
      <span className="material-symbols-outlined text-white">
        {isMuted ? 'volume_off' : 'volume_up'}
      </span>
      
      {/* Indicador pulsante quando mutado - apenas mobile */}
      {isMuted && showMobileIndicator && (
        <motion.span
          className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full md:hidden"
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [1, 0.7, 1]
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
    </motion.button>
  );
}
