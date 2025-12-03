'use client';

import Image from 'next/image';
import { useTheme } from '@/app/providers';

interface MedBraveLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
  variant?: 'morphing' | 'particles' | 'breathing';
}

export function MedBraveLoader({ 
  size = 'md', 
  text, 
  fullScreen = false,
  variant = 'breathing'
}: MedBraveLoaderProps) {
  const { theme } = useTheme();
  
  const sizeMap = {
    sm: 40,
    md: 60,
    lg: 80,
    xl: 120
  };

  const logoSize = sizeMap[size];
  const isDark = theme === 'dark';

  const renderLoader = () => {
    switch (variant) {
      case 'morphing':
        return (
          <div className="relative" style={{ width: logoSize, height: logoSize }}>
            {/* Círculo morphing de fundo */}
            <div className="absolute inset-0 animate-morph-circle">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-accent/20 blur-xl" />
            </div>
            
            {/* Logo com fade */}
            <div className="relative animate-logo-fade">
              <Image
                src={isDark ? '/medbravelogo-dark.png' : '/medbravelogo.png'}
                alt="MedBrave"
                width={logoSize}
                height={logoSize}
                style={{ width: 'auto', height: 'auto' }}
                className="object-contain"
                priority
              />
            </div>

            {/* Anéis orbitais */}
            <div className="absolute inset-0 animate-orbit-ring">
              <div className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary" />
            </div>
            <div className="absolute inset-2 animate-orbit-ring-reverse">
              <div className="absolute inset-0 rounded-full border-2 border-accent/20 border-b-accent" />
            </div>
          </div>
        );

      case 'particles':
        return (
          <div className="relative" style={{ width: logoSize * 1.5, height: logoSize * 1.5 }}>
            {/* Partículas animadas */}
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-particle-burst"
                style={{
                  left: '50%',
                  top: '50%',
                  animationDelay: `${i * 0.1}s`,
                  transform: `rotate(${i * 45}deg) translateY(-${logoSize * 0.6}px)`
                }}
              >
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-accent shadow-lg" />
              </div>
            ))}

            {/* Logo central */}
            <div className="absolute inset-0 flex items-center justify-center animate-pulse-scale">
              <Image
                src={isDark ? '/medbravelogo-dark.png' : '/medbravelogo.png'}
                alt="MedBrave"
                width={logoSize}
                height={logoSize}
                style={{ width: 'auto', height: 'auto' }}
                className="object-contain"
                priority
              />
            </div>

            {/* Círculo de energia */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-energy-ring" style={{ width: logoSize * 1.2, height: logoSize * 1.2 }}>
                <div className="w-full h-full rounded-full border-2 border-primary/40 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]" />
              </div>
            </div>
          </div>
        );

      case 'breathing':
      default:
        return (
          <div className="relative" style={{ width: logoSize * 1.3, height: logoSize * 1.3 }}>
            {/* Glow de fundo pulsante */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-breathing-glow" style={{ width: logoSize * 1.2, height: logoSize * 1.2 }}>
                <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/30 via-accent/20 to-primary/30 blur-2xl" />
              </div>
            </div>

            {/* Anéis concêntricos */}
            <div className="absolute inset-0 flex items-center justify-center animate-ring-pulse">
              <div style={{ width: logoSize * 1.15, height: logoSize * 1.15 }}>
                <div className="w-full h-full rounded-full border border-primary/30" />
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center animate-ring-pulse-delayed">
              <div style={{ width: logoSize * 1.25, height: logoSize * 1.25 }}>
                <div className="w-full h-full rounded-full border border-accent/20" />
              </div>
            </div>

            {/* Logo com breathing */}
            <div className="absolute inset-0 flex items-center justify-center animate-breathing">
              <Image
                src={isDark ? '/medbravelogo-dark.png' : '/medbravelogo.png'}
                alt="MedBrave"
                width={logoSize}
                height={logoSize}
                style={{ width: 'auto', height: 'auto' }}
                className="object-contain drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)]"
                priority
              />
            </div>

            {/* Brilho rotativo */}
            <div className="absolute inset-0 flex items-center justify-center animate-rotating-shine">
              <div 
                className="absolute w-1 bg-gradient-to-b from-transparent via-primary/60 to-transparent blur-sm"
                style={{ height: logoSize * 1.1 }}
              />
            </div>
          </div>
        );
    }
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-6">
      {renderLoader()}
      
      {text && (
        <p className="text-text-light-secondary dark:text-text-dark-secondary text-sm font-medium animate-fade-in-up">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}
