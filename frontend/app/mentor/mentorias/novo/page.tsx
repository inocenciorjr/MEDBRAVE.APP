'use client';

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useToast } from '@/lib/contexts/ToastContext';
import { mentorProgramService, CreateProgramPayload } from '@/lib/services/mentorProgramService';
import { createClient } from '@/lib/supabase/client';
import { ImageCropModal } from '@/components/flashcards/ImageCropModal';
import {
    Image as ImageIcon, Trash2, Calendar,
    CreditCard, Banknote, QrCode, Building2, Wallet, HelpCircle,
    DollarSign, FileText, Settings, Check, X, Save
} from 'lucide-react';

// Tipos
type PaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'cash' | 'other';
type PaymentModality = 'cash' | 'installment';
type BillingFrequency = 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'custom';

interface ProgramFormData {
    title: string;
    description: string;
    coverImageUrl: string;
    startDate: string;
    endDate: string;
    maxParticipants: number | undefined;
    isFree: boolean;
    // Preços
    priceInCash: number; // Preço à vista
    priceInstallment: number; // Preço parcelado
    suggestedInstallments: number; // Número de parcelas sugerido
    // Pagamento
    acceptedPaymentMethods: PaymentMethod[];
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
    priceInCash: 0,
    priceInstallment: 0,
    suggestedInstallments: 3,
    acceptedPaymentMethods: ['pix'],
    tags: [],
};

const paymentMethodsConfig = [
    { id: 'pix' as PaymentMethod, label: 'PIX', icon: QrCode },
    { id: 'credit_card' as PaymentMethod, label: 'Cartão de Crédito', icon: CreditCard },
    { id: 'debit_card' as PaymentMethod, label: 'Cartão de Débito', icon: CreditCard },
    { id: 'bank_transfer' as PaymentMethod, label: 'Transferência', icon: Building2 },
    { id: 'cash' as PaymentMethod, label: 'Dinheiro', icon: Banknote },
    { id: 'other' as PaymentMethod, label: 'Outro', icon: Wallet },
];



