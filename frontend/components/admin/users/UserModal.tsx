'use client';

import React, { useState } from 'react';
import { AdminModal } from '@/components/admin/ui/AdminModal';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminSelect } from '@/components/admin/ui/AdminInput';
import { AdminBadge } from '@/components/admin/ui/AdminBadge';
import { User } from '@/types/admin/user';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (userId: string, updates: Partial<User>) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
}

const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
  onDelete
}) => {
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});

  React.useEffect(() => {
    if (user) {
      setFormData({
        role: user.role,
        status: user.status
      });
    }
  }, [user]);

  if (!user) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(user.id, formData);
      setEditMode(false);
      onClose();
    } catch (error) {
      console.error('Error saving user:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja deletar este usuário? Esta ação não pode ser desfeita.')) {
      return;
    }

    setSaving(true);
    try {
      await onDelete(user.id);
      onClose();
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <div className="flex justify-between items-center w-full">
      <div>
        {editMode ? (
          <AdminButton
            variant="outline"
            onClick={() => setEditMode(false)}
            disabled={saving}
          >
            Cancelar Edição
          </AdminButton>
        ) : (
          <AdminButton
            variant="danger"
            onClick={handleDelete}
            disabled={saving}
          >
            <span className="material-symbols-outlined text-sm mr-2">delete</span>
            Deletar Usuário
          </AdminButton>
        )}
      </div>
      <div className="flex gap-3">
        <AdminButton
          variant="outline"
          onClick={onClose}
          disabled={saving}
        >
          Fechar
        </AdminButton>
        {editMode ? (
          <AdminButton
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </AdminButton>
        ) : (
          <AdminButton
            onClick={() => setEditMode(true)}
          >
            <span className="material-symbols-outlined text-sm mr-2">edit</span>
            Editar
          </AdminButton>
        )}
      </div>
    </div>
  );

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalhes do Usuário"
      subtitle={user.email}
      size="lg"
      footer={footer}
    >
      <div className="space-y-6">
        {/* Informações Básicas */}
        <div className="bg-background-light dark:bg-background-dark rounded-lg p-4">
          <h4 className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">person</span>
            Informações Básicas
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Nome</label>
              <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                {user.displayName}
              </p>
            </div>
            <div>
              <label className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Email</label>
              <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                {user.email}
              </p>
            </div>
            <div>
              <label className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Telefone</label>
              <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                {user.phoneNumber || 'Não informado'}
              </p>
            </div>
            <div>
              <label className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Data de Criação</label>
              <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                {new Date(user.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>

        {/* Role e Status */}
        <div className="bg-background-light dark:bg-background-dark rounded-lg p-4">
          <h4 className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">badge</span>
            Role e Status
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-2 block">
                Role
              </label>
              {editMode ? (
                <AdminSelect
                  value={formData.role || user.role}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, role: e.target.value as any })}
                  options={[
                    { value: 'STUDENT', label: 'Estudante' },
                    { value: 'TEACHER', label: 'Professor' },
                    { value: 'MENTOR', label: 'Mentor' },
                    { value: 'ADMIN', label: 'Administrador' }
                  ]}
                />
              ) : (
                <AdminBadge 
                  label={user.role}
                  variant={user.role === 'ADMIN' ? 'error' : 'info'}
                />
              )}
            </div>
            <div>
              <label className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-2 block">
                Status
              </label>
              {editMode ? (
                <AdminSelect
                  value={formData.status || user.status}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, status: e.target.value as any })}
                  options={[
                    { value: 'ACTIVE', label: 'Ativo' },
                    { value: 'INACTIVE', label: 'Inativo' },
                    { value: 'SUSPENDED', label: 'Suspenso' },
                    { value: 'PENDING_EMAIL_VERIFICATION', label: 'Aguardando Verificação' }
                  ]}
                />
              ) : (
                <AdminBadge 
                  label={user.status}
                  variant={user.status === 'ACTIVE' ? 'success' : 'error'}
                />
              )}
            </div>
          </div>
        </div>

        {/* Estatísticas de Estudo */}
        {user.stats && (
          <div className="bg-primary/5 rounded-lg p-4">
            <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined">analytics</span>
              Estatísticas de Estudo
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {user.stats.questionsAnswered}
                </p>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Questões Respondidas
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {user.stats.questionsAnswered > 0
                    ? Math.round((user.stats.questionsCorrect / user.stats.questionsAnswered) * 100)
                    : 0}%
                </p>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Taxa de Acerto
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {user.stats.streak}
                </p>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Dias de Streak
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center">
                <p className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
                  {user.stats.flashcardsReviewed}
                </p>
                <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                  Flashcards Revisados
                </p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
                  {user.stats.simulatedTestsCompleted}
                </p>
                <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                  Simulados Completos
                </p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
                  {user.stats.level}
                </p>
                <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                  Nível
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Biografia */}
        {user.biography && (
          <div className="bg-background-light dark:bg-background-dark rounded-lg p-4">
            <h4 className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">description</span>
              Biografia
            </h4>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              {user.biography}
            </p>
          </div>
        )}

        {/* Especialidades (para mentores/professores) */}
        {user.specialties && user.specialties.length > 0 && (
          <div className="bg-background-light dark:bg-background-dark rounded-lg p-4">
            <h4 className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">school</span>
              Especialidades
            </h4>
            <div className="flex flex-wrap gap-2">
              {user.specialties.map((specialty, index) => (
                <AdminBadge 
                  key={index} 
                  label={specialty}
                  variant="info" 
                  size="sm"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminModal>
  );
};

export default UserModal;
