'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { TextHighlight, ToolMode, HighlightColor } from '@/types/resolucao-questoes';

interface HighlightRange {
  start: number;
  end: number;
  text: string;
}

/**
 * Hook robusto para gerenciar marcação de texto
 * Suporta:
 * - Múltiplas ocorrências do mesmo texto
 * - Seleção precisa baseada em posição
 * - Highlights sobrepostos
 * - Conteúdo HTML
 */
export function useTextHighlight(
  toolMode: ToolMode,
  onAddHighlight?: (highlight: TextHighlight) => void,
  onRemoveHighlight?: (highlightId: string) => void
) {
  const textRef = useRef<HTMLDivElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  /**
   * Calcula a posição absoluta de um nó dentro do container
   */
  const getAbsoluteOffset = useCallback((container: Node, targetNode: Node, targetOffset: number): number => {
    let offset = 0;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    
    let node: Node | null = walker.nextNode();
    while (node) {
      if (node === targetNode) {
        return offset + targetOffset;
      }
      offset += (node.textContent?.length || 0);
      node = walker.nextNode();
    }
    
    return offset + targetOffset;
  }, []);

  /**
   * Extrai todo o texto de um container (incluindo nós filhos)
   */
  const getFullText = useCallback((container: Node): string => {
    let text = '';
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    
    let node: Node | null = walker.nextNode();
    while (node) {
      text += node.textContent || '';
      node = walker.nextNode();
    }
    
    return text;
  }, []);

  /**
   * Processa a seleção de texto e cria um highlight
   */
  const handleTextSelection = useCallback(() => {
    if (toolMode !== 'highlight') return;
    
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length === 0) return;

    const container = textRef.current;
    if (!container) return;

    try {
      const range = selection.getRangeAt(0);
      
      // Verifica se a seleção está dentro do container
      if (!container.contains(range.commonAncestorContainer)) {
        return;
      }

      // Calcula offsets absolutos dentro do container
      const startOffset = getAbsoluteOffset(container, range.startContainer, range.startOffset);
      const endOffset = getAbsoluteOffset(container, range.endContainer, range.endOffset);

      // Cria o highlight com posição precisa
      const highlight: Omit<TextHighlight, 'color'> = {
        id: crypto.randomUUID(),
        startOffset,
        endOffset,
        text: selectedText,
        type: 'highlight',
      };

      if (onAddHighlight) {
        onAddHighlight(highlight as TextHighlight);
      }

      // Limpa a seleção
      selection.removeAllRanges();
    } catch (error) {
      console.error('Erro ao criar highlight:', error);
    }
  }, [toolMode, onAddHighlight, getAbsoluteOffset]);

  /**
   * Remove um highlight pelo ID
   */
  const handleHighlightClick = useCallback((highlightId: string) => {
    if (onRemoveHighlight) {
      onRemoveHighlight(highlightId);
    }
  }, [onRemoveHighlight]);

  /**
   * Handler para mouseup
   */
  const handleMouseUp = useCallback(() => {
    if (toolMode === 'highlight') {
      // Pequeno delay para garantir que a seleção está completa
      requestAnimationFrame(() => {
        handleTextSelection();
      });
    }
  }, [toolMode, handleTextSelection]);

  /**
   * Mescla highlights sobrepostos para evitar duplicação visual
   */
  const mergeOverlappingRanges = useCallback((ranges: Array<{ start: number; end: number; id: string; color: HighlightColor }>): Array<{ start: number; end: number; ids: string[]; color: HighlightColor }> => {
    if (ranges.length === 0) return [];
    
    // Ordena por posição inicial
    const sorted = [...ranges].sort((a, b) => a.start - b.start);
    const merged: Array<{ start: number; end: number; ids: string[]; color: HighlightColor }> = [];
    
    let current = { start: sorted[0].start, end: sorted[0].end, ids: [sorted[0].id], color: sorted[0].color };
    
    for (let i = 1; i < sorted.length; i++) {
      const range = sorted[i];
      
      if (range.start <= current.end) {
        // Ranges se sobrepõem - mescla
        current.end = Math.max(current.end, range.end);
        current.ids.push(range.id);
        // Mantém a cor do primeiro highlight (ou poderia misturar)
      } else {
        // Sem sobreposição - adiciona o atual e começa novo
        merged.push(current);
        current = { start: range.start, end: range.end, ids: [range.id], color: range.color };
      }
    }
    
    merged.push(current);
    return merged;
  }, []);

  /**
   * Gera segmentos de texto com highlights aplicados
   * Usa posição absoluta para precisão
   */
  const getHighlightSegments = useCallback((
    text: string,
    highlights: TextHighlight[]
  ): Array<{
    text: string;
    type: 'normal' | 'highlight';
    id?: string;
    ids?: string[];
    color?: HighlightColor;
  }> => {
    if (!text || highlights.length === 0) {
      return [{ text: text || '', type: 'normal' }];
    }

    // Converte highlights para ranges com validação
    const validRanges = highlights
      .filter(h => {
        // Valida que o highlight está dentro dos limites do texto
        const isValid = h.startOffset >= 0 && 
                       h.endOffset <= text.length && 
                       h.startOffset < h.endOffset;
        
        if (!isValid) {
          console.warn('Highlight inválido ignorado:', h);
        }
        return isValid;
      })
      .map(h => ({
        start: h.startOffset,
        end: h.endOffset,
        id: h.id,
        color: h.color || 'yellow' as HighlightColor,
      }));

    if (validRanges.length === 0) {
      return [{ text, type: 'normal' }];
    }

    // Mescla ranges sobrepostos
    const mergedRanges = mergeOverlappingRanges(validRanges);
    
    const segments: Array<{
      text: string;
      type: 'normal' | 'highlight';
      id?: string;
      ids?: string[];
      color?: HighlightColor;
    }> = [];
    
    let lastEnd = 0;
    
    for (const range of mergedRanges) {
      // Adiciona texto normal antes do highlight
      if (range.start > lastEnd) {
        segments.push({
          text: text.substring(lastEnd, range.start),
          type: 'normal',
        });
      }
      
      // Adiciona o highlight
      segments.push({
        text: text.substring(range.start, range.end),
        type: 'highlight',
        id: range.ids[0], // ID principal para remoção
        ids: range.ids,   // Todos os IDs (para highlights mesclados)
        color: range.color,
      });
      
      lastEnd = range.end;
    }
    
    // Adiciona texto restante
    if (lastEnd < text.length) {
      segments.push({
        text: text.substring(lastEnd),
        type: 'normal',
      });
    }
    
    return segments.length > 0 ? segments : [{ text, type: 'normal' }];
  }, [mergeOverlappingRanges]);

  // Adiciona event listeners
  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    element.addEventListener('mouseup', handleMouseUp);
    
    // Também escuta touchend para mobile
    element.addEventListener('touchend', handleMouseUp);
    
    return () => {
      element.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseUp]);

  return {
    textRef,
    handleTextSelection,
    handleHighlightClick,
    getHighlightSegments,
    isSelecting,
    getFullText,
  };
}
