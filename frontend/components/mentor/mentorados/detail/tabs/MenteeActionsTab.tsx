'use client';

import { AlertCircle, CheckCircle, XCircle, Calendar, Info } from 'lucide-react';

interface MenteeDetails {
  id: string;
  mentorshipId: string;
  name: string;
  email: string;
  status: string;
}

interface MenteeActionsTabProps {
  mentee: MenteeDetails;
  isSubmitting: boolean;
  onSuspend: () => void;
  onReactivate: () => void;
  onExtend: () => void;
  onTerminate: () => void;
}

interface ActionCardProps {
  title: string;
  description: string;
  buttonText: string;
  gradient: string;
  shadowColor: string;
  iconBg: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}

function ActionCard({ 
  title, 
  description, 
  buttonText, 
  gradient, 
  shadowColor, 
  iconBg, 
  icon, 
  onClick, 
  disabled,
  variant = 'default'
}: ActionCardProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-primary/5 
                  dark:from-surface-dark dark:via-surface-dark dark:to-primary/10 
                  rounded-2xl p-6 border-2 border-border-light dark:border-border-dark
                  shadow-xl dark:shadow-dark-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.01]
                  group">
      {/* Background glow */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 rounded-full blur-2xl 
                    group-hover:opacity-20 transition-opacity duration-300`} />
      
      <div className="relative">
        <div className={`w-14 h-14 rounded-xl ${iconBg} flex items-center justify-center mb-4
                      shadow-lg ${shadowColor} group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        
        <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
          {title}
        </h3>
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-5 leading-relaxed">
          {description}
        </p>
        
        <button 
          onClick={onClick} 
          disabled={disabled}
          className={`
            w-full py-3 px-5 rounded-xl font-semibold
            transition-all duration-300 
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center gap-2
            ${variant === 'danger' 
              ? `bg-gradient-to-r ${gradient} text-white shadow-lg ${shadowColor}
                 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]`
              : `bg-gradient-to-r ${gradient} text-white shadow-lg ${shadowColor}
                 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]`
            }
          `}
        >
          {disabled ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            buttonText
          )}
        </button>
      </div>
    </div>
  );
}

export function MenteeActionsTab({ 
  mentee, 
  isSubmitting, 
  onSuspend, 
  onReactivate, 
  onExtend, 
  onTerminate 
}: MenteeActionsTabProps) {
  const isSuspended = mentee.status === 'SUSPENDED' || mentee.status === 'suspended';
  const isActive = mentee.status === 'ACTIVE' || mentee.status === 'active';

  return (
    <div className="space-y-6">
      {/* Section Title */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 
                      flex items-center justify-center shadow-lg shadow-red-500/30">
          <AlertCircle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
            Ações de Gestão
          </h2>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            Gerencie o status e configurações da mentoria
          </p>
        </div>
      </div>
      
      {/* Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isActive && (
          <ActionCard
            title="Suspender Mentorado"
            description="Pausar temporariamente a mentoria. O mentorado não terá acesso aos recursos enquanto suspenso."
            buttonText={isSubmitting ? 'Processando...' : 'Suspender Mentoria'}
            gradient="from-amber-500 to-orange-500"
            shadowColor="shadow-amber-500/30"
            iconBg="bg-gradient-to-br from-amber-500 to-orange-500"
            icon={<AlertCircle className="w-7 h-7 text-white" />}
            onClick={onSuspend}
            disabled={isSubmitting}
          />
        )}
        
        {isSuspended && (
          <ActionCard
            title="Reativar Mentorado"
            description="Reativar a mentoria suspensa. O mentorado voltará a ter acesso aos recursos."
            buttonText={isSubmitting ? 'Processando...' : 'Reativar Mentoria'}
            gradient="from-emerald-500 to-green-500"
            shadowColor="shadow-emerald-500/30"
            iconBg="bg-gradient-to-br from-emerald-500 to-green-500"
            icon={<CheckCircle className="w-7 h-7 text-white" />}
            onClick={onReactivate}
            disabled={isSubmitting}
          />
        )}
        
        <ActionCard
          title="Estender Tempo"
          description="Adicionar mais dias à mentoria. Útil para renovações ou bonificações."
          buttonText="Estender Período"
          gradient="from-blue-500 to-cyan-500"
          shadowColor="shadow-blue-500/30"
          iconBg="bg-gradient-to-br from-blue-500 to-cyan-500"
          icon={<Calendar className="w-7 h-7 text-white" />}
          onClick={onExtend}
          disabled={isSubmitting}
        />
        
        <ActionCard
          title="Encerrar Mentoria"
          description="Finalizar a mentoria permanentemente. Esta ação não pode ser desfeita."
          buttonText={isSubmitting ? 'Processando...' : 'Encerrar Mentoria'}
          gradient="from-red-500 to-rose-500"
          shadowColor="shadow-red-500/30"
          iconBg="bg-gradient-to-br from-red-500 to-rose-500"
          icon={<XCircle className="w-7 h-7 text-white" />}
          onClick={onTerminate}
          disabled={isSubmitting}
          variant="danger"
        />
      </div>

      {/* Info Box */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-blue-50 to-cyan-50/50 
                    dark:from-blue-900/20 dark:via-blue-900/15 dark:to-cyan-900/10 
                    rounded-2xl p-6 border-2 border-blue-200 dark:border-blue-800/50
                    shadow-lg transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-2xl" />
        
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 
                        flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0">
            <Info className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-3">
              Sobre as ações de gestão
            </h4>
            <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-400">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                <span><strong>Suspender:</strong> Pausa temporária, pode ser revertida a qualquer momento</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <span><strong>Estender:</strong> Adiciona dias ao período da mentoria sem alterar outras configurações</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                <span><strong>Encerrar:</strong> Finaliza permanentemente a mentoria (ação irreversível)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
