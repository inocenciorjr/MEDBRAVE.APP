'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { TabGroup } from '@/components/ui/TabGroup';
import { mentorProgramService, MentorProgram } from '@/lib/services/mentorProgramService';
import Image from 'next/image';
import { 
  Users, Calendar, Send, Play, XCircle, 
  UserPlus, TrendingUp, BookOpen, DollarSign 
} from 'lucide-react';
import { ProgramSettingsTab } from '@/components/mentor/mentorias/ProgramSettingsTab';
import { MenteesTab } from '@/components/mentor/mentorias/MenteesTab';

type TabId = 'overview' | 'mentees' | 'simulados' | 'settings';

export default function ProgramDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const programId = params.id as string;
  
  const [program, setProgram] = useState<MentorProgram | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [error, setError] = useState<string | null>(null);
  const [menteesCount, setMenteesCount] = useState<number>(0);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Check for tab query param
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['overview', 'mentees', 'simulados', 'settings'].includes(tab)) {
      setActiveTab(tab as TabId);
    }
  }, [searchParams]);

  useEffect(() => {
    loadProgram();
  }, [programId]);

  const loadProgram = async () => {
    try {
      const data = await mentorProgramService.getProgram(programId);
      setProgram(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: 'submit' | 'activate') => {
    if (!program) return;
    try {
      switch (action) {
        case 'submit':
          await mentorProgramService.submitForApproval(program.id);
          break;
        case 'activate':
          await mentorProgramService.activateProgram(program.id);
          break;
      }
      loadProgram();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCloseProgram = async () => {
    if (!program) return;
    setIsClosing(true);
    try {
      await mentorProgramService.closeProgram(program.id);
      setShowCloseModal(false);
      loadProgram();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsClosing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      draft: { label: 'Rascunho', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
      pending_approval: { label: 'Aguardando Aprovação', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
      approved: { label: 'Aprovado', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
      rejected: { label: 'Rejeitado', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
      active: { label: 'Ativo', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
      closed: { label: 'Encerrado', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
    };
    const { label, className } = config[status] || config.draft;
    return <span className={`px-3 py-1 rounded-full text-sm font-semibold ${className}`}>{label}</span>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Programa não encontrado'}</p>
        <button onClick={() => router.push('/mentor/mentorias')} className="text-primary hover:underline">
          Voltar para mentorias
        </button>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Mentor', icon: 'school', href: '/mentor' },
          { label: 'Mentorias', icon: 'folder_special', href: '/mentor/mentorias' },
          { label: program.title, icon: 'description' },
        ]}
      />

      {/* Header */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Imagem */}
            {program.coverImageUrl && (
              <div className="w-full md:w-64 flex-shrink-0">
                <div className="aspect-square rounded-xl overflow-hidden border border-border-light dark:border-border-dark">
                  <img src={program.coverImageUrl} alt={program.title} className="w-full h-full object-cover" />
                </div>
              </div>
            )}
            
            {/* Conteúdo */}
            <div className="flex-1 flex flex-col">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                      {program.title}
                    </h1>
                    {getStatusBadge(program.status)}
                  </div>
                  {program.description && (
                    <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4">
                      {program.description}
                    </p>
                  )}
                  <div className="flex items-center gap-6 text-sm text-text-light-secondary dark:text-text-dark-secondary flex-wrap">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {program.activeParticipantsCount} participantes
                    </span>
                    {program.startDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(program.startDate).toLocaleDateString('pt-BR')} - {program.endDate ? new Date(program.endDate).toLocaleDateString('pt-BR') : 'Sem fim'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {program.status === 'draft' && (
                    <button
                      onClick={() => handleAction('submit')}
                      className="px-4 py-2 bg-primary text-white rounded-xl font-medium
                        hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Enviar para Aprovação
                    </button>
                  )}
                  {program.status === 'approved' && (
                    <button
                      onClick={() => handleAction('activate')}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium
                        hover:bg-emerald-700 transition-colors flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Ativar Programa
                    </button>
                  )}
                  {program.status === 'active' && (
                    <>
                      <button
                        onClick={() => router.push(`/mentor/mentorias/${programId}/adicionar`)}
                        className="px-4 py-2 bg-primary text-white rounded-xl font-medium
                          hover:bg-primary/90 transition-colors flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        Adicionar Mentorado
                      </button>
                      <button
                        onClick={() => setShowCloseModal(true)}
                        className="px-4 py-2 border border-border-light dark:border-border-dark rounded-xl font-medium
                          hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Encerrar
                      </button>
                    </>
                  )}
                </div>
              </div>

              {program.status === 'rejected' && program.rejectionReason && (
                <div className="mt-auto p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    <strong>Motivo da rejeição:</strong> {program.rejectionReason}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Tabs */}
      <TabGroup
        tabs={[
          { id: 'overview', label: 'Visão Geral', icon: 'dashboard' },
          { id: 'mentees', label: `Mentorados (${menteesCount || program.activeParticipantsCount || 0})`, icon: 'groups' },
          { id: 'simulados', label: 'Simulados', icon: 'quiz' },
          { id: 'settings', label: 'Configurações', icon: 'settings' },
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
      />

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Participantes" value={program.activeParticipantsCount} color="blue" />
          <StatCard icon={BookOpen} label="Simulados" value={0} subtitle="criados" color="purple" />
          <StatCard icon={TrendingUp} label="Média de Acertos" value="0%" color="green" />
          <StatCard icon={DollarSign} label="Receita" value={program.isFree ? 'Gratuito' : `R$ ${program.price || 0}`} color="orange" />
        </div>
      )}

      {activeTab === 'mentees' && (
        <MenteesTab 
          programId={programId} 
          programStatus={program.status} 
          onTotalChange={setMenteesCount}
        />
      )}

      {activeTab === 'simulados' && (
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-12
          border border-border-light dark:border-border-dark text-center">
          <BookOpen className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-text-light-secondary dark:text-text-dark-secondary">
            Simulados do programa serão exibidos aqui
          </p>
        </div>
      )}

      {activeTab === 'settings' && (
        <ProgramSettingsTab program={program} onUpdate={loadProgram} />
      )}

      {/* Modal de Confirmação para Encerrar Mentoria */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
                  Encerrar Mentoria
                </h3>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Esta ação não pode ser desfeita
                </p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Atenção:</strong> Ao encerrar a mentoria "{program.title}", todos os mentorados 
                perderão acesso aos conteúdos exclusivos. Os dados históricos serão mantidos.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCloseModal(false)}
                disabled={isClosing}
                className="flex-1 py-3 border border-border-light dark:border-border-dark rounded-xl font-medium 
                  hover:bg-background-light dark:hover:bg-background-dark transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCloseProgram}
                disabled={isClosing}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 
                  transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isClosing ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Encerrando...
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5" />
                    Encerrar Mentoria
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtitle, color }: {
  icon: any; label: string; value: string | number; subtitle?: string; color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-5 border border-border-light dark:border-border-dark">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">{label}</p>
      <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">{value}</p>
      {subtitle && <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">{subtitle}</p>}
    </div>
  );
}




