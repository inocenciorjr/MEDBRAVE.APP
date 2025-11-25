'use client';

import Lottie from 'lottie-react';
import animationData from '@/public/animations/logo-animation.json';

interface LoadingAnimationProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

const sizeMap = {
  sm: 'w-24 h-24',
  md: 'w-32 h-32',
  lg: 'w-48 h-48',
  xl: 'w-64 h-64',
  full: 'w-full h-full',
};

export function LoadingAnimation({ 
  size = 'md', 
  className = ''
}: LoadingAnimationProps) {
  return (
    <div className={`flex items-center justify-center ${sizeMap[size]} ${className}`}>
      <Lottie
        animationData={animationData}
        loop
        autoplay
      />
    </div>
  );
}
