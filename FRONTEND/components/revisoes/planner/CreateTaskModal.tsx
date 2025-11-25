'use client';

import { useState, useEffect } from 'react';
import { TaskType, TaskSource, getDefaultPermissions } from './types';
import { format } from 'date-fns';
import Checkbox from '@/components/ui/Checkbox';
import Dropdown from '@/components/ui/Dropdown';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTask: (task: any) => void;
  selectedDate?: Date;
  selectedHour?: number;
}

const TASK_COLORS = [
  { value: 'blue', label: 'Azul', class: 'bg-blue-500' },
  { value: 'yellow', label: 'Amarelo', class: 'bg-yellow-500' },
  { value: 'orange', label: 'Laranja', class: 'bg-orange-500' },
  { value: 'pink', label: 'Rosa', class: 'bg-pink-500' },
  { value: 'gray', label: 'Cinza', class: 'bg-gray-500' },
];

const WEEKDAYS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

export function CreateTaskModal({ isOpen, onClose, onCreateTask, selectedDate: initialDate, selectedHour: initialHour }: CreateTaskModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date());
  const [startHour, setStartHour] = useState(initialHour || 8);
  const [duration, setDuration] = useState(1);
  const [taskType, setTaskType] = useState<TaskType>('study-session');
  const [selectedColor, setSelectedColor] = useState('blue'); // Azul para study-session
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [recurringEndDate, setRecurringEndDate] = useState('');

  // Atualizar cor quando mudar o tipo de tarefa
  useEffect(() => {
    if (taskType === 'study-session') {
      setSelectedColor('blue'); // Azul
    } else if (taskType === 'custom') {
      setSelectedColor('yellow'); // Amarelo
    }
  }, [taskType]);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = 'hidden';
      // Resetar para valores iniciais quando abrir
      setSelectedDate(initialDate || new Date());
      setStartHour(initialHour || 8);
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
  }, [isOpen, initialDate, initialHour]);

  if (!shouldRender) return null;

  const toggleWeekday = (day: number) => {
    setSelectedWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validar se a data não é no passado
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(selectedDate);
    taskDate.setHours(0, 0, 0, 0);

    if (taskDate < today) {
      alert('Não é possível criar tarefas no passado!');
      return;
    }

    // Validar recorrência
    if (isRecurring) {
      if (selectedWeekdays.length === 0) {
        alert('Selecione pelo menos um dia da semana para a tarefa recorrente!');
        return;
      }

      if (!recurringEndDate) {
        alert('Defina uma data final para a tarefa recorrente!');
        return;
      }

      // Validar que a data final não é mais de 1 ano no futuro
      const endDate = new Date(recurringEndDate);
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1);

      if (endDate > maxDate) {
        alert('A data final não pode ser superior a 1 ano no futuro!');
        return;
      }
    }

    const calculatedEndHour = startHour + duration;

    // Se passar de 22h, limitar a 22h (será exibido como "+")
    const endHour = Math.min(calculatedEndHour, 22);

    // Avisar se a duração foi limitada
    if (calculatedEndHour > 22) {
      console.log(`Duração ajustada: tarefa vai até 22h+ (sem horário final definido)`);
    }

    const baseTask = {
      title,
      description,
      date: format(selectedDate, 'yyyy-MM-dd'),
      start_hour: startHour,
      start_minute: 0,
      end_hour: endHour,
      end_minute: 0,
      taskType,
      source: 'user' as TaskSource,
      permissions: getDefaultPermissions('user'),
      color: selectedColor,
      icon: getIconByTaskType(taskType),
      metadata: {
        createdAt: new Date().toISOString(),
      },
    };

    console.log('[CreateTaskModal] Criando tarefa com cor:', selectedColor);
    console.log('[CreateTaskModal] Tarefa completa:', baseTask);

    if (isRecurring && selectedWeekdays.length > 0 && recurringEndDate) {
      // Criar tarefa recorrente (o backend vai expandir automaticamente)
      onCreateTask({
        ...baseTask,
        isRecurring: true,
        recurringDays: selectedWeekdays,
        recurringEndDate: recurringEndDate,
      });
    } else {
      // Criar tarefa única
      onCreateTask(baseTask);
    }

    // Reset form
    setTitle('');
    setDescription('');
    setStartHour(initialHour || 8);
    setDuration(1);
    setTaskType('study-session');
    setSelectedColor('blue');
    setIsRecurring(false);
    setSelectedWeekdays([]);
    setRecurringEndDate('');
    onClose();
  };

  const getIconByTaskType = (type: TaskType): string => {
    switch (type) {
      case 'study-session':
        return 'menu_book';
      case 'custom':
        return 'event';
      default:
        return 'task';
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'
          }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-[500px] bg-surface-light dark:bg-surface-dark 
                   shadow-2xl dark:shadow-dark-2xl z-[10000] transform transition-transform duration-300 ease-out ${isAnimating ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                Nova Tarefa
              </h2>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                Crie uma nova tarefa no seu planner
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
          <div className="flex-1 overflow-y-auto p-6"
            onClick={e => e.stopPropagation()}
          >

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Data e Horário */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary pl-1">
                  Data e Horário
                </h3>
                <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-4 border-2 border-primary/20 
                              shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl 
                              transition-all duration-300">
                  <div className="grid grid-cols-2 gap-4 items-end">
                    <div>
                      <label className="block text-xs font-medium text-primary uppercase tracking-wider mb-2">
                        Data
                      </label>
                      <input
                        type="date"
                        value={format(selectedDate, 'yyyy-MM-dd')}
                        onChange={(e) => {
                          const [year, month, day] = e.target.value.split('-').map(Number);
                          setSelectedDate(new Date(year, month - 1, day));
                        }}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        className="w-full h-[58px] px-4 rounded-xl border-2 border-border-light dark:border-border-dark
                                 bg-surface-light dark:bg-surface-dark
                                 text-text-light-primary dark:text-text-dark-primary
                                 focus:border-primary focus:ring-4 focus:ring-primary/20
                                 transition-all duration-200 font-semibold
                                 hover:border-primary/50 shadow-sm hover:shadow-md"
                      />
                    </div>
                    <div>
                      <Dropdown
                        label="Horário"
                        options={Array.from({ length: 16 }, (_, i) => i + 6).map(hour => ({
                          value: hour.toString(),
                          label: `${hour.toString().padStart(2, '0')}:00`
                        }))}
                        value={startHour.toString()}
                        onChange={(value) => setStartHour(parseInt(value))}
                        fullWidth
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Duração */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary pl-1">
                  Duração
                </h3>
                <div>
                  <label className="block text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2 pl-1">
                    Horas
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDuration(Math.max(1, duration - 1))}
                      disabled={duration <= 1}
                      className="flex items-center justify-center w-10 h-10 bg-surface-light dark:bg-surface-dark border-2 border-border-light dark:border-border-dark rounded-lg hover:bg-primary/10 hover:border-primary/50 hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all group"
                    >
                      <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary group-hover:text-primary transition-colors">remove</span>
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={duration}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setDuration(Math.max(1, Math.min(8, val)));
                      }}
                      className="flex-1 px-4 py-2.5 text-center bg-surface-light dark:bg-surface-dark border-2 border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-text-light-primary dark:text-text-dark-primary font-bold text-lg transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setDuration(Math.min(8, duration + 1))}
                      disabled={duration >= 8}
                      className="flex items-center justify-center w-10 h-10 bg-surface-light dark:bg-surface-dark border-2 border-border-light dark:border-border-dark rounded-lg hover:bg-primary/10 hover:border-primary/50 hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all group"
                    >
                      <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary group-hover:text-primary transition-colors">add</span>
                    </button>
                  </div>
                  <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-2 pl-1">
                    Término: {(startHour + duration) > 22 ? '22:00+' : `${(startHour + duration).toString().padStart(2, '0')}:00`}
                  </p>
                </div>
              </div>

              {/* Título */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary pl-1">
                  Título da Tarefa
                </h3>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border-light dark:border-border-dark
                           bg-surface-light dark:bg-surface-dark
                           text-text-light-primary dark:text-text-dark-primary
                           focus:border-primary focus:ring-4 focus:ring-primary/20
                           transition-all duration-200 font-normal
                           hover:border-primary/50 shadow-sm hover:shadow-md"
                  placeholder="Clique para adicionar título"
                  required
                />
              </div>

              {/* Tipo de Tarefa */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary pl-1">
                  Tipo de Tarefa
                </h3>
                <div className="space-y-2">
                  <label className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all duration-300
                                    hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10
                                    shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                                    hover:scale-[1.01] group
                                    ${taskType === 'study-session' ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-border-light dark:border-border-dark'}`}>
                    <Checkbox
                      checked={taskType === 'study-session'}
                      onChange={() => setTaskType('study-session')}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">menu_book</span>
                        <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary 
                                    group-hover:text-primary transition-colors">
                          Sessão de Estudo
                        </p>
                      </div>
                      <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1.5 ml-8">
                        Para estudos, revisões e prática de questões
                      </p>
                    </div>
                  </label>
                  <label className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all duration-300
                                    hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10
                                    shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                                    hover:scale-[1.01] group
                                    ${taskType === 'custom' ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-border-light dark:border-border-dark'}`}>
                    <Checkbox
                      checked={taskType === 'custom'}
                      onChange={() => setTaskType('custom')}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">event</span>
                        <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary 
                                    group-hover:text-primary transition-colors">
                          Outra Atividade
                        </p>
                      </div>
                      <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1.5 ml-8">
                        Para compromissos, pausas e outras atividades
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Cor da Tarefa */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary pl-1">
                  Cor da Tarefa
                </h3>
                <div className="grid grid-cols-6 gap-3">
                  {TASK_COLORS.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setSelectedColor(color.value)}
                      className={`h-12 rounded-xl ${color.class} transition-all duration-300 shadow-lg hover:shadow-xl
                                dark:shadow-dark-lg dark:hover:shadow-dark-xl ${selectedColor === color.value
                          ? 'ring-4 ring-primary ring-offset-2 ring-offset-surface-light dark:ring-offset-surface-dark scale-110'
                          : 'hover:scale-105 opacity-80 hover:opacity-100'
                        }`}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              {/* Tarefa Recorrente */}
              <div className="border-t-2 border-border-light dark:border-border-dark pt-4">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-primary/5 dark:hover:bg-primary/10 transition-all duration-200">
                  <Checkbox
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                  />
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                      Tarefa Recorrente
                    </span>
                    <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-0.5">
                      Repetir esta tarefa em dias específicos da semana
                    </p>
                  </div>
                </label>
              </div>

              {isRecurring && (
                <div className="space-y-4 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 
                              rounded-xl p-5 border-2 border-primary/30
                              shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                              transition-all duration-300">
                  <div>
                    <label className="block text-xs font-medium text-primary uppercase tracking-wider mb-3">
                      Dias da Semana
                    </label>
                    <div className="grid grid-cols-7 gap-2">
                      {WEEKDAYS.map(day => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleWeekday(day.value)}
                          className={`py-2.5 rounded-lg text-xs font-bold transition-all duration-300 shadow-md hover:shadow-lg ${selectedWeekdays.includes(day.value)
                            ? 'bg-primary text-white scale-110'
                            : 'bg-surface-light dark:bg-surface-dark text-text-light-secondary dark:text-text-dark-secondary border-2 border-border-light dark:border-border-dark hover:border-primary/50'
                            }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-primary uppercase tracking-wider mb-2">
                      Repetir até (máximo 1 ano)
                    </label>
                    <input
                      type="date"
                      value={recurringEndDate}
                      onChange={(e) => setRecurringEndDate(e.target.value)}
                      min={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
                      max={(() => {
                        const maxDate = new Date();
                        maxDate.setFullYear(maxDate.getFullYear() + 1);
                        return format(maxDate, 'yyyy-MM-dd');
                      })()}
                      className="w-full px-4 py-3 rounded-xl border-2 border-border-light dark:border-border-dark
                               bg-surface-light dark:bg-surface-dark
                               text-text-light-primary dark:text-text-dark-primary
                               focus:border-primary focus:ring-4 focus:ring-primary/20
                               transition-all duration-200 font-semibold
                               hover:border-primary/50 shadow-sm hover:shadow-md"
                      required={isRecurring}
                    />
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="p-6 border-t-2 border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border-2 border-border-light dark:border-border-dark rounded-xl 
                         font-semibold text-text-light-primary dark:text-text-dark-primary 
                         hover:bg-surface-light dark:hover:bg-surface-dark 
                         transition-all duration-200
                         shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                         hover:scale-105"
              >
                Cancelar
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold 
                         hover:bg-primary/90 transition-all duration-200 
                         shadow-xl hover:shadow-2xl
                         flex items-center justify-center gap-2 hover:scale-105"
              >
                <span className="material-symbols-outlined">add</span>
                <span>Criar Tarefa</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
