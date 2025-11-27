'use client';

import { useState } from 'react';
import { TextHighlight } from '@/types/resolucao-questoes';
import { ImageModal } from './modals/ImageModal';
import { HtmlContent } from './HtmlContent';

interface QuestionTextProps {
  text: string;
  isHtml?: boolean;
  images?: string[];
  highlights: TextHighlight[];
  textRef: React.RefObject<HTMLDivElement | null>;
  toolMode: string;
  getHighlightSegments: (text: string, highlights: TextHighlight[]) => any[];
  onHighlightClick?: (highlightId: string) => void;
}

export function QuestionText({
  text,
  isHtml = false,
  images,
  highlights,
  textRef,
  toolMode,
  getHighlightSegments,
  onHighlightClick,
}: QuestionTextProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const htmlRef = useState<HTMLDivElement | null>(null)[0];

  const segments = getHighlightSegments(text, highlights);

  // Adicionar event listeners para imagens no HTML
  useState(() => {
    if (isHtml && htmlRef) {
      const images = htmlRef.querySelectorAll('img');
      images.forEach((img) => {
        img.style.cursor = 'zoom-in';
        img.style.transition = 'transform 0.2s';
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';
        img.style.margin = '1rem auto';
        img.style.borderRadius = '0.5rem';
        img.style.border = '2px solid var(--border-color)';
        
        img.addEventListener('mouseenter', () => {
          img.style.transform = 'scale(1.02)';
        });
        
        img.addEventListener('mouseleave', () => {
          img.style.transform = 'scale(1)';
        });
        
        img.addEventListener('click', () => {
          console.log('Imagem HTML clicada:', img.src);
          setSelectedImage(img.src);
        });
      });
    }
  });

  return (
    <>
      {/* Question Text */}
      {isHtml ? (
        <div 
          ref={(el) => {
            if (el && el !== htmlRef) {
              // Adicionar event listeners quando o elemento for montado
              const images = el.querySelectorAll('img');
              images.forEach((img) => {
                img.style.cursor = 'zoom-in';
                img.style.transition = 'transform 0.2s';
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                img.style.display = 'block';
                img.style.margin = '1rem auto';
                img.style.borderRadius = '0.5rem';
                img.style.border = '2px solid #e5e7eb';
                
                img.addEventListener('mouseenter', () => {
                  img.style.transform = 'scale(1.02)';
                });
                
                img.addEventListener('mouseleave', () => {
                  img.style.transform = 'scale(1)';
                });
                
                img.addEventListener('click', () => {
                  setSelectedImage(img.src);
                });
              });
            }
          }}
          className="text-text-light-primary dark:text-text-dark-primary font-bold prose dark:prose-invert max-w-none mb-4"
          dangerouslySetInnerHTML={{ __html: text }}
        />
      ) : (
        <div
          ref={textRef}
          className={`text-text-light-primary dark:text-text-dark-primary font-bold leading-relaxed mb-4 ${
            toolMode !== 'none' && toolMode !== 'edit' ? 'select-text cursor-text' : ''
          }`}
        >
          {segments.map((segment, index) => {
            if (segment.type === 'normal') {
              return <span key={`normal-${index}`}>{segment.text}</span>;
            }
            
            const colorClasses = {
              yellow: 'bg-yellow-300/80 dark:bg-yellow-400/60 hover:bg-yellow-400/90 dark:hover:bg-yellow-400/80',
              pink: 'bg-pink-400/80 dark:bg-pink-500/60 hover:bg-pink-500/90 dark:hover:bg-pink-500/80',
              green: 'bg-green-400/80 dark:bg-green-500/60 hover:bg-green-500/90 dark:hover:bg-green-500/80',
              blue: 'bg-cyan-400/80 dark:bg-cyan-500/60 hover:bg-cyan-500/90 dark:hover:bg-cyan-500/80',
              orange: 'bg-orange-400/80 dark:bg-orange-500/60 hover:bg-orange-500/90 dark:hover:bg-orange-500/80',
            };
            
            const color = (segment as any).color || 'yellow';
            
            return (
              <span
                key={segment.id || `segment-${index}`}
                className={`${colorClasses[color as keyof typeof colorClasses]} px-1 rounded cursor-pointer transition-colors`}
                onClick={() => {
                  if (segment.id && onHighlightClick) {
                    onHighlightClick(segment.id);
                  }
                }}
                title="Clique para remover marcação"
              >
                {segment.text}
              </span>
            );
          })}
        </div>
      )}

      {/* Question Images */}
      {images && images.length > 0 && (
        <div className={`mt-6 flex flex-col items-center gap-4`}>
          {images.map((imageUrl, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(imageUrl)}
              className="relative group overflow-hidden rounded-lg border-2 border-border-light dark:border-border-dark hover:border-primary dark:hover:border-primary transition-all cursor-zoom-in max-w-2xl w-full"
            >
              <img
                src={imageUrl}
                alt={`Imagem ${index + 1} da questão`}
                className="w-full h-auto object-contain max-h-96 transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-4xl opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg">
                  zoom_in
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Image Modal */}
      <ImageModal
        imageUrl={selectedImage}
        isOpen={selectedImage !== null}
        onClose={() => setSelectedImage(null)}
      />
    </>
  );
}
