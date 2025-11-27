'use client';

import React from 'react';
import { AdminStats } from '../ui/AdminStats';
import type { DashboardStats } from '@/services/admin/statsService';

export interface StatsGridProps {
  stats: DashboardStats;
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <AdminStats
        title="Total de Usuários"
        value={stats.totalUsers}
        icon="people"
        color="blue"
      />
      <AdminStats
        title="Usuários Ativos"
        value={stats.activeUsers}
        icon="person_check"
        color="green"
      />
      <AdminStats
        title="Questões Publicadas"
        value={stats.publishedQuestions}
        icon="quiz"
        color="purple"
      />
      <AdminStats
        title="Conteúdo Reportado"
        value={stats.reportedContent}
        icon="flag"
        color="red"
      />
    </div>
  );
}
