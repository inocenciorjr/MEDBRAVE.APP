'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { TextHighlight, HighlightColor } from '@/types/resolucao-questoes';
import { ImageModal } from './modals/ImageModal';

interface QuestionTextProps {
  text: string;
  isHtml?: boolean;
  images?: string[];
  highlights: TextHighlight[];
  textRef: React.RefObject<HTMLDivElement | null>;
  toolMode: string;
  getHighlightSegments: (text: string, highlights: TextHighlight[]) => Array<{
    text: string;
    type: 'normal' | 'highlight';
    id?: string;
    ids?: string[];
    color?: HighlightColor;
  }>;
  onHighlightClick?: (highlightId: string) => void;
  onAddHighlight?: (highlight: TextHighlight) => void;
}

// Cores neon vibrantes para o marca-texto
const HIGHLIGHT_COLOR_CLASSES: Record<HighlightColor, string> = {
  yellow: 'bg-[#FFFF00]/80 hover:bg-[#FFFF00] dark:bg-[#FFFF00]/70 dark:hover:bg-[#FFFF00]/90',
  pink: 'bg-[#FF10F0]/70 hover:bg-[#FF10F0]/90 dark:bg-[#FF10F0]/60 dark:hover:bg-[#FF10F0]/80',
  green: 'bg-[#39FF14]/70 hover:bg-[#39FF14]/90 dark:bg-[#39FF14]/60 dark:hover:bg-[#39FF14]/80',
  blue: 'bg-[#00FFFF]/70 hover:bg-[#00FFFF]/90 dark:bg-[#00FFFF]/60 dark:hover:bg-[#00FFFF]/80',
  orange: 'bg-[#FF6600]/70 hover:bg-[#FF6600]/90 dark:bg-[#FF6600]/60 dark:hover:bg-[#FF6600]/80',
};

