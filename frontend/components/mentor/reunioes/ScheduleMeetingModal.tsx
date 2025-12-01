'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { useToast } from '@/lib/contexts/ToastContext';
import { format, addDays } from 'date-fns';

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Mentee {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export default function ScheduleMeetingModal({ isOpen, onClose, onSuccess }: ScheduleMeetingModalProps) {
  const toast = useToast();
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [time, setTime] = useState('14:00');
  const [duration, setDuration] = useState(60);
  const [type, setType] = useState<'individual' | 'group'>('individual');
  const [meetingLink, setMeetingLink] = useState('');
  const [selectedMentees, setSelectedMentees] = useState<string[]>([]);
  const [mentees, setMentees] = useState<Mentee[]>([]);
  const [isLoadingMentees, setIsLoadingMentees] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = 'hidden';
      setTimeout(() => setIsAnimating(true), 10);
      loadMentees();
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
        document.body.style.overflow = 'unset';
        resetForm();
      }, 300);
      return () => clearTimeout(timer);
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
    setTime('14:00');
    setDuration(60);
    setType('individual');
    setMeetingLink('');
    setSelectedMentees([]);
  };

  const loadMentees = async () => {
    setIsLoadingMentees(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // TODO: Implementar chamada real à API
      setMentees([]);
    } catch (error) {
      console.error('Erro ao carregar mentorados:', error);
    } finally {
      setIsLoadingMentees(false);
    }
  };

  const toggleMentee = (menteeId: string) => {
    if (type === 'individual') {
      setSelectedMentees([menteeId]);
    } else {
      setSelectedMentees(prev => 
        prev.includes(menteeId)
          ? prev.filter(id => id !== menteeId)
          : [...prev, menteeId]
      );
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Digite um título para a reunião');
      return;
    }
    if (selectedMentees.length === 0) {
      toast.error('Selecione pelo menos um participante');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // TODO: Implementar chamada real à API
      toast.success('Reunião agendada com sucesso!');
      onSuccess();
    } catch (error) {
      console.error('Erro ao agendar reunião:', error);
      toast.error('Erro ao agendar reunião');
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
        className={`fixed right-0 top-0 h-full w-full md:w-[550px] bg-surface-light dark:bg-surface-dark
          shadow-2xl dark:shadow-dark-2xl z-[10000] transform transition-transform duration-300 ease-out
          ${isAnimating ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark
            bg-background-light dark:bg-background-dark">
            <div>
              <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                Agendar Reunião
              </h2>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                Marque uma sessão de mentoria
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
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Título */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                Título *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Revisão de Cardiologia"
                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark
                  border border-border-light dark:border-border-dark rounded-xl
                  text-text-light-primary dark:text-text-dark-primary
                  placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                Descrição (opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o objetivo da reunião..."
                rows={3}
                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark
                  border border-border-light dark:border-border-dark rounded-xl
                  text-text-light-primary dark:text-text-dark-primary
                  placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                  resize-none"
              />
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                  Data *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full px-4 py-3 bg-background-light dark:bg-background-dark
                    border border-border-light dark:border-border-dark rounded-xl
                    text-text-light-primary dark:text-text-dark-primary
                    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                  Horário *
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-3 bg-background-light dark:bg-background-dark
                    border border-border-light dark:border-border-dark rounded-xl
                    text-text-light-primary dark:text-text-dark-primary
                    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>

            {/* Duração */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                Duração
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[30, 45, 60, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`py-2.5 rounded-xl font-medium text-sm transition-all duration-200
                      ${duration === d
                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                        : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary hover:border-primary/30'
                      }`}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                Tipo de Reunião
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setType('individual'); setSelectedMentees([]); }}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all duration-200
                    ${type === 'individual'
                      ? 'bg-primary text-white shadow-lg shadow-primary/30'
                      : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary hover:border-primary/30'
                    }`}
                >
                  <span className="material-symbols-outlined text-lg">person</span>
                  Individual
                </button>
                <button
                  onClick={() => { setType('group'); setSelectedMentees([]); }}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all duration-200
                    ${type === 'group'
                      ? 'bg-primary text-white shadow-lg shadow-primary/30'
                      : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary hover:border-primary/30'
                    }`}
                >
                  <span className="material-symbols-outlined text-lg">groups</span>
                  Grupo
                </button>
              </div>
            </div>

            {/* Link da reunião */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                Link da Reunião (opcional)
              </label>
              <input
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark
                  border border-border-light dark:border-border-dark rounded-xl
                  text-text-light-primary dark:text-text-dark-primary
                  placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            {/* Participantes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                  Participantes *
                </label>
                {selectedMentees.length > 0 && (
                  <span className="text-sm text-primary font-medium">
                    {selectedMentees.length} selecionado(s)
                  </span>
                )}
              </div>

              {isLoadingMentees ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : mentees.length === 0 ? (
                <div className="text-center py-8 bg-background-light dark:bg-background-dark rounded-xl">
                  <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">
                    group_off
                  </span>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    Nenhum mentorado encontrado
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {mentees.map((mentee) => (
                    <button
                      key={mentee.id}
                      onClick={() => toggleMentee(mentee.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200
                        ${selectedMentees.includes(mentee.id)
                          ? 'bg-primary/10 dark:bg-primary/20 border border-primary'
                          : 'bg-background-light dark:bg-background-dark border border-transparent hover:border-primary/30'
                        }`}
                    >
                      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex-shrink-0">
                        {mentee.avatar ? (
                          <Image src={mentee.avatar} alt={mentee.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary">person</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-light-primary dark:text-text-dark-primary truncate">
                          {mentee.name}
                        </p>
                        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary truncate">
                          {mentee.email}
                        </p>
                      </div>
                      <span className={`material-symbols-outlined transition-colors ${
                        selectedMentees.includes(mentee.id)
                          ? 'text-primary'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}>
                        {type === 'individual' 
                          ? (selectedMentees.includes(mentee.id) ? 'radio_button_checked' : 'radio_button_unchecked')
                          : (selectedMentees.includes(mentee.id) ? 'check_box' : 'check_box_outline_blank')
                        }
                      </span>
                    </button>
                  ))}
                </div>
              )}
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
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-primary text-white rounded-xl font-semibold
                  hover:bg-primary/90 transition-all duration-200
                  shadow-lg hover:shadow-xl shadow-primary/30
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Agendando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">event</span>
                    Agendar
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
