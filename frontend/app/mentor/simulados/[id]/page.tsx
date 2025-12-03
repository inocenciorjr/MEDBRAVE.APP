'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  SimuladoHeader,
  SimuladoTabs,
  SimuladoOverviewTab,
  SimuladoEditTab,
  SimuladoParticipantsTab,
  SimuladoProgressTab,
  SimuladoAnalyticsTab 
} from '@/components/mentor/simulados/manage';

interface MentorSimulado {
  id: string;
  mentor_id: string;
  name: string;
  description: string | null;
  questions: Array<{ questionId: string; type: 'bank' | 'custom'; order: number }>;
  question_count: number;
  visibility: 'public' | 'private' | 'selected';
  allowed_user_ids: string[];
  selected_mentorship_ids: string[];
  status: 'draft' | 'active' | 'closed';
  time_limit_minutes: number | null;
  shuffle_questions: boolean;
  show_results: boolean;
  scheduled_at: string | null;
  is_public: boolean;
  respondents_count: number;
  average_score: number | null;
  created_at: string;
  updated_at: string;
}

type TabType = 'overview' | 'edit' | 'participants' | 'progress' | 'analytics';

export default function SimuladoManagePage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const simuladoId = params.id as string;

  const [simulado, setSimulado] = useState<MentorSimulado | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [canEdit, setCanEdit] = useState(false);

  // Verificar se pode editar (antes do horário de início)
  const checkCanEdit = useCallback((sim: MentorSimulado) => {
    if (!sim.scheduled_at) {
      // Sem agendamento = pode editar sempre (desde que não tenha começado)
      return sim.status === 'draft' || sim.status === 'active';
    }
    const scheduledDate = new Date(sim.scheduled_at);
    return scheduledDate > new Date();
  }, []);

  // Carregar dados do simulado
  const loadSimulado = useCallback(async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      
      const response = await fetch(
        `/api/mentorship/mentor-simulados/${simuladoId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Simulado não encontrado');
          router.push('/mentor/simulados');
          return;
        }
        throw new Error('Erro ao carregar simulado');
      }

      const data = await response.json();
      setSimulado(data.data);
      setCanEdit(checkCanEdit(data.data));
    } catch (error) {
      console.error('Erro ao carregar simulado:', error);
      toast.error('Erro ao carregar simulado');
    } finally {
      setLoading(false);
    }
  }, [simuladoId, token, router, checkCanEdit]);

  useEffect(() => {
    if (simuladoId) {
      loadSimulado();
    }
  }, [simuladoId, loadSimulado]);

  // Atualizar simulado
  const handleUpdateSimulado = async (updates: Partial<MentorSimulado>) => {
    if (!canEdit) {
      toast.error('Não é possível editar após o horário de início');
      return false;
    }

    if (!token) return false;

    try {
      
      const response = await fetch(
        `/api/mentorship/mentor-simulados/${simuladoId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao atualizar simulado');
      }

      const data = await response.json();
      setSimulado(data.data);
      toast.success('Simulado atualizado com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao atualizar simulado:', error);
      toast.error('Erro ao atualizar simulado');
      return false;
    }
  };

  if (loading) {
    return (
      <div className="w-full py-8">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gradient-to-r from-border-light to-border-light/50 dark:from-border-dark dark:to-border-dark/50 rounded-2xl"></div>
            <div className="h-16 bg-gradient-to-r from-border-light to-border-light/50 dark:from-border-dark dark:to-border-dark/50 rounded-2xl"></div>
            <div className="h-96 bg-gradient-to-r from-border-light to-border-light/50 dark:from-border-dark dark:to-border-dark/50 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!simulado) {
    return (
      <div className="w-full py-8">
        <div className="px-4 sm:px-6 lg:px-8 text-center py-20">
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-slate-400 dark:text-slate-500">error</span>
          </div>
          <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
            Simulado não encontrado
          </h2>
          <button
            onClick={() => router.push('/mentor/simulados')}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-primary to-violet-500 text-white rounded-xl font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:scale-105 transition-all"
          >
            Voltar para Simulados
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-8">
      <div className="px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <SimuladoHeader 
          simulado={simulado} 
          canEdit={canEdit}
          onBack={() => router.push('/mentor/simulados')}
        />

        {/* Tabs */}
        <SimuladoTabs 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          canEdit={canEdit}
        />

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'overview' && (
            <SimuladoOverviewTab 
              simulado={simulado}
              canEdit={canEdit}
              onUpdate={handleUpdateSimulado}
            />
          )}
          
          {activeTab === 'edit' && (
            <SimuladoEditTab 
              simulado={simulado}
              canEdit={canEdit}
              onUpdate={handleUpdateSimulado}
              onRefresh={loadSimulado}
            />
          )}
          
          {activeTab === 'participants' && (
            <SimuladoParticipantsTab 
              simulado={simulado}
              canEdit={canEdit}
              onUpdate={handleUpdateSimulado}
              onRefresh={loadSimulado}
            />
          )}
          
          {activeTab === 'progress' && (
            <SimuladoProgressTab 
              simuladoId={simuladoId}
            />
          )}
          
          {activeTab === 'analytics' && (
            <SimuladoAnalyticsTab 
              simuladoId={simuladoId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
