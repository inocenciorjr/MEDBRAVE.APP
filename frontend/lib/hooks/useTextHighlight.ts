'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { TextHighlight, ToolMode } from '@/types/resolucao-questoes';

/**
 * Custom hook to manage text highlighting and selection
 * @param toolMode - Current tool mode (highlight, edit)
 * @param onAddHighlight - Callback when a highlight is added
 * @param onRemoveHighlight - Callback when a highlight is removed
 * @returns Object containing highlight state and functions
 */
export function useTextHighlight(
  toolMode: ToolMode,
  onAddHighlight?: (highlight: TextHighlight) => void,
  onRemoveHighlight?: (highlightId: string) => void
) {
  const textRef = useRef<HTMLDivElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  /**
   * Handles text selection and creates highlight
   */
  const handleTextSelection = useCallback(() => {
    if (toolMode !== 'highlight') return;
    
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    try {
      const range = selection.getRangeAt(0);
      
      // Create highlight without color - will be added by callback
      const highlight: Partial<TextHighlight> = {
        id: crypto.randomUUID(),
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        text: selectedText,
        type: 'highlight',
      };

      // Call callback if provided - callback will add color
      if (onAddHighlight) {
        onAddHighlight(highlight as TextHighlight);
      }

      // Clear selection
      selection.removeAllRanges();
    } catch (error) {
      console.error('Error creating highlight:', error);
    }
  }, [toolMode, onAddHighlight]);

  /**
   * Handles click on highlighted text to remove it
   */
  const handleHighlightClick = useCallback((highlightId: string) => {
    if (onRemoveHighlight) {
      onRemoveHighlight(highlightId);
    }
  }, [onRemoveHighlight]);

  /**
   * Handles mouse up event for text selection
   */
  const handleMouseUp = useCallback(() => {
    if (toolMode !== 'none' && toolMode !== 'edit') {
      // Small delay to ensure selection is complete
      setTimeout(() => {
        handleTextSelection();
      }, 10);
    }
  }, [toolMode, handleTextSelection]);

  /**
   * Gets highlight data for rendering
   * Uses text matching instead of offsets to avoid duplication
   */
  const getHighlightSegments = useCallback((
    text: string,
    highlights: TextHighlight[]
  ) => {
    if (highlights.length === 0) {
      return [{ text, type: 'normal' as const }];
    }

    // Create a simple array with just the text and highlights
    // We'll render each highlight by finding its text in the original
    const segments: Array<{
      text: string;
      type: 'normal' | 'highlight';
      id?: string;
      color?: string;
    }> = [];

    let remainingText = text;
    let processedHighlights = new Set<string>();

    highlights.forEach((highlight) => {
      if (processedHighlights.has(highlight.id)) return;
      
      const index = remainingText.indexOf(highlight.text);
      if (index !== -1) {
        // Add text before highlight
        if (index > 0) {
          segments.push({
            text: remainingText.substring(0, index),
            type: 'normal',
          });
        }

        // Add highlight
        segments.push({
          text: highlight.text,
          type: 'highlight',
          id: highlight.id,
          color: highlight.color,
        });

        remainingText = remainingText.substring(index + highlight.text.length);
        processedHighlights.add(highlight.id);
      }
    });

    // Add remaining text
    if (remainingText) {
      segments.push({
        text: remainingText,
        type: 'normal',
      });
    }

    return segments.length > 0 ? segments : [{ text, type: 'normal' as const }];
  }, []);

  // Add event listener for mouse up
  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    element.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      element.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseUp]);

  return {
    textRef,
    handleTextSelection,
    handleHighlightClick,
    getHighlightSegments,
    isSelecting,
  };
}
