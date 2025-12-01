'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { useToast } from '@/lib/contexts/ToastContext';

interface AddMenteeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface UserSearchResult {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
}

export default function AddMenteeModal({ isOpen, onClose, onSuccess }: AddMenteeModalProps) {
  const toast = useToast();
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mentorshipDays, setMentorshipDays] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = 'hidden';
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
        document.body.style.overflow = 'unset';
        setSearchQuery('');
        setSearchResults([]);
        setSelectedUsers([]);
        setMentorshipDays(30);
      }, 300);
      return () => clearTimeout(timer);
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Buscar usuários
  const searchUsers = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Buscar usuários por email ou nome
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
        .neq('role', 'MENTOR')
        .limit(10);

      if (error) throw error;
      
      // Filtrar usuários já selecionados
      const filtered = (data || []).filter(
        u => !selectedUsers.some(s => s.id === u.id)
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce da busca
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const addUser = (user: UserSearchResult) => {
    setSelectedUsers(prev => [...prev, user]);
    setSearchResults(prev => prev.filter(u => u.id !== user.id));
    setSearchQuery('');
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleSubmit = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Selecione pelo menos um usuário');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // TODO: Implementar chamada real à API
      // const response = await fetch('/api/mentorship/mentees/batch', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${session.access_token}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     userIds: selectedUsers.map(u => u.id),
      //     mentorshipDays,
      //   }),
      // });

      toast.success(`${selectedUsers.length} mentorado(s) adicionado(s) com sucesso!`);
      onSuccess();
    } catch (error) {
      console.error('Erro ao adicionar mentorados:', error);
      toast.error('Erro ao adicionar mentorados');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!shouldRender) return null;

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] transition-opacity duration-300
          ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-[500px] bg-surface-light dark:bg-surface-dark
          shadow-2xl dark:shadow-dark-2xl z-[10000] transform transition-transform duration-300 ease-out
          ${isAnimating ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark
            bg-background-light dark:bg-background-dark">
            <div>
              <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                Adicionar Mentorados
              </h2>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                Busque e adicione alunos à sua lista
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-surface-light dark:hover:bg-surface-dark rounded-xl
                transition-all duration-200 hover:scale-110 group"
            >
              <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary
                group-hover:text-primary transition-colors">
                close
              </span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Busca */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                Buscar Usuário
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2
                  text-text-light-secondary dark:text-text-dark-secondary">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Digite o email ou nome do usuário..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background-light dark:bg-background-dark
                    border border-border-light dark:border-border-dark rounded-xl
                    text-text-light-primary dark:text-text-dark-primary
                    placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary
                    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                    transition-all duration-200"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Resultados da busca */}
              {searchResults.length > 0 && (
                <div className="bg-background-light dark:bg-background-dark rounded-xl border border-border-light dark:border-border-dark
                  divide-y divide-border-light dark:divide-border-dark overflow-hidden">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => addUser(user)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-primary/5 dark:hover:bg-primary/10
                        transition-colors text-left"
                    >
                      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex-shrink-0">
                        {user.avatar_url ? (
                          <Image src={user.avatar_url} alt={user.full_name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary">person</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-light-primary dark:text-text-dark-primary truncate">
                          {user.full_name}
                        </p>
                        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary truncate">
                          {user.email}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-primary">add_circle</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Usuários selecionados */}
            {selectedUsers.length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                  Selecionados ({selectedUsers.length})
                </label>
                <div className="space-y-2">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 bg-primary/5 dark:bg-primary/10 rounded-xl
                        border border-primary/20"
                    >
                      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex-shrink-0">
                        {user.avatar_url ? (
                          <Image src={user.avatar_url} alt={user.full_name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary">person</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-light-primary dark:text-text-dark-primary truncate">
                          {user.full_name}
                        </p>
                        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary truncate">
                          {user.email}
                        </p>
                      </div>
                      <button
                        onClick={() => removeUser(user.id)}
                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-red-500">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tempo de mentoria */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                Tempo de Mentoria
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[30, 60, 90, 180].map((days) => (
                  <button
                    key={days}
                    onClick={() => setMentorshipDays(days)}
                    className={`py-3 rounded-xl font-medium transition-all duration-200
                      ${mentorshipDays === days
                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                        : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary hover:border-primary/30'
                      }`}
                  >
                    {days} dias
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={mentorshipDays}
                  onChange={(e) => setMentorshipDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 px-3 py-2 bg-background-light dark:bg-background-dark
                    border border-border-light dark:border-border-dark rounded-xl
                    text-text-light-primary dark:text-text-dark-primary text-center
                    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  dias personalizados
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 border border-border-light dark:border-border-dark rounded-xl
                  font-semibold text-text-light-primary dark:text-text-dark-primary
                  hover:bg-surface-light dark:hover:bg-surface-dark transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={selectedUsers.length === 0 || isSubmitting}
                className="flex-1 py-3 px-4 bg-primary text-white rounded-xl font-semibold
                  hover:bg-primary/90 transition-all duration-200
                  shadow-lg hover:shadow-xl shadow-primary/30
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Adicionando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">person_add</span>
                    Adicionar {selectedUsers.length > 0 ? `(${selectedUsers.length})` : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