export default function NovaMentoriaPage() {
    const router = useRouter();
    const toast = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<ProgramFormData>(initialFormData);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
    const [newTag, setNewTag] = useState('');
    const [activeSection, setActiveSection] = useState<string>('basic');

    // Crop modal states
    const [showCropModal, setShowCropModal] = useState(false);
    const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);



    // Seleção de imagem - abre o crop modal
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

        // Abrir modal de crop
        const reader = new FileReader();
        reader.onloadend = () => {
            setTempImageUrl(reader.result as string);
            setShowCropModal(true);
        };
        reader.readAsDataURL(file);
    };

    // Após o crop, fazer upload da imagem
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

            const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);

            setCoverImagePreview(publicUrl);
            setFormData(prev => ({ ...prev, coverImageUrl: publicUrl }));
            toast.success('Imagem enviada!');
        } catch (err: any) {
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

    // Toggle método de pagamento
    const togglePaymentMethod = (method: PaymentMethod) => {
        setFormData(prev => {
            const methods = prev.acceptedPaymentMethods.includes(method)
                ? prev.acceptedPaymentMethods.filter(m => m !== method)
                : [...prev.acceptedPaymentMethods, method];
            return { ...prev, acceptedPaymentMethods: methods.length > 0 ? methods : [method] };
        });
    };

    // Tags
    const addTag = () => {
        if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
            setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
            setNewTag('');
        }
    };

    const removeTag = (tag: string) => {
        setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
    };

    // Submit
    const handleSubmit = async () => {
        if (!formData.title.trim()) {
            toast.error('O título é obrigatório');
            setActiveSection('basic');
            return;
        }

        if (!formData.isFree && formData.priceInCash <= 0) {
            toast.error('Defina o preço à vista');
            setActiveSection('pricing');
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
                price: formData.isFree ? 0 : formData.priceInCash,
                priceInCash: formData.isFree ? 0 : formData.priceInCash,
                priceInstallment: formData.isFree ? 0 : formData.priceInstallment,
                suggestedInstallments: formData.suggestedInstallments,
                acceptedPaymentMethods: formData.acceptedPaymentMethods,
                tags: formData.tags,
            };

            await mentorProgramService.createProgram(payload);
            toast.success('Mentoria criada com sucesso!');
            router.push('/mentor/mentorias');
        } catch (err: any) {
            toast.error(err.message || 'Erro ao criar mentoria');
        } finally {
            setIsLoading(false);
        }
    };

    const sections = [
        { id: 'basic', label: 'Informações Básicas', icon: FileText },
        { id: 'period', label: 'Período', icon: Calendar },
        { id: 'pricing', label: 'Preço e Tags', icon: DollarSign },
    ];

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark">
            <div className="w-full px-6 py-6">
                <Breadcrumb
                    items={[
                        { label: 'Mentor', icon: 'school', href: '/mentor' },
                        { label: 'Mentorias', icon: 'folder_special', href: '/mentor/mentorias' },
                        { label: 'Nova Mentoria', icon: 'add' },
                    ]}
                />

                <div className="mt-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                            Criar Nova Mentoria
                        </h1>
                        <p className="text-sm text-text-light-secondary mt-1">
                            Configure todos os detalhes da sua mentoria
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="px-4 py-2 border border-border-light dark:border-border-dark rounded-xl
                font-medium hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="px-6 py-2 bg-primary text-white rounded-xl font-semibold
                hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2
                shadow-lg shadow-primary/30"
                        >
                            {isLoading ? (
                                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Criando...</>
                            ) : (
                                <><Save className="w-5 h-5" />Criar Mentoria</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Steps Indicator */}
                <div className="mt-8 bg-surface-light dark:bg-surface-dark rounded-2xl p-6 border border-border-light dark:border-border-dark">
                    <div className="flex items-center justify-between">
                        {sections.map((section, index) => {
                            const Icon = section.icon;
                            const isActive = activeSection === section.id;
                            const isComplete = sections.findIndex(s => s.id === activeSection) > index;

                            return (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`flex flex-col items-center gap-2 transition-all ${isActive ? 'scale-105' : ''
                                        }`}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isActive
                                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                        : isComplete
                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                        }`}>
                                        {isComplete ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                                    </div>
                                    <span className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-text-light-secondary dark:text-text-dark-secondary'
                                        }`}>
                                        {section.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content */}
                <div className="mt-6 space-y-6">
                        {/* Basic Info Section */}
                        {activeSection === 'basic' && (
                            <BasicInfoSection
                                formData={formData}
                                setFormData={setFormData}
                                coverImagePreview={coverImagePreview}
                                isUploading={isUploading}
                                fileInputRef={fileInputRef}
                                handleImageSelect={handleImageSelect}
                                handleRemoveImage={handleRemoveImage}
                            />
                        )}

                        {/* Period Section */}
                        {activeSection === 'period' && (
                            <PeriodSection formData={formData} setFormData={setFormData} />
                        )}

                        {/* Pricing Section */}
                        {activeSection === 'pricing' && (
                            <PricingSection 
                                formData={formData} 
                                setFormData={setFormData} 
                                togglePaymentMethod={togglePaymentMethod}
                                newTag={newTag}
                                setNewTag={setNewTag}
                                addTag={addTag}
                                removeTag={removeTag}
                            />
                        )}



                        {/* Navigation Buttons */}
                        <div className="flex items-center justify-between pt-6">
                            <button
                                onClick={() => {
                                    const currentIndex = sections.findIndex(s => s.id === activeSection);
                                    if (currentIndex > 0) {
                                        setActiveSection(sections[currentIndex - 1].id);
                                    }
                                }}
                                disabled={sections.findIndex(s => s.id === activeSection) === 0}
                                className="flex items-center gap-2 px-6 py-3 text-text-light-secondary hover:text-text-light-primary
                                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-xl
                                    hover:bg-surface-light dark:hover:bg-surface-dark"
                            >
                                <span className="material-symbols-outlined">chevron_left</span>
                                Anterior
                            </button>

                            <button
                                onClick={() => {
                                    const currentIndex = sections.findIndex(s => s.id === activeSection);
                                    if (currentIndex < sections.length - 1) {
                                        setActiveSection(sections[currentIndex + 1].id);
                                    }
                                }}
                                disabled={sections.findIndex(s => s.id === activeSection) === sections.length - 1}
                                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold
                                    hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed
                                    shadow-lg shadow-primary/30"
                            >
                                Próximo
                                <span className="material-symbols-outlined">chevron_right</span>
                            </button>
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
        </div>
    );
}


// ============================================
// SECTION COMPONENTS
// ============================================

