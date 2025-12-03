'use client';

import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/lib/contexts/ToastContext';
import { mentorProgramService, CreateProgramPayload } from '@/lib/services/mentorProgramService';
import { createClient } from '@/lib/supabase/client';
import { ImageCropModal } from '@/components/flashcards/ImageCropModal';
import { 
  X, Image as ImageIcon, Trash2, ChevronRight, ChevronLeft,
  CreditCard, Banknote, QrCode, Building2, Wallet, HelpCircle,
  Calendar, DollarSign, FileText, Settings, Check
} from 'lucide-react';

interface CreateProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Tipos de pagamento
type PaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'cash' | 'other';
type PaymentModality = 'cash' | 'installment';
type BillingFrequency = 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'custom';

interface ProgramFormData {
  // Informações básicas
  title: string;
  description: string;
  coverImageUrl: string;
  
  // Período
  startDate: string;
  endDate: string;
  
  // Participantes
  maxParticipants: number | undefined;
  
  // Configurações de preço
  isFree: boolean;
  price: number;
  
  // Configurações de pagamento
  acceptedPaymentMethods: PaymentMethod[];
  paymentModality: PaymentModality;
  installments: number;
  billingFrequency: BillingFrequency;
  customFrequencyDays: number;
  generateReminders: boolean;
  reminderDaysBefore: number;
  
  // Configurações adicionais
  isPublic: boolean;
  requiresApproval: boolean;
  allowLateEnrollment: boolean;
  
  // Tags e categorias
  tags: string[];
}

const initialFormData: ProgramFormData = {
  title: '',
  description: '',
  coverImageUrl: '',
  startDate: '',
  endDate: '',
  maxParticipants: undefined,
  isFree: false,
  price: 0,
  acceptedPaymentMethods: ['pix'],
  paymentModality: 'cash',
  installments: 1,
  billingFrequency: 'monthly',
  customFrequencyDays: 30,
  generateReminders: true,
  reminderDaysBefore: 3,
  isPublic: true,
  requiresApproval: false,
  allowLateEnrollment: true,
  tags: [],
};

const paymentMethodsConfig: { id: PaymentMethod; label: string; icon: any }[] = [
  { id: 'pix', label: 'PIX', icon: QrCode },
  { id: 'credit_card', label: 'Cartão de Crédito', icon: CreditCard },
  { id: 'debit_card', label: 'Cartão de Débito', icon: CreditCard },
  { id: 'bank_transfer', label: 'Transferência', icon: Building2 },
  { id: 'cash', label: 'Dinheiro', icon: Banknote },
  { id: 'other', label: 'Outro', icon: Wallet },
];

const billingFrequencyConfig: { id: BillingFrequency; label: string; days: number }[] = [
  { id: 'monthly', label: 'Mensal', days: 30 },
  { id: 'quarterly', label: 'Trimestral', days: 90 },
  { id: 'semiannual', label: 'Semestral', days: 180 },
  { id: 'annual', label: 'Anual', days: 365 },
  { id: 'custom', label: 'Personalizado', days: 0 },
];

type Step = 'basic' | 'period' | 'pricing' | 'payment' | 'settings' | 'review';

const steps: { id: Step; label: string; icon: any }[] = [
  { id: 'basic', label: 'Informações', icon: FileText },
  { id: 'period', label: 'Período', icon: Calendar },
  { id: 'pricing', label: 'Preço', icon: DollarSign },
  { id: 'payment', label: 'Pagamento', icon: CreditCard },
  { id: 'settings', label: 'Configurações', icon: Settings },
  { id: 'review', label: 'Revisão', icon: Check },
];

