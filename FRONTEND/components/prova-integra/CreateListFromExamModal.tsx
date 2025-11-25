'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/contexts/ToastContext';
import FolderSelector from '@/components/banco-questoes/FolderSelector';
import api from '@/services/api';

interface CreateListFromExamModalProps {
  examId: string;
  examTitle: string;
  questionIds: string[];
  isOpen: boolean;
  onClose: () => void;
}

export function CreateListFromExamModal({ 
  examId, 
  examTitle, 
  questionIds,
  isOpen, 
  onClose 
}: CreateListFromExamModalProps) {
  const router = useRouter();
  const toast = useToast();
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [listName, setListName] = useState(`Lista: ${examTitle}`);
  const [folderId, setFolderId] = useState<string | null>(null);

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
      }, 300);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleCreateList = async () => {
    try {
      setLoading(true);
      
      if (!listName.trim()) {
        toast.warning('Digite um nome para a lista');
        setLoading(false);
        return;
      }

      if (questionIds.length === 0) {
        toast.warning('Esta prova não possui questões');
        setLoading(false);
        return;
      }
      
      // Criar lista com as questões da prova
      const response = await api.post('/question-lists', {
        name: listName,
        title: listName,
        description: `Lista criada a partir da prova: ${examTitle}`,
        folder_id: folderId,
        is_public: false,
        tags: ['prova-integra', examId],
        status: 'active',
        question_count: questionIds.length,
        questions: questionIds
      });
      
      const newList = response.data.data;
      
      toast.success('Lista criada com sucesso!');
      
      // Redirecionar para a lista criada
      router.push(`/resolucao-questoes/${newList.id}`);
      
      onClose();
    } catch (error: any) {
      console.error('Erro ao criar lista:', error);
      toast.error(error.message || 'Erro ao criar lista');
    } finally {
      setLoading(false);
    }
  };

  if (!shouldRender) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-[500px] bg-surface-light dark:bg-surface-dark shadow-2xl dark:shadow-dark-2xl z-[10000] transform transition-transform duration-300 ease-out ${
          isAnimating ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark">
            <div>
              <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">
                Criar Lista
              </h2>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Criar lista a partir desta prova
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">
                close
              </span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Info da Prova */}
            <div className="bg-background-light dark:bg-background-dark rounded-lg p-4 border border-border-light dark:border-border-dark">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-0.5">description</span>
                <div className="flex-1">
                  <h3 className="font-medium text-slate-700 dark:text-slate-200 mb-1">
                    Prova: {examTitle}
                  </h3>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    {questionIds.length} questões
                  </p>
                </div>
              </div>
            </div>

            {/* Seletor de Pasta */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Salvar em
              </h3>
              <FolderSelector
                selectedFolder={folderId}
                onSelectFolder={setFolderId}
                showLists={false}
              />
            </div>

            {/* Nome da Lista */}
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2 block">
                  Nome da Lista
                </span>
                <input
                  type="text"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  placeholder="Digite o nome da lista"
                  className="w-full px-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-slate-700 dark:text-slate-200 transition-all"
                />
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-6 py-3 border border-border-light dark:border-border-dark rounded-lg font-medium text-slate-700 dark:text-slate-200 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateList}
                disabled={loading || questionIds.length === 0}
                className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">playlist_add</span>
                    Criar Lista
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
