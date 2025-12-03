'use client';

import { LucideIcon } from 'lucide-react';

interface MenteeStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  gradient: string;
  shadowColor: string;
}

export function MenteeStatCard({ 
  icon: Icon, 
  label, 
  value, 
  subtitle, 
  gradient,
  shadowColor 
}: MenteeStatCardProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-primary/5 
                  dark:from-surface-dark dark:via-surface-dark dark:to-primary/10 
                  rounded-2xl p-5 border-2 border-border-light dark:border-border-dark
                  shadow-xl dark:shadow-dark-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]
                  group">
      {/* Background glow */}
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradient} opacity-10 rounded-full blur-2xl 
                    group-hover:opacity-20 transition-opacity duration-300`} />
      
      <div className="relative flex items-start gap-4">
        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${gradient} 
                      flex items-center justify-center shadow-lg ${shadowColor}
                      group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1 truncate">
            {label}
          </p>
          <p className="text-2xl md:text-3xl font-bold text-text-light-primary dark:text-text-dark-primary">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Preset configurations for common stat cards
export const statCardPresets = {
  blue: {
    gradient: 'from-blue-500 to-cyan-500',
    shadowColor: 'shadow-blue-500/30'
  },
  green: {
    gradient: 'from-emerald-500 to-green-500',
    shadowColor: 'shadow-emerald-500/30'
  },
  purple: {
    gradient: 'from-violet-500 to-purple-500',
    shadowColor: 'shadow-violet-500/30'
  },
  orange: {
    gradient: 'from-orange-500 to-amber-500',
    shadowColor: 'shadow-orange-500/30'
  },
  pink: {
    gradient: 'from-pink-500 to-rose-500',
    shadowColor: 'shadow-pink-500/30'
  },
  cyan: {
    gradient: 'from-cyan-500 to-teal-500',
    shadowColor: 'shadow-cyan-500/30'
  },
  red: {
    gradient: 'from-red-500 to-rose-500',
    shadowColor: 'shadow-red-500/30'
  },
  amber: {
    gradient: 'from-amber-500 to-yellow-500',
    shadowColor: 'shadow-amber-500/30'
  }
};