function CreateProgramModal({ isOpen, onClose, onSuccess }: CreateProgramModalProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Animation states
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  
  // Form states
  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [formData, setFormData] = useState<ProgramFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  
  // Crop modal states
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);

  // Handle modal open/close
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = 'hidden';
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
        document.body.style.overflow = 'unset';
        // Reset form
        setFormData(initialFormData);
        setCurrentStep('basic');
        setCoverImagePreview(null);
        setShowCropModal(false);
        setTempImageUrl(null);
      }, 300);
      return () => clearTimeout(timer);
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Calculate installment value
  const installmentValue = useMemo(() => {
    if (formData.isFree || formData.price <= 0) return 0;
    return formData.price / (formData.paymentModality === 'installment' ? formData.installments : 1);
  }, [formData.price, formData.installments, formData.paymentModality, formData.isFree]);

  // Image select handler - opens crop modal
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    // Open crop modal
    const reader = new FileReader();
    reader.onloadend = () => {
      setTempImageUrl(reader.result as string);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  // After crop, upload the image
  const handleCropComplete = async (croppedBlob: Blob) => {
    setShowCropModal(false);
    setTempImageUrl(null);
    setIsUploading(true);
    
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) throw new Error('Não autenticado');

      const fileName = `program-cover-${Date.now()}.png`;
      const filePath = `mentor-programs/${session.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, croppedBlob, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      setCoverImagePreview(publicUrl);
      setFormData(prev => ({ ...prev, coverImageUrl: publicUrl }));
      toast.success('Imagem enviada com sucesso!');
    } catch (err: any) {
      console.error('Erro ao fazer upload:', err);
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setCoverImagePreview(null);
    setFormData(prev => ({ ...prev, coverImageUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Toggle payment method
  const togglePaymentMethod = (method: PaymentMethod) => {
    setFormData(prev => {
      const methods = prev.acceptedPaymentMethods.includes(method)
        ? prev.acceptedPaymentMethods.filter(m => m !== method)
        : [...prev.acceptedPaymentMethods, method];
      return { ...prev, acceptedPaymentMethods: methods.length > 0 ? methods : [method] };
    });
  };

  // Add tag
  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag('');
    }
  };

  // Remove tag
  const removeTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  // Navigation
  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const canGoNext = currentStepIndex < steps.length - 1;
  const canGoPrev = currentStepIndex > 0;

  const goNext = () => {
    if (canGoNext) setCurrentStep(steps[currentStepIndex + 1].id);
  };

  const goPrev = () => {
    if (canGoPrev) setCurrentStep(steps[currentStepIndex - 1].id);
  };

  // Validation
  const validateStep = (step: Step): boolean => {
    switch (step) {
      case 'basic':
        return formData.title.trim().length >= 3;
      case 'period':
        return true; // Datas são opcionais
      case 'pricing':
        return formData.isFree || formData.price > 0;
      case 'payment':
        return formData.acceptedPaymentMethods.length > 0;
      case 'settings':
        return true;
      case 'review':
        return true;
      default:
        return true;
    }
  };

  const isStepComplete = (step: Step): boolean => {
    const stepIndex = steps.findIndex(s => s.id === step);
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    return stepIndex < currentIndex && validateStep(step);
  };

  // Submit
  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('O título é obrigatório');
      return;
    }

    if (!formData.isFree && formData.price <= 0) {
      toast.error('Defina um preço válido ou marque como gratuito');
      return;
    }

    setIsLoading(true);
    try {
      const payload: CreateProgramPayload = {
        title: formData.title,
        description: formData.description,
        coverImageUrl: formData.coverImageUrl,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        maxParticipants: formData.maxParticipants,
        isFree: formData.isFree,
        price: formData.isFree ? 0 : formData.price,
        tags: formData.tags,
        settings: {
          acceptedPaymentMethods: formData.acceptedPaymentMethods,
          paymentModality: formData.paymentModality,
          installments: formData.installments,
          billingFrequency: formData.billingFrequency,
          customFrequencyDays: formData.customFrequencyDays,
          generateReminders: formData.generateReminders,
          reminderDaysBefore: formData.reminderDaysBefore,
          isPublic: formData.isPublic,
          requiresApproval: formData.requiresApproval,
          allowLateEnrollment: formData.allowLateEnrollment,
        },
      };

      await mentorProgramService.createProgram(payload);
      toast.success('Mentoria criada com sucesso! Envie para aprovação quando estiver pronto.');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar programa');
    } finally {
      setIsLoading(false);
    }
  };

  if (!shouldRender) return null;

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] transition-opacity duration-300
          ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Modal Lateral */}
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-[700px] lg:w-[800px] bg-surface-light dark:bg-surface-dark
          shadow-2xl z-[10000] flex flex-col will-change-transform
          ${isAnimating ? 'animate-slide-in-right' : 'animate-slide-out-right'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark
          bg-background-light dark:bg-background-dark">
          <div>
            <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
              Criar Mentoria
            </h2>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
              Configure todos os detalhes da sua mentoria
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-surface-light dark:hover:bg-surface-dark rounded-xl transition-all"
          >
            <X className="w-5 h-5 text-text-light-secondary" />
          </button>
        </div>

        {/* Steps Indicator */}
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark bg-background-light/50 dark:bg-background-dark/50">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isComplete = isStepComplete(step.id);
              
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex flex-col items-center gap-1.5 transition-all ${
                    isActive ? 'scale-105' : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    isActive 
                      ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                      : isComplete
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                  }`}>
                    {isComplete ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs font-medium ${
                    isActive ? 'text-primary' : 'text-text-light-secondary dark:text-text-dark-secondary'
                  }`}>
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step: Basic Info */}
          {currentStep === 'basic' && (
            <BasicInfoStep
              formData={formData}
              setFormData={setFormData}
              coverImagePreview={coverImagePreview}
              isUploading={isUploading}
              fileInputRef={fileInputRef}
              handleImageSelect={handleImageSelect}
              handleRemoveImage={handleRemoveImage}
            />
          )}

          {/* Step: Period */}
          {currentStep === 'period' && (
            <PeriodStep formData={formData} setFormData={setFormData} />
          )}

          {/* Step: Pricing */}
          {currentStep === 'pricing' && (
            <PricingStep formData={formData} setFormData={setFormData} installmentValue={installmentValue} />
          )}

          {/* Step: Payment */}
          {currentStep === 'payment' && (
            <PaymentStep
              formData={formData}
              setFormData={setFormData}
              togglePaymentMethod={togglePaymentMethod}
              installmentValue={installmentValue}
            />
          )}

          {/* Step: Settings */}
          {currentStep === 'settings' && (
            <SettingsStep
              formData={formData}
              setFormData={setFormData}
              newTag={newTag}
              setNewTag={setNewTag}
              addTag={addTag}
              removeTag={removeTag}
            />
          )}

          {/* Step: Review */}
          {currentStep === 'review' && (
            <ReviewStep formData={formData} coverImagePreview={coverImagePreview} installmentValue={installmentValue} />
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
          <div className="flex items-center justify-between">
            <button
              onClick={goPrev}
              disabled={!canGoPrev}
              className="flex items-center gap-2 px-4 py-2.5 text-text-light-secondary hover:text-text-light-primary
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Anterior
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 border border-border-light dark:border-border-dark rounded-xl
                  font-medium text-text-light-primary dark:text-text-dark-primary
                  hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>

              {currentStep === 'review' ? (
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold
                    hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2
                    shadow-lg shadow-primary/30"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Criar Mentoria
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={goNext}
                  disabled={!validateStep(currentStep)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-semibold
                    hover:bg-primary/90 transition-all disabled:opacity-50 shadow-lg shadow-primary/30"
                >
                  Próximo
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Image Crop Modal */}
      {tempImageUrl && (
        <ImageCropModal
          isOpen={showCropModal}
          imageUrl={tempImageUrl}
          onCropComplete={handleCropComplete}
          onClose={() => {
            setShowCropModal(false);
            setTempImageUrl(null);
          }}
        />
      )}
    </>,
    document.body
  );
}


// ============================================
// STEP COMPONENTS
// ============================================

// Step 1: Basic Info
function BasicInfoStep({
  formData,
  setFormData,
  coverImagePreview,
  isUploading,
  fileInputRef,
  handleImageSelect,
  handleRemoveImage,
}: {
  formData: ProgramFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProgramFormData>>;
  coverImagePreview: string | null;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveImage: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
          Informações Básicas
        </h3>
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
          Defina o título, descrição e imagem de capa do programa
        </p>
      </div>

      {/* Imagem de Capa */}
      <div>
        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
          Imagem de Capa
        </label>
        
        {coverImagePreview ? (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden border border-border-light dark:border-border-dark h-48">
              <img 
                src={coverImagePreview} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-lg"
                  title="Trocar imagem"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-lg"
                  title="Remover imagem"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-text-light-secondary text-center">
              A imagem foi recortada para formato quadrado (400x400px)
            </p>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center
              cursor-pointer transition-all
              ${isUploading 
                ? 'border-primary bg-primary/5' 
                : 'border-border-light dark:border-border-dark hover:border-primary hover:bg-primary/5'
              }`}
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-3" />
                <span className="text-sm text-text-light-secondary">Enviando...</span>
              </>
            ) : (
              <>
                <div className="p-4 bg-primary/10 rounded-xl mb-3">
                  <ImageIcon className="w-8 h-8 text-primary" />
                </div>
                <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                  Clique para adicionar imagem
                </span>
                <span className="text-xs text-text-light-secondary mt-1">
                  PNG, JPG ou WEBP (máx. 5MB)
                </span>
              </>
            )}
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
      </div>

      {/* Título */}
      <div>
        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
          Título da Mentoria *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Ex: Intensivão Revalida 2026.1"
          className="w-full px-4 py-3 bg-background-light dark:bg-background-dark
            border border-border-light dark:border-border-dark rounded-xl
            text-text-light-primary dark:text-text-dark-primary
            focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        <p className="text-xs text-text-light-secondary mt-1">
          Mínimo de 3 caracteres
        </p>
      </div>

      {/* Descrição */}
      <div>
        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
          Descrição
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Descreva a mentoria, objetivos, público-alvo, metodologia..."
          rows={5}
          className="w-full px-4 py-3 bg-background-light dark:bg-background-dark
            border border-border-light dark:border-border-dark rounded-xl
            text-text-light-primary dark:text-text-dark-primary
            focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
        />
      </div>
    </div>
  );
}

