'use client';

import { useState } from 'react';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

/**
 * Componente Avatar com fallback automático para UI Avatars
 * Resolve o problema de imagens quebradas do Google
 */
export function Avatar({ src, name = 'User', size = 'md', className = '', onClick }: AvatarProps) {
  const [hasError, setHasError] = useState(false);
  
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&size=128`;
  
  // Se não tem src ou já deu erro, usar fallback
  const imageSrc = (!src || hasError) ? fallbackUrl : src;
  
  return (
    <img
      src={imageSrc}
      alt={`Avatar de ${name}`}
      className={`${sizeClasses[size]} rounded-full object-cover ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-primary' : ''} ${className}`}
      onClick={onClick}
      onError={() => {
        if (!hasError) {
          setHasError(true);
        }
      }}
    />
  );
}

export default Avatar;
