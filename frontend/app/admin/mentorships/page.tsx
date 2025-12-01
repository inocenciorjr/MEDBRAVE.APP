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

export default function MentorshipsAdminPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'mentors' | 'mentorships'>('mentors');
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [mentorships, setMentorships] = useState<Mentorship[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // Modal states
  const [showMentorModal, setShowMentorModal] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar mentores (usuários com role MENTOR)
      const { data: mentorsData, error: mentorsError } = await supabase
        .from('users')
        .select('id, display_name, email, photo_url, role, created_at')
        .eq('role', 'MENTOR');

      if (mentorsError) throw mentorsError;

      // Carregar perfis de mentor
      const { data: profilesData } = await supabase
        .from('mentor_profiles')
        .select('*');

      // Combinar dados
      const mentorsWithProfiles = (mentorsData || []).map(mentor => ({
        ...mentor,
        mentorProfile: profilesData?.find(p => p.userId === mentor.id)
      }));

      setMentors(mentorsWithProfiles);

      // Carregar mentorias
      const { data: mentorshipsData, error: mentorshipsError } = await supabase
        .from('mentorships')
        .select('*')
        .order('createdAt', { ascending: false });

      if (mentorshipsError) throw mentorshipsError;

      // Buscar nomes dos mentores e mentorados
      const mentorIds = [...new Set((mentorshipsData || []).map(m => m.mentorId))];
      const menteeIds = [...new Set((mentorshipsData || []).map(m => m.menteeId))];
      const allUserIds = [...new Set([...mentorIds, ...menteeIds])];

      const { data: usersData } = await supabase
        .from('users')
        .select('id, display_name, email')
        .in('id', allUserIds);

      const usersMap = new Map((usersData || []).map(u => [u.id, u]));

      const mentorshipsWithUsers = (mentorshipsData || []).map(m => ({
        ...m,
        mentor: usersMap.get(m.mentorId),
        mentee: usersMap.get(m.menteeId)
      }));

      setMentorships(mentorshipsWithUsers);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMentorApproval = async (mentor: Mentor) => {
    try {
      const isApproved = !mentor.mentorProfile?.isApproved;
      
      if (mentor.mentorProfile) {
        const { error } = await supabase
          .from('mentor_profiles')
          .update({ 
            isApproved, 
            approvedAt: isApproved ? new Date().toISOString() : null 
          })
          .eq('userId', mentor.id);

        if (error) throw error;
      } else {
        // Criar perfil se não existir
        const { error } = await supabase
          .from('mentor_profiles')
          .insert({
            id: crypto.randomUUID(),
            userId: mentor.id,
            isActive: true,
            isApproved,
            approvedAt: isApproved ? new Date().toISOString() : null,
            totalMentees: 0,
            activeMentees: 0,
            rating: 0,
            ratingCount: 0
          });

        if (error) throw error;
      }

      toast.success(isApproved ? 'Mentor aprovado!' : 'Aprovação removida');
      loadData();
    } catch (error: any) {
      toast.error('Erro ao atualizar mentor');
    }
  };

  const handleRemoveMentorRole = async (userId: string) => {
    if (!confirm('Remover role de mentor deste usuário?')) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: 'USER' })
        .eq('id', userId);

      if (error) throw error;
      toast.success('Role de mentor removida');
      loadData();
    } catch (error: any) {
      toast.error('Erro ao remover role');
    }
  };

  const handleUpdateMentorshipStatus = async (mentorshipId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('mentorships')
        .update({ status: newStatus, updatedAt: new Date().toISOString() })
        .eq('id', mentorshipId);

      if (error) throw error;
      toast.success('Status atualizado');
      loadData();
    } catch (error: any) {
      toast.error('Erro ao atualizar status');
    }
  };


  // Estatísticas
  const stats = useMemo(() => ({
    totalMentors: mentors.length,
    approvedMentors: mentors.filter(m => m.mentorProfile?.isApproved).length,
    totalMentorships: mentorships.length,
    activeMentorships: mentorships.filter(m => m.status === 'active').length
  }), [mentors, mentorships]);

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
                          {mentor.photo_url ? (
                            <img src={mentor.photo_url} alt="" className="w-10 h-10 rounded-full" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-primary font-bold">{mentor.display_name?.[0]?.toUpperCase()}</span>
                            </div>
                          )}
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
    </>
  );
}
