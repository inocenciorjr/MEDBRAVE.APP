'use client';

import React, { useState, useEffect } from 'react';
import { AdminButton } from '../ui/AdminButton';
import type { UserNote } from '@/types/admin/user';
import { getUserNotes, addUserNote } from '@/services/admin/userService';
import { useToast } from '@/lib/contexts/ToastContext';

interface UserNotesPanelProps {
  userId: string;
}

export function UserNotesPanel({ userId }: UserNotesPanelProps) {
  const toast = useToast();
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [userId]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const result = await getUserNotes(userId);
      setNotes(result);
    } catch (error: any) {
      toast.error('Erro ao carregar notas');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newNote.trim()) {
      toast.error('A nota não pode estar vazia');
      return;
    }

    if (newNote.trim().length < 5) {
      toast.error('A nota deve ter pelo menos 5 caracteres');
      return;
    }

    setAdding(true);
    try {
      await addUserNote(userId, newNote.trim());
      toast.success('Nota adicionada com sucesso');
      setNewNote('');
      setShowAddForm(false);
      await loadNotes();
    } catch (error: any) {
      toast.error('Erro ao adicionar nota');
    } finally {
      setAdding(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-surface-light dark:bg-surface-dark rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
            Notas Internas
          </h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            {notes.length} {notes.length === 1 ? 'nota registrada' : 'notas registradas'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <AdminButton
            size="sm"
            variant="outline"
            onClick={loadNotes}
            icon="refresh"
          >
            Atualizar
          </AdminButton>
          
          {!showAddForm && (
            <AdminButton
              size="sm"
              onClick={() => setShowAddForm(true)}
              icon="add"
            >
              Nova Nota
            </AdminButton>
          )}
        </div>
      </div>

      {/* Add Note Form */}
      {showAddForm && (
        <form onSubmit={handleAddNote} className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl space-y-3">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl">
              note_add
            </span>
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Adicionar Nova Nota
              </h4>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Digite sua nota aqui... (mínimo 5 caracteres)"
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-900 text-text-light-primary dark:text-text-dark-primary placeholder:text-text-light-secondary/50 dark:placeholder:text-text-dark-secondary/50 focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                autoFocus
              />
              <div className="flex justify-between items-center mt-2 text-xs">
                <span className="text-blue-700 dark:text-blue-300">
                  Notas são visíveis apenas para administradores
                </span>
                <span className={newNote.length < 5 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}>
                  {newNote.length} caracteres
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <AdminButton
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setShowAddForm(false);
                setNewNote('');
              }}
              disabled={adding}
            >
              Cancelar
            </AdminButton>
            <AdminButton
              type="submit"
              size="sm"
              loading={adding}
              icon="save"
            >
              Salvar Nota
            </AdminButton>
          </div>
        </form>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-5xl text-text-light-secondary dark:text-text-dark-secondary mb-4">
            note
          </span>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4">
            Nenhuma nota registrada para este usuário
          </p>
          {!showAddForm && (
            <AdminButton
              size="sm"
              onClick={() => setShowAddForm(true)}
              icon="add"
            >
              Adicionar Primeira Nota
            </AdminButton>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-4 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Author Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-semibold text-sm">
                      {note.creator ? getInitials(note.creator.display_name) : 'AD'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h4 className="font-medium text-text-light-primary dark:text-text-dark-primary">
                        {note.creator?.display_name || 'Administrador'}
                      </h4>
                      <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                        {note.creator?.email || 'admin@sistema.com'}
                      </p>
                    </div>
                    <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary whitespace-nowrap">
                      {formatDate(note.created_at)}
                    </span>
                  </div>

                  {/* Note Text */}
                  <div className="p-3 bg-background-light dark:bg-background-dark rounded-lg">
                    <p className="text-sm text-text-light-primary dark:text-text-dark-primary whitespace-pre-wrap">
                      {note.note}
                    </p>
                  </div>

                  {/* Note ID */}
                  <div className="mt-2 text-xs text-text-light-secondary dark:text-text-dark-secondary font-mono">
                    ID: {note.id}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-xl">
            info
          </span>
          <div className="text-sm text-yellow-700 dark:text-yellow-300">
            <p className="font-semibold mb-1">Sobre as notas internas:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Notas são visíveis apenas para administradores</li>
              <li>Use para registrar observações, avisos ou histórico</li>
              <li>Todas as notas são permanentes e auditáveis</li>
              <li>O autor e data são registrados automaticamente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
