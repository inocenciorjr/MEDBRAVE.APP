// ============================================================================
// SHOW DO MILHÃO - CONFIGURAÇÕES DE ANIMAÇÃO (FRAMER MOTION)
// ============================================================================

import { Variants, Transition } from 'framer-motion';

// Transições base
export const springTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
};

export const smoothTransition: Transition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.4,
};

export const dramaticTransition: Transition = {
  type: 'spring',
  stiffness: 100,
  damping: 15,
};

// ============================================================================
// ANIMAÇÕES DA PERGUNTA
// ============================================================================

export const questionContainerVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: -50,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 30,
    transition: { duration: 0.3 },
  },
};

export const questionTextVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -20,
    filter: 'blur(10px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

// ============================================================================
// ANIMAÇÕES DAS ALTERNATIVAS
// ============================================================================

export const optionsContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
};

export const optionVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -100,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
    },
  },
  hover: {
    scale: 1.02,
    x: 10,
    transition: { duration: 0.2 },
  },
  tap: {
    scale: 0.98,
  },
  selected: {
    opacity: 1,
    scale: 1.02,
    x: 0,
    transition: { duration: 0.3 },
  },
  eliminated: {
    opacity: 1,
    scale: 1,
    x: 0,
    transition: { duration: 0.3 },
  },
  correct: {
    opacity: 1,
    scale: 1.02,
    x: 0,
    transition: { duration: 0.3 },
  },
  wrong: {
    opacity: 1,
    scale: 1.02,
    x: 0,
    transition: { duration: 0.3 },
  },
};

// ============================================================================
// ANIMAÇÕES DE SUSPENSE
// ============================================================================

export const suspensePulseVariants: Variants = {
  initial: { scale: 1, opacity: 1 },
  pulse: {
    scale: [1, 1.02, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 0.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const suspenseGlowVariants: Variants = {
  initial: { boxShadow: '0 0 0px rgba(139, 92, 246, 0)' },
  glow: {
    boxShadow: [
      '0 0 10px rgba(139, 92, 246, 0.3)',
      '0 0 30px rgba(139, 92, 246, 0.6)',
      '0 0 10px rgba(139, 92, 246, 0.3)',
    ],
    transition: {
      duration: 0.8,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ============================================================================
// ANIMAÇÕES DOS PRÊMIOS
// ============================================================================

export const prizeBarVariants: Variants = {
  hidden: { opacity: 0, x: 100 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.2,
    },
  },
};

export const prizeLevelVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  active: {
    scale: 1.1,
    backgroundColor: 'rgb(139, 92, 246)',
    color: 'white',
    boxShadow: '0 0 20px rgba(139, 92, 246, 0.6)',
    transition: { duration: 0.3 },
  },
  passed: {
    opacity: 0.5,
    scale: 0.95,
  },
  checkpoint: {
    backgroundColor: 'rgb(234, 179, 8)',
    color: 'black',
    fontWeight: 'bold',
  },
};

export const prizeUpdateVariants: Variants = {
  initial: { scale: 1 },
  update: {
    scale: [1, 1.3, 1],
    transition: { duration: 0.5 },
  },
};

// ============================================================================
// ANIMAÇÕES DAS AJUDAS
// ============================================================================

export const helpButtonVariants: Variants = {
  idle: { scale: 1 },
  hover: {
    scale: 1.1,
    rotate: [0, -5, 5, 0],
    transition: { duration: 0.3 },
  },
  tap: { scale: 0.95 },
  disabled: {
    opacity: 0.4,
    scale: 0.9,
    filter: 'grayscale(100%)',
  },
  active: {
    scale: 1.2,
    boxShadow: '0 0 30px rgba(139, 92, 246, 0.8)',
  },
};

export const cardRevealVariants: Variants = {
  hidden: {
    rotateY: 180,
    opacity: 0,
  },
  visible: {
    rotateY: 0,
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

export const universityPanelVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 50,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      staggerChildren: 0.2,
    },
  },
  exit: {
    opacity: 0,
    y: -30,
    transition: { duration: 0.3 },
  },
};

export const universityStudentVariants: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4 },
  },
  thinking: {
    opacity: [1, 0.7, 1],
    transition: { duration: 1, repeat: 2 },
  },
  answered: {
    scale: 1.05,
    transition: { duration: 0.3 },
  },
};

// ============================================================================
// ANIMAÇÕES DE RESULTADO
// ============================================================================

export const resultOverlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

export const resultModalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.5,
    y: 100,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: -50,
    transition: { duration: 0.3 },
  },
};

export const correctCelebrationVariants: Variants = {
  hidden: { scale: 0, rotate: -180 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 15,
    },
  },
};

export const wrongShakeVariants: Variants = {
  shake: {
    x: [-10, 10, -10, 10, -5, 5, 0],
    transition: { duration: 0.5 },
  },
};

// ============================================================================
// ANIMAÇÕES DE TRANSIÇÃO ENTRE PERGUNTAS
// ============================================================================

export const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    x: 300,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    opacity: 0,
    x: -300,
    transition: {
      duration: 0.3,
    },
  },
};

// ============================================================================
// ANIMAÇÕES DO BACKGROUND
// ============================================================================

export const backgroundGradientVariants: Variants = {
  idle: {
    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
  },
  suspense: {
    background: [
      'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
      'linear-gradient(135deg, #312e81 0%, #4c1d95 50%, #312e81 100%)',
      'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  correct: {
    background: 'linear-gradient(135deg, #14532d 0%, #166534 50%, #14532d 100%)',
    transition: { duration: 0.5 },
  },
  wrong: {
    background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)',
    transition: { duration: 0.5 },
  },
};

// ============================================================================
// EFEITOS DE PARTÍCULAS / BRILHO
// ============================================================================

export const sparkleVariants: Variants = {
  hidden: { opacity: 0, scale: 0 },
  visible: {
    opacity: [0, 1, 0],
    scale: [0, 1, 0],
    transition: {
      duration: 1,
      ease: 'easeOut',
    },
  },
};

export const floatingParticleVariants: Variants = {
  animate: {
    y: [0, -20, 0],
    opacity: [0.3, 0.8, 0.3],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};
