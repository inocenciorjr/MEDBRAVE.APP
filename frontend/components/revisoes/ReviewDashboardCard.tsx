'use client';

import { useReviewDashboard } from '@/hooks/useReviewDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Clock, Target, TrendingUp, Zap } from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';

export function ReviewDashboardCard() {
  const { dashboard, loading, activateCramming } = useReviewDashboard();
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

  if (!dashboard) return null;

  const totalItems = dashboard.total_due + dashboard.completed_today;
  const progressPercentage = totalItems > 0 
    ? (dashboard.completed_today / totalItems) * 100 
    : 0;

  const handleActivateCramming = async () => {
    const examDate = prompt('Digite a data da prova (YYYY-MM-DD):');
    if (!examDate) return;

    const daysUntilExam = dashboard.days_until_exam || 15;
    const crammingDays = Math.min(daysUntilExam, 15);
    
    const confirmed = window.confirm(
      'Ativar Modo Pré-Prova?\n\n' +
      `Sua prova está em ${daysUntilExam} dias.\n\n` +
      'Este modo irá:\n' +
      `• Reagendar TODAS as revisões para os próximos ${crammingDays} dias\n` +
      '• Distribuir uniformemente até a data da prova\n' +
      `• Usar intervalos máximos de ${crammingDays} dias\n` +
      '• Aumentar limite diário para 200 revisões\n\n' +
      '⚠️ ATENÇÃO: Este é um modo INTENSIVO!\n' +
      'Use apenas quando a prova estiver muito próxima (≤15 dias).\n\n' +
      'Deseja continuar?'
    );

    if (!confirmed) return;

    try {
      await activateCramming(examDate);
      toast.success('Modo Pré-Prova ativado!', 'Revisões reagendadas para os próximos 15 dias.');
    } catch (error) {
      toast.error('Erro ao ativar modo Pré-Prova');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Dashboard de Revisões</CardTitle>
            <CardDescription>
              Acompanhe seu progresso e estatísticas
            </CardDescription>
          </div>
          <Badge variant={
            dashboard.study_mode === 'intensive' ? 'destructive' :
            dashboard.study_mode === 'balanced' ? 'default' : 'secondary'
          }>
            {dashboard.study_mode === 'intensive' && 'Intensivo'}
            {dashboard.study_mode === 'balanced' && 'Balanceado'}
            {dashboard.study_mode === 'relaxed' && 'Sem Compromisso'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progresso do Dia */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso de Hoje</span>
            <span className="font-medium">
              {dashboard.completed_today} / {totalItems}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Estatísticas Principais */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              <span>Pendentes</span>
            </div>
            <p className="text-2xl font-bold">{dashboard.total_due}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Tempo Estimado</span>
            </div>
            <p className="text-2xl font-bold">{dashboard.estimated_time_minutes}min</p>
          </div>
        </div>

        {/* Dias até Prova */}
        {dashboard.days_until_exam !== null && (
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="font-medium">Dias até a prova</span>
              </div>
              <span className="text-2xl font-bold text-primary">
                {dashboard.days_until_exam}
              </span>
            </div>
          </div>
        )}

        {/* Breakdown por Tipo */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Por Tipo de Conteúdo</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Questões</span>
              <span className="font-medium">{dashboard.breakdown.questions}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Flashcards</span>
              <span className="font-medium">{dashboard.breakdown.flashcards}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Caderno de Erros</span>
              <span className="font-medium">{dashboard.breakdown.errors}</span>
            </div>
          </div>
        </div>

        {/* Breakdown por Estado */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Por Estado</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Novos</span>
              <Badge variant="outline">{dashboard.state_breakdown.new}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Aprendendo</span>
              <Badge variant="outline">{dashboard.state_breakdown.learning}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Revisão</span>
              <Badge variant="outline">{dashboard.state_breakdown.review}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Reaprendendo</span>
              <Badge variant="outline">{dashboard.state_breakdown.relearning}</Badge>
            </div>
          </div>
        </div>

        {/* Modo Pré-Prova */}
        {dashboard.days_until_exam && dashboard.days_until_exam <= 30 && (
          <Button
            onClick={handleActivateCramming}
            variant="outline"
            className="w-full"
          >
            <Zap className="h-4 w-4 mr-2" />
            Ativar Modo Pré-Prova
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
