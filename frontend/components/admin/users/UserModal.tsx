'use client';

import React, { useState, useEffect } from 'react';
import { AdminModal } from '../ui/AdminModal';
import { AdminButton } from '../ui/AdminButton';
import { UserStatsCard } from './UserStatsCard';
import { UserLogsTable } from './UserLogsTable';
import { UserSessionsTable } from './UserSessionsTable';
import { UserSecurityAnalysis } from './UserSecurityAnalysis';
import { UserNotesPanel } from './UserNotesPanel';
import { UserPlansTable } from './UserPlansTable';
import { SuspendUserModal } from './SuspendUserModal';
import { BanUserModal } from './BanUserModal';
import { SendEmailModal } from './SendEmailModal';
import type { User } from '@/types/admin/user';
import { getUserById, getUserStatistics, getUserPlans } from '@/services/admin/userService';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (userId: string, updates: any) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
  onSuspend: (userId: string, reason: string, duration?: number) => Promise<void>;
  onActivate: (userId: string) => Promise<void>;
  onBan: (userId: string, reason: string) => Promise<void>;
  onSendEmail: (userId: string, subject: string, message: string) => Promise<void>;
  onAddPlan: (userId: string) => void;
}

export default function UserModal({
  isOpen,
  onClose,
  user,
  onSave,
  onDelete,
  onSuspend,
  onActivate,
  onBan,
  onSendEmail,
  onAddPlan,
}: UserModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'plans' | 'stats' | 'logs' | 'sessions' | 'security' | 'notes'>('info');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    email: '',
    role: '',
  });
  
  // Modal states
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        display_name: user.display_name,
        email: user.email,
        role: user.role,
      });
      loadUserData();
    }
  }, [user, isOpen]);

  const loadUserData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [statsData, plansData] = await Promise.all([
        getUserStatistics(user.id),
        getUserPlans(user.id),
      ]);
      setStats(statsData);
      setPlans(plansData);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    await onSave(user.id, formData);
    setEditing(false);
  };

  if (!user) return null;

  const getStatusColor = () => {
    if (user.is_banned) return 'text-red-600 dark:text-red-400';
    if (user.is_blocked) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getStatusText = () => {
    if (user.is_banned) return 'Banido';
    if (user.is_blocked) return 'Suspenso';
    return 'Ativo';
  };

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Usuário: ${user.display_name}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Header com Status */}
        <div className="flex items-center justify-between pb-4 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center gap-4">
            {user.photo_url ? (
              <img src={user.photo_url} alt={user.display_name} className="w-16 h-16 rounded-full" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold text-2xl">{user.display_name?.[0]?.toUpperCase()}</span>
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">{user.display_name}</h3>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">{user.email}</p>
              <p className={`text-sm font-medium ${getStatusColor()}`}>{getStatusText()}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!user.is_blocked && !user.is_banned && (
              <AdminButton size="sm" variant="outline" onClick={() => setShowSuspendModal(true)} icon="block">
                Suspender
              </AdminButton>
            )}
            {user.is_blocked && !user.is_banned && (
              <AdminButton size="sm" variant="outline" onClick={() => onActivate(user.id)} icon="check_circle">
                Ativar
              </AdminButton>
            )}
            {!user.is_banned && (
              <AdminButton size="sm" variant="danger" onClick={() => setShowBanModal(true)} icon="gavel">
                Banir
              </AdminButton>
            )}
            <AdminButton size="sm" variant="outline" onClick={() => setShowEmailModal(true)} icon="mail">
              Enviar Email
            </AdminButton>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border-light dark:border-border-dark overflow-x-auto">
          {[
            { id: 'info', label: 'Informações', icon: 'person' },
            { id: 'plans', label: `Planos (${plans.length})`, icon: 'credit_card' },
            { id: 'stats', label: 'Estatísticas', icon: 'bar_chart' },
            { id: 'sessions', label: 'Sessões', icon: 'devices' },
            { id: 'security', label: 'Segurança', icon: 'security' },
            { id: 'logs', label: 'Logs', icon: 'history' },
            { id: 'notes', label: 'Notas', icon: 'note' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {activeTab === 'info' && (
            <div className="space-y-4">
              {editing ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Nome</label>
                    <input
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark"
                    >
                      <option value="STUDENT">Estudante</option>
                      <option value="ADMIN">Admin</option>
                      <option value="MODERATOR">Moderador</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <AdminButton onClick={handleSave} icon="save">Salvar</AdminButton>
                    <AdminButton variant="outline" onClick={() => setEditing(false)}>Cancelar</AdminButton>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">ID</p>
                      <p className="font-mono text-sm">{user.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Role</p>
                      <p className="font-medium">{user.role}</p>
                    </div>
                    <div>
                      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Cadastro</p>
                      <p>{new Date(user.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Último Login</p>
                      <p>{user.last_login_at ? new Date(user.last_login_at).toLocaleString('pt-BR') : 'Nunca'}</p>
                    </div>
                  </div>
                  <AdminButton onClick={() => setEditing(true)} icon="edit">Editar</AdminButton>
                </>
              )}
            </div>
          )}

          {activeTab === 'plans' && user && (
            <UserPlansTable userId={user.id} onAddPlan={() => onAddPlan(user.id)} />
          )}

          {activeTab === 'stats' && (
            <div>
              {stats ? (
                <UserStatsCard stats={stats} loading={loading} />
              ) : (
                <p className="text-center text-text-light-secondary dark:text-text-dark-secondary py-8">
                  Nenhuma estatística disponível
                </p>
              )}
            </div>
          )}

          {activeTab === 'logs' && user && (
            <UserLogsTable userId={user.id} />
          )}

          {activeTab === 'sessions' && user && (
            <UserSessionsTable userId={user.id} />
          )}

          {activeTab === 'security' && user && (
            <UserSecurityAnalysis userId={user.id} />
          )}

          {activeTab === 'notes' && user && (
            <UserNotesPanel userId={user.id} />
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between pt-4 border-t border-border-light dark:border-border-dark">
          <AdminButton variant="danger" onClick={() => onDelete(user.id)} icon="delete">
            Deletar Usuário
          </AdminButton>
          <AdminButton variant="outline" onClick={onClose}>
            Fechar
          </AdminButton>
        </div>
      </div>

      {/* Sub-Modals */}
      <SuspendUserModal
        isOpen={showSuspendModal}
        onClose={() => setShowSuspendModal(false)}
        user={user}
        onConfirm={onSuspend}
      />

      <BanUserModal
        isOpen={showBanModal}
        onClose={() => setShowBanModal(false)}
        user={user}
        onConfirm={onBan}
      />

      <SendEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        user={user}
        onConfirm={onSendEmail}
      />
    </AdminModal>
  );
}
