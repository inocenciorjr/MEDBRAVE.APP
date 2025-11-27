'use client';

import { useEffect, useState } from 'react';

interface ImageModalProps {
  imageUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
  zIndex?: number;
}

export function ImageModal({ imageUrl, isOpen, onClose, zIndex = 50 }: ImageModalProps) {
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setIsZoomed(false); // Reset zoom quando abre
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsZoomed(!isZoomed);
  };

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      style={{ zIndex }}
      onClick={onClose}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-6 right-6 p-3 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
        aria-label="Fechar imagem"
      >
        <span className="material-symbols-outlined text-3xl">close</span>
      </button>

      <img
        src={imageUrl}
        alt="Imagem ampliada"
        className="rounded-lg cursor-pointer transition-all duration-300 ease-in-out"
        onClick={handleImageClick}
        style={{ 
          width: isZoomed ? '85vw' : '70vw',
          height: isZoomed ? '85vh' : '70vh',
          objectFit: 'contain'
        }}
      />
    </div>
  );
}
