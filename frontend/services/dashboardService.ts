/**
 * Dashboard service for fetching user data
 */

import { createClient } from '@/lib/supabase/client';

export interface UserDashboardData {
  user: {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
  };
  stats: {
    totalQuestions: number;
    correctAnswers: number;
    studyStreak: number;
    weeklyHours: number;
  };
  recentActivity: Array<{
    day: string;
    hours: number;
    minutes: number;
    date: string;
  }>;
}

export async function getUserDashboardData(): Promise<UserDashboardData> {
  const supabase = createClient();
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Usuário não autenticado');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single();

  // Get user statistics
  const { data: stats } = await supabase
    .from('user_statistics')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Get recent activity (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: sessions } = await supabase
    .from('study_sessions')
    .select('created_at, duration_minutes')
    .eq('user_id', user.id)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: true });

  // Process activity data
  const activityMap = new Map<string, { hours: number; minutes: number }>();
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  // Initialize last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayKey = date.toISOString().split('T')[0];
    activityMap.set(dayKey, { hours: 0, minutes: 0 });
  }

  // Fill with actual data
  sessions?.forEach(session => {
    const date = new Date(session.created_at);
    const dayKey = date.toISOString().split('T')[0];
    const existing = activityMap.get(dayKey) || { hours: 0, minutes: 0 };
    const totalMinutes = existing.hours * 60 + existing.minutes + (session.duration_minutes || 0);
    activityMap.set(dayKey, {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    });
  });

  // Convert to array
  const recentActivity = Array.from(activityMap.entries()).map(([dateStr, time]) => {
    const date = new Date(dateStr);
    return {
      day: days[date.getDay()],
      hours: time.hours,
      minutes: time.minutes,
      date: date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
    };
  });

  return {
    user: {
      id: user.id,
      email: user.email || '',
      name: profile?.full_name || user.email?.split('@')[0] || 'Usuário',
      avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url
    },
    stats: {
      totalQuestions: stats?.total_questions || 0,
      correctAnswers: stats?.correct_answers || 0,
      studyStreak: stats?.current_streak || 0,
      weeklyHours: Math.floor(recentActivity.reduce((acc, day) => acc + day.hours + day.minutes / 60, 0))
    },
    recentActivity
  };
}
