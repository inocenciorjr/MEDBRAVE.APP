'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { AdminStats } from '@/components/admin/ui/AdminStats';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminModal } from '@/components/admin/ui/AdminModal';
import { useToast } from '@/lib/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface Mentor {
  id: string;
  display_name: string;
  email: string;
  photo_url: string | null;
  role: string;
  created_at: string;
  mentorProfile?: {
    bio: string;
    specialties: string[];
    isActive: boolean;
    isApproved: boolean;
    totalMentees: number;
    activeMentees: number;
    rating: number;
  };
}

interface Mentorship {
  id: string;
  mentorId: string;
  menteeId: string;
  title: string;
  status: string;
  progress: number;
  createdAt: any;
  mentor?: { display_name: string; email: string };
  mentee?: { display_name: string; email: string };
}

interface MentorProgram {
  id: string;
  mentorId: string;
  title: string;
  description?: string;
  status: string;
  isPublic: boolean;
  participantsCount: number;
  createdAt: string;
  mentor?: { id: string; email: string; displayName: string };
}

export default function MentorshipsAdminPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'mentors' | 'programs' | 'mentorships'>('mentors');
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [mentorships, setMentorships] = useState<Mentorship[]>([]);
  const [programs, setPrograms] = useState<MentorProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // Modal states
  const [showMentorModal, setShowMentorModal] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Buscar token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      // Carregar mentores via API do backend
      const mentorsResponse = await fetch('/api/mentorship/admin/mentors', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!mentorsResponse.ok) {
        throw new Error('Erro ao carregar mentores');
      }

      const mentorsData = await mentorsResponse.json();
      setMentors(mentorsData);

      // Carregar mentorias via API do backend
      const mentorshipsResponse = await fetch('/api/mentorship/admin/mentorships', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!mentorshipsResponse.ok) {
        throw new Error('Erro ao carregar mentorias');
      }

      const mentorshipsData = await mentorshipsResponse.json();
      setMentorships(mentorshipsData);

      // Carregar programas de mentoria pendentes
      const programsResponse = await fetch('/api/mentorship/admin/programs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (programsResponse.ok) {
        const programsData = await programsResponse.json();
        setPrograms(programsData.data || programsData || []);
      }

    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast.error(`Erro ao carregar dados: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMentorApproval = async (mentor: Mentor) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        toast.error('Sessão expirada');
        return;
      }

      const response = await fetch(`/api/mentorship/admin/mentors/${mentor.id}/toggle-approval`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar mentor');
      }

      const result = await response.json();
      toast.success(result.isApproved ? 'Mentor aprovado!' : 'Aprovação removida');
      loadData();
    } catch (error: any) {
      toast.error('Erro ao atualizar mentor');
    }
  };

  const handleRemoveMentorRole = async (userId: string) => {
    if (!confirm('Remover role de mentor deste usuário?')) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        toast.error('Sessão expirada');
        return;
      }

      // Usar API do admin de usuários
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: 'USER' })
      });

      if (!response.ok) {
        throw new Error('Erro ao remover role');
      }

      toast.success('Role de mentor removida');
      loadData();
    } catch (error: any) {
      toast.error('Erro ao remover role');
    }
  };

  const handleUpdateMentorshipStatus = async (mentorshipId: string, newStatus: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        toast.error('Sessão expirada');
        return;
      }

      const response = await fetch(`/api/mentorship/admin/mentorships/${mentorshipId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar status');
      }

      toast.success('Status atualizado');
      loadData();
    } catch (error: any) {
      toast.error('Erro ao atualizar status');
    }
  };


  // Handlers para programas
  const handleApproveProgram = async (programId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/mentorship/admin/programs/${programId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!response.ok) throw new Error('Erro ao aprovar');
      toast.success('Programa aprovado com sucesso!');
      loadData();
    } catch (error) {
      toast.error('Erro ao aprovar programa');
    }
  };

  const handleRejectProgram = async () => {
    if (!selectedProgramId || !rejectReason.trim()) {
      toast.error('Informe o motivo da rejeição');
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/mentorship/admin/programs/${selectedProgramId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason })
      });
      if (!response.ok) throw new Error('Erro ao rejeitar');
      toast.success('Programa rejeitado');
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedProgramId(null);
      loadData();
    } catch (error) {
      toast.error('Erro ao rejeitar programa');
    }
  };

  // Estatísticas
  const stats = useMemo(() => ({
    totalMentors: mentors.length,
    approvedMentors: mentors.filter(m => m.mentorProfile?.isApproved).length,
    totalMentorships: mentorships.length,
    activeMentorships: mentorships.filter(m => m.status === 'active').length,
    pendingPrograms: programs.filter(p => p.status === 'pending_approval').length,
    totalPrograms: programs.length
  }), [mentors, mentorships, programs]);

  // Filtros
  const filteredMentors = useMemo(() => {
    return mentors.filter(m => {
      const matchesSearch = searchTerm === '' || 
        m.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' ||
        (statusFilter === 'APPROVED' && m.mentorProfile?.isApproved) ||
        (statusFilter === 'PENDING' && !m.mentorProfile?.isApproved);
      
      return matchesSearch && matchesStatus;
    });
  }, [mentors, searchTerm, statusFilter]);

  const filteredMentorships = useMemo(() => {
    return mentorships.filter(m => {
      const matchesSearch = searchTerm === '' ||
        m.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.mentor?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.mentee?.display_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter.toLowerCase();
      
      return matchesSearch && matchesStatus;
    });
  }, [mentorships, searchTerm, statusFilter]);

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Admin', icon: 'dashboard', href: '/admin' },
          { label: 'Mentorias', icon: 'school', href: '/admin/mentorships' }
        ]}
      />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 font-display">
              Gestão de Mentorias
            </h1>
            <p className="text-text-light-secondary dark:text-text-dark-secondary mt-1">
              Gerencie mentores e mentorias da plataforma
            </p>
          </div>
          <AdminButton onClick={loadData} disabled={loading}>
            <span className="material-symbols-outlined text-sm mr-2">refresh</span>
            Recarregar
          </AdminButton>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <AdminStats title="Total de Mentores" value={stats.totalMentors} icon="person" color="blue" />
          <AdminStats title="Mentores Aprovados" value={stats.approvedMentors} icon="verified" color="green" />
          <AdminStats title="Total de Mentorias" value={stats.totalMentorships} icon="school" color="purple" />
          <AdminStats title="Mentorias Ativas" value={stats.activeMentorships} icon="trending_up" color="orange" />
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-border-light dark:border-border-dark">
          <button
            onClick={() => { setActiveTab('mentors'); setStatusFilter('ALL'); }}
            className={`px-4 py-2 font-medium transition-all ${
              activeTab === 'mentors'
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-light-secondary dark:text-text-dark-secondary'
            }`}
          >
            <span className="material-symbols-outlined text-sm mr-2 align-middle">person</span>
            Mentores ({mentors.length})
          </button>
          <button
            onClick={() => { setActiveTab('programs'); setStatusFilter('ALL'); }}
            className={`px-4 py-2 font-medium transition-all relative ${
              activeTab === 'programs'
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-light-secondary dark:text-text-dark-secondary'
            }`}
          >
            <span className="material-symbols-outlined text-sm mr-2 align-middle">folder_special</span>
            Programas ({programs.length})
            {stats.pendingPrograms > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {stats.pendingPrograms}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('mentorships'); setStatusFilter('ALL'); }}
            className={`px-4 py-2 font-medium transition-all ${
              activeTab === 'mentorships'
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-light-secondary dark:text-text-dark-secondary'
            }`}
          >
            <span className="material-symbols-outlined text-sm mr-2 align-middle">school</span>
            Mentorias ({mentorships.length})
          </button>
        </div>

        {/* Filtros */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark"
          >
            <option value="ALL">Todos os Status</option>
            {activeTab === 'mentors' ? (
              <>
                <option value="APPROVED">Aprovados</option>
                <option value="PENDING">Pendentes</option>
              </>
            ) : (
              <>
                <option value="active">Ativas</option>
                <option value="paused">Pausadas</option>
                <option value="completed">Concluídas</option>
              </>
            )}
          </select>
        </div>


        {/* Conteúdo */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : activeTab === 'programs' ? (
          /* Lista de Programas */
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden">
            <div className="px-6 py-4 border-b border-border-light dark:border-border-dark">
              <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                Programas de Mentoria ({programs.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Programa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mentor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Participantes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  {programs.map((program) => (
                    <tr key={program.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-text-light-primary dark:text-text-dark-primary">{program.title}</p>
                        {program.description && (
                          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary line-clamp-1">{program.description}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-text-light-primary dark:text-text-dark-primary">{program.mentor?.displayName || program.mentor?.email || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          program.status === 'pending_approval' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                          program.status === 'approved' || program.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          program.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}>
                          {program.status === 'pending_approval' ? 'Aguardando' :
                           program.status === 'approved' ? 'Aprovado' :
                           program.status === 'active' ? 'Ativo' :
                           program.status === 'rejected' ? 'Rejeitado' :
                           program.status === 'draft' ? 'Rascunho' : program.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-text-light-primary dark:text-text-dark-primary">{program.participantsCount || 0}</span>
                      </td>
                      <td className="px-6 py-4">
                        {program.status === 'pending_approval' && (
                          <div className="flex gap-2">
                            <AdminButton size="sm" variant="primary" onClick={() => handleApproveProgram(program.id)}>
                              Aprovar
                            </AdminButton>
                            <AdminButton size="sm" variant="danger" onClick={() => { setSelectedProgramId(program.id); setShowRejectModal(true); }}>
                              Rejeitar
                            </AdminButton>
                          </div>
                        )}
                        {program.status !== 'pending_approval' && (
                          <span className="text-sm text-text-light-secondary">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {programs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-text-light-secondary dark:text-text-dark-secondary">
                        Nenhum programa encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'mentors' ? (
          /* Lista de Mentores */
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden">
            <div className="px-6 py-4 border-b border-border-light dark:border-border-dark">
              <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                Lista de Mentores ({filteredMentors.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mentor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mentorados</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  {filteredMentors.map((mentor) => (
                    <tr key={mentor.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={mentor.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(mentor.display_name || 'M')}&background=6366f1&color=fff`} 
                            alt="" 
                            className="w-10 h-10 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (!target.dataset.fallback) {
                                target.dataset.fallback = 'true';
                                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(mentor.display_name || 'M')}&background=6366f1&color=fff`;
                              }
                            }}
                          />
                          <div>
                            <p className="font-medium text-text-light-primary dark:text-text-dark-primary">{mentor.display_name}</p>
                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">{mentor.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          mentor.mentorProfile?.isApproved
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {mentor.mentorProfile?.isApproved ? 'Aprovado' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-text-light-primary dark:text-text-dark-primary">
                          {mentor.mentorProfile?.activeMentees || 0} / {mentor.mentorProfile?.totalMentees || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-yellow-500 text-sm">star</span>
                          <span>{mentor.mentorProfile?.rating?.toFixed(1) || '0.0'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <AdminButton
                            size="sm"
                            variant={mentor.mentorProfile?.isApproved ? 'outline' : 'primary'}
                            onClick={() => handleToggleMentorApproval(mentor)}
                          >
                            {mentor.mentorProfile?.isApproved ? 'Revogar' : 'Aprovar'}
                          </AdminButton>
                          <AdminButton
                            size="sm"
                            variant="danger"
                            onClick={() => handleRemoveMentorRole(mentor.id)}
                          >
                            Remover
                          </AdminButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredMentors.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-text-light-secondary dark:text-text-dark-secondary">
                        Nenhum mentor encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Lista de Mentorias */
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden">
            <div className="px-6 py-4 border-b border-border-light dark:border-border-dark">
              <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                Lista de Mentorias ({filteredMentorships.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mentoria</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mentor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mentorado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progresso</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  {filteredMentorships.map((mentorship) => (
                    <tr key={mentorship.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                          {mentorship.title || 'Sem título'}
                        </p>
                        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                          ID: {mentorship.id.slice(0, 8)}...
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-text-light-primary dark:text-text-dark-primary">
                          {mentorship.mentor?.display_name || 'N/A'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-text-light-primary dark:text-text-dark-primary">
                          {mentorship.mentee?.display_name || 'N/A'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={mentorship.status}
                          onChange={(e) => handleUpdateMentorshipStatus(mentorship.id, e.target.value)}
                          className={`px-2 py-1 rounded text-xs font-medium border-0 ${
                            mentorship.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            mentorship.status === 'paused' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                          }`}
                        >
                          <option value="active">Ativa</option>
                          <option value="paused">Pausada</option>
                          <option value="completed">Concluída</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${mentorship.progress || 0}%` }}
                            />
                          </div>
                          <span className="text-sm">{mentorship.progress || 0}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <AdminButton size="sm" variant="outline" onClick={() => {}}>
                          Detalhes
                        </AdminButton>
                      </td>
                    </tr>
                  ))}
                  {filteredMentorships.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-text-light-secondary dark:text-text-dark-secondary">
                        Nenhuma mentoria encontrada
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Rejeição de Programa */}
      <AdminModal
        isOpen={showRejectModal}
        onClose={() => { setShowRejectModal(false); setRejectReason(''); setSelectedProgramId(null); }}
        title="Rejeitar Programa"
      >
        <div className="space-y-4">
          <p className="text-text-light-secondary dark:text-text-dark-secondary">
            Informe o motivo da rejeição para que o mentor possa corrigir e reenviar.
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Motivo da rejeição..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-border-light dark:border-border-dark 
              bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary
              focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
          />
          <div className="flex gap-3 justify-end">
            <AdminButton variant="outline" onClick={() => { setShowRejectModal(false); setRejectReason(''); }}>
              Cancelar
            </AdminButton>
            <AdminButton variant="danger" onClick={handleRejectProgram} disabled={!rejectReason.trim()}>
              Confirmar Rejeição
            </AdminButton>
          </div>
        </div>
      </AdminModal>
    </>
  );
}
