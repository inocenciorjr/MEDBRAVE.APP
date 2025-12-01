'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import MentorDashboardStats from '@/components/mentor/MentorDashboardStats';
import MentorRecentActivity from '@/components/mentor/MentorRecentActivity';
import MentorQuickActions from '@/components/mentor/MentorQuickActions';
import MentorMenteesOverview from '@/components/mentor/MentorMenteesOverview';
import { MentorDashboardSkeleton } from '@/components/mentor/skeletons/MentorDashboardSkeleton';

export default function MentorDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        // Buscar dados do dashboard
        // TODO: Implementar chamadas reais à API
        setDashboardData({
          totalMentees: 0,
          activeMentorships: 0,
          pendingRequests: 0,
          completedSessions: 0,
          upcomingMeetings: [],
          recentActivity: [],
        });
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (isLoading) {
    return <MentorDashboardSkeleton />;
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header da Página */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-text-light-primary dark:text-text-dark-primary">
            Painel do Mentor
          </h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Gerencie seus mentorados, simulados e acompanhe o progresso
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <MentorDashboardStats data={dashboardData} />

      {/* Quick Actions */}
      <MentorQuickActions />

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mentorados Overview - 2 colunas */}
        <div className="lg:col-span-2">
          <MentorMenteesOverview />
        </div>

        {/* Atividade Recente - 1 coluna */}
        <div className="lg:col-span-1">
          <MentorRecentActivity activities={dashboardData?.recentActivity || []} />
        </div>
      </div>
    </div>
  );
}
