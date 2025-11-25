'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { StatsGrid } from '@/components/admin/dashboard/StatsGrid';
import { QuickActions } from '@/components/admin/dashboard/QuickActions';
import { getDashboardStats, type DashboardStats } from '@/services/admin/statsService';
import { supabase } from '@/config/supabase';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Aguardar um pouco para o token ser processado
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('[Admin] Sem sessão, redirecionando para login');
        router.push('/login?redirect=/admin');
        return;
      }

      setAuthChecked(true);
      loadStats();
    } catch (err) {
      console.error('[Admin] Erro ao verificar autenticação:', err);
      router.push('/login?redirect=/admin');
    }
  };

  useEffect(() => {
    if (authChecked) {
      loadStats();
    }
  }, [authChecked]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboardStats();
      setStats(data);
    } catch (err: any) {
      console.error('Error loading dashboard stats:', err);
      setError(err.message || 'Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-surface-light dark:bg-surface-dark rounded-xl animate-pulse"
            />
          ))}
        </div>
        <div className="h-64 bg-surface-light dark:bg-surface-dark rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-red-500 mb-4">
            error
          </span>
          <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
            Erro ao carregar dashboard
          </h2>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4">
            {error}
          </p>
          <button
            onClick={loadStats}
            className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Admin', icon: 'dashboard', href: '/admin' }
        ]}
      />
      <div className="space-y-6">
        {/* Welcome message */}
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-700 dark:text-slate-200 mb-2">
            Bem-vindo ao Painel Administrativo
          </h1>
          <p className="text-text-light-secondary dark:text-text-dark-secondary">
            Visão geral do sistema e estatísticas principais
          </p>
        </div>

        {/* Stats Grid */}
        <StatsGrid stats={stats} />

        {/* Quick Actions */}
        <QuickActions />
      </div>
    </>
  );
}
