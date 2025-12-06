'use client';

import { useState } from 'react';
import { Question, ToolMode, TextHighlight, HighlightColor } from '@/types/resolucao-questoes';
import { useTextHighlight } from '@/lib/hooks/useTextHighlight';
import { QuestionText } from './QuestionText';

interface QuestionBodyProps {
  question: Question;
  toolMode: ToolMode;
  onToolModeChange: (mode: ToolMode) => void;
  highlights: TextHighlight[];
  onAddHighlight: (highlight: TextHighlight) => void;
  onRemoveHighlight: (highlightId: string) => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
}

const HIGHLIGHT_COLORS: { color: HighlightColor; label: string; class: string }[] = [
  { color: 'yellow', label: 'Amarelo Neon', class: 'bg-[#FFFF00] dark:bg-[#FFFF00]' },
  { color: 'pink', label: 'Rosa Neon', class: 'bg-[#FF10F0] dark:bg-[#FF10F0]' },
  { color: 'green', label: 'Verde Neon', class: 'bg-[#39FF14] dark:bg-[#39FF14]' },
  { color: 'blue', label: 'Azul Neon', class: 'bg-[#00FFFF] dark:bg-[#00FFFF]' },
  { color: 'orange', label: 'Laranja Neon', class: 'bg-[#FF6600] dark:bg-[#FF6600]' },
];

export function QuestionBody({
  question,
  toolMode,
  onToolModeChange,
  highlights,
  onAddHighlight,
  onRemoveHighlight,
  isFocusMode = false,
  onToggleFocusMode,
}: QuestionBodyProps) {
  const [selectedColor, setSelectedColor] = useState<HighlightColor>('yellow');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleAddHighlightWithColor = (highlight: TextHighlight) => {
    onAddHighlight({ ...highlight, color: selectedColor });
  };

  const { textRef, getHighlightSegments, handleHighlightClick } = useTextHighlight(
    toolMode,
    handleAddHighlightWithColor,
    onRemoveHighlight
  );

  const segments = getHighlightSegments(question.text, highlights);

  const getToolButtonClass = (mode: ToolMode) => {
    const isActive = toolMode === mode;
    return `p-2 rounded-lg transition-colors ${
      isActive
        ? 'bg-primary text-white'
        : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20'
    }`;
  };

  return (
    <div>
      {/* Question Tools */}
      <div className="flex items-center justify-end mb-6">
        
        {/* Text Tools */}
        <div className="flex items-center gap-3">
          {/* Highlight Button with Color Picker */}
          <div className="relative">
            <button
              onClick={() => {
                if (toolMode === 'highlight') {
                  setShowColorPicker(!showColorPicker);
                } else {
                  onToolModeChange('highlight');
                  setShowColorPicker(true);
                }
              }}
              className={getToolButtonClass('highlight')}
              aria-label="Destacar texto"
              title="Destacar texto (clique no texto marcado para remover)"
            >
              <span className="material-symbols-outlined text-xl">border_color</span>
            </button>
            
            {/* Color Picker */}
            {showColorPicker && toolMode === 'highlight' && (
              <div className="absolute top-full mt-2 right-0 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg shadow-lg p-2 z-10 flex gap-2">
                {HIGHLIGHT_COLORS.map((colorOption) => (
                  <button
                    key={colorOption.color}
                    onClick={() => {
                      setSelectedColor(colorOption.color);
                      setShowColorPicker(false);
                    }}
                    className={`w-8 h-8 rounded-lg ${colorOption.class} border-2 transition-all ${
                      selectedColor === colorOption.color
                        ? 'border-primary scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    title={colorOption.label}
                    aria-label={colorOption.label}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-border-light dark:bg-border-dark" />

          {/* Print Button */}
          <button
            className="p-2 rounded-lg text-text-light-secondary dark:text-text-dark-secondary hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 transition-colors"
            aria-label="Imprimir questão"
            title="Imprimir questão"
          >
            <span className="material-symbols-outlined text-xl">print</span>
          </button>

          {/* Report Error Button */}
          <button
            className="p-2 rounded-lg text-text-light-secondary dark:text-text-dark-secondary hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            aria-label="Relatar erro na questão"
            title="Relatar erro na questão"
          >
            <span className="material-symbols-outlined text-xl">flag</span>
          </button>

          {/* Focus Mode Toggle - Hidden on mobile */}
          {onToggleFocusMode && (
            <>
              <div className="hidden xl:block w-px h-6 bg-border-light dark:bg-border-dark" />
              <button
                onClick={onToggleFocusMode}
                className={`hidden xl:block p-2 rounded-lg transition-colors ${
                  isFocusMode
                    ? 'bg-primary text-white'
                    : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20'
                }`}
                aria-label={isFocusMode ? 'Sair do modo foco' : 'Ativar modo foco'}
                title={isFocusMode ? 'Sair do modo foco' : 'Ativar modo foco'}
              >
                <span className="material-symbols-outlined text-xl">
                  {isFocusMode ? 'fullscreen_exit' : 'fullscreen'}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Question Text with Images */}
      <QuestionText
        text={question.text}
        isHtml={question.isHtml}
        images={question.images}
        highlights={highlights}
        textRef={textRef}
        toolMode={toolMode}
        getHighlightSegments={getHighlightSegments}
        onHighlightClick={handleHighlightClick}
        onAddHighlight={handleAddHighlightWithColor}
      />
    </div>
  );
}
