'use client';

import { useState } from 'react';
import { useReviewPreferences } from '@/hooks/useReviewPreferences';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Calendar } from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';

export function ReviewPreferencesCard() {
  const { preferences, loading, updatePreferences, setExamDate, clearExamDate } = useReviewPreferences();
  const [saving, setSaving] = useState(false);
  const [examDateInput, setExamDateInput] = useState('');
  const toast = useToast();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!preferences) return null;

  const handleToggle = async (field: keyof typeof preferences, value: boolean) => {
    try {
      setSaving(true);
      await updatePreferences({ [field]: value });
      toast.success('Preferências atualizadas');
    } catch (error) {
      toast.error('Erro ao atualizar preferências');
    } finally {
      setSaving(false);
    }
  };

  const handleStudyModeChange = async (mode: 'intensive' | 'balanced' | 'relaxed') => {
    try {
      setSaving(true);
      await updatePreferences({ study_mode: mode });
      toast.success('Modo de estudo atualizado');
    } catch (error) {
      toast.error('Erro ao atualizar modo');
    } finally {
      setSaving(false);
    }
  };

  const handleSetExamDate = async () => {
    if (!examDateInput) return;
    try {
      setSaving(true);
      await setExamDate(examDateInput);
      toast.success('Data da prova configurada');
      setExamDateInput('');
    } catch (error) {
      toast.error('Erro ao configurar data');
    } finally {
      setSaving(false);
    }
  };

  const handleClearExamDate = async () => {
    try {
      setSaving(true);
      await clearExamDate();
      toast.success('Data da prova removida');
    } catch (error) {
      toast.error('Erro ao remover data');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferências de Revisão</CardTitle>
        <CardDescription>
          Configure como o sistema de revisão espaçada funciona para você
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto-Add */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Adicionar Automaticamente</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="auto-questions">Questões</label>
              <input
                id="auto-questions"
                type="checkbox"
                checked={preferences.auto_add_questions}
                onChange={(e) => handleToggle('auto_add_questions', e.currentTarget.checked)}
                disabled={saving}
              />
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="auto-flashcards">Flashcards</label>
              <input
                id="auto-flashcards"
                type="checkbox"
                checked={preferences.auto_add_flashcards}
                onChange={(e) => handleToggle('auto_add_flashcards', e.currentTarget.checked)}
                disabled={saving}
              />
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="auto-errors">Caderno de Erros</label>
              <input
                id="auto-errors"
                type="checkbox"
                checked={preferences.auto_add_error_notebook}
                onChange={(e) => handleToggle('auto_add_error_notebook', e.currentTarget.checked)}
                disabled={saving}
              />
            </div>
          </div>
        </div>

        {/* Habilitar/Desabilitar Tipos */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Tipos Habilitados</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="enable-questions">Questões</label>
              <input
                id="enable-questions"
                type="checkbox"
                checked={preferences.enable_questions}
                onChange={(e) => handleToggle('enable_questions', e.currentTarget.checked)}
                disabled={saving}
              />
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="enable-flashcards">Flashcards</label>
              <input
                id="enable-flashcards"
                type="checkbox"
                checked={preferences.enable_flashcards}
                onChange={(e) => handleToggle('enable_flashcards', e.currentTarget.checked)}
                disabled={saving}
              />
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="enable-errors">Caderno de Erros</label>
              <input
                id="enable-errors"
                type="checkbox"
                checked={preferences.enable_error_notebook}
                onChange={(e) => handleToggle('enable_error_notebook', e.currentTarget.checked)}
                disabled={saving}
              />
            </div>
          </div>
        </div>

        {/* Modo de Estudo */}
        <div className="space-y-2">
          <label htmlFor="study-mode">Modo de Estudo</label>
          <select
            id="study-mode"
            value={preferences.study_mode}
            onChange={(e) => handleStudyModeChange(e.currentTarget.value as 'intensive' | 'balanced' | 'relaxed')}
            disabled={saving}
            className="w-full px-4 py-3 rounded-xl border-2 border-border-light dark:border-border-dark"
          >
            <option value="intensive">Intensivo (máx 30 dias)</option>
            <option value="balanced">Balanceado (máx 40 dias)</option>
            <option value="relaxed">Sem Compromisso (máx 60 dias)</option>
          </select>
          <p className="text-xs text-muted-foreground">
            {preferences.study_mode === 'intensive' && 'Intervalos curtos, mais revisões, 90% retenção'}
            {preferences.study_mode === 'balanced' && 'Intervalos médios, revisões moderadas, 85% retenção'}
            {preferences.study_mode === 'relaxed' && 'Intervalos longos, menos revisões, 80% retenção'}
          </p>
        </div>

        {/* Data da Prova */}
        <div className="space-y-2">
          <label htmlFor="exam-date">Data da Próxima Prova</label>
          {preferences.exam_date ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={new Date(preferences.exam_date).toISOString().split('T')[0]}
                disabled
                className="flex-1 px-4 py-3 rounded-xl border-2 border-border-light dark:border-border-dark"
              />
              <Button
                variant="outline"
                onClick={handleClearExamDate}
                disabled={saving}
              >
                Remover
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                id="exam-date"
                type="date"
                value={examDateInput}
                onChange={(e) => setExamDateInput(e.target.value)}
                disabled={saving}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-border-light dark:border-border-dark"
              />
              <Button
                onClick={handleSetExamDate}
                disabled={saving || !examDateInput}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Definir
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            O sistema ajustará automaticamente os intervalos baseado na proximidade da prova
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