// Step 2: Period
function PeriodStep({
  formData,
  setFormData,
}: {
  formData: ProgramFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProgramFormData>>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
          Período da Mentoria
        </h3>
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
          Defina as datas de início e término e limite de participantes
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
            Data de Início
          </label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
            className="w-full px-4 py-3 bg-background-light dark:bg-background-dark
              border border-border-light dark:border-border-dark rounded-xl
              text-text-light-primary dark:text-text-dark-primary
              focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
            Data de Término
          </label>
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
            min={formData.startDate}
            className="w-full px-4 py-3 bg-background-light dark:bg-background-dark
              border border-border-light dark:border-border-dark rounded-xl
              text-text-light-primary dark:text-text-dark-primary
              focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
          Limite de Participantes
        </label>
        <input
          type="number"
          value={formData.maxParticipants || ''}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            maxParticipants: e.target.value ? parseInt(e.target.value) : undefined 
          }))}
          placeholder="Deixe vazio para ilimitado"
          min={1}
          className="w-full px-4 py-3 bg-background-light dark:bg-background-dark
            border border-border-light dark:border-border-dark rounded-xl
            text-text-light-primary dark:text-text-dark-primary
            focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <p className="text-xs text-text-light-secondary mt-1">
          Deixe em branco para não limitar o número de participantes
        </p>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-medium mb-1">Dica</p>
          <p>As datas são opcionais. Você pode definir um programa sem data de término para mentorias contínuas.</p>
        </div>
      </div>
    </div>
  );
}


