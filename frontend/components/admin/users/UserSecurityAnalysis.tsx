'use client';

import { useState, useEffect } from 'react';

interface SecurityAnalysisProps {
  userId: string;
}

interface SessionActivity {
  userId: string;
  sessionCount: number;
  uniqueIPs: number;
  uniqueDevices: number;
  recentLogins: number;
  disconnects: number;
}

interface SuspiciousActivity {
  userId: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  details: any;
}

interface SecurityAnalysis {
  activity: SessionActivity;
  suspicious: SuspiciousActivity[];
}

export function UserSecurityAnalysis({ userId }: SecurityAnalysisProps) {
  const [analysis, setAnalysis] = useState<SecurityAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSecurityAnalysis();
  }, [userId]);

  const fetchSecurityAnalysis = async () => {
    try {
      setLoading(true);
      
      // Usar baseService para incluir o token automaticamente
      const { get } = await import('@/services/admin/baseService');
      const result = await get<{ success: boolean; data: SecurityAnalysis }>(`/admin/users/${userId}/security-analysis`);
      
      if (result.success) {
        setAnalysis(result.data);
      } else {
        setError('Erro ao carregar análise de segurança');
      }
    } catch (err) {
      setError('Erro ao carregar análise de segurança');
      console.error('Erro ao carregar análise:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'high':
        return {
          color: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
          icon: 'error',
          glow: 'shadow-red-500/20',
        };
      case 'medium':
        return {
          color: 'text-yellow-600 dark:text-yellow-400',
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          badge: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
          icon: 'warning',
          glow: 'shadow-yellow-500/20',
        };
      case 'low':
        return {
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
          icon: 'info',
          glow: 'shadow-blue-500/20',
        };
      default:
        return {
          color: 'text-gray-600 dark:text-gray-400',
          bg: 'bg-gray-50 dark:bg-gray-900/20',
          border: 'border-gray-200 dark:border-gray-800',
          badge: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300',
          icon: 'help',
          glow: 'shadow-gray-500/20',
        };
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Loading Skeleton */}
        <div className="bg-gradient-to-br from-surface-light to-background-light dark:from-surface-dark dark:to-background-dark 
                      rounded-2xl shadow-xl dark:shadow-dark-xl p-8 border-2 border-border-light dark:border-border-dark">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              <div className="flex-1">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-background-light dark:bg-background-dark p-6 rounded-xl border-2 border-border-light dark:border-border-dark">
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 
                    rounded-2xl shadow-xl dark:shadow-dark-xl p-8 border-2 border-red-200 dark:border-red-800
                    animate-slide-in-from-bottom">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-14 h-14 bg-red-100 dark:bg-red-900/40 rounded-xl 
                        flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl">
              error
            </span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-900 dark:text-red-100 mb-1">
              Erro ao Carregar Análise
            </h3>
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const hasThreats = analysis.suspicious.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header com Status Geral */}
      <div className={`relative overflow-hidden rounded-2xl shadow-2xl dark:shadow-dark-2xl border-2 
                     transition-all duration-500 hover:scale-[1.01] group
                     ${hasThreats 
                       ? 'bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-red-900/20 dark:via-orange-900/20 dark:to-yellow-900/20 border-red-300 dark:border-red-700' 
                       : 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20 border-green-300 dark:border-green-700'
                     }`}>
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent 
                        dark:via-gray-800 animate-pulse-slow"></div>
        </div>

        <div className="relative p-8">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-4 flex-1">
              <div className={`relative flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center 
                            shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3
                            ${hasThreats 
                              ? 'bg-gradient-to-br from-red-500 to-orange-500' 
                              : 'bg-gradient-to-br from-green-500 to-emerald-500'
                            }`}>
                {/* Glow Effect */}
                <div className={`absolute inset-0 rounded-2xl blur-xl opacity-50 
                              ${hasThreats ? 'bg-red-500' : 'bg-green-500'}`}></div>
                <span className="material-symbols-outlined text-white text-4xl relative z-10">
                  {hasThreats ? 'shield_with_heart' : 'verified_user'}
                </span>
              </div>
              <div className="flex-1">
                <h3 className={`text-2xl font-display font-bold mb-2 
                             ${hasThreats 
                               ? 'text-red-900 dark:text-red-100' 
                               : 'text-green-900 dark:text-green-100'
                             }`}>
                  {hasThreats ? 'Atividades Suspeitas Detectadas' : 'Conta Segura'}
                </h3>
                <p className={`text-sm font-medium
                            ${hasThreats 
                              ? 'text-red-700 dark:text-red-300' 
                              : 'text-green-700 dark:text-green-300'
                            }`}>
                  {hasThreats 
                    ? `${analysis.suspicious.length} alerta(s) de segurança encontrado(s)` 
                    : 'Nenhum padrão suspeito identificado'
                  }
                </p>
              </div>
            </div>
            
            {/* Status Badge */}
            <div className={`flex-shrink-0 px-4 py-2 rounded-xl font-bold text-sm shadow-lg
                          ${hasThreats 
                            ? 'bg-red-500 text-white' 
                            : 'bg-green-500 text-white'
                          }`}>
              {hasThreats ? 'ATENÇÃO' : 'SEGURO'}
            </div>
          </div>
        </div>
      </div>

      {/* Métricas de Atividade */}
      <div className="bg-gradient-to-br from-surface-light to-background-light dark:from-surface-dark dark:to-background-dark 
                    rounded-2xl shadow-xl dark:shadow-dark-xl p-8 border-2 border-border-light dark:border-border-dark
                    transition-all duration-500 hover:shadow-2xl dark:hover:shadow-dark-2xl hover:scale-[1.01]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-primary text-2xl">
              analytics
            </span>
          </div>
          <div>
            <h4 className="text-lg font-display font-bold text-text-light-primary dark:text-text-dark-primary">
              Análise de Atividade
            </h4>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Métricas de uso nas últimas 24 horas
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Sessões Ativas */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 
                        p-6 rounded-xl border-2 border-blue-200 dark:border-blue-800
                        shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                        transition-all duration-300 hover:scale-105 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl"></div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl">
                  devices
                </span>
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                  Sessões
                </p>
              </div>
              <p className="text-4xl font-display font-bold text-blue-900 dark:text-blue-100 mb-1">
                {analysis.activity.sessionCount}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Ativas agora
              </p>
            </div>
          </div>

          {/* IPs Únicos */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 
                        p-6 rounded-xl border-2 border-purple-200 dark:border-purple-800
                        shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                        transition-all duration-300 hover:scale-105 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl"></div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-xl">
                  public
                </span>
                <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  IPs Únicos
                </p>
              </div>
              <p className="text-4xl font-display font-bold text-purple-900 dark:text-purple-100 mb-1">
                {analysis.activity.uniqueIPs}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                Localizações
              </p>
            </div>
          </div>

          {/* Dispositivos */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 
                        p-6 rounded-xl border-2 border-green-200 dark:border-green-800
                        shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                        transition-all duration-300 hover:scale-105 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full blur-2xl"></div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-xl">
                  smartphone
                </span>
                <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wider">
                  Dispositivos
                </p>
              </div>
              <p className="text-4xl font-display font-bold text-green-900 dark:text-green-100 mb-1">
                {analysis.activity.uniqueDevices}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                Diferentes
              </p>
            </div>
          </div>

          {/* Logins Recentes */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 
                        p-6 rounded-xl border-2 border-orange-200 dark:border-orange-800
                        shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                        transition-all duration-300 hover:scale-105 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl"></div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-xl">
                  login
                </span>
                <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wider">
                  Logins
                </p>
              </div>
              <p className="text-4xl font-display font-bold text-orange-900 dark:text-orange-100 mb-1">
                {analysis.activity.recentLogins}
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                Últimas 24h
              </p>
            </div>
          </div>

          {/* Disconnects */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 
                        p-6 rounded-xl border-2 border-red-200 dark:border-red-800
                        shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                        transition-all duration-300 hover:scale-105 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full blur-2xl"></div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-xl">
                  logout
                </span>
                <p className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase tracking-wider">
                  Disconnects
                </p>
              </div>
              <p className="text-4xl font-display font-bold text-red-900 dark:text-red-100 mb-1">
                {analysis.activity.disconnects}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                Últimas 24h
              </p>
            </div>
          </div>

          {/* Total de Alertas */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 
                        p-6 rounded-xl border-2 border-yellow-200 dark:border-yellow-800
                        shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                        transition-all duration-300 hover:scale-105 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/10 rounded-full blur-2xl"></div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-xl">
                  notification_important
                </span>
                <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-300 uppercase tracking-wider">
                  Alertas
                </p>
              </div>
              <p className="text-4xl font-display font-bold text-yellow-900 dark:text-yellow-100 mb-1">
                {analysis.suspicious.length}
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                Detectados
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Atividades Suspeitas */}
      {analysis.suspicious.length > 0 ? (
        <div className="bg-gradient-to-br from-surface-light to-background-light dark:from-surface-dark dark:to-background-dark 
                      rounded-2xl shadow-xl dark:shadow-dark-xl p-8 border-2 border-border-light dark:border-border-dark
                      transition-all duration-500 hover:shadow-2xl dark:hover:shadow-dark-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-red-500/10 dark:bg-red-500/20 rounded-xl flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">
                warning
              </span>
            </div>
            <div>
              <h4 className="text-lg font-display font-bold text-text-light-primary dark:text-text-dark-primary">
                Atividades Suspeitas Detectadas
              </h4>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                {analysis.suspicious.length} alerta(s) de segurança
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            {analysis.suspicious.map((item, index) => {
              const config = getSeverityConfig(item.severity);
              return (
                <div 
                  key={index}
                  className={`group relative overflow-hidden ${config.bg} ${config.border} border-2 rounded-xl p-6
                            shadow-lg hover:shadow-2xl dark:shadow-dark-lg dark:hover:shadow-dark-2xl
                            transition-all duration-300 hover:scale-[1.02] animate-slide-in-from-bottom`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Animated Glow */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${config.glow} blur-xl`}></div>
                  
                  <div className="relative flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`flex-shrink-0 w-12 h-12 ${config.bg} rounded-xl flex items-center justify-center 
                                    shadow-lg group-hover:scale-110 transition-transform duration-300 border-2 ${config.border}`}>
                        <span className={`material-symbols-outlined ${config.color} text-2xl`}>
                          {config.icon}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className={`font-bold text-base mb-2 ${config.color}`}>
                          {item.reason}
                        </h5>
                        <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 border border-border-light dark:border-border-dark">
                          <pre className="text-xs font-mono text-text-light-secondary dark:text-text-dark-secondary overflow-x-auto">
                            {JSON.stringify(item.details, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                    <span className={`flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-full ${config.badge} 
                                   shadow-md uppercase tracking-wider`}>
                      {item.severity}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20 
                      rounded-2xl shadow-xl dark:shadow-dark-xl p-12 border-2 border-green-300 dark:border-green-700
                      transition-all duration-500 hover:shadow-2xl dark:hover:shadow-dark-2xl hover:scale-[1.01]
                      animate-fade-in">
          <div className="text-center space-y-6">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-green-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
              <div className="relative w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full 
                            flex items-center justify-center shadow-2xl mx-auto">
                <span className="material-symbols-outlined text-white text-6xl">
                  verified_user
                </span>
              </div>
            </div>
            <div>
              <h4 className="text-2xl font-display font-bold text-green-900 dark:text-green-100 mb-3">
                Nenhuma Atividade Suspeita
              </h4>
              <p className="text-green-700 dark:text-green-300 max-w-md mx-auto">
                Este usuário não apresenta padrões suspeitos de uso. Todas as métricas estão dentro dos limites normais.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
              <span className="material-symbols-outlined text-lg">
                check_circle
              </span>
              <span className="font-semibold">Conta verificada e segura</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
