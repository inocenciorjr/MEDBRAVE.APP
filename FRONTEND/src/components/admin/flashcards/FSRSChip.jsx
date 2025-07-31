import React from 'react';
import { X } from 'lucide-react';

/**
 * 🏷️ COMPONENTE: Chip Visual para Status FSRS
 * 
 * Features:
 * - Cores dinâmicas baseadas no tipo
 * - Ícones contextuais
 * - Suporte a remoção
 * - Tooltips informativos
 */
const FSRSChip = ({ 
  filter, 
  onRemove, 
  removable = false, 
  size = 'sm',
  variant = 'default' 
}) => {
  if (!filter) return null;

  const Icon = filter.icon;

  // Definir cores baseadas no tipo
  const getColorClasses = () => {
    const baseClasses = {
      red: {
        default: 'bg-red-100 text-red-800 border-red-200',
        outline: 'border-red-500 text-red-600 bg-white',
        solid: 'bg-red-500 text-white border-red-500'
      },
      orange: {
        default: 'bg-orange-100 text-orange-800 border-orange-200',
        outline: 'border-orange-500 text-orange-600 bg-white',
        solid: 'bg-orange-500 text-white border-orange-500'
      },
      yellow: {
        default: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        outline: 'border-yellow-500 text-yellow-600 bg-white',
        solid: 'bg-yellow-500 text-white border-yellow-500'
      },
      green: {
        default: 'bg-green-100 text-green-800 border-green-200',
        outline: 'border-green-500 text-green-600 bg-white',
        solid: 'bg-green-500 text-white border-green-500'
      },
      blue: {
        default: 'bg-blue-100 text-blue-800 border-blue-200',
        outline: 'border-blue-500 text-blue-600 bg-white',
        solid: 'bg-blue-500 text-white border-blue-500'
      },
      gray: {
        default: 'bg-gray-100 text-gray-800 border-gray-200',
        outline: 'border-gray-500 text-gray-600 bg-white',
        solid: 'bg-gray-500 text-white border-gray-500'
      }
    };

    return baseClasses[filter.color]?.[variant] || baseClasses.gray[variant];
  };

  // Definir tamanhos
  const getSizeClasses = () => {
    const sizeClasses = {
      xs: 'px-2 py-1 text-xs',
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-5 py-2.5 text-lg'
    };

    return sizeClasses[size] || sizeClasses.sm;
  };

  // Definir classes do ícone
  const getIconSize = () => {
    const iconSizes = {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6'
    };

    return iconSizes[size] || iconSizes.sm;
  };

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 border rounded-full
        transition-all duration-200 hover:shadow-sm
        ${getColorClasses()}
        ${getSizeClasses()}
        ${removable ? 'pr-1' : ''}
      `}
      title={filter.description}
    >
      {/* Ícone */}
      {Icon && (
        <Icon className={`${getIconSize()} flex-shrink-0`} />
      )}

      {/* Label */}
      <span className="font-medium">{filter.label}</span>

      {/* Botão de remoção */}
      {removable && onRemove && (
        <button
          onClick={onRemove}
          className={`
            ml-1 p-0.5 rounded-full hover:bg-black/10 transition-colors
            ${variant === 'solid' ? 'hover:bg-white/20' : ''}
          `}
          title={`Remover filtro ${filter.label}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

/**
 * 📊 COMPONENTE: Chip de Estatística FSRS
 */
export const FSRSStatChip = ({ 
  label, 
  value, 
  icon: Icon, 
  color = 'gray',
  trend = null 
}) => {
  const getColorClasses = () => {
    const colors = {
      red: 'text-red-600 bg-red-50',
      orange: 'text-orange-600 bg-orange-50',
      yellow: 'text-yellow-600 bg-yellow-50',
      green: 'text-green-600 bg-green-50',
      blue: 'text-blue-600 bg-blue-50',
      gray: 'text-gray-600 bg-gray-50'
    };
    return colors[color] || colors.gray;
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${getColorClasses()}`}>
      {Icon && <Icon className="w-4 h-4" />}
      <div className="flex flex-col">
        <span className="text-lg font-bold">{value}</span>
        <span className="text-xs opacity-75">{label}</span>
      </div>
      {trend && (
        <div className={`text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </div>
      )}
    </div>
  );
};

/**
 * 🎯 COMPONENTE: Chip de Prioridade
 */
export const PriorityChip = ({ priority, size = 'sm' }) => {
  const priorities = {
    baixa: { label: 'Baixa', color: 'green', icon: '◉' },
    media: { label: 'Média', color: 'yellow', icon: '◐' },
    alta: { label: 'Alta', color: 'orange', icon: '◑' },
    critica: { label: 'Crítica', color: 'red', icon: '●' }
  };

  const config = priorities[priority] || priorities.media;

  return (
    <FSRSChip
      filter={{
        label: config.label,
        color: config.color,
        icon: () => <span>{config.icon}</span>
      }}
      size={size}
      variant="outline"
    />
  );
};

export default FSRSChip; 