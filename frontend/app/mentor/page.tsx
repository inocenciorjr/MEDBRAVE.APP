'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import MentorDashboardStats from '@/components/mentor/MentorDashboardStats';

import MentorQuickActions from '@/components/mentor/MentorQuickActions';
import MentorProgramsOverview from '@/components/mentor/MentorProgramsOverview';
import { MentorDashboardSkeleton } from '@/components/mentor/skeletons/MentorDashboardSkeleton';

export default function MentorDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) return;

        // Buscar estatísticas de programas
        const programsResponse = await fetch('/api/mentorship/programs', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        const programsData = await programsResponse.json();
        const programs = programsData.data || [];

        // Buscar mentorados
        const menteesResponse = await fetch('/api/mentorship/mentor/mentees', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        const menteesData = await menteesResponse.json();
        const mentees = menteesData.data || [];

        setDashboardData({
          totalMentees: mentees.length,
          activePrograms: programs.filter((p: any) => ['active', 'approved'].includes(p.status)).length,
          pendingPrograms: programs.filter((p: any) => p.status === 'pending_approval').length,
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
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Mentor', icon: 'school', href: '/mentor' },
        ]}
      />

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

      {/* Programas Overview - largura total */}
      <MentorProgramsOverview />
    </div>
  );
}
