'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Mentee {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'active' | 'inactive' | 'pending';
  progress: number;
  lastActivity: string;
  mentorshipDays: number;
  mentorshipEndDate?: string;
  questionsAnswered: number;
  accuracy: number;
}

interface MenteeDetailsModalProps {
  mentee: Mentee;
  onClose: () => void;
}

export default function MenteeDetailsModal({ mentee, onClose }: MenteeDetailsModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'simulados'>('overview');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    setTimeout(() => setIsAnimating(true), 10);
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setShouldRender(false);
      onClose();
    }, 300);
  };

  const getStatusConfig = (status: Mentee['status']) => {
    const configs = {
      active: { label: 'Ativo', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
      inactive: { label: 'Inativo', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' },
      pending: { label: 'Pendente', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    };
    return configs[status];
  };

  const statusConfig = getStatusConfig(mentee.status);

  if (!shouldRender) return null;

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] transition-opacity duration-300
          ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-[600px] bg-surface-light dark:bg-surface-dark
          shadow-2xl dark:shadow-dark-2xl z-[10000] transform transition-transform duration-300 ease-out
          ${isAnimating ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          {/* Header com perfil */}
          <div className="relative">
            {/* Background gradient */}
            <div className="h-32 bg-gradient-to-br from-primary via-primary/80 to-primary/60" />
            
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-sm rounded-xl
                hover:bg-white/30 transition-all duration-200"
            >
              <span className="material-symbols-outlined text-white">close</span>
            </button>

            {/* Profile info */}
            <div className="px-6 pb-6 -mt-12">
              <div className="flex items-end gap-4">
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-white dark:bg-surface-dark
                  ring-4 ring-surface-light dark:ring-surface-dark shadow-xl flex-shrink-0">
                  {mentee.avatar ? (
                    <Image src={mentee.avatar} alt={mentee.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                      <span className="material-symbols-outlined text-primary text-4xl">person</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary truncate">
                      {mentee.name}
                    </h2>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary truncate">
                    {mentee.email}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats rápidos */}
          <div className="px-6 py-4 border-b border-border-light dark:border-border-dark">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                  {mentee.mentorshipDays}
                </p>
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Dias</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                  {mentee.questionsAnswered}
                </p>
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Questões</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {mentee.accuracy}%
                </p>
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Acerto</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {mentee.progress}%
                </p>
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Progresso</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 border-b border-border-light dark:border-border-dark">
            <div className="flex gap-1">
              {[
                { id: 'overview', label: 'Visão Geral', icon: 'dashboard' },
                { id: 'progress', label: 'Progresso', icon: 'trending_up' },
                { id: 'simulados', label: 'Simulados', icon: 'quiz' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200
                    border-b-2 -mb-px
                    ${activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-text-light-secondary dark:text-text-dark-secondary hover:text-primary'
                    }`}
                >
                  <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Informações gerais */}
                <div className="bg-background-light dark:bg-background-dark rounded-xl p-4 space-y-4">
                  <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                    Informações da Mentoria
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-1">
                        Última atividade
                      </p>
                      <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                        {mentee.lastActivity 
                          ? formatDistanceToNow(new Date(mentee.lastActivity), { addSuffix: true, locale: ptBR })
                          : 'Nunca'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-1">
                        Término da mentoria
                      </p>
                      <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                        {mentee.mentorshipEndDate 
                          ? new Date(mentee.mentorshipEndDate).toLocaleDateString('pt-BR')
                          : 'Não definido'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progresso geral */}
                <div className="bg-background-light dark:bg-background-dark rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                      Progresso Geral
                    </h3>
                    <span className="text-lg font-bold text-primary">{mentee.progress}%</span>
                  </div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                      style={{ width: `${mentee.progress}%` }}
                    />
                  </div>
                </div>

                {/* Ações rápidas */}
                <div className="grid grid-cols-2 gap-3">
                  <button className="flex items-center justify-center gap-2 p-4 bg-primary/10 dark:bg-primary/20
                    rounded-xl text-primary font-medium hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors">
                    <span className="material-symbols-outlined">mail</span>
                    Enviar Recado
                  </button>
                  <button className="flex items-center justify-center gap-2 p-4 bg-cyan-100 dark:bg-cyan-900/30
                    rounded-xl text-cyan-600 dark:text-cyan-400 font-medium hover:bg-cyan-200 dark:hover:bg-cyan-900/50 transition-colors">
                    <span className="material-symbols-outlined">quiz</span>
                    Criar Simulado
                  </button>
                  <button className="flex items-center justify-center gap-2 p-4 bg-amber-100 dark:bg-amber-900/30
                    rounded-xl text-amber-600 dark:text-amber-400 font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors">
                    <span className="material-symbols-outlined">event</span>
                    Agendar Reunião
                  </button>
                  <button className="flex items-center justify-center gap-2 p-4 bg-emerald-100 dark:bg-emerald-900/30
                    rounded-xl text-emerald-600 dark:text-emerald-400 font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors">
                    <span className="material-symbols-outlined">schedule</span>
                    Estender Tempo
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'progress' && (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-4">
                  trending_up
                </span>
                <p className="text-text-light-secondary dark:text-text-dark-secondary">
                  Gráficos de progresso em desenvolvimento
                </p>
              </div>
            )}

            {activeTab === 'simulados' && (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-4">
                  quiz
                </span>
                <p className="text-text-light-secondary dark:text-text-dark-secondary">
                  Lista de simulados em desenvolvimento
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="flex-1 py-3 px-4 border border-border-light dark:border-border-dark rounded-xl
                  font-semibold text-text-light-primary dark:text-text-dark-primary
                  hover:bg-surface-light dark:hover:bg-surface-dark transition-all duration-200"
              >
                Fechar
              </button>
              <button
                className="py-3 px-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl
                  font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition-all duration-200
                  flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">person_remove</span>
                Remover
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
