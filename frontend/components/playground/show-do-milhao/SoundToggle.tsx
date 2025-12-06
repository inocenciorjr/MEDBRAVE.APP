'use client';

import { motion } from 'framer-motion';

interface SoundToggleProps {
  isMuted: boolean;
  onToggle: () => void;
  className?: string;
}

export function SoundToggle({ isMuted, onToggle, className = '' }: SoundToggleProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onToggle}
      className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${className}`}
      title={isMuted ? 'Ativar som' : 'Desativar som'}
    >
      <span className="material-symbols-outlined text-white">
        {isMuted ? 'volume_off' : 'volume_up'}
      </span>
    </motion.button>
  );
}
