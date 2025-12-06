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
      className="relative flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 overflow-hidden shadow-md sm:shadow-lg shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98] transition-transform"
    >
      {/* Glow overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-white/10 pointer-events-none" />
      
      {/* Animated shimmer */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

      {/* Badge TRIAL PRO - hidden on mobile */}
      <div className="relative hidden sm:flex items-center px-1.5 py-0.5 bg-white/20 rounded text-[9px] font-bold text-white tracking-wider animate-pulse">
        TRIAL PRO
      </div>

      {/* Dias restantes */}
      <div className="relative flex items-center gap-0.5 sm:gap-1">
        {/* Número */}
        <div className={`
          flex items-center justify-center min-w-[24px] sm:min-w-[36px] h-6 sm:h-8 px-0.5 sm:px-1 
          bg-white/20 rounded sm:rounded-lg backdrop-blur-sm
          ${isExpired ? 'bg-red-500/40 animate-pulse' : isUrgent ? 'bg-amber-500/30 animate-pulse' : ''}
        `}>
          <span 
            className={`
              text-sm sm:text-xl font-black text-white 
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
        
        {/* Texto - versão mobile compacta */}
        <div className="flex sm:hidden flex-col leading-none">
          <span className="text-[7px] font-semibold text-white/90 uppercase">
            {planInfo.daysRemaining === 1 ? 'dia' : 'dias'}
          </span>
        </div>
        
        {/* Texto - versão desktop */}
        <div className="hidden sm:flex flex-col leading-none">
          <span className="text-[9px] font-semibold text-white/90 uppercase tracking-wide animate-fadeInOut">
            {planInfo.daysRemaining === 1 ? 'dia' : 'dias'}
          </span>
          <span className="text-[8px] font-medium text-white/70 uppercase tracking-wide animate-fadeInOut [animation-delay:0.5s]">
            {planInfo.daysRemaining === 1 ? 'restante' : 'restantes'}
          </span>
        </div>
      </div>

      {/* Seta indicando clicável - mobile */}
      <span className="relative sm:hidden material-symbols-outlined text-white/80 text-sm">
        chevron_right
      </span>

      {/* Botão visual interno - desktop */}
      <div className="relative hidden sm:flex ml-1 px-3 py-1.5 bg-white text-purple-700 text-xs font-bold rounded-lg 
                   shadow-[0_0_15px_rgba(255,255,255,0.5)]
                   uppercase tracking-wide
                   animate-buttonGlow"
      >
        Comprar plano
      </div>
    </button>
  );
}
