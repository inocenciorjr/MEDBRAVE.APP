'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';

export default function UserPlanCard() {
  const router = useRouter();
  const { user, loading } = useUser();

  const daysRemaining = useMemo(() => {
    if (!user?.activePlan?.endDate) return null;
    
    const end = new Date(user.activePlan.endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }, [user?.activePlan?.endDate]);

  const handleSubscribe = () => {
    router.push('/planos');
  };

  if (loading) {
    return (
      <div className="p-3 rounded-lg bg-surface-light dark:bg-surface-dark animate-pulse">
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full mb-3"></div>
        <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  const userPlan = user?.activePlan;

  // Se não tem plano ou tem plano FREE, mostrar banner premium
  if (!userPlan || userPlan.planName === 'FREE' || userPlan.status.toUpperCase() !== 'ACTIVE') {
    return (
      <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-900 to-purple-900 dark:from-indigo-900 dark:to-purple-900 text-center relative overflow-hidden shadow-2xl dark:shadow-dark-2xl max-w-full">
        {/* Círculo decorativo */}
        <div className="absolute -top-3 -left-3 w-12 h-12 bg-white/10 rounded-full"></div>
        
        {/* Conteúdo */}
        <h3 className="font-bold text-white dark:text-white relative z-10 text-sm">
          Seja premium
        </h3>
        <p className="text-[10px] text-indigo-200 dark:text-indigo-200 mt-1 mb-3 relative z-10 leading-tight">
          Acesse nossos recursos especiais assinando nosso pacote
        </p>
        <button
          onClick={handleSubscribe}
          className="w-full bg-surface-light dark:bg-surface-dark text-primary font-semibold py-1.5 text-sm rounded-lg shadow-sm hover:opacity-90 transition-opacity relative z-10"
        >
          Assine
        </button>
      </div>
    );
  }

  // Se tem plano TRIAL, mostrar card com dias restantes
  if (userPlan.isTrial || userPlan.planName.includes('TRIAL')) {
    return (
      <div className="p-3 rounded-lg bg-gradient-to-br from-purple-600 to-purple-800 dark:from-purple-700 dark:to-purple-900 text-center relative overflow-hidden shadow-2xl dark:shadow-dark-2xl max-w-full">
        {/* Círculo decorativo */}
        <div className="absolute -top-3 -left-3 w-12 h-12 bg-white/10 rounded-full"></div>
        
        {/* Badge Trial */}
        <div className="inline-block px-2 py-0.5 bg-white/20 rounded-full text-[10px] text-white font-semibold mb-2 relative z-10">
          TRIAL
        </div>
        
        {/* Conteúdo */}
        <h3 className="font-bold text-white dark:text-white relative z-10 text-sm">
          {userPlan.planName}
        </h3>
        
        {daysRemaining !== null && (
          <p className="text-[10px] text-purple-100 dark:text-purple-100 mt-1 mb-3 relative z-10 leading-tight">
            {daysRemaining > 0 
              ? `${daysRemaining} ${daysRemaining === 1 ? 'dia restante' : 'dias restantes'}`
              : 'Período de teste encerrado'
            }
          </p>
        )}
        
        <button
          onClick={handleSubscribe}
          className="w-full bg-white text-purple-700 font-semibold py-1.5 text-sm rounded-lg shadow-sm hover:opacity-90 transition-opacity relative z-10"
        >
          Assine agora
        </button>
      </div>
    );
  }

  // Se tem plano pago ativo, mostrar card do plano
  return (
    <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 dark:from-emerald-700 dark:to-teal-800 text-center relative overflow-hidden shadow-2xl dark:shadow-dark-2xl max-w-full">
      {/* Círculo decorativo */}
      <div className="absolute -top-3 -left-3 w-12 h-12 bg-white/10 rounded-full"></div>
      
      {/* Badge Premium */}
      <div className="inline-block px-2 py-0.5 bg-white/20 rounded-full text-[10px] text-white font-semibold mb-2 relative z-10">
        ✓ ATIVO
      </div>
      
      {/* Conteúdo */}
      <h3 className="font-bold text-white dark:text-white relative z-10 text-sm">
        {userPlan.planName}
      </h3>
      
      {userPlan.endDate && daysRemaining !== null && (
        <p className="text-[10px] text-emerald-100 dark:text-emerald-100 mt-1 relative z-10 leading-tight">
          {daysRemaining > 0 
            ? `Válido por mais ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}`
            : 'Plano vitalício'
          }
        </p>
      )}
      
      {!userPlan.endDate && (
        <p className="text-[10px] text-emerald-100 dark:text-emerald-100 mt-1 relative z-10 leading-tight">
          Plano vitalício
        </p>
      )}
    </div>
  );
}
