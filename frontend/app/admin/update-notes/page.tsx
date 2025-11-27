'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAllUpdateNotes,
  deleteUpdateNote,
  updateUpdateNote,
} from '@/lib/api/updateNotes';

interface UpdateNote {
  id: string;
  title: string;
  content: string;
  filter_ids: string[];
  sub_filter_ids: string[];
  is_active: boolean;
  created_at: string;
  last_updated_date: string;
  creator_name?: string;
}

export default function AdminUpdateNotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<UpdateNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [showInactive]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await getAllUpdateNotes(showInactive);
      setNotes(data);
    } catch (error) {
      console.error('Erro ao carregar notas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('Tem certeza que deseja desativar esta nota?')) return;

    try {
      await deleteUpdateNote(noteId);
      loadNotes();
    } catch (error) {
      console.error('Erro ao deletar nota:', error);
    }
  };

  const handleToggleActive = async (noteId: string, currentStatus: boolean) => {
    try {
      await updateUpdateNote(noteId, { is_active: !currentStatus });
      loadNotes();
    } catch (error) {
      console.error('Erro ao atualizar status da nota:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 mb-2">
              Notas de Atualização
            </h1>
            <p className="text-text-light-secondary dark:text-text-dark-secondary">
              Gerencie notas de atualização de diretrizes e protocolos
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/update-notes/create')}
            className="px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <span className="material-symbols-outlined">add</span>
            Nova Nota
          </button>
        </div>

        <div className="mb-6 flex items-center space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Mostrar notas inativas
            </span>
          </label>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-md p-12 text-center">
            <span className="material-symbols-outlined text-6xl text-text-light-secondary dark:text-text-dark-secondary mb-4">
              note_add
            </span>
            <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4">
              Nenhuma nota de atualização cadastrada
            </p>
            <button
              onClick={() => router.push('/admin/update-notes/create')}
              className="px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
            >
              Criar Primeira Nota
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`bg-surface-light dark:bg-surface-dark rounded-xl p-6 shadow-md hover:shadow-lg transition-all ${
                  !note.is_active ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">
                        {note.title}
                      </h3>
                      {!note.is_active && (
                        <span className="px-2 py-1 text-xs font-medium bg-surface-light dark:bg-surface-dark text-text-light-secondary dark:text-text-dark-secondary rounded border border-border-light dark:border-border-dark">
                          Inativa
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-3 line-clamp-2">
                      {note.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                      <span>Criado por: {note.creator_name || 'Admin'}</span>
                      <span>•</span>
                      <span>Última atualização: {formatDate(note.last_updated_date)}</span>
                      <span>•</span>
                      <span>{note.filter_ids.length + note.sub_filter_ids.length} filtros</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => router.push(`/admin/update-notes/${note.id}`)}
                      className="p-2 text-text-light-secondary dark:text-text-dark-secondary hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-all hover:scale-110 active:scale-95"
                      title="Editar"
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button
                      onClick={() => handleToggleActive(note.id, note.is_active)}
                      className="p-2 text-text-light-secondary dark:text-text-dark-secondary hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-all hover:scale-110 active:scale-95"
                      title={note.is_active ? 'Desativar' : 'Ativar'}
                    >
                      <span className="material-symbols-outlined">
                        {note.is_active ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all hover:scale-110 active:scale-95"
                      title="Deletar"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
