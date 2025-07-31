import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Sun, Sunset, Moon, Clock } from 'lucide-react';

const periodConfig = {
  PERIODO: {
    icon: Clock,
    gradient: 'from-slate-400 to-slate-600',
    textColor: 'text-white',
    label: 'PERÍODO'
  },
  MANHA: {
    icon: Sun,
    gradient: 'from-cyan-400 via-blue-400 to-blue-500',
    textColor: 'text-white',
    label: 'MANHÃ'
  },
  TARDE: {
    icon: Sunset,
    gradient: 'from-orange-400 via-amber-400 to-yellow-400',
    textColor: 'text-white',
    label: 'TARDE'
  },
  NOITE: {
    icon: Moon,
    gradient: 'from-purple-600 via-indigo-600 to-blue-700',
    textColor: 'text-white',
    label: 'NOITE'
  }
};

export default function PeriodCard({ 
  period = 'PERIODO', 
  className = '', 
  onClick,
  isSelected = false,
  taskCount = 0 
}) {
  const config = periodConfig[period] || periodConfig.PERIODO;
  const IconComponent = config.icon;

  return (
    <Card 
      className={`
        relative overflow-hidden border-0 shadow-lg hover:shadow-xl 
        transition-all duration-300 cursor-pointer group
        ${isSelected ? 'ring-2 ring-white ring-opacity-50' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      <div className={`
        absolute inset-0 bg-gradient-to-br ${config.gradient}
        group-hover:scale-105 transition-transform duration-300
      `} />
      
      {/* Overlay com padrão sutil */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10" />
      
      {/* Efeito de brilho */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform -skew-x-12 translate-x-full group-hover:translate-x-[-200%]" />
      
      <CardContent className="relative p-6 flex flex-col items-center justify-center min-h-[120px] text-center">
        {/* Ícone */}
        <div className="mb-3 p-3 rounded-full bg-white/20 backdrop-blur-sm">
          <IconComponent className="h-8 w-8 text-white drop-shadow-sm" />
        </div>
        
        {/* Label */}
        <h3 className={`
          text-lg font-bold tracking-wider ${config.textColor} 
          drop-shadow-sm mb-1
        `}>
          {config.label}
        </h3>
        
        {/* Contador de tarefas */}
        {taskCount > 0 && (
          <div className="mt-2 px-3 py-1 rounded-full bg-white/30 backdrop-blur-sm">
            <span className="text-sm font-semibold text-white">
              {taskCount} {taskCount === 1 ? 'tarefa' : 'tarefas'}
            </span>
          </div>
        )}
        
        {/* Indicador de seleção */}
        {isSelected && (
          <div className="absolute top-3 right-3">
            <div className="w-3 h-3 rounded-full bg-white shadow-lg animate-pulse" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

