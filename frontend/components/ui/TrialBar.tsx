'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';

export default function TrialBar() {
  const router = useRouter();
  const { user, loading } = useUser();

  const planInfo = useMemo(() => {
    if (!user?.activePlan) return null;
    
    const plan = user.activePlan;
    const isTrial = plan.isTrial || plan.planName.includes('TRIAL');
    const isActive = plan.status.toUpperCase() === 'ACTIVE';
    
    if (!plan.endDate) return { isTrial, isActive, daysRemaining: null, planName: plan.planName };
    
    const end = new Date(plan.endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      isTrial,
      isActive,
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
      planName: plan.planName,
    };
  }, [user?.activePlan]);

  if (loading) return null;

  if (!planInfo || (!planInfo.isTrial && planInfo.isActive && planInfo.planName !== 'FREE')) {
    return null;
  }

  const handleClick = () => {
    router.push('/planos');
  };

  const isUrgent = planInfo.daysRemaining !== null && planInfo.daysRemaining <= 3;
  const isExpired = planInfo.daysRemaining === 0;
  const daysDisplay = planInfo.daysRemaining !== null 
    ? String(planInfo.daysRemaining).padStart(2, '0') 
    : '--';

  return (
    <button
      onClick={handleClick}
      className="relative flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 overflow-hidden shadow-lg shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98] transition-transform"
    >
      {/* Glow overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-white/10 pointer-events-none" />
      
      {/* Animated shimmer */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

      {/* Badge TRIAL PRO - mobile mostra TRIAL, desktop mostra TRIAL PRO */}
      <div className="relative flex items-center px-1 sm:px-1.5 py-0.5 bg-white/20 rounded text-[8px] sm:text-[9px] font-bold text-white tracking-wider animate-pulse">
        <span className="sm:hidden">TRIAL</span>
        <span className="hidden sm:inline">TRIAL PRO</span>
      </div>

      {/* Dias restantes */}
      <div className="relative flex items-center gap-1">
        {/* Número */}
        <div className={`
          flex items-center justify-center min-w-[28px] sm:min-w-[36px] h-7 sm:h-8 px-1 
          bg-white/20 rounded-lg backdrop-blur-sm
          ${isExpired ? 'bg-red-500/40 animate-pulse' : isUrgent ? 'bg-amber-500/30 animate-pulse' : ''}
        `}>
          <span 
            className={`
              text-base sm:text-xl font-black text-white 
              ${isUrgent || isExpired ? 'animate-bounce' : 'animate-glow'}
            `}
            style={{
              fontFamily: '"Orbitron", "Rajdhani", "Share Tech Mono", monospace',
              textShadow: '0 0 8px rgba(255,255,255,0.5), 1px 1px 2px rgba(0,0,0,0.3)',
              WebkitTextStroke: '0.5px rgba(79, 70, 229, 0.5)',
            }}
          >
            {daysDisplay}
          </span>
        </div>
        
        {/* Texto - mobile mostra só "dias", desktop mostra "dias restantes" */}
        <div className="flex flex-col leading-none">
          <span className="text-[8px] sm:text-[9px] font-semibold text-white/90 uppercase tracking-wide">
            {planInfo.daysRemaining === 1 ? 'dia' : 'dias'}
          </span>
          <span className="hidden sm:block text-[8px] font-medium text-white/70 uppercase tracking-wide">
            {planInfo.daysRemaining === 1 ? 'restante' : 'restantes'}
          </span>
        </div>
      </div>

      {/* Botão visual interno - mobile mostra "Comprar", desktop mostra "Comprar plano" */}
      <div className="relative flex px-2 sm:px-3 py-1 sm:py-1.5 bg-white text-purple-700 text-[10px] sm:text-xs font-bold rounded-lg 
                   shadow-[0_0_15px_rgba(255,255,255,0.5)]
                   uppercase tracking-wide
                   animate-buttonGlow"
      >
        <span className="sm:hidden">Comprar</span>
        <span className="hidden sm:inline">Comprar plano</span>
      </div>
    </button>
  );
}