// Basic Info Section
function BasicInfoSection({
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
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 border border-border-light dark:border-border-dark">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
                    Informações Básicas
                </h2>
                <p className="text-sm text-text-light-secondary">
                    Defina o título, descrição e imagem de capa da mentoria
                </p>
            </div>

            <div className="space-y-6">
                {/* Imagem de Capa */}
                <div>
                    <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-3">
                        Imagem de Capa
                    </label>

                    {coverImagePreview ? (
                        <div className="space-y-4">
                            <div className="relative rounded-xl overflow-hidden border border-border-light dark:border-border-dark aspect-square max-w-md mx-auto">
                                <img
                                    src={coverImagePreview}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute top-4 right-4 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2.5 bg-primary text-white rounded-xl
                                            hover:bg-primary/90 transition-colors shadow-lg"
                                        title="Trocar imagem"
                                    >
                                        <ImageIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleRemoveImage}
                                        className="p-2.5 bg-red-500 text-white rounded-xl
                                            hover:bg-red-600 transition-colors shadow-lg"
                                        title="Remover imagem"
                                    >
                                        <Trash2 className="w-5 h-5" />
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
                            className={`aspect-square max-w-md mx-auto border-2 border-dashed rounded-xl flex flex-col items-center justify-center
                cursor-pointer transition-all
                ${isUploading
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border-light dark:border-border-dark hover:border-primary hover:bg-primary/5'
                                }`}
                        >
                            {isUploading ? (
                                <>
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
                                    <span className="text-sm text-text-light-secondary">Enviando imagem...</span>
                                </>
                            ) : (
                                <>
                                    <div className="p-6 bg-primary/10 rounded-2xl mb-4">
                                        <ImageIcon className="w-12 h-12 text-primary" />
                                    </div>
                                    <span className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                                        Clique para adicionar imagem
                                    </span>
                                    <span className="text-sm text-text-light-secondary">
                                        PNG, JPG ou WEBP (máximo 5MB)
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
              text-text-light-primary dark:text-text-dark-primary text-lg
              focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                    <p className="text-xs text-text-light-secondary mt-2">
                        Mínimo de 3 caracteres. Este será o nome principal da sua mentoria.
                    </p>
                </div>

                {/* Descrição */}
                <div>
                    <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                        Descrição Detalhada
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Descreva detalhadamente a mentoria: objetivos, público-alvo, metodologia, recursos inclusos, cronograma e resultados esperados..."
                        rows={8}
                        className="w-full px-4 py-3 bg-background-light dark:bg-background-dark
              border border-border-light dark:border-border-dark rounded-xl
              text-text-light-primary dark:text-text-dark-primary
              focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                    />
                    <p className="text-xs text-text-light-secondary mt-2">
                        Uma descrição completa ajuda os mentorados a entenderem o valor da mentoria.
                    </p>
                </div>
            </div>
        </div>
    );
}


// Period Section
function PeriodSection({
    formData,
    setFormData,
}: {
    formData: ProgramFormData;
    setFormData: React.Dispatch<React.SetStateAction<ProgramFormData>>;
}) {
    return (
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 border border-border-light dark:border-border-dark">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
                    Período da Mentoria
                </h2>
                <p className="text-sm text-text-light-secondary">
                    Defina as datas de início e término e limite de participantes
                </p>
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
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
                        <p className="text-xs text-text-light-secondary mt-1">
                            Quando a mentoria começará (opcional)
                        </p>
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
                        <p className="text-xs text-text-light-secondary mt-1">
                            Quando a mentoria terminará (opcional)
                        </p>
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
                        max={1000}
                        className="w-full px-4 py-3 bg-background-light dark:bg-background-dark
              border border-border-light dark:border-border-dark rounded-xl
              text-text-light-primary dark:text-text-dark-primary
              focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <p className="text-xs text-text-light-secondary mt-2">
                        Deixe em branco para não limitar o número de participantes.
                        Recomendamos definir um limite para manter a qualidade do atendimento.
                    </p>
                </div>

                {/* Info box */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                        <p className="font-medium mb-1">Dica sobre datas</p>
                        <p>As datas são opcionais e podem ser definidas posteriormente.
                            Você pode criar mentorias contínuas sem data de término ou mentorias
                            com duração específica para turmas fechadas.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}


// Pricing Section
function PricingSection({
    formData,
    setFormData,
    togglePaymentMethod,
    newTag,
    setNewTag,
    addTag,
    removeTag,
}: {
    formData: ProgramFormData;
    setFormData: React.Dispatch<React.SetStateAction<ProgramFormData>>;
    togglePaymentMethod: (method: PaymentMethod) => void;
    newTag: string;
    setNewTag: React.Dispatch<React.SetStateAction<string>>;
    addTag: () => void;
    removeTag: (tag: string) => void;
}) {
    return (
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 border border-border-light dark:border-border-dark">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
                    Preço e Pagamento
                </h2>
                <p className="text-sm text-text-light-secondary">
                    Defina o preço sugerido e formas de pagamento aceitas
                </p>
            </div>

            <div className="space-y-6">
                {/* Gratuito ou Pago */}
                <div>
                    <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-3">
                        Tipo de Mentoria
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, isFree: false }))}
                            className={`p-6 rounded-xl border-2 transition-all text-left ${!formData.isFree
                                ? 'border-primary bg-primary/5 shadow-lg shadow-primary/20'
                                : 'border-border-light dark:border-border-dark hover:border-primary/30'
                                }`}
                        >
                            <div className="flex items-center gap-4 mb-3">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${!formData.isFree ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                    }`}>
                                    <DollarSign className="w-6 h-6" />
                                </div>
                                <div>
                                    <span className="font-bold text-lg text-text-light-primary dark:text-text-dark-primary block">
                                        Mentoria Paga
                                    </span>
                                    <span className="text-sm text-text-light-secondary">
                                        Defina um preço sugerido
                                    </span>
                                </div>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, isFree: true, priceInCash: 0, priceInstallment: 0 }))}
                            className={`p-6 rounded-xl border-2 transition-all text-left ${formData.isFree
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-lg shadow-emerald-500/20'
                                : 'border-border-light dark:border-border-dark hover:border-emerald-300'
                                }`}
                        >
                            <div className="flex items-center gap-4 mb-3">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.isFree ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                    }`}>
                                    <Check className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <span className="font-bold text-lg text-text-light-primary dark:text-text-dark-primary block">
                                        Mentoria Gratuita
                                    </span>
                                    <span className="text-sm text-text-light-secondary block mt-1">
                                        Sem custo adicional
                                    </span>
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 block mt-2 font-medium">
                                        ⓘ Disponível apenas para usuários com plano ativo
                                    </span>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Preços */}
                {!formData.isFree && (
                    <>
                        {/* Preço À Vista */}
                        <div>
                            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-3">
                                Preço À Vista (R$) *
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light-secondary text-xl font-semibold">
                                    R$
                                </span>
                                <input
                                    type="number"
                                    value={formData.priceInCash || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, priceInCash: parseFloat(e.target.value) || 0 }))}
                                    placeholder="0,00"
                                    min={0}
                                    step={0.01}
                                    className="w-full pl-16 pr-4 py-4 bg-background-light dark:bg-background-dark
                                        border border-border-light dark:border-border-dark rounded-xl
                                        text-text-light-primary dark:text-text-dark-primary text-2xl font-bold
                                        focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                            </div>
                            <p className="text-xs text-text-light-secondary mt-2">
                                Valor para pagamento único (geralmente com desconto)
                            </p>
                        </div>

                        {/* Oferecer Parcelado? */}
                        <div className="flex items-center justify-between p-4 bg-background-light dark:bg-background-dark rounded-xl">
                            <div>
                                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                                    Oferecer Opção Parcelada?
                                </label>
                                <p className="text-xs text-text-light-secondary mt-1">
                                    Permite que mentorados paguem em parcelas
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ 
                                    ...prev, 
                                    priceInstallment: prev.priceInstallment > 0 ? 0 : (prev.priceInCash || 0)
                                }))}
                                className={`relative w-14 h-7 rounded-full transition-colors ${
                                    formData.priceInstallment > 0 ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                            >
                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                    formData.priceInstallment > 0 ? 'translate-x-8' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>

                        {/* Preço Parcelado */}
                        {formData.priceInstallment > 0 && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-3">
                                        Preço Total Parcelado (R$) *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light-secondary text-xl font-semibold">
                                            R$
                                        </span>
                                        <input
                                            type="number"
                                            value={formData.priceInstallment || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, priceInstallment: parseFloat(e.target.value) || 0 }))}
                                            placeholder="0,00"
                                            min={0}
                                            step={0.01}
                                            className="w-full pl-16 pr-4 py-4 bg-background-light dark:bg-background-dark
                                                border border-border-light dark:border-border-dark rounded-xl
                                                text-text-light-primary dark:text-text-dark-primary text-2xl font-bold
                                                focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        />
                                    </div>
                                    <p className="text-xs text-text-light-secondary mt-2">
                                        Valor total quando parcelado (pode ser maior que à vista)
                                    </p>
                                </div>

                                {/* Número de Parcelas Sugerido */}
                                <div>
                                    <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-3">
                                        Número de Parcelas Sugerido
                                    </label>
                                    <div className="grid grid-cols-6 gap-3">
                                        {[2, 3, 4, 5, 6, 12].map((n) => (
                                            <button
                                                key={n}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, suggestedInstallments: n }))}
                                                className={`py-4 rounded-xl font-bold text-lg transition-all ${
                                                    formData.suggestedInstallments === n
                                                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                                        : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark hover:border-primary/30'
                                                }`}
                                            >
                                                {n}x
                                            </button>
                                        ))}
                                    </div>

                                    {/* Resumo */}
                                    {formData.priceInstallment > 0 && (
                                        <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-text-light-secondary">Valor total:</span>
                                                <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                                                    R$ {formData.priceInstallment.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-text-light-secondary">
                                                    {formData.suggestedInstallments} parcelas de:
                                                </span>
                                                <span className="text-xl font-bold text-primary">
                                                    R$ {(formData.priceInstallment / formData.suggestedInstallments).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Comparação */}
                                {formData.priceInCash > 0 && formData.priceInstallment > 0 && formData.priceInCash < formData.priceInstallment && (
                                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                                        <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                                            💰 Economia pagando à vista
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-green-600 dark:text-green-400">Desconto:</span>
                                            <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                                R$ {(formData.priceInstallment - formData.priceInCash).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}

                {/* Formas de Pagamento Aceitas */}
                {!formData.isFree && (
                    <div>
                        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-3">
                            Formas de Pagamento Aceitas *
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {paymentMethodsConfig.map(({ id, label, icon: Icon }) => {
                                const isSelected = formData.acceptedPaymentMethods.includes(id);
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => togglePaymentMethod(id)}
                                        className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${isSelected
                                            ? 'border-primary bg-primary/5 shadow-lg shadow-primary/20'
                                            : 'border-border-light dark:border-border-dark hover:border-primary/30'
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                            }`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <span className={`font-medium ${isSelected ? 'text-primary' : 'text-text-light-primary dark:text-text-dark-primary'
                                            }`}>
                                            {label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-xs text-text-light-secondary mt-2">
                            Selecione todas as formas de pagamento que você aceita
                        </p>
                    </div>
                )}

                {/* Info sobre preços */}
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-700 dark:text-amber-300">
                        <p className="font-medium mb-1">Dica sobre preços</p>
                        <p>Considere o valor do mercado, a duração da mentoria e os recursos inclusos.
                            Opções parceladas podem aumentar a acessibilidade para mais mentorados.</p>
                    </div>
                </div>

                {/* Tags Section */}
                <TagsSection
                    formData={formData}
                    setFormData={setFormData}
                    newTag={newTag}
                    setNewTag={setNewTag}
                    addTag={addTag}
                    removeTag={removeTag}
                />
            </div>
        </div>
    );
}

