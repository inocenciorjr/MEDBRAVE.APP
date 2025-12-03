'use client';

import { useState, useEffect } from 'react';
import { DollarSign, RefreshCw, CheckCircle, CreditCard, Wallet } from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

interface MenteeFinancialTabProps {
  mentorshipId: string;
  onRefresh: () => void;
}

const paymentTypeOptions = [
  { value: 'pix', label: 'PIX', icon: '💸' },
  { value: 'credit_card', label: 'Cartão de Crédito', icon: '💳' },
  { value: 'debit_card', label: 'Cartão de Débito', icon: '💳' },
  { value: 'bank_transfer', label: 'Transferência', icon: '🏦' },
  { value: 'cash', label: 'Dinheiro', icon: '💵' },
  { value: 'other', label: 'Outro', icon: '📝' },
];

const billingFrequencyOptions = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
  { value: 'custom', label: 'Personalizado' },
];

export function MenteeFinancialTab({ mentorshipId, onRefresh }: MenteeFinancialTabProps) {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [financialInfo, setFinancialInfo] = useState<any>(null);

  // Form state
  const [paymentType, setPaymentType] = useState('pix');
  const [paymentModality, setPaymentModality] = useState('cash');
  const [totalAmount, setTotalAmount] = useState('');
  const [installments, setInstallments] = useState(1);
  const [billingFrequency, setBillingFrequency] = useState('monthly');
  const [customDays, setCustomDays] = useState(30);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadFinancialInfo();
  }, [mentorshipId]);

  const loadFinancialInfo = async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithAuth(`/mentorship/financial/mentee/${mentorshipId}`);
      const data = await response.json();
      if (data.success && data.data) {
        setFinancialInfo(data.data);
        if (data.data.paymentType) setPaymentType(data.data.paymentType);
        if (data.data.paymentModality) setPaymentModality(data.data.paymentModality);
        if (data.data.totalAmount) setTotalAmount(data.data.totalAmount.toString());
        if (data.data.installments) setInstallments(data.data.installments);
        if (data.data.billingFrequency) setBillingFrequency(data.data.billingFrequency);
        if (data.data.customFrequencyDays) setCustomDays(data.data.customFrequencyDays);
        if (data.data.notes) setNotes(data.data.notes);
      }
    } catch (err) {
      console.error('Erro ao carregar informações financeiras:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      toast.error('Informe o valor total');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetchWithAuth(`/mentorship/financial/mentee/${mentorshipId}`, {
        method: 'PUT',
        body: JSON.stringify({
          paymentType,
          paymentModality,
          totalAmount: parseFloat(totalAmount),
          installments: paymentModality === 'installment' ? installments : 1,
          billingFrequency,
          customFrequencyDays: billingFrequency === 'custom' ? customDays : undefined,
          notes,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Informações financeiras salvas!');
        loadFinancialInfo();
        onRefresh();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-[600px] bg-gradient-to-r from-border-light to-border-light/50 
                      dark:from-border-dark dark:to-border-dark/50 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 
                        flex items-center justify-center shadow-lg shadow-orange-500/30">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
              Configuração Financeira
            </h2>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Defina os termos de pagamento da mentoria
            </p>
          </div>
        </div>
        <button 
          onClick={loadFinancialInfo} 
          className="p-3 rounded-xl bg-gradient-to-br from-background-light to-surface-light 
                   dark:from-background-dark dark:to-surface-dark 
                   border-2 border-border-light dark:border-border-dark
                   hover:border-primary/50 shadow-lg hover:shadow-xl
                   transition-all duration-300 hover:scale-110 active:scale-95"
        >
          <RefreshCw className="w-5 h-5 text-text-light-secondary dark:text-text-dark-secondary" />
        </button>
      </div>

      {/* Main Form Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-orange-500/5 
                    dark:from-surface-dark dark:via-surface-dark dark:to-orange-500/10 
                    rounded-2xl p-6 md:p-8 border-2 border-border-light dark:border-border-dark
                    shadow-xl dark:shadow-dark-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-amber-500/10 to-transparent rounded-full blur-3xl" />
        
        <div className="relative space-y-6">
          {/* Payment Type */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-text-light-primary dark:text-text-dark-primary mb-4 uppercase tracking-wider">
              <CreditCard className="w-4 h-4" />
              Tipo de Pagamento
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {paymentTypeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPaymentType(option.value)}
                  className={`
                    py-4 px-4 rounded-xl text-sm font-semibold transition-all duration-300
                    flex items-center justify-center gap-2
                    ${paymentType === option.value
                      ? 'bg-gradient-to-r from-primary to-violet-500 text-white shadow-lg shadow-primary/30 scale-[1.02]'
                      : 'bg-gradient-to-br from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark border-2 border-border-light dark:border-border-dark hover:border-primary/50 hover:scale-[1.02]'
                    }
                  `}
                >
                  <span>{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Modality */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-text-light-primary dark:text-text-dark-primary mb-4 uppercase tracking-wider">
              <Wallet className="w-4 h-4" />
              Modalidade
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setPaymentModality('cash')}
                className={`
                  py-5 rounded-xl font-semibold transition-all duration-300
                  flex items-center justify-center gap-3
                  ${paymentModality === 'cash'
                    ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30 scale-[1.02]'
                    : 'bg-gradient-to-br from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark border-2 border-border-light dark:border-border-dark hover:border-emerald-500/50 hover:scale-[1.02]'
                  }
                `}
              >
                <span className="text-xl">💵</span>
                À Vista
              </button>
              <button
                onClick={() => setPaymentModality('installment')}
                className={`
                  py-5 rounded-xl font-semibold transition-all duration-300
                  flex items-center justify-center gap-3
                  ${paymentModality === 'installment'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
                    : 'bg-gradient-to-br from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark border-2 border-border-light dark:border-border-dark hover:border-blue-500/50 hover:scale-[1.02]'
                  }
                `}
              >
                <span className="text-xl">💳</span>
                Parcelado
              </button>
            </div>
          </div>

          {/* Amount and Installments */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-text-light-primary dark:text-text-dark-primary mb-3 uppercase tracking-wider">
                Valor Total (R$)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light-secondary font-semibold">R$</span>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-12 pr-4 py-4 bg-gradient-to-br from-background-light to-surface-light 
                           dark:from-background-dark dark:to-surface-dark 
                           border-2 border-border-light dark:border-border-dark 
                           rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary
                           text-lg font-semibold transition-all duration-300"
                />
              </div>
            </div>
            {paymentModality === 'installment' && (
              <div>
                <label className="block text-sm font-bold text-text-light-primary dark:text-text-dark-primary mb-3 uppercase tracking-wider">
                  Parcelas
                </label>
                <select
                  value={installments}
                  onChange={(e) => setInstallments(parseInt(e.target.value))}
                  className="w-full px-4 py-4 bg-gradient-to-br from-background-light to-surface-light 
                           dark:from-background-dark dark:to-surface-dark 
                           border-2 border-border-light dark:border-border-dark 
                           rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary
                           text-lg font-semibold transition-all duration-300 cursor-pointer"
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                    <option key={n} value={n}>
                      {n}x de R$ {(parseFloat(totalAmount || '0') / n).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Billing Frequency */}
          <div>
            <label className="block text-sm font-bold text-text-light-primary dark:text-text-dark-primary mb-4 uppercase tracking-wider">
              Frequência de Cobrança
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {billingFrequencyOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setBillingFrequency(option.value)}
                  className={`
                    py-3 rounded-xl text-sm font-semibold transition-all duration-300
                    ${billingFrequency === option.value
                      ? 'bg-gradient-to-r from-primary to-violet-500 text-white shadow-lg shadow-primary/30 scale-[1.02]'
                      : 'bg-gradient-to-br from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark border-2 border-border-light dark:border-border-dark hover:border-primary/50 hover:scale-[1.02]'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {billingFrequency === 'custom' && (
              <div className="mt-4 flex items-center gap-3 p-4 rounded-xl bg-background-light dark:bg-background-dark border-2 border-border-light dark:border-border-dark">
                <span className="text-sm text-text-light-secondary font-medium">A cada</span>
                <input
                  type="number"
                  value={customDays}
                  onChange={(e) => setCustomDays(parseInt(e.target.value) || 30)}
                  className="w-20 px-3 py-2 bg-surface-light dark:bg-surface-dark border-2 border-border-light 
                           dark:border-border-dark rounded-xl text-center font-semibold
                           focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary"
                />
                <span className="text-sm text-text-light-secondary font-medium">dias</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-bold text-text-light-primary dark:text-text-dark-primary mb-3 uppercase tracking-wider">
              Observações
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anotações sobre o pagamento..."
              className="w-full px-4 py-4 bg-gradient-to-br from-background-light to-surface-light 
                       dark:from-background-dark dark:to-surface-dark 
                       border-2 border-border-light dark:border-border-dark 
                       rounded-xl resize-none focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary
                       transition-all duration-300"
            />
          </div>

          {/* Summary */}
          {totalAmount && parseFloat(totalAmount) > 0 && (
            <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-violet-500/10 
                          dark:from-primary/20 dark:via-primary/10 dark:to-violet-500/20 
                          rounded-xl p-5 border-2 border-primary/30">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl" />
              
              <div className="relative">
                <h4 className="font-bold text-primary mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Resumo do Pagamento
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-2 rounded-lg bg-white/50 dark:bg-black/20">
                    <span className="text-text-light-secondary dark:text-text-dark-secondary">Valor Total:</span>
                    <span className="font-bold text-lg text-text-light-primary dark:text-text-dark-primary">
                      R$ {parseFloat(totalAmount).toFixed(2)}
                    </span>
                  </div>
                  {paymentModality === 'installment' && (
                    <div className="flex justify-between items-center p-2 rounded-lg bg-white/50 dark:bg-black/20">
                      <span className="text-text-light-secondary dark:text-text-dark-secondary">Parcelas:</span>
                      <span className="font-bold text-text-light-primary dark:text-text-dark-primary">
                        {installments}x de R$ {(parseFloat(totalAmount) / installments).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center p-2 rounded-lg bg-white/50 dark:bg-black/20">
                    <span className="text-text-light-secondary dark:text-text-dark-secondary">Frequência:</span>
                    <span className="font-bold text-text-light-primary dark:text-text-dark-primary">
                      {billingFrequencyOptions.find(o => o.value === billingFrequency)?.label}
                      {billingFrequency === 'custom' && ` (${customDays} dias)`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-4 bg-gradient-to-r from-primary to-violet-500 text-white rounded-xl font-bold text-lg
                     hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.01]
                     transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-3"
          >
            {isSaving ? (
              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <DollarSign className="w-6 h-6" />
                Salvar Configuração Financeira
              </>
            )}
          </button>
        </div>
      </div>

      {/* Current Config Info */}
      {financialInfo && (
        <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-emerald-500/5 
                      dark:from-surface-dark dark:via-surface-dark dark:to-emerald-500/10 
                      rounded-2xl p-6 border-2 border-border-light dark:border-border-dark
                      shadow-xl dark:shadow-dark-xl">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl" />
          
          <div className="relative">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 
                            flex items-center justify-center shadow-md shadow-emerald-500/30">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-text-light-primary dark:text-text-dark-primary">
                Configuração Atual
              </h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-background-light dark:bg-background-dark border-2 border-border-light dark:border-border-dark">
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-2 uppercase tracking-wider">Status</p>
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                  financialInfo.status === 'active' 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {financialInfo.status === 'active' ? 'Ativo' : financialInfo.status}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-background-light dark:bg-background-dark border-2 border-border-light dark:border-border-dark">
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-2 uppercase tracking-wider">Última Atualização</p>
                <p className="font-bold text-text-light-primary dark:text-text-dark-primary">
                  {financialInfo.updatedAt ? new Date(financialInfo.updatedAt).toLocaleDateString('pt-BR') : '-'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-background-light dark:bg-background-dark border-2 border-border-light dark:border-border-dark">
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-2 uppercase tracking-wider">Valor Configurado</p>
                <p className="font-bold text-text-light-primary dark:text-text-dark-primary">
                  R$ {financialInfo.totalAmount?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-background-light dark:bg-background-dark border-2 border-border-light dark:border-border-dark">
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-2 uppercase tracking-wider">Tipo</p>
                <p className="font-bold text-text-light-primary dark:text-text-dark-primary">
                  {paymentTypeOptions.find(o => o.value === financialInfo.paymentType)?.label || '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
