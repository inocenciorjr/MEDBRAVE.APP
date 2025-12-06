'use client';

import { useCallback, useRef } from 'react';
import { TextHighlight, HighlightColor } from '@/types/resolucao-questoes';

interface HighlightedQuestionTextProps {
  text: string;
  isHtml?: boolean;
  highlights: TextHighlight[];
  onImageClick?: (src: string) => void;
  className?: string;
}

// Cores neon para highlights
const HIGHLIGHT_COLOR_CLASSES: Record<HighlightColor, string> = {
  yellow: 'bg-[#FFFF00]/80 dark:bg-[#FFFF00]/70',
  pink: 'bg-[#FF10F0]/70 dark:bg-[#FF10F0]/60',
  green: 'bg-[#39FF14]/70 dark:bg-[#39FF14]/60',
  blue: 'bg-[#00FFFF]/70 dark:bg-[#00FFFF]/60',
  orange: 'bg-[#FF6600]/70 dark:bg-[#FF6600]/60',
};

export function HighlightedQuestionText({
  text,
  isHtml = false,
  highlights,
  onImageClick,
  className = '',
}: HighlightedQuestionTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Função para adicionar event listeners em imagens
  const setupImageListeners = useCallback((element: HTMLElement) => {
    const images = element.querySelectorAll('img');
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
        if (onImageClick) {
          onImageClick(img.src);
        }
      });
    });
  }, [onImageClick]);

  // Gera segmentos de texto com highlights aplicados
  const getHighlightedSegments = useCallback(() => {
    if (!text || highlights.length === 0) {
      return [{ text: text || '', type: 'normal' as const }];
    }

    // Filtra highlights válidos
    const validHighlights = highlights.filter(h => 
      h.startOffset >= 0 && h.endOffset <= text.length && h.startOffset < h.endOffset
    );

    if (validHighlights.length === 0) {
      return [{ text, type: 'normal' as const }];
    }

    // Ordena por posição
    const sorted = [...validHighlights].sort((a, b) => a.startOffset - b.startOffset);
    
    const segments: Array<{
      text: string;
      type: 'normal' | 'highlight';
      id?: string;
      color?: HighlightColor;
    }> = [];
    
    let lastEnd = 0;
    
    for (const h of sorted) {
      if (h.startOffset > lastEnd) {
        segments.push({ text: text.substring(lastEnd, h.startOffset), type: 'normal' });
      }
      segments.push({ 
        text: text.substring(h.startOffset, h.endOffset), 
        type: 'highlight', 
        id: h.id, 
        color: h.color 
      });
      lastEnd = h.endOffset;
    }
    
    if (lastEnd < text.length) {
      segments.push({ text: text.substring(lastEnd), type: 'normal' });
    }
    
    return segments.length > 0 ? segments : [{ text, type: 'normal' as const }];
  }, [text, highlights]);

  // Aplica highlights em conteúdo HTML
  const applyHtmlHighlights = useCallback((htmlContent: string): string => {
    if (highlights.length === 0) return htmlContent;

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
    const sortedHighlights = [...highlights]
      .filter(h => h.startOffset >= 0 && h.endOffset <= currentOffset && h.startOffset < h.endOffset)
      .sort((a, b) => b.startOffset - a.startOffset);

    // Aplica cada highlight
    for (const highlight of sortedHighlights) {
      const { startOffset, endOffset, id, color } = highlight;
      
      for (const textNodeInfo of textNodes) {
        const { node: textNode, start, end } = textNodeInfo;
        
        if (startOffset < end && endOffset > start) {
          const nodeText = textNode.textContent || '';
          const highlightStart = Math.max(0, startOffset - start);
          const highlightEnd = Math.min(nodeText.length, endOffset - start);
          
          if (highlightStart < highlightEnd) {
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
              highlightSpan.className = `highlight-mark highlight-${color || 'yellow'} px-0.5 rounded`;
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
  }, [highlights]);

  if (isHtml) {
    const highlightedHtml = applyHtmlHighlights(text);
    
    return (
      <>
        <div
          ref={(el) => {
            if (el) {
              setupImageListeners(el);
              (containerRef as any).current = el;
            }
          }}
          className={`prose prose-sm dark:prose-invert max-w-none text-text-light-secondary dark:text-text-dark-secondary [&_img]:mx-auto [&_img]:block [&_img]:my-4 ${className}`}
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
        
        {/* CSS para cores neon de highlight em HTML */}
        <style jsx global>{`
          .highlight-yellow { background-color: rgba(255, 255, 0, 0.8); }
          .highlight-pink { background-color: rgba(255, 16, 240, 0.7); }
          .highlight-green { background-color: rgba(57, 255, 20, 0.7); }
          .highlight-blue { background-color: rgba(0, 255, 255, 0.7); }
          .highlight-orange { background-color: rgba(255, 102, 0, 0.7); }
          .dark .highlight-yellow { background-color: rgba(255, 255, 0, 0.7); }
          .dark .highlight-pink { background-color: rgba(255, 16, 240, 0.6); }
          .dark .highlight-green { background-color: rgba(57, 255, 20, 0.6); }
          .dark .highlight-blue { background-color: rgba(0, 255, 255, 0.6); }
          .dark .highlight-orange { background-color: rgba(255, 102, 0, 0.6); }
        `}</style>
      </>
    );
  }

  // Texto puro com highlights
  const segments = getHighlightedSegments();

  return (
    <div
      ref={containerRef}
      className={`prose prose-sm dark:prose-invert max-w-none text-text-light-secondary dark:text-text-dark-secondary whitespace-pre-wrap ${className}`}
    >
      {segments.map((segment, index) => {
        if (segment.type === 'normal') {
          return <span key={`normal-${index}`}>{segment.text}</span>;
        }
        
        return (
          <span
            key={segment.id || `segment-${index}`}
            className={`${HIGHLIGHT_COLOR_CLASSES[segment.color || 'yellow']} px-0.5 rounded`}
          >
            {segment.text}
          </span>
        );
      })}
    </div>
  );
}
