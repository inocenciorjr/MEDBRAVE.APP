'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';
import { useToast } from '@/lib/contexts/ToastContext';
import { mentorAnalyticsService, MenteePerformanceData } from '@/lib/services/mentorAnalyticsService';
import {
  MenteeHeader,
  MenteeTabs,
  MenteeExtendModal,
  MenteeOverviewTab,
  MenteePerformanceTab,
  MenteeSimuladosTab,
  MenteeFinancialTab,
  MenteeChargesTab,
  MenteeActionsTab,
  type MenteeTabId
} from '@/components/mentor/mentorados/detail';

interface MenteeDetails {
  id: string;
  mentorshipId: string;
  name: string;
  email: string;
  avatar?: string;
  status: string;
  startDate: string;
  endDate?: string;
  programId?: string;
}

export default function MenteeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const menteeId = params.id as string;
  
  const [mentee, setMentee] = useState<MenteeDetails | null>(null);
  const [performance, setPerformance] = useState<MenteePerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPerformance, setIsLoadingPerformance] = useState(false);
  const [activeTab, setActiveTab] = useState<MenteeTabId>('overview');
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadMenteeDetails();
  }, [menteeId]);

  useEffect(() => {
    if (mentee?.id) {
      loadPerformanceData();
    }
  }, [mentee?.id]);

  const loadMenteeDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }

      const response = await fetch(`/api/mentorship/mentor/mentees/${menteeId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      const data = await response.json();
      if (data.success && data.data) {
        setMentee(data.data);
      } else {
        setError('Mentorado não encontrado');
      }
    } catch (err) {
      console.error('Erro ao carregar detalhes:', err);
      setError('Erro ao carregar dados do mentorado');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPerformanceData = async () => {
    if (!mentee?.id) return;
    setIsLoadingPerformance(true);
    try {
      const data = await mentorAnalyticsService.getMenteePerformance(mentee.id);
      setPerformance(data);
    } catch (err) {
      console.error('Erro ao carregar performance:', err);
    } finally {
      setIsLoadingPerformance(false);
    }
  };

  // Management Actions
  const handleSuspend = async () => {
    if (!mentee?.mentorshipId) return;
    if (!confirm('Tem certeza que deseja suspender este mentorado?')) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetchWithAuth(`/mentorship/mentor/mentees/${mentee.mentorshipId}/suspend`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Mentorado suspenso com sucesso');
        loadMenteeDetails();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao suspender mentorado');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivate = async () => {
    if (!mentee?.mentorshipId) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetchWithAuth(`/mentorship/mentor/mentees/${mentee.mentorshipId}/reactivate`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Mentorado reativado com sucesso');
        loadMenteeDetails();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao reativar mentorado');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTerminate = async () => {
    if (!mentee?.mentorshipId) return;
    if (!confirm('Tem certeza que deseja encerrar permanentemente esta mentoria? Esta ação não pode ser desfeita.')) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetchWithAuth(`/mentorship/mentor/mentees/${mentee.id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Mentoria encerrada com sucesso');
        router.push('/mentor/mentorados');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao encerrar mentoria');
    } finally {
      setIsSubmitting(false);
    }
  };

  const daysRemaining = mentee?.endDate 
    ? Math.ceil((new Date(mentee.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // Loading State
  if (isLoading) {
    return (
      <div className="w-full py-8">
        <div className="px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Header Skeleton */}
          <div className="animate-pulse h-48 bg-gradient-to-r from-border-light to-border-light/50 
                        dark:from-border-dark dark:to-border-dark/50 rounded-2xl"></div>
          {/* Tabs Skeleton */}
          <div className="animate-pulse h-20 bg-gradient-to-r from-border-light to-border-light/50 
                        dark:from-border-dark dark:to-border-dark/50 rounded-2xl"></div>
          {/* Content Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse h-32 bg-gradient-to-r from-border-light to-border-light/50 
                                    dark:from-border-dark dark:to-border-dark/50 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !mentee) {
    return (
      <div className="w-full py-8">
        <div className="px-4 sm:px-6 lg:px-8 text-center py-20">
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-slate-400 dark:text-slate-500">error</span>
          </div>
          <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
            {error || 'Mentorado não encontrado'}
          </h2>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4">
            Não foi possível carregar os dados do mentorado.
          </p>
          <button 
            onClick={() => router.push('/mentor/mentorados')} 
            className="mt-4 px-6 py-3 bg-gradient-to-r from-primary to-violet-500 text-white rounded-xl font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:scale-105 transition-all"
          >
            Voltar para lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-8">
      <div className="px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <MenteeHeader 
          mentee={mentee} 
          onBack={() => router.back()} 
        />

        {/* Tabs */}
        <MenteeTabs 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'overview' && (
            <MenteeOverviewTab 
              performance={performance}
              menteeStatus={mentee.status}
              daysRemaining={daysRemaining}
            />
          )}

          {activeTab === 'performance' && (
            <MenteePerformanceTab 
              performance={performance}
              isLoading={isLoadingPerformance}
            />
          )}

          {activeTab === 'simulados' && (
            <MenteeSimuladosTab 
              performance={performance}
            />
          )}

          {activeTab === 'financial' && (
            <MenteeFinancialTab 
              mentorshipId={mentee.mentorshipId}
              onRefresh={loadMenteeDetails}
            />
          )}

          {activeTab === 'charges' && (
            <MenteeChargesTab 
              mentorshipId={mentee.mentorshipId}
            />
          )}

          {activeTab === 'actions' && (
            <MenteeActionsTab 
              mentee={mentee}
              isSubmitting={isSubmitting}
              onSuspend={handleSuspend}
              onReactivate={handleReactivate}
              onExtend={() => setShowExtendModal(true)}
              onTerminate={handleTerminate}
            />
          )}
        </div>
      </div>

      {/* Extend Modal */}
      <MenteeExtendModal
        isOpen={showExtendModal}
        onClose={() => setShowExtendModal(false)}
        onSuccess={() => { 
          setShowExtendModal(false); 
          loadMenteeDetails(); 
        }}
        mentorshipId={mentee.mentorshipId}
        currentEndDate={mentee.endDate}
      />
    </div>
  );
}