// Step 3: Pricing
function PricingStep({
  formData,
  setFormData,
  installmentValue,
}: {
  formData: ProgramFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProgramFormData>>;
  installmentValue: number;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
          Configuração de Preço
        </h3>
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
          Defina o valor da mentoria e modalidade de pagamento
        </p>
      </div>

      {/* Gratuito ou Pago */}
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, isFree: false }))}
          className={`p-4 rounded-xl border-2 transition-all text-left ${
            !formData.isFree
              ? 'border-primary bg-primary/5'
              : 'border-border-light dark:border-border-dark hover:border-primary/30'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              !formData.isFree ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
            }`}>
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">Pago</span>
          </div>
          <p className="text-xs text-text-light-secondary">
            Defina um valor para o programa
          </p>
        </button>

        <button
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, isFree: true, price: 0 }))}
          className={`p-4 rounded-xl border-2 transition-all text-left ${
            formData.isFree
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
              : 'border-border-light dark:border-border-dark hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              formData.isFree ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
            }`}>
              <Check className="w-5 h-5" />
            </div>
            <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">Gratuito</span>
          </div>
          <p className="text-xs text-text-light-secondary">
            Mentoria sem custo para participantes
          </p>
        </button>
      </div>

      {/* Valor */}
      {!formData.isFree && (
        <>
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
              Valor Total da Mentoria (R$) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light-secondary">R$</span>
              <input
                type="number"
                value={formData.price || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                placeholder="0,00"
                min={0}
                step={0.01}
                className="w-full pl-12 pr-4 py-3 bg-background-light dark:bg-background-dark
                  border border-border-light dark:border-border-dark rounded-xl
                  text-text-light-primary dark:text-text-dark-primary text-lg font-semibold
                  focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Modalidade de Pagamento */}
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
              Modalidade de Pagamento
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, paymentModality: 'cash', installments: 1 }))}
                className={`p-4 rounded-xl border-2 transition-all ${
                  formData.paymentModality === 'cash'
                    ? 'border-primary bg-primary/5'
                    : 'border-border-light dark:border-border-dark hover:border-primary/30'
                }`}
              >
                <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">À Vista</span>
                <p className="text-xs text-text-light-secondary mt-1">Pagamento único</p>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, paymentModality: 'installment', installments: 2 }))}
                className={`p-4 rounded-xl border-2 transition-all ${
                  formData.paymentModality === 'installment'
                    ? 'border-primary bg-primary/5'
                    : 'border-border-light dark:border-border-dark hover:border-primary/30'
                }`}
              >
                <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">Parcelado</span>
                <p className="text-xs text-text-light-secondary mt-1">Dividir em parcelas</p>
              </button>
            </div>
          </div>

          {/* Número de Parcelas */}
          {formData.paymentModality === 'installment' && (
            <div>
              <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                Número de Parcelas
              </label>
              <div className="grid grid-cols-6 gap-2">
                {[2, 3, 4, 5, 6, 12].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, installments: n }))}
                    className={`py-3 rounded-xl font-semibold transition-all ${
                      formData.installments === n
                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                        : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark hover:border-primary/30'
                    }`}
                  >
                    {n}x
                  </button>
                ))}
              </div>
              
              {/* Valor da parcela */}
              <div className="mt-4 p-4 bg-primary/5 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-light-secondary">Valor de cada parcela:</span>
                  <span className="text-lg font-bold text-primary">
                    R$ {installmentValue.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Step 4: Payment Methods
function PaymentStep({
  formData,
  setFormData,
  togglePaymentMethod,
  installmentValue,
}: {
  formData: ProgramFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProgramFormData>>;
  togglePaymentMethod: (method: PaymentMethod) => void;
  installmentValue: number;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
          Formas de Pagamento
        </h3>
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
          Selecione as formas de pagamento aceitas e configure lembretes
        </p>
      </div>

      {/* Métodos de Pagamento */}
      <div>
        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-3">
          Formas de Pagamento Aceitas *
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {paymentMethodsConfig.map(({ id, label, icon: Icon }) => {
            const isSelected = formData.acceptedPaymentMethods.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => togglePaymentMethod(id)}
                className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border-light dark:border-border-dark hover:border-primary/30'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isSelected ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`font-medium ${
                  isSelected ? 'text-primary' : 'text-text-light-primary dark:text-text-dark-primary'
                }`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Frequência de Cobrança (para parcelado) */}
      {formData.paymentModality === 'installment' && (
        <div>
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-3">
            Frequência de Cobrança das Parcelas
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {billingFrequencyConfig.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, billingFrequency: id }))}
                className={`py-3 px-4 rounded-xl font-medium transition-all ${
                  formData.billingFrequency === id
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark hover:border-primary/30'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {formData.billingFrequency === 'custom' && (
            <div className="mt-3 flex items-center gap-3">
              <span className="text-sm text-text-light-secondary">A cada</span>
              <input
                type="number"
                value={formData.customFrequencyDays}
                onChange={(e) => setFormData(prev => ({ ...prev, customFrequencyDays: parseInt(e.target.value) || 30 }))}
                min={1}
                max={365}
                className="w-24 px-3 py-2 bg-background-light dark:bg-background-dark
                  border border-border-light dark:border-border-dark rounded-xl text-center
                  focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <span className="text-sm text-text-light-secondary">dias</span>
            </div>
          )}
        </div>
      )}

      {/* Lembretes de Cobrança */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              Gerar Lembretes de Cobrança
            </label>
            <p className="text-xs text-text-light-secondary mt-0.5">
              Criar lembretes automáticos para cada parcela
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, generateReminders: !prev.generateReminders }))}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              formData.generateReminders ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              formData.generateReminders ? 'translate-x-8' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {formData.generateReminders && (
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
              Lembrar quantos dias antes do vencimento?
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={formData.reminderDaysBefore}
                onChange={(e) => setFormData(prev => ({ ...prev, reminderDaysBefore: parseInt(e.target.value) || 3 }))}
                min={1}
                max={30}
                className="w-24 px-3 py-2 bg-background-light dark:bg-background-dark
                  border border-border-light dark:border-border-dark rounded-xl text-center
                  focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <span className="text-sm text-text-light-secondary">dias antes</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// Step 5: Settings
function SettingsStep({
  formData,
  setFormData,
  newTag,
  setNewTag,
  addTag,
  removeTag,
}: {
  formData: ProgramFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProgramFormData>>;
  newTag: string;
  setNewTag: React.Dispatch<React.SetStateAction<string>>;
  addTag: () => void;
  removeTag: (tag: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
          Configurações Adicionais
        </h3>
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
          Defina visibilidade, tags e outras opções
        </p>
      </div>

      {/* Toggles */}
      <div className="space-y-4">
        {/* Programa Público */}
        <div className="flex items-center justify-between p-4 bg-background-light dark:bg-background-dark rounded-xl">
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              Mentoria Pública
            </label>
            <p className="text-xs text-text-light-secondary mt-0.5">
              Visível na listagem pública de mentorias
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, isPublic: !prev.isPublic }))}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              formData.isPublic ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              formData.isPublic ? 'translate-x-8' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Requer Aprovação */}
        <div className="flex items-center justify-between p-4 bg-background-light dark:bg-background-dark rounded-xl">
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              Requer Aprovação para Inscrição
            </label>
            <p className="text-xs text-text-light-secondary mt-0.5">
              Você precisa aprovar cada solicitação de inscrição
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, requiresApproval: !prev.requiresApproval }))}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              formData.requiresApproval ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              formData.requiresApproval ? 'translate-x-8' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Permitir Inscrição Tardia */}
        <div className="flex items-center justify-between p-4 bg-background-light dark:bg-background-dark rounded-xl">
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              Permitir Inscrição Tardia
            </label>
            <p className="text-xs text-text-light-secondary mt-0.5">
              Aceitar inscrições após a data de início
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, allowLateEnrollment: !prev.allowLateEnrollment }))}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              formData.allowLateEnrollment ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              formData.allowLateEnrollment ? 'translate-x-8' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
          Tags / Categorias
        </label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="Digite uma tag e pressione Enter"
            className="flex-1 px-4 py-2.5 bg-background-light dark:bg-background-dark
              border border-border-light dark:border-border-dark rounded-xl
              text-text-light-primary dark:text-text-dark-primary
              focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="button"
            onClick={addTag}
            className="px-4 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90"
          >
            Adicionar
          </button>
        </div>
        
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary
                  rounded-full text-sm font-medium"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:bg-primary/20 rounded-full p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
        
        <p className="text-xs text-text-light-secondary mt-2">
          Sugestões: Revalida, Residência, Clínica Médica, Cirurgia, Pediatria...
        </p>
      </div>
    </div>
  );
}

