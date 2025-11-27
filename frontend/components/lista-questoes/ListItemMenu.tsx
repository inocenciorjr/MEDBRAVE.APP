'use client';

import { useState, useRef, useEffect } from 'react';

interface ListItemMenuProps {
  itemType: 'folder' | 'list' | 'simulado';
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onMove?: () => void;
  onDuplicate?: () => void;
  onDuplicateErrors?: () => void;
  onCreateSimulated?: () => void;
}

export default function ListItemMenu({ itemType, onEdit, onDelete, onShare, onMove, onDuplicate, onDuplicateErrors, onCreateSimulated }: ListItemMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Verificar se o clique foi fora do menu E fora do botão
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Calcular posição do menu quando abrir
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuHeight = 300; // Altura estimada do menu
      const menuWidth = 192; // w-48 = 192px
      
      let top = rect.bottom + 8; // 8px abaixo do botão
      let left = rect.right - menuWidth; // Alinhado à direita do botão
      
      // Se o menu vai sair da tela embaixo, abrir para cima
      if (top + menuHeight > window.innerHeight) {
        top = rect.top - menuHeight - 8; // 8px acima do botão
      }
      
      // Se o menu vai sair da tela à esquerda, ajustar
      if (left < 0) {
        left = 8; // 8px da borda esquerda
      }
      
      // Se o menu vai sair da tela à direita, ajustar
      if (left + menuWidth > window.innerWidth) {
        left = window.innerWidth - menuWidth - 8; // 8px da borda direita
      }
      
      setMenuPosition({ top, left });
    }
  }, [isOpen]);

  const handleAction = (action: () => void | undefined) => {
    if (action) {
      action();
    }
    setIsOpen(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="text-text-light-secondary dark:text-text-dark-secondary hover:text-primary transition-colors p-1 rounded-md hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20"
      >
        <span className="material-symbols-outlined">more_vert</span>
      </button>

      {isOpen && (
        <div 
          ref={menuRef}
          className="fixed w-48 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg shadow-xl dark:shadow-dark-2xl z-50"
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
          }}
        >
          <div className="py-1">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction(onEdit);
                }}
                className="w-full px-4 py-2 text-left text-sm text-text-light-primary dark:text-text-dark-primary hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 flex items-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-base">edit</span>
                Editar
              </button>
            )}

            {onMove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction(onMove);
                }}
                className="w-full px-4 py-2 text-left text-sm text-text-light-primary dark:text-text-dark-primary hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 flex items-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-base">drive_file_move</span>
                Mover
              </button>
            )}

            {onShare && itemType === 'list' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction(onShare);
                }}
                className="w-full px-4 py-2 text-left text-sm text-text-light-primary dark:text-text-dark-primary hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 flex items-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-base">share</span>
                Compartilhar
              </button>
            )}

            {onDuplicate && itemType === 'list' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction(onDuplicate);
                }}
                className="w-full px-4 py-2 text-left text-sm text-text-light-primary dark:text-text-dark-primary hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 flex items-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-base">content_copy</span>
                Duplicar Lista
              </button>
            )}

            {onDuplicateErrors && itemType === 'list' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction(onDuplicateErrors);
                }}
                className="w-full px-4 py-2 text-left text-sm text-text-light-primary dark:text-text-dark-primary hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 flex items-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-base">error</span>
                Duplicar Somente Erros
              </button>
            )}

            {onCreateSimulated && itemType === 'list' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction(onCreateSimulated);
                }}
                className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-primary/10 flex items-center gap-2 transition-colors font-medium"
              >
                <span className="material-symbols-outlined text-base">timer</span>
                Criar Simulado
              </button>
            )}

            {onDelete && (
              <>
                <div className="border-t border-border-light dark:border-border-dark my-1"></div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(onDelete);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                  Excluir
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
