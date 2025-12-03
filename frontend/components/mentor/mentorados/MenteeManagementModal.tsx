'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useToast } from '@/lib/contexts/ToastContext';
import {
  menteeFinancialService,
  MenteeFinancialInfo,
  PaymentType,
  PaymentModality,
  BillingFrequency,
  MenteeStatus,
} from '@/lib/services/menteeFinancialService';

interface MenteeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mentee: {
    id: string;
    mentorshipId: string;
    name: string;
    email: string;
    avatar?: string;
    status: string;
    expirationDate?: string;
  };
}

const paymentTypeLabels: Record<PaymentType, string> = {
  [PaymentType.PIX]: 'PIX',
  [PaymentType.CREDIT_CARD]: 'Cartão de Crédito',
  [PaymentType.DEBIT_CARD]: 'Cartão de Débito',
  [PaymentType.BANK_TRANSFER]: 'Transferência',
  [PaymentType.CASH]: 'Dinheiro',
  [PaymentType.OTHER]: 'Outro',
};

const billingFrequencyLabels: Record<BillingFrequency, string> = {
  [BillingFrequency.MONTHLY]: 'Mensal',
  [BillingFrequency.QUARTERLY]: 'Trimestral',
  [BillingFrequency.SEMIANNUAL]: 'Semestral',
  [BillingFrequency.ANNUAL]: 'Anual',
  [BillingFrequency.CUSTOM]: 'Personalizado',
};