// Step 6: Review
function ReviewStep({
  formData,
  coverImagePreview,
  installmentValue,
}: {
  formData: ProgramFormData;
  coverImagePreview: string | null;
  installmentValue: number;
}) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    return paymentMethodsConfig.find(m => m.id === method)?.label || method;
  };

  const getBillingFrequencyLabel = (freq: BillingFrequency) => {
    return billingFrequencyConfig.find(f => f.id === freq)?.label || freq;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
          Revisão Final
        </h3>
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
          Confira todas as informações antes de criar a mentoria
        </p>
      </div>

      {/* Preview Card */}
      <div className="bg-background-light dark:bg-background-dark rounded-2xl overflow-hidden border border-border-light dark:border-border-dark">
        {/* Cover */}
        <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 relative">
          {coverImagePreview ? (
            <img src={coverImagePreview} alt="Capa" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-primary/30" />
            </div>
          )}
          {formData.isFree ? (
            <span className="absolute top-3 right-3 px-3 py-1 bg-emerald-500 text-white text-sm font-semibold rounded-full">
              Gratuito
            </span>
          ) : (
            <span className="absolute top-3 right-3 px-3 py-1 bg-primary text-white text-sm font-semibold rounded-full">
              {formatCurrency(formData.price)}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <h4 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
            {formData.title || 'Título do Programa'}
          </h4>
          {formData.description && (
            <p className="text-sm text-text-light-secondary line-clamp-2 mb-4">
              {formData.description}
            </p>
          )}

          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {formData.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-xs rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-4">
        <ReviewSection title="Período">
          <ReviewItem label="Início" value={formData.startDate ? new Date(formData.startDate).toLocaleDateString('pt-BR') : 'Não definido'} />
          <ReviewItem label="Término" value={formData.endDate ? new Date(formData.endDate).toLocaleDateString('pt-BR') : 'Não definido'} />
          <ReviewItem label="Limite de Participantes" value={formData.maxParticipants?.toString() || 'Ilimitado'} />
        </ReviewSection>

        <ReviewSection title="Pagamento">
          <ReviewItem label="Valor" value={formData.isFree ? 'Gratuito' : formatCurrency(formData.price)} />
          {!formData.isFree && (
            <>
              <ReviewItem label="Modalidade" value={formData.paymentModality === 'cash' ? 'À Vista' : `Parcelado em ${formData.installments}x`} />
              {formData.paymentModality === 'installment' && (
                <ReviewItem label="Valor da Parcela" value={formatCurrency(installmentValue)} />
              )}
              <ReviewItem label="Formas Aceitas" value={formData.acceptedPaymentMethods.map(getPaymentMethodLabel).join(', ')} />
              {formData.paymentModality === 'installment' && (
                <ReviewItem 
                  label="Frequência de Cobrança" 
                  value={formData.billingFrequency === 'custom' 
                    ? `A cada ${formData.customFrequencyDays} dias` 
                    : getBillingFrequencyLabel(formData.billingFrequency)
                  } 
                />
              )}
              <ReviewItem label="Lembretes" value={formData.generateReminders ? `${formData.reminderDaysBefore} dias antes` : 'Desativado'} />
            </>
          )}
        </ReviewSection>

        <ReviewSection title="Configurações">
          <ReviewItem label="Visibilidade" value={formData.isPublic ? 'Público' : 'Privado'} />
          <ReviewItem label="Aprovação de Inscrição" value={formData.requiresApproval ? 'Requerida' : 'Automática'} />
          <ReviewItem label="Inscrição Tardia" value={formData.allowLateEnrollment ? 'Permitida' : 'Não permitida'} />
        </ReviewSection>
      </div>

      {/* Info */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-700 dark:text-amber-300">
          <p className="font-medium mb-1">Próximos passos</p>
          <p>Após criar a mentoria, você poderá enviá-la para aprovação do administrador. 
          Depois de aprovada, você poderá ativá-la e começar a adicionar mentorados.</p>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-background-light dark:bg-background-dark rounded-xl p-4">
      <h4 className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-text-light-secondary">{label}</span>
      <span className="font-medium text-text-light-primary dark:text-text-dark-primary">{value}</span>
    </div>
  );
}

export { CreateProgramModal };
export default CreateProgramModal;
