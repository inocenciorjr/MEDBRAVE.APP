import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogFooter, DialogHeader } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectItem, SelectTrigger, SelectContent, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { 
  Calendar,
  Clock,
  Tag,
  FileText,
  Link,
  X,
  Save,
  AlertCircle,
  Repeat
} from 'lucide-react';
import { toast } from 'sonner';
import plannerApi from '../../services/plannerApi';

const taskTypes = [
  { value: 'Questões', label: 'Questões', color: 'bg-blue-500', icon: '❓' },
  { value: 'Prova', label: 'Prova', color: 'bg-purple-500', icon: '📝' },
  { value: 'Simulado', label: 'Simulado', color: 'bg-amber-500', icon: '🎯' },
  { value: 'Capítulo', label: 'Capítulo', color: 'bg-emerald-500', icon: '📖' },
  { value: 'Aulas', label: 'Aulas', color: 'bg-cyan-500', icon: '🎓' },
  { value: 'Pessoal', label: 'Pessoal', color: 'bg-pink-500', icon: '👤' },
  { value: 'Flashcard', label: 'Flashcard', color: 'bg-indigo-500', icon: '🗂️' },
];

const repeatOptions = [
  { value: 'none', label: 'Não se Repete' },
  { value: 'daily', label: 'Todos os dias da semana (2a a 6a)' },
  { value: 'weekly', label: 'Todos os dias da semana (2a a 6a, pelas próximas 4 semanas)' },
  { value: 'weekdays', label: 'Todos os dias (nesta semana)' },
  { value: 'weekends', label: 'Todos os dias (pelas próximas 4 semanas)' },
  { value: 'custom', label: 'Semanal (todos os sábados pelas próximas 4 semanas)' },
];

export default function TaskModal({ open, onClose, userId, date, task }) {
  const isEdit = !!task && task.type === 'MANUAL';
  const [form, setForm] = useState({
    title: '',
    description: '',
    scheduledDate: date || '',
    taskType: 'Questões',
    targetUrl: '',
    repeat: 'none',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEdit && task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        scheduledDate: task.scheduledDate || date || '',
        taskType: task.taskType || 'Questões',
        targetUrl: task.targetUrl || '',
        repeat: 'none',
      });
    } else {
      setForm({
        title: '',
        description: '',
        scheduledDate: date || '',
        taskType: 'Questões',
        targetUrl: '',
        repeat: 'none',
      });
    }
    setErrors({});
  }, [open, isEdit, task, date]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    if (!form.title.trim()) newErrors.title = 'Título é obrigatório';
    if (!form.scheduledDate) newErrors.scheduledDate = 'Data é obrigatória';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const taskData = {
        title: form.title.trim(),
        description: form.description.trim(),
        scheduledDate: form.scheduledDate,
        type: 'MANUAL',
        taskType: form.taskType,
        targetUrl: form.targetUrl.trim(),
        status: 'PENDING',
      };

      if (isEdit) {
        await plannerApi.updateTask(task.id, taskData);
        toast.success('Tarefa atualizada com sucesso!');
      } else {
        await plannerApi.createTask(userId, taskData);
        toast.success('Tarefa criada com sucesso!');
      }
      
      onClose(true);
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error);
      toast.error('Erro ao salvar tarefa');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose(false);
  };

  const selectedTaskType = taskTypes.find(type => type.value === form.taskType) || taskTypes[0];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto bg-card/95 backdrop-blur-sm border-0 shadow-2xl">
        {/* Header com gradiente */}
        <DialogHeader className="relative p-0 mb-6 overflow-hidden rounded-t-lg">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6">
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <DialogTitle className="text-white font-bold text-lg">
                  Tarefa
                </DialogTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 pb-6">
          {/* Título */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Adicionar título</span>
            </Label>
            <Input
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Digite o título da tarefa..."
              className={`
                h-12 border-0 bg-muted/30 focus:bg-muted/50 transition-colors duration-200
                ${errors.title ? 'ring-2 ring-red-500' : ''}
              `}
            />
            {errors.title && (
              <div className="flex items-center space-x-1 text-red-500 text-xs">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.title}</span>
              </div>
            )}
          </div>

          {/* Data */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Data</span>
            </Label>
            <Input
              type="date"
              value={form.scheduledDate}
              onChange={(e) => setForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
              className={`
                h-12 border-0 bg-muted/30 focus:bg-muted/50 transition-colors duration-200
                ${errors.scheduledDate ? 'ring-2 ring-red-500' : ''}
              `}
            />
            {errors.scheduledDate && (
              <div className="flex items-center space-x-1 text-red-500 text-xs">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.scheduledDate}</span>
              </div>
            )}
          </div>

          {/* Repetição */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <Repeat className="h-4 w-4" />
              <span>Repetição</span>
            </Label>
            <Select value={form.repeat} onValueChange={(value) => setForm(prev => ({ ...prev, repeat: value }))}>
              <SelectTrigger className="h-12 border-0 bg-muted/30 focus:bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {repeatOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Tarefa */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <Tag className="h-4 w-4" />
              <span>Tipo</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {taskTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, taskType: type.value }))}
                  className={`
                    p-3 rounded-xl border-2 transition-all duration-200 text-left
                    ${form.taskType === type.value
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                      : 'border-muted hover:border-muted-foreground/30 bg-muted/20 hover:bg-muted/40'
                    }
                  `}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{type.icon}</span>
                    <span className="text-sm font-medium">{type.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Detalhes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">
              Detalhes
            </Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Escrever aqui"
              className="min-h-[80px] border-0 bg-muted/30 focus:bg-muted/50 transition-colors duration-200 resize-none"
            />
            <div className="text-xs text-muted-foreground">
              Normas Reguladoras Profissionais (NR-5)
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <span>📊 Acessar MLPs desta tarefa</span>
              <span className="font-mono">00:00:00</span>
            </div>
          </div>

          {/* URL (opcional) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <Link className="h-4 w-4" />
              <span>Link (opcional)</span>
            </Label>
            <Input
              value={form.targetUrl}
              onChange={(e) => setForm(prev => ({ ...prev, targetUrl: e.target.value }))}
              placeholder="https://..."
              className="h-12 border-0 bg-muted/30 focus:bg-muted/50 transition-colors duration-200"
            />
          </div>

          {/* Botão Salvar */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                <span>Salvando...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Save className="h-4 w-4" />
                <span>Salvar</span>
              </div>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

