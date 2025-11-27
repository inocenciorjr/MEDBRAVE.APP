'use client';

import { useState } from 'react';
import { PlannerView } from '@/components/revisoes/planner/PlannerView';
import { PlannerScheduleSettingsModal } from '@/components/revisoes/planner/PlannerScheduleSettingsModal';
import { Button } from '@/components/ui/button';
import { Clock, List } from 'lucide-react';

export default function ReviewPlannerPage() {
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [showScheduleSettings, setShowScheduleSettings] = useState(false);

  return (
    <>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-semibold text-slate-700 dark:text-slate-200">
                Planner de Revisões
              </h1>
              <p className="text-text-light-secondary dark:text-text-dark-secondary mt-1">
                Organize suas revisões e atividades de estudo
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  // TODO: Abrir modal de gerenciamento de revisões
                }}
                className="flex items-center gap-2"
              >
                <List className="h-4 w-4" />
                Gerenciar Revisões
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowScheduleSettings(true)}
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Configurar Horários
              </Button>
            </div>
          </div>

          {/* Planner */}
          <PlannerView viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      </div>

      {/* Modal de Configurações de Horários */}
      <PlannerScheduleSettingsModal
        isOpen={showScheduleSettings}
        onClose={() => setShowScheduleSettings(false)}
        onSuccess={() => {
          // Recarregar a página para atualizar os eventos
          window.location.reload();
        }}
      />
    </>
  );
}
