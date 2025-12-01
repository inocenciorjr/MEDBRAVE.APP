'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import NewMessageModal from '@/components/mentor/recados/NewMessageModal';

interface Message {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  recipients: 'all' | 'selected';
  recipientsCount: number;
  readCount: number;
}

export default function RecadosPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // TODO: Implementar chamada real à API
        setMessages([]);
      } catch (error) {
        console.error('Erro ao carregar recados:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, []);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Mentor', icon: 'school', href: '/mentor' },
          { label: 'Recados', icon: 'mail', href: '/mentor/recados' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-text-light-primary dark:text-text-dark-primary">
            Recados
          </h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Envie mensagens para seus mentorados
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="px-5 py-2.5 bg-primary text-white rounded-xl font-semibold
            hover:bg-primary/90 transition-all duration-200
            shadow-lg hover:shadow-xl shadow-primary/30
            hover:scale-105 active:scale-[0.98]
            flex items-center gap-2"
        >
          <span className="material-symbols-outlined">edit</span>
          Novo Recado
        </button>
      </div>

      {/* Info card */}
      <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-900/10
        rounded-2xl p-5 border border-emerald-200/50 dark:border-emerald-800/50">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
            <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-2xl">
              info
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
              Sobre os recados
            </h3>
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              Os recados enviados aparecem na página inicial dos seus mentorados em um card destacado.
              Use para comunicar avisos importantes, dicas de estudo ou motivação.
            </p>
          </div>
        </div>
      </div>

      {/* Lista de recados */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5
              border border-border-light dark:border-border-dark animate-pulse">
              <div className="space-y-3">
                <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-4 w-2/3 bg-slate-100 dark:bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-12
          border border-border-light dark:border-border-dark text-center">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl blur-xl" />
            <div className="relative p-5 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-5xl">
                mail
              </span>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
            Nenhum recado enviado
          </h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-6 max-w-md mx-auto">
            Envie recados para seus mentorados. Eles aparecerão na página inicial de cada um.
          </p>
          <button
            onClick={() => setShowNewModal(true)}
            className="px-6 py-3 bg-primary text-white rounded-xl font-semibold
              hover:bg-primary/90 transition-all duration-200
              shadow-lg hover:shadow-xl shadow-primary/30
              hover:scale-105 active:scale-[0.98]
              inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined">edit</span>
            Enviar Primeiro Recado
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5
                border border-border-light dark:border-border-dark
                hover:border-primary/30 hover:shadow-lg dark:hover:shadow-dark-lg
                transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary
                    group-hover:text-primary transition-colors">
                    {message.title}
                  </h3>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1 line-clamp-2">
                    {message.content}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: ptBR })}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">group</span>
                      {message.recipients === 'all' ? 'Todos' : `${message.recipientsCount} destinatários`}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      {message.readCount} visualizações
                    </span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary
                  group-hover:text-primary group-hover:translate-x-1 transition-all duration-200">
                  chevron_right
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <NewMessageModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSuccess={() => {
          setShowNewModal(false);
          // Recarregar lista
        }}
      />
    </div>
  );
}
