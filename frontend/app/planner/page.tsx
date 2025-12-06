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
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-700 dark:text-slate-200">
                Planner de Revisões
              </h1>
              <p className="text-xs sm:text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                Organize suas revisões e atividades de estudo
              </p>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  // TODO: Abrir modal de gerenciamento de revisões
                }}
                className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
              >
                <List className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Gerenciar</span>
                <span className="hidden sm:inline"> Revisões</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowScheduleSettings(true)}
                className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
              >
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Configurar</span>
                <span className="hidden sm:inline"> Horários</span>
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