export default function MenteeManagementModal({
  isOpen,
  onClose,
  onSuccess,
  mentee,
}: MenteeManagementModalProps) {
  const toast = useToast();
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'financial' | 'actions'>('info');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [paymentType, setPaymentType] = useState<PaymentType>(PaymentType.PIX);
  const [paymentModality, setPaymentModality] = useState<PaymentModality>(PaymentModality.CASH);
  const [totalAmount, setTotalAmount] = useState('');
  const [installments, setInstallments] = useState(1);
  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>(BillingFrequency.MONTHLY);
  const [customDays, setCustomDays] = useState(30);
  const [expirationDate, setExpirationDate] = useState('');
  const [notes, setNotes] = useState('');

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [newExpirationDate, setNewExpirationDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = 'hidden';
      setTimeout(() => setIsAnimating(true), 10);
      
      // Set default expiration date
      if (mentee.expirationDate) {
        setExpirationDate(mentee.expirationDate.split('T')[0]);
        setNewExpirationDate(mentee.expirationDate.split('T')[0]);
      } else {
        const defaultDate = new Date();
        defaultDate.setMonth(defaultDate.getMonth() + 1);
        setExpirationDate(defaultDate.toISOString().split('T')[0]);
        setNewExpirationDate(defaultDate.toISOString().split('T')[0]);
      }
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
        document.body.style.overflow = 'unset';
      }, 300);
      return () => clearTimeout(timer);
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, mentee.expirationDate]);

  const handleSaveFinancial = async () => {
    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      toast.error('Informe o valor total');
      return;
    }

    setIsSaving(true);
    try {
      await menteeFinancialService.saveFinancialInfo(mentee.mentorshipId, {
        menteeId: mentee.id,
        paymentType,
        paymentModality,
        totalAmount: parseFloat(totalAmount),
        installments: paymentModality === PaymentModality.INSTALLMENT ? installments : 1,
        billingFrequency,
        customFrequencyDays: billingFrequency === BillingFrequency.CUSTOM ? customDays : undefined,
        startDate: new Date().toISOString(),
        expirationDate: new Date(expirationDate).toISOString(),
        notes,
      });
      toast.success('Informações financeiras salvas!');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAction = async (action: 'suspend' | 'reactivate' | 'expire' | 'extend') => {
    setActionLoading(action);
    try {
      switch (action) {
        case 'suspend':
          await menteeFinancialService.suspendMentee(mentee.mentorshipId);
          toast.success('Mentorado suspenso');
          break;
        case 'reactivate':
          await menteeFinancialService.reactivateMentee(mentee.mentorshipId, newExpirationDate);
          toast.success('Mentorado reativado');
          break;
        case 'expire':
          await menteeFinancialService.expireMentee(mentee.mentorshipId);
          toast.success('Mentorado expirado');
          break;
        case 'extend':
          await menteeFinancialService.extendMentorship(mentee.mentorshipId, newExpirationDate);
          toast.success('Tempo estendido');
          break;
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao executar ação');
    } finally {
      setActionLoading(null);
    }
  };

  if (!shouldRender) return null;

  return createPortal(
    <>
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] transition-opacity duration-300
          ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-[550px] bg-surface-light dark:bg-surface-dark
          shadow-2xl z-[10000] transform transition-transform duration-300 ease-out
          ${isAnimating ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14 rounded-full overflow-hidden bg-primary/10">
                {mentee.avatar ? (
                  <Image src={mentee.avatar} alt={mentee.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-2xl">person</span>
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
                  {mentee.name}
                </h2>
                <p className="text-sm text-text-light-secondary">{mentee.email}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-xl">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border-light dark:border-border-dark">
            {(['info', 'financial', 'actions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium transition-colors
                  ${activeTab === tab 
                    ? 'text-primary border-b-2 border-primary' 
                    : 'text-text-light-secondary hover:text-text-light-primary'
                  }`}
              >
                {tab === 'info' && 'Informações'}
                {tab === 'financial' && 'Financeiro'}
                {tab === 'actions' && 'Ações'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'info' && (
              <div className="space-y-4">
                <InfoRow label="Status" value={
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
                    ${mentee.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      mentee.status === 'expired' ? 'bg-red-100 text-red-700' :
                      mentee.status === 'suspended' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                    {mentee.status === 'active' ? 'Ativo' :
                     mentee.status === 'expired' ? 'Expirado' :
                     mentee.status === 'suspended' ? 'Suspenso' : mentee.status}
                  </span>
                } />
                <InfoRow label="Expiração" value={
                  mentee.expirationDate 
                    ? new Date(mentee.expirationDate).toLocaleDateString('pt-BR')
                    : 'Não definida'
                } />
              </div>
            )}

            {activeTab === 'financial' && (
              <div className="space-y-5">
                {/* Tipo de Pagamento */}
                <div>
                  <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                    Tipo de Pagamento
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(paymentTypeLabels).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setPaymentType(key as PaymentType)}
                        className={`py-2 px-3 rounded-xl text-sm font-medium transition-all
                          ${paymentType === key 
                            ? 'bg-primary text-white' 
                            : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark'
                          }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modalidade */}
                <div>
                  <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                    Modalidade
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPaymentModality(PaymentModality.CASH)}
                      className={`py-3 rounded-xl font-medium transition-all
                        ${paymentModality === PaymentModality.CASH 
                          ? 'bg-primary text-white' 
                          : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark'
                        }`}
                    >
                      À Vista
                    </button>
                    <button
                      onClick={() => setPaymentModality(PaymentModality.INSTALLMENT)}
                      className={`py-3 rounded-xl font-medium transition-all
                        ${paymentModality === PaymentModality.INSTALLMENT 
                          ? 'bg-primary text-white' 
                          : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark'
                        }`}
                    >
                      Parcelado
                    </button>
                  </div>
                </div>

                {/* Valor e Parcelas */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Valor Total (R$)</label>
                    <input
                      type="number"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      placeholder="0,00"
                      className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl"
                    />
                  </div>
                  {paymentModality === PaymentModality.INSTALLMENT && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Parcelas</label>
                      <select
                        value={installments}
                        onChange={(e) => setInstallments(parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl"
                      >
                        {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                          <option key={n} value={n}>{n}x</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Frequência de Cobrança */}
                <div>
                  <label className="block text-sm font-medium mb-2">Frequência de Cobrança</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(billingFrequencyLabels).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setBillingFrequency(key as BillingFrequency)}
                        className={`py-2.5 rounded-xl text-sm font-medium transition-all
                          ${billingFrequency === key 
                            ? 'bg-primary text-white' 
                            : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark'
                          }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {billingFrequency === BillingFrequency.CUSTOM && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-sm">A cada</span>
                      <input
                        type="number"
                        value={customDays}
                        onChange={(e) => setCustomDays(parseInt(e.target.value) || 30)}
                        className="w-20 px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-center"
                      />
                      <span className="text-sm">dias</span>
                    </div>
                  )}
                </div>

                {/* Data de Expiração */}
                <div>
                  <label className="block text-sm font-medium mb-2">Data de Expiração</label>
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl"
                  />
                </div>

                {/* Notas */}
                <div>
                  <label className="block text-sm font-medium mb-2">Observações</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Anotações sobre o pagamento..."
                    className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl resize-none"
                  />
                </div>

                {/* Botão Salvar */}
                <button
                  onClick={handleSaveFinancial}
                  disabled={isSaving}
                  className="w-full py-3 bg-primary text-white rounded-xl font-semibold
                    hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined">save</span>
                  )}
                  Salvar Informações Financeiras
                </button>
              </div>
            )}

            {activeTab === 'actions' && (
              <div className="space-y-4">
                {/* Estender Tempo */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined">schedule</span>
                    Estender Tempo
                  </h4>
                  <input
                    type="date"
                    value={newExpirationDate}
                    onChange={(e) => setNewExpirationDate(e.target.value)}
                    className="w-full px-4 py-2 mb-3 bg-white dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl"
                  />
                  <button
                    onClick={() => handleAction('extend')}
                    disabled={actionLoading === 'extend'}
                    className="w-full py-2.5 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:opacity-50"
                  >
                    {actionLoading === 'extend' ? 'Estendendo...' : 'Estender Mentoria'}
                  </button>
                </div>

                {/* Suspender */}
                {mentee.status === 'active' && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                    <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
                      <span className="material-symbols-outlined">pause_circle</span>
                      Suspender Mentorado
                    </h4>
                    <p className="text-sm text-amber-600 dark:text-amber-300 mb-3">
                      O mentorado perderá acesso temporariamente.
                    </p>
                    <button
                      onClick={() => handleAction('suspend')}
                      disabled={actionLoading === 'suspend'}
                      className="w-full py-2.5 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 disabled:opacity-50"
                    >
                      {actionLoading === 'suspend' ? 'Suspendendo...' : 'Suspender'}
                    </button>
                  </div>
                )}

                {/* Reativar */}
                {(mentee.status === 'suspended' || mentee.status === 'expired') && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                    <h4 className="font-semibold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-2">
                      <span className="material-symbols-outlined">play_circle</span>
                      Reativar Mentorado
                    </h4>
                    <input
                      type="date"
                      value={newExpirationDate}
                      onChange={(e) => setNewExpirationDate(e.target.value)}
                      className="w-full px-4 py-2 mb-3 bg-white dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl"
                    />
                    <button
                      onClick={() => handleAction('reactivate')}
                      disabled={actionLoading === 'reactivate'}
                      className="w-full py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 disabled:opacity-50"
                    >
                      {actionLoading === 'reactivate' ? 'Reativando...' : 'Reativar'}
                    </button>
                  </div>
                )}

                {/* Expirar */}
                {mentee.status === 'active' && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                      <span className="material-symbols-outlined">cancel</span>
                      Expirar Mentorado
                    </h4>
                    <p className="text-sm text-red-600 dark:text-red-300 mb-3">
                      O mentorado será marcado como expirado imediatamente.
                    </p>
                    <button
                      onClick={() => handleAction('expire')}
                      disabled={actionLoading === 'expire'}
                      className="w-full py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 disabled:opacity-50"
                    >
                      {actionLoading === 'expire' ? 'Expirando...' : 'Expirar Agora'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border-light dark:border-border-dark">
      <span className="text-sm text-text-light-secondary">{label}</span>
      <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{value}</span>
    </div>
  );
}