// Tags Section Component (used inside PricingSection)
function TagsSection({
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
        <div className="mt-6 pt-6 border-t border-border-light dark:border-border-dark">
            <div className="mb-4">
                <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
                    Tags e Categorias
                </h3>
                <p className="text-sm text-text-light-secondary">
                    Adicione tags para facilitar a busca e categorização da mentoria
                </p>
            </div>

            <div className="space-y-4">
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        placeholder="Digite uma tag e pressione Enter"
                        className="flex-1 px-4 py-3 bg-background-light dark:bg-background-dark
                            border border-border-light dark:border-border-dark rounded-xl
                            text-text-light-primary dark:text-text-dark-primary
                            focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                        type="button"
                        onClick={addTag}
                        className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
                    >
                        Adicionar
                    </button>
                </div>

                {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary
                                    rounded-full text-sm font-medium border border-primary/20"
                            >
                                {tag}
                                <button
                                    type="button"
                                    onClick={() => removeTag(tag)}
                                    className="hover:bg-primary/20 rounded-full p-1 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                <div className="bg-background-light dark:bg-background-dark rounded-xl p-4">
                    <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                        Sugestões de tags populares:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {[
                            'Revalida', 'Residência Médica', 'Clínica Médica', 'Cirurgia', 'Pediatria',
                            'Ginecologia', 'Cardiologia', 'Neurologia', 'Intensivo', 'Preparatório'
                        ].map((suggestion) => (
                            <button
                                key={suggestion}
                                type="button"
                                onClick={() => {
                                    if (!formData.tags.includes(suggestion)) {
                                        setFormData(prev => ({ ...prev, tags: [...prev.tags, suggestion] }));
                                    }
                                }}
                                disabled={formData.tags.includes(suggestion)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                    formData.tags.includes(suggestion)
                                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                        : 'bg-gray-100 dark:bg-gray-800 text-text-light-secondary hover:bg-primary/10 hover:text-primary'
                                }`}
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}


