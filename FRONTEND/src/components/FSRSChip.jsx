import React from 'react';
import { X } from 'lucide-react';

/**
 * 🎨 COMPONENTE: Chip visual para filtros FSRS
 * 
 * Props:
 * - filter: objeto com id, label, description, icon, color
 * - onRemove: função para remover o filtro (opcional)
 * - removable: boolean para mostrar botão de remoção
 */
const FSRSChip = ({ filter, onRemove, removable = false }) => {
  if (!filter) return null;

  const Icon = filter.icon;
  
  // Mapear cores para estilos CSS Variables compatíveis
  const getColorStyles = (color) => {
    const colorMap = {
      red: {
        backgroundColor: 'var(--color-red-light)',
        color: 'var(--color-red-dark)',
        borderColor: 'var(--color-red-border)'
      },
      orange: {
        backgroundColor: 'var(--color-orange-light)',
        color: 'var(--color-orange-dark)',
        borderColor: 'var(--color-orange-border)'
      },
      yellow: {
        backgroundColor: 'var(--color-yellow-light)',
        color: 'var(--color-yellow-dark)',
        borderColor: 'var(--color-yellow-border)'
      },
      green: {
        backgroundColor: 'var(--color-green-light)',
        color: 'var(--color-green-dark)',
        borderColor: 'var(--color-green-border)'
      },
      blue: {
        backgroundColor: 'var(--color-blue-light)',
        color: 'var(--color-blue-dark)',
        borderColor: 'var(--color-blue-border)'
      },
      purple: {
        backgroundColor: 'var(--color-purple-light)',
        color: 'var(--color-purple-dark)',
        borderColor: 'var(--color-purple-border)'
      },
      gray: {
        backgroundColor: 'var(--bg-tertiary)',
        color: 'var(--text-secondary)',
        borderColor: 'var(--border-color)'
      }
    };

    return colorMap[color] || colorMap.gray;
  };

  const colorStyles = getColorStyles(filter.color);

  return (
    <div 
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all hover:opacity-80"
      style={{
        backgroundColor: colorStyles.backgroundColor,
        color: colorStyles.color,
        borderColor: colorStyles.borderColor
      }}
    >
      {Icon && <Icon className="w-4 h-4" />}
      <span>{filter.label}</span>
      {removable && onRemove && (
        <button
          onClick={() => onRemove(filter.id)}
          className="ml-1 rounded-full p-0.5 transition-all hover:opacity-70"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.1)'
          }}
          aria-label={`Remover filtro ${filter.label}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

export default FSRSChip; 