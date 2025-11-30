'use client';

import { useState, useEffect } from 'react';
import { AdminButton } from '../ui/AdminButton';
import { useToast } from '@/lib/contexts/ToastContext';
import { getUserPlansByUserId, cancelUserPlan, renewUserPlan, updateUserPlanDates } from '@/services/admin/userPlanService';
import type { UserPlan } from '@/types/admin/plan';

interface UserPlansTableProps {
    userId: string;
    onAddPlan: () => void;
}

export function UserPlansTable({ userId, onAddPlan }: UserPlansTableProps) {
    const toast = useToast();
    const [plans, setPlans] = useState<UserPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPlan, setEditingPlan] = useState<string | null>(null);
    const [editDates, setEditDates] = useState<{ startDate: string; endDate: string }>({
        startDate: '',
        endDate: '',
    });

    useEffect(() => {
        loadPlans();
    }, [userId]);

    const loadPlans = async () => {
        setLoading(true);
        try {
            const data = await getUserPlansByUserId(userId);
            setPlans(data);
        } catch (error: any) {
            toast.error('Erro ao carregar planos');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelPlan = async (planId: string) => {
        if (!confirm('Tem certeza que deseja cancelar este plano?')) return;

        try {
            await cancelUserPlan(planId, { reason: 'Cancelado pelo admin' });
            toast.success('Plano cancelado com sucesso');
            loadPlans();
        } catch (error: any) {
            toast.error('Erro ao cancelar plano');
        }
    };

    const handleRenewPlan = async (planId: string) => {
        const days = prompt('Quantos dias deseja renovar?', '30');
        if (!days) return;

        try {
            const renewPayload = {
                durationDays: parseInt(days),
                paymentMethod: 'ADMIN' as const,
            };
            await renewUserPlan(planId, renewPayload);
            toast.success('Plano renovado com sucesso');
            loadPlans();
        } catch (error: any) {
            toast.error('Erro ao renovar plano');
        }
    };

    const handleStartEdit = (plan: UserPlan) => {
        setEditingPlan(plan.id);
        setEditDates({
            startDate: new Date(plan.startDate).toISOString().split('T')[0],
            endDate: new Date(plan.endDate).toISOString().split('T')[0],
        });
    };

    const handleSaveEdit = async (planId: string) => {
        try {
            await updateUserPlanDates(
                planId,
                new Date(editDates.startDate),
                new Date(editDates.endDate)
            );
            toast.success('Datas atualizadas com sucesso');
            setEditingPlan(null);
            loadPlans();
        } catch (error: any) {
            toast.error('Erro ao atualizar datas');
        }
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return {
                    bg: 'bg-green-100 dark:bg-green-900/30',
                    text: 'text-green-700 dark:text-green-300',
                    icon: 'check_circle',
                    label: 'Ativo',
                };
            case 'EXPIRED':
                return {
                    bg: 'bg-red-100 dark:bg-red-900/30',
                    text: 'text-red-700 dark:text-red-300',
                    icon: 'event_busy',
                    label: 'Expirado',
                };
            case 'CANCELLED':
                return {
                    bg: 'bg-gray-100 dark:bg-gray-800',
                    text: 'text-gray-700 dark:text-gray-300',
                    icon: 'cancel',
                    label: 'Cancelado',
                };
            case 'TRIAL':
                return {
                    bg: 'bg-blue-100 dark:bg-blue-900/30',
                    text: 'text-blue-700 dark:text-blue-300',
                    icon: 'schedule',
                    label: 'Trial',
                };
            default:
                return {
                    bg: 'bg-gray-100 dark:bg-gray-800',
                    text: 'text-gray-700 dark:text-gray-300',
                    icon: 'help',
                    label: status,
                };
        }
    };

    const getPaymentMethodLabel = (method: string) => {
        const labels: Record<string, string> = {
            'admin': 'Admin (Manual)',
            'CREDIT_CARD': 'Cartão de Crédito',
            'PIX': 'PIX',
            'free': 'Gratuito',
            'BANK_SLIP': 'Boleto',
            'other': 'Outro',
        };
        return labels[method] || method;
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-32 bg-surface-light dark:bg-surface-dark rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
                    Planos do Usuário ({plans.length})
                </h3>
                <AdminButton onClick={onAddPlan} icon="add" size="sm">
                    Adicionar Plano
                </AdminButton>
            </div>

            {plans.length === 0 ? (
                <div className="text-center py-12 bg-background-light dark:bg-background-dark rounded-xl">
                    <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">
                        workspace_premium
                    </span>
                    <p className="text-text-light-secondary dark:text-text-dark-secondary">
                        Nenhum plano encontrado
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {plans.map((plan) => {
                        const statusConfig = getStatusConfig(plan.status);
                        const isEditing = editingPlan === plan.id;

                        return (
                            <div
                                key={plan.id}
                                className="p-5 bg-gradient-to-br from-surface-light to-background-light dark:from-surface-dark dark:to-background-dark rounded-xl border-2 border-border-light dark:border-border-dark hover:shadow-lg transition-all"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    {/* Plan Info */}
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${statusConfig.bg}`}>
                                                <span className={`material-symbols-outlined ${statusConfig.text}`}>
                                                    {statusConfig.icon}
                                                </span>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-text-light-primary dark:text-text-dark-primary">
                                                    {plan.plan?.name || 'Plano'}
                                                </h4>
                                                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                                                    ID: {plan.planId}
                                                </p>
                                            </div>
                                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                                                {statusConfig.label}
                                            </span>
                                        </div>

                                        {/* Dates */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                                                    Data de Início
                                                </label>
                                                {isEditing ? (
                                                    <input
                                                        type="date"
                                                        value={editDates.startDate}
                                                        onChange={(e) => setEditDates({ ...editDates, startDate: e.target.value })}
                                                        className="w-full mt-1 px-3 py-1.5 text-sm rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark"
                                                    />
                                                ) : (
                                                    <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                                                        {new Date(plan.startDate).toLocaleDateString('pt-BR')}
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                                                    Data de Término
                                                </label>
                                                {isEditing ? (
                                                    <input
                                                        type="date"
                                                        value={editDates.endDate}
                                                        onChange={(e) => setEditDates({ ...editDates, endDate: e.target.value })}
                                                        className="w-full mt-1 px-3 py-1.5 text-sm rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark"
                                                    />
                                                ) : (
                                                    <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                                                        {new Date(plan.endDate).toLocaleDateString('pt-BR')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Additional Info */}
                                        <div className="flex flex-wrap gap-4 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                                            <div className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm">payments</span>
                                                <span>{getPaymentMethodLabel(plan.paymentMethod || 'N/A')}</span>
                                            </div>
                                            {plan.autoRenew && (
                                                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                                    <span className="material-symbols-outlined text-sm">autorenew</span>
                                                    <span>Renovação Automática</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm">schedule</span>
                                                <span>Criado em {new Date(plan.createdAt).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2">
                                        {isEditing ? (
                                            <>
                                                <button
                                                    onClick={() => handleSaveEdit(plan.id)}
                                                    className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                                    title="Salvar"
                                                >
                                                    <span className="material-symbols-outlined text-lg">save</span>
                                                </button>
                                                <button
                                                    onClick={() => setEditingPlan(null)}
                                                    className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900/30 transition-colors"
                                                    title="Cancelar"
                                                >
                                                    <span className="material-symbols-outlined text-lg">close</span>
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => handleStartEdit(plan)}
                                                    className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                                    title="Editar datas"
                                                >
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                </button>
                                                {plan.status === 'ACTIVE' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleRenewPlan(plan.id)}
                                                            className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                                            title="Renovar"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">autorenew</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancelPlan(plan.id)}
                                                            className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                                            title="Cancelar plano"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">cancel</span>
                                                        </button>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
