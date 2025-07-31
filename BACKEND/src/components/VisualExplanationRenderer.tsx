import React, { useEffect, useRef } from 'react';

interface VisualExplanationRendererProps {
  content: string;
  className?: string;
}

export const VisualExplanationRenderer: React.FC<VisualExplanationRendererProps> = ({
  content,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initMermaid = async () => {
      if (typeof window !== 'undefined') {
        try {
          const mermaidModule = await import('mermaid');
          const mermaid = mermaidModule.default;
          
          // Configurar Mermaid
          mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            securityLevel: 'loose',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 14,
            flowchart: {
              useMaxWidth: true,
              htmlLabels: true,
              curve: 'basis'
            },
            timeline: {
              useMaxWidth: true
            }
          });

          // Renderizar diagramas Mermaid
          if (containerRef.current) {
            const mermaidElements = containerRef.current.querySelectorAll('.mermaid');
            mermaidElements.forEach(async (element, index) => {
              const id = `mermaid-${Date.now()}-${index}`;
              element.id = id;
              try {
                const { svg } = await mermaid.render(id, element.textContent || '');
                element.innerHTML = svg;
              } catch (error) {
                console.warn('Erro ao renderizar diagrama Mermaid:', error);
                element.innerHTML = '<div class="text-red-500 p-2">Erro ao renderizar diagrama</div>';
              }
            });
          }
        } catch (error) {
          console.warn('Mermaid não pôde ser carregado:', error);
        }
      }
    };
    
    initMermaid();
  }, [content]);

  // Processar o conteúdo markdown para HTML
  const processContent = (text: string): string => {
    return text
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-blue-800 mt-6 mb-3 flex items-center">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-blue-900 mt-8 mb-4 flex items-center border-b-2 border-blue-200 pb-2">$1</h2>')
      
      // Mermaid code blocks
      .replace(/```mermaid\n([\s\S]*?)\n```/g, '<div class="mermaid bg-gray-50 p-4 rounded-xl border my-4">$1</div>')
      
      // Regular code blocks
      .replace(/```(\w+)?\n([\s\S]*?)\n```/g, '<pre class="bg-gray-900 text-green-400 p-4 rounded-xl overflow-x-auto my-4"><code>$2</code></pre>')
      
      // Tables
      .replace(/\|(.+)\|\n\|[-\s|]+\|\n((?:\|.+\|\n?)*)/g, (_match: string, header: string, rows: string) => {
        const headerCells = header.split('|').filter((cell: string) => cell.trim()).map((cell: string) => 
          `<th class="px-4 py-2 bg-blue-100 text-blue-900 font-semibold border">${cell.trim()}</th>`
        ).join('');
        
        const bodyRows = rows.split('\n').filter((row: string) => row.trim()).map((row: string) => {
          const cells = row.split('|').filter((cell: string) => cell.trim()).map((cell: string) =>
            `<td class="px-4 py-2 border">${cell.trim()}</td>`
          ).join('');
          return `<tr>${cells}</tr>`;
        }).join('');
        
        return `<div class="overflow-x-auto my-4">
          <table class="min-w-full border-collapse border border-gray-300 rounded-xl">
            <thead><tr>${headerCells}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </div>`;
      })
      
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      
      // Italic text
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      
      // Lists
      .replace(/^- (.*$)/gim, '<li class="ml-4 mb-1">• $1</li>')
      .replace(/^(\d+)\. (.*$)/gim, '<li class="ml-4 mb-1">$1. $2</li>')
      
      // Emojis and icons
      .replace(/📸|🔬|📊|🗺️|⚠️|🔑|📋|💊|🧠|📖|🎯/g, '<span class="text-lg mr-1">$&</span>')
      
      // Line breaks
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/\n/g, '<br>');
  };

  return (
    <div 
      ref={containerRef}
      className={`visual-explanation prose max-w-none ${className}`}
      dangerouslySetInnerHTML={{ 
        __html: `<div class="space-y-4">${processContent(content)}</div>` 
      }}
      style={{
        '--mermaid-font-family': 'Inter, system-ui, sans-serif'
      } as React.CSSProperties}
    />
  );
};

// Componente para preview de imagens sugeridas
export const ImageSuggestionCard: React.FC<{
  type: 'clinical' | 'microscopy' | 'chart' | 'anatomy';
  description: string;
  title: string;
}> = ({ type, description, title }) => {
  const getIcon = () => {
    switch (type) {
      case 'clinical': return '📸';
      case 'microscopy': return '🔬';
      case 'chart': return '📊';
      case 'anatomy': return '🗺️';
      default: return '🖼️';
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'clinical': return 'bg-blue-50 border-blue-200';
      case 'microscopy': return 'bg-green-50 border-green-200';
      case 'chart': return 'bg-purple-50 border-purple-200';
      case 'anatomy': return 'bg-orange-50 border-orange-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`p-4 rounded-xl border-2 border-dashed ${getBgColor()} my-3`}>
      <div className="flex items-start space-x-3">
        <span className="text-2xl">{getIcon()}</span>
        <div>
          <h4 className="font-semibold text-gray-800 mb-1">{title}</h4>
          <p className="text-sm text-gray-600">{description}</p>
          <div className="mt-2 text-xs text-gray-500 italic">
            💡 Imagem sugerida para melhor compreensão
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook para carregar Mermaid dinamicamente
export const useMermaid = () => {
  useEffect(() => {
    const loadMermaid = async () => {
      if (typeof window !== 'undefined' && !window.mermaid) {
        try {
          const mermaidModule = await import('mermaid');
          window.mermaid = mermaidModule.default;
        } catch (error) {
          console.warn('Erro ao carregar Mermaid:', error);
        }
      }
    };
    loadMermaid();
  }, []);
};

// Tipos para TypeScript
declare global {
  interface Window {
    mermaid: any;
  }
}

export default VisualExplanationRenderer; 