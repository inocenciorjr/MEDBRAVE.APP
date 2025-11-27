'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { AdminCard } from '@/components/admin/ui/AdminCard';
import { AdminButton } from '../../../components/admin/ui/AdminButton';
import { UserPlanStatusBadge } from '@/components/admin/user-plans/UserPlanStatusBadge';
import { PaymentMethodBadge } from '@/components/admin/user-plans/PaymentMethodBadge';
import { CancelUserPlanModal } from '@/components/admin/user-plans/CancelUserPlanModal';
import { RenewUserPlanModal } from '@/components/admin/user-plans/RenewUserPlanModal';
import type { UserPlan, PaymentMethod } from '@/types/admin/plan';
import {
  getUserPlanById,
  cancelUserPlan,
  renewUserPlan,
} from '@/services/admin/userPlanService';

export default function UserPlanDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const userPlanId = params.id as string;

  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelModal, setCancelModal] = useState(false);
  const [renewModal, setRenewModal] = useState(false);

  useEffect(() => {
    loadUserPlan();
  }, [userPlanId]);

  const loadUserPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUserPlanById(userPlanId);
      setUserPlan(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar plano');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConfirm = async (reason: string) => {
    if (!userPlan) return;
    await cancelUserPlan(userPlan.id, { reason });
    setCancelModal(false);
    loadUserPlan();
  };

  const handleRenewConfirm = async (durationDays: number, paymentMethod: PaymentMethod) => {
    if (!userPlan) return;
    await renewUserPlan(userPlan.id, { durationDays, paymentMethod });
    setRenewModal(false);
    loadUserPlan();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR');
  };

  const getDaysRemaining = () => {
    if (!userPlan) return 0;
    const now = new Date();
    const end = new Date(userPlan.endDate);
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-surface-light dark:bg-surface-dark rounded animate-pulse" />
        <div className="h-96 bg-surface-light dark:bg-surface-dark rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !userPlan) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
          <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
            Erro ao carregar plano
          </h2>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4">
            {error || 'Plano não encontrado'}
          </p>
          <AdminButton onClick={() => router.push('/admin/user-plans')} icon="arrow_back">
            Voltar para Planos
          </AdminButton>
        </div>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining();

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Admin', icon: 'dashboard', href: '/admin' },
          { label: 'Planos de Usuários', icon: 'people', href: '/admin/user-plans' },
          { label: 'Detalhes', icon: 'visibility' },
        ]}
      />

      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 font-display">
              Detalhes do Plano
            </h1>
            <p className="text-text-light-secondary dark:text-text-dark-secondary mt-1">
              Informações completas do plano de usuário
            </p>
          </div>
          <div className="flex gap-2">
            {userPlan.status === 'ACTIVE' && (
              <>
                <AdminButton
                  variant="outline"
                  icon="autorenew"
                  onClick={() => setRenewModal(true)}
                >
                  Renovar
                </AdminButton>
                <AdminButton
                  variant="danger"
                  icon="cancel"
                  onClick={() => setCancelModal(true)}
                >
                  Cancelar
                </AdminButton>
              </>
            )}
            {userPlan.status !== 'ACTIVE' && userPlan.status !== 'CANCELLED' && (
              <AdminButton
                variant="outline"
                icon="autorenew"
                onClick={() => setRenewModal(true)}
              >
                Renovar
              </AdminButton>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AdminCard
            header={
              <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
                Informações do Usuário
              </h3>
            }
          >
            <div className="space-y-4">
              <div>
                <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
                  Nome
                </div>
                <div className="font-medium text-text-light-primary dark:text-text-dark-primary">
                  {userPlan.user?.name || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
                  Email
                </div>
                <div className="font-medium text-text-light-primary dark:text-text-dark-primary">
                  {userPlan.user?.email || userPlan.userId}
                </div>
              </div>
              <div>
                <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
                  ID do Usuário
                </div>
                <div className="font-mono text-sm text-text-light-tertiary dark:text-text-dark-tertiary">
                  {userPlan.userId}
                </div>
              </div>
            </div>
          </AdminCard>

          <AdminCard
            header={
              <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
                Informações do Plano
              </h3>
            }
          >
            <div className="space-y-4">
              <div>
                <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
                  Plano
                </div>
                <div className="font-medium text-text-light-primary dark:text-text-dark-primary">
                  {userPlan.plan?.name || userPlan.planId}
                </div>
              </div>
              <div>
                <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
                  Status
                </div>
                <UserPlanStatusBadge status={userPlan.status} />
              </div>
              <div>
                <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
                  Método de Pagamento
                </div>
                <PaymentMethodBadge method={userPlan.paymentMethod} />
              </div>
              <div>
                <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
                  Auto-renovação
                </div>
                <div className="flex items-center gap-2">
                  {userPlan.autoRenew ? (
                    <>
                      <span className="material-symbols-outlined text-green-600 dark:text-green-400">
                        check_circle
                      </span>
                      <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
                        Ativada
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-gray-400">cancel</span>
                      <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
                        Desativada
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </AdminCard>

          <AdminCard
            header={
              <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
                Datas e Validade
              </h3>
            }
          >
            <div className="space-y-4">
              <div>
                <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
                  Data de Início
                </div>
                <div className="text-sm text-text-light-primary dark:text-text-dark-primary">
                  {formatDate(userPlan.startDate)}
                </div>
              </div>
              <div>
                <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
                  Data de Término
                </div>
                <div className="text-sm text-text-light-primary dark:text-text-dark-primary">
                  {formatDate(userPlan.endDate)}
                </div>
              </div>
              {userPlan.status === 'ACTIVE' && (
                <div>
                  <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
                    Dias Restantes
                  </div>
                  <div
                    className={`text-lg font-bold ${
                      daysRemaining < 0
                        ? 'text-red-600 dark:text-red-400'
                        : daysRemaining <= 7
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}
                  >
                    {daysRemaining < 0 ? 'Expirado' : `${daysRemaining} dias`}
                  </div>
                </div>
              )}
              {userPlan.nextBillingDate && (
                <div>
                  <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
                    Próxima Cobrança
                  </div>
                  <div className="text-sm text-text-light-primary dark:text-text-dark-primary">
                    {formatDate(userPlan.nextBillingDate)}
                  </div>
                </div>
              )}
            </div>
          </AdminCard>
        </div>

        {userPlan.cancellationReason && (
          <AdminCard
            header={
              <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
                Informações de Cancelamento
              </h3>
            }
          >
            <div className="space-y-2">
              <div>
                <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
                  Motivo
                </div>
                <div className="text-text-light-primary dark:text-text-dark-primary">
                  {userPlan.cancellationReason}
                </div>
              </div>
              {userPlan.cancelledAt && (
                <div>
                  <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
                    Data do Cancelamento
                  </div>
                  <div className="text-sm text-text-light-primary dark:text-text-dark-primary">
                    {formatDate(userPlan.cancelledAt)}
                  </div>
                </div>
              )}
            </div>
          </AdminCard>
        )}

        <AdminCard
          header={
            <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
              Informações Técnicas
            </h3>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
                ID do Plano de Usuário
              </div>
              <div className="font-mono text-sm text-text-light-tertiary dark:text-text-dark-tertiary">
                {userPlan.id}
              </div>
            </div>
            <div>
              <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
                ID do Plano
              </div>
              <div className="font-mono text-sm text-text-light-tertiary dark:text-text-dark-tertiary">
                {userPlan.planId}
              </div>
            </div>
            {userPlan.lastPaymentId && (
              <div>
                <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
                  ID do Último Pagamento
                </div>
                <div className="font-mono text-sm text-text-light-tertiary dark:text-text-dark-tertiary">
                  {userPlan.lastPaymentId}
                </div>
              </div>
            )}
            <div>
              <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
                Criado em
              </div>
              <div className="text-sm text-text-light-primary dark:text-text-dark-primary">
                {formatDate(userPlan.createdAt)}
              </div>
            </div>
            <div>
              <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
                Atualizado em
              </div>
              <div className="text-sm text-text-light-primary dark:text-text-dark-primary">
                {formatDate(userPlan.updatedAt)}
              </div>
            </div>
          </div>
        </AdminCard>
      </div>

      {cancelModal && (
        <CancelUserPlanModal
          userPlan={userPlan}
          isOpen={true}
          onClose={() => setCancelModal(false)}
          onConfirm={handleCancelConfirm}
        />
      )}

      {renewModal && (
        <RenewUserPlanModal
          userPlan={userPlan}
          isOpen={true}
          onClose={() => setRenewModal(false)}
          onConfirm={handleRenewConfirm}
        />
      )}
    </>
  );
}
