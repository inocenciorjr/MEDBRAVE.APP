import React from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

/**
 * Componente Tag melhorado
 * Suporta diferentes variantes, cores e temas
 */
const Tag = ({ 
  children, 
  variant = 'default',
  color = 'blue',
  size = 'md',
  removable = false,
  onRemove,
  className = '',
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center gap-1 font-medium rounded-full transition-all duration-200';
  
  // Tamanhos
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };
  
  // Variantes e cores
  const variantClasses = {
    default: {
      blue: 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
      green: 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
      yellow: 'bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
      red: 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
      purple: 'bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
      orange: 'bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
      gray: 'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
    },
    solid: {
      blue: 'bg-blue-600 text-white border border-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
      green: 'bg-green-600 text-white border border-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600',
      yellow: 'bg-yellow-600 text-white border border-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600',
      red: 'bg-red-600 text-white border border-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600',
      purple: 'bg-purple-600 text-white border border-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600',
      orange: 'bg-orange-600 text-white border border-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600',
      gray: 'bg-gray-600 text-white border border-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600'
    },
    outline: {
      blue: 'bg-transparent text-blue-600 border border-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-400 dark:hover:bg-blue-900/20',
      green: 'bg-transparent text-green-600 border border-green-600 hover:bg-green-50 dark:text-green-400 dark:border-green-400 dark:hover:bg-green-900/20',
      yellow: 'bg-transparent text-yellow-600 border border-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:border-yellow-400 dark:hover:bg-yellow-900/20',
      red: 'bg-transparent text-red-600 border border-red-600 hover:bg-red-50 dark:text-red-400 dark:border-red-400 dark:hover:bg-red-900/20',
      purple: 'bg-transparent text-purple-600 border border-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-400 dark:hover:bg-purple-900/20',
      orange: 'bg-transparent text-orange-600 border border-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-400 dark:hover:bg-orange-900/20',
      gray: 'bg-transparent text-gray-600 border border-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:border-gray-400 dark:hover:bg-gray-900/20'
    },
    gradient: {
      blue: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 hover:from-blue-600 hover:to-blue-700',
      green: 'bg-gradient-to-r from-green-500 to-green-600 text-white border-0 hover:from-green-600 hover:to-green-700',
      yellow: 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0 hover:from-yellow-600 hover:to-yellow-700',
      red: 'bg-gradient-to-r from-red-500 to-red-600 text-white border-0 hover:from-red-600 hover:to-red-700',
      purple: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 hover:from-purple-600 hover:to-purple-700',
      orange: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 hover:from-orange-600 hover:to-orange-700',
      gray: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white border-0 hover:from-gray-600 hover:to-gray-700'
    }
  };
  
  const handleRemove = (e) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove();
    }
  };
  
  return (
    <span 
      className={cn(
        baseClasses,
        sizeClasses[size],
        variantClasses[variant][color],
        removable && 'pr-1',
        className
      )}
      {...props}
    >
      <span>{children}</span>
      {removable && (
        <button
          onClick={handleRemove}
          className="ml-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          type="button"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};

export default Tag;

// Componente de exemplo de uso
export const TagExample = () => {
  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <h3 className="font-semibold">Variante Default</h3>
        <div className="flex flex-wrap gap-2">
          <Tag color="blue">Azul</Tag>
          <Tag color="green">Verde</Tag>
          <Tag color="yellow">Amarelo</Tag>
          <Tag color="red">Vermelho</Tag>
          <Tag color="purple">Roxo</Tag>
          <Tag color="orange">Laranja</Tag>
          <Tag color="gray">Cinza</Tag>
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="font-semibold">Variante Solid</h3>
        <div className="flex flex-wrap gap-2">
          <Tag variant="solid" color="blue">Azul</Tag>
          <Tag variant="solid" color="green">Verde</Tag>
          <Tag variant="solid" color="red">Vermelho</Tag>
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="font-semibold">Variante Outline</h3>
        <div className="flex flex-wrap gap-2">
          <Tag variant="outline" color="blue">Azul</Tag>
          <Tag variant="outline" color="green">Verde</Tag>
          <Tag variant="outline" color="red">Vermelho</Tag>
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="font-semibold">Variante Gradient</h3>
        <div className="flex flex-wrap gap-2">
          <Tag variant="gradient" color="blue">Azul</Tag>
          <Tag variant="gradient" color="purple">Roxo</Tag>
          <Tag variant="gradient" color="orange">Laranja</Tag>
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="font-semibold">Tags Removíveis</h3>
        <div className="flex flex-wrap gap-2">
          <Tag color="blue" removable onRemove={() => console.log('Removido!')}>Removível</Tag>
          <Tag variant="solid" color="green" removable>Sólido Removível</Tag>
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="font-semibold">Tamanhos</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Tag size="sm" color="blue">Pequeno</Tag>
          <Tag size="md" color="green">Médio</Tag>
          <Tag size="lg" color="purple">Grande</Tag>
        </div>
      </div>
    </div>
  );
};