export function QuestionText({
  text,
  isHtml = false,
  images,
  highlights,
  textRef,
  toolMode,
  getHighlightSegments,
  onHighlightClick,
  onAddHighlight,
}: QuestionTextProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const htmlContainerRef = useRef<HTMLDivElement>(null);
  const [htmlHighlightedContent, setHtmlHighlightedContent] = useState<string>('');

  // Gera segmentos para texto puro
  const segments = !isHtml ? getHighlightSegments(text, highlights) : [];

  /**
   * Aplica highlights em conteúdo HTML
   * Usa uma abordagem baseada em TreeWalker para preservar a estrutura HTML
   */
  const applyHtmlHighlights = useCallback((htmlContent: string, highlightsList: TextHighlight[]): string => {
    if (highlightsList.length === 0) return htmlContent;

    // Cria um elemento temporário para manipular o HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    // Extrai todo o texto para calcular posições
    const textNodes: { node: Text; start: number; end: number }[] = [];
    let currentOffset = 0;

    const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null);
    let node: Node | null = walker.nextNode();
    
    while (node) {
      const textNode = node as Text;
      const length = textNode.textContent?.length || 0;
      textNodes.push({
        node: textNode,
        start: currentOffset,
        end: currentOffset + length,
      });
      currentOffset += length;
      node = walker.nextNode();
    }

    // Ordena highlights por posição (do fim para o início para não afetar offsets)
    const sortedHighlights = [...highlightsList]
      .filter(h => h.startOffset >= 0 && h.endOffset <= currentOffset && h.startOffset < h.endOffset)
      .sort((a, b) => b.startOffset - a.startOffset);

    // Aplica cada highlight
    for (const highlight of sortedHighlights) {
      const { startOffset, endOffset, id, color } = highlight;
      
      // Encontra os nós de texto afetados
      for (const textNodeInfo of textNodes) {
        const { node: textNode, start, end } = textNodeInfo;
        
        // Verifica se este nó de texto é afetado pelo highlight
        if (startOffset < end && endOffset > start) {
          const nodeText = textNode.textContent || '';
          const highlightStart = Math.max(0, startOffset - start);
          const highlightEnd = Math.min(nodeText.length, endOffset - start);
          
          if (highlightStart < highlightEnd) {
            // Divide o nó de texto e insere o span de highlight
            const beforeText = nodeText.substring(0, highlightStart);
            const highlightText = nodeText.substring(highlightStart, highlightEnd);
            const afterText = nodeText.substring(highlightEnd);
            
            const parent = textNode.parentNode;
            if (parent) {
              const fragment = document.createDocumentFragment();
              
              if (beforeText) {
                fragment.appendChild(document.createTextNode(beforeText));
              }
              
              const highlightSpan = document.createElement('span');
              highlightSpan.className = `highlight-mark highlight-${color || 'yellow'} px-0.5 rounded cursor-pointer transition-colors`;
              highlightSpan.setAttribute('data-highlight-id', id);
              highlightSpan.textContent = highlightText;
              fragment.appendChild(highlightSpan);
              
              if (afterText) {
                fragment.appendChild(document.createTextNode(afterText));
              }
              
              parent.replaceChild(fragment, textNode);
            }
          }
        }
      }
    }

    return tempDiv.innerHTML;
  }, []);

  // Atualiza o conteúdo HTML com highlights
  useEffect(() => {
    if (isHtml) {
      const highlighted = applyHtmlHighlights(text, highlights);
      setHtmlHighlightedContent(highlighted);
    }
  }, [isHtml, text, highlights, applyHtmlHighlights]);

  // Configura event listeners para imagens e highlights no HTML
  useEffect(() => {
    const container = htmlContainerRef.current;
    if (!container || !isHtml) return;

    // Configura imagens
    const images = container.querySelectorAll('img');
    images.forEach((img) => {
      img.style.cursor = 'zoom-in';
      img.style.transition = 'transform 0.2s';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = '1rem auto';
      img.style.borderRadius = '0.5rem';
      img.style.border = '2px solid #e5e7eb';
      
      const handleMouseEnter = () => { img.style.transform = 'scale(1.02)'; };
      const handleMouseLeave = () => { img.style.transform = 'scale(1)'; };
      const handleClick = () => { setSelectedImage(img.src); };
      
      img.addEventListener('mouseenter', handleMouseEnter);
      img.addEventListener('mouseleave', handleMouseLeave);
      img.addEventListener('click', handleClick);
    });

    // Configura clicks nos highlights
    const highlightSpans = container.querySelectorAll('[data-highlight-id]');
    highlightSpans.forEach((span) => {
      const handleClick = (e: Event) => {
        e.stopPropagation();
        const highlightId = span.getAttribute('data-highlight-id');
        if (highlightId && onHighlightClick) {
          onHighlightClick(highlightId);
        }
      };
      span.addEventListener('click', handleClick);
    });

    // Cleanup
    return () => {
      images.forEach((img) => {
        img.removeEventListener('mouseenter', () => {});
        img.removeEventListener('mouseleave', () => {});
        img.removeEventListener('click', () => {});
      });
      highlightSpans.forEach((span) => {
        span.removeEventListener('click', () => {});
      });
    };
  }, [isHtml, htmlHighlightedContent, onHighlightClick]);

  /**
   * Handler para seleção de texto em HTML
   * Usa busca no texto original para encontrar a posição correta
   */
  const handleHtmlMouseUp = useCallback(() => {
    if (toolMode !== 'highlight' || !onAddHighlight) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length < 2) return;

    // Extrai texto puro do HTML original
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    const originalText = tempDiv.textContent || tempDiv.innerText || '';
    
    // Encontra a posição do texto selecionado no texto original
    let searchStart = 0;
    let foundStart = -1;
    
    while (true) {
      const index = originalText.indexOf(selectedText, searchStart);
      if (index === -1) break;
      
      // Verifica se essa posição já está marcada
      const isAlreadyHighlighted = highlights.some(h => 
        (index >= h.startOffset && index < h.endOffset) ||
        (index + selectedText.length > h.startOffset && index + selectedText.length <= h.endOffset) ||
        (index <= h.startOffset && index + selectedText.length >= h.endOffset)
      );
      
      if (!isAlreadyHighlighted) {
        foundStart = index;
        break;
      }
      
      searchStart = index + 1;
    }
    
    if (foundStart === -1) {
      selection.removeAllRanges();
      return;
    }

    const highlight: Omit<TextHighlight, 'color'> = {
      id: crypto.randomUUID(),
      startOffset: foundStart,
      endOffset: foundStart + selectedText.length,
      text: selectedText,
      type: 'highlight',
    };

    onAddHighlight(highlight as TextHighlight);
    selection.removeAllRanges();
  }, [toolMode, onAddHighlight]);

  return (
    <>
      {/* Question Text */}
      {isHtml ? (
        <div 
          ref={htmlContainerRef}
          onMouseUp={handleHtmlMouseUp}
          onTouchEnd={handleHtmlMouseUp}
          className={`text-text-light-primary dark:text-text-dark-primary font-bold prose dark:prose-invert max-w-none mb-4 ${
            toolMode === 'highlight' ? 'select-text cursor-text' : ''
          }`}
          dangerouslySetInnerHTML={{ __html: htmlHighlightedContent || text }}
        />
      ) : (
        <div
          ref={textRef}
          className={`text-text-light-primary dark:text-text-dark-primary font-bold leading-relaxed mb-4 whitespace-pre-wrap ${
            toolMode !== 'none' && toolMode !== 'edit' ? 'select-text cursor-text' : ''
          }`}
        >
          {segments.map((segment, index) => {
            if (segment.type === 'normal') {
              return <span key={`normal-${index}`}>{segment.text}</span>;
            }
            
            const color = segment.color || 'yellow';
            
            return (
              <span
                key={segment.id || `segment-${index}`}
                className={`${HIGHLIGHT_COLOR_CLASSES[color]} px-0.5 rounded cursor-pointer transition-colors`}
                onClick={(e) => {
                  e.stopPropagation();
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
        <div className="mt-6 flex flex-col items-center gap-4">
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

      {/* CSS para cores neon de highlight em HTML */}
      <style jsx global>{`
        .highlight-yellow {
          background-color: rgba(255, 255, 0, 0.8);
        }
        .highlight-yellow:hover {
          background-color: rgba(255, 255, 0, 1);
        }
        .highlight-pink {
          background-color: rgba(255, 16, 240, 0.7);
        }
        .highlight-pink:hover {
          background-color: rgba(255, 16, 240, 0.9);
        }
        .highlight-green {
          background-color: rgba(57, 255, 20, 0.7);
        }
        .highlight-green:hover {
          background-color: rgba(57, 255, 20, 0.9);
        }
        .highlight-blue {
          background-color: rgba(0, 255, 255, 0.7);
        }
        .highlight-blue:hover {
          background-color: rgba(0, 255, 255, 0.9);
        }
        .highlight-orange {
          background-color: rgba(255, 102, 0, 0.7);
        }
        .highlight-orange:hover {
          background-color: rgba(255, 102, 0, 0.9);
        }
        .dark .highlight-yellow {
          background-color: rgba(255, 255, 0, 0.7);
        }
        .dark .highlight-yellow:hover {
          background-color: rgba(255, 255, 0, 0.9);
        }
        .dark .highlight-pink {
          background-color: rgba(255, 16, 240, 0.6);
        }
        .dark .highlight-pink:hover {
          background-color: rgba(255, 16, 240, 0.8);
        }
        .dark .highlight-green {
          background-color: rgba(57, 255, 20, 0.6);
        }
        .dark .highlight-green:hover {
          background-color: rgba(57, 255, 20, 0.8);
        }
        .dark .highlight-blue {
          background-color: rgba(0, 255, 255, 0.6);
        }
        .dark .highlight-blue:hover {
          background-color: rgba(0, 255, 255, 0.8);
        }
        .dark .highlight-orange {
          background-color: rgba(255, 102, 0, 0.6);
        }
        .dark .highlight-orange:hover {
          background-color: rgba(255, 102, 0, 0.8);
        }
      `}</style>
    </>
  );
}
