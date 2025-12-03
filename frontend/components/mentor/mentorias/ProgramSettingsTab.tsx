'use client';

import { useState, useRef } from 'react';
import { MentorProgram, mentorProgramService } from '@/lib/services/mentorProgramService';
import { useToast } from '@/lib/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';
import { ImageCropModal } from '@/components/flashcards/ImageCropModal';
import {
  Calendar, Users, DollarSign, Image as ImageIcon, Trash2,
  CreditCard, Banknote, QrCode, Building2, Wallet, HelpCircle, Check, X
} from 'lucide-react';

type PaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'cash' | 'other';

const paymentMethodsConfig = [
  { id: 'pix' as PaymentMethod, label: 'PIX', icon: QrCode },
  { id: 'credit_card' as PaymentMethod, label: 'Cartão de Crédito', icon: CreditCard },
  { id: 'debit_card' as PaymentMethod, label: 'Cartão de Débito', icon: CreditCard },
  { id: 'bank_transfer' as PaymentMethod, label: 'Transferência', icon: Building2 },
  { id: 'cash' as PaymentMethod, label: 'Dinheiro', icon: Banknote },
  { id: 'other' as PaymentMethod, label: 'Outro', icon: Wallet },
];

interface ProgramSettingsTabProps {
  program: MentorProgram;
  onUpdate: () => void;
}

export function ProgramSettingsTab({ program, onUpdate }: ProgramSettingsTabProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  
  const [formData, setFormData] = useState({
    title: program.title,
    description: program.description || '',
    coverImageUrl: program.coverImageUrl || '',
    startDate: program.startDate?.split('T')[0] || '',
    endDate: program.endDate?.split('T')[0] || '',
    maxParticipants: program.maxParticipants || undefined,
    isFree: program.isFree,
    priceInCash: program.priceInCash || program.price || 0,
    priceInstallment: program.priceInstallment || 0,
    suggestedInstallments: program.suggestedInstallments || 3,
    acceptedPaymentMethods: (program.acceptedPaymentMethods || ['pix']) as PaymentMethod[],
    tags: program.tags || [],
  });

  const canEdit = ['draft', 'approved'].includes(program.status);

  // Image handling
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

    const reader = new FileReader();
    reader.onloadend = () => {
      setTempImageUrl(reader.result as string);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

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

      setFormData(prev => ({ ...prev, coverImageUrl: publicUrl }));
      toast.success('Imagem enviada!');
    } catch (err: any) {
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, coverImageUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Payment methods
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

  // Save
  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('O título é obrigatório');
      return;
    }

    if (!formData.isFree && formData.priceInCash <= 0) {
      toast.error('Defina o preço à vista');
      return;
    }

    setIsSubmitting(true);
    try {
      await mentorProgramService.updateProgram(program.id, {
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
      });
      toast.success('Programa atualizado com sucesso');
      setIsEditing(false);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar programa');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
          Configurações do Programa
        </h2>
        {canEdit && !isEditing && (
          <button onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">edit</span>
            Editar
          </button>
        )}
      </div>

      {!canEdit && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">info</span>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Programas com status "{program.status}" não podem ser editados.
            {program.status === 'pending_approval' && ' Aguarde a aprovação do admin.'}
            {program.status === 'active' && ' Encerre o programa para fazer alterações.'}
          </p>
        </div>
      )}

      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Imagem de Capa */}
          <div>
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Imagem de Capa
            </h3>
            
            {isEditing ? (
              <div>
                {formData.coverImageUrl ? (
                  <div className="space-y-4">
                    <div className="relative rounded-xl overflow-hidden border border-border-light dark:border-border-dark aspect-square max-w-md mx-auto">
                      <img src={formData.coverImageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute top-4 right-4 flex gap-2">
                        <button type="button" onClick={() => fileInputRef.current?.click()}
                          className="p-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors shadow-lg">
                          <ImageIcon className="w-5 h-5" />
                        </button>
                        <button type="button" onClick={handleRemoveImage}
                          className="p-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors shadow-lg">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div onClick={() => fileInputRef.current?.click()}
                    className={`aspect-square max-w-md mx-auto border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                      isUploading ? 'border-primary bg-primary/5' : 'border-border-light dark:border-border-dark hover:border-primary hover:bg-primary/5'
                    }`}>
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
                        <span className="text-sm text-text-light-secondary">PNG, JPG ou WEBP (máximo 5MB)</span>
                      </>
                    )}
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              </div>
            ) : (
              formData.coverImageUrl ? (
                <div className="rounded-xl overflow-hidden border border-border-light dark:border-border-dark aspect-square max-w-md mx-auto">
                  <img src={formData.coverImageUrl} alt={program.title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <p className="text-text-light-secondary dark:text-text-dark-secondary text-center py-8">Sem imagem de capa</p>
              )
            )}
          </div>

          {/* Informações Básicas */}
          <div className="border-t border-border-light dark:border-border-dark pt-6">
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">info</span>
              Informações Básicas
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  Título da Mentoria *
                </label>
                {isEditing ? (
                  <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
                ) : (
                  <p className="text-text-light-secondary dark:text-text-dark-secondary">{program.title}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  Descrição
                </label>
                {isEditing ? (
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={6}
                    placeholder="Descreva detalhadamente a mentoria..."
                    className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                ) : (
                  <p className="text-text-light-secondary dark:text-text-dark-secondary">{program.description || 'Sem descrição'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Período */}
          <div className="border-t border-border-light dark:border-border-dark pt-6">
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Período
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  Data de Início
                </label>
                {isEditing ? (
                  <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
                ) : (
                  <p className="text-text-light-secondary dark:text-text-dark-secondary">
                    {program.startDate ? new Date(program.startDate).toLocaleDateString('pt-BR') : 'Não definida'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  Data de Término
                </label>
                {isEditing ? (
                  <input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    min={formData.startDate}
                    className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
                ) : (
                  <p className="text-text-light-secondary dark:text-text-dark-secondary">
                    {program.endDate ? new Date(program.endDate).toLocaleDateString('pt-BR') : 'Não definida'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Participantes */}
          <div className="border-t border-border-light dark:border-border-dark pt-6">
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Participantes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  Máximo de Participantes
                </label>
                {isEditing ? (
                  <input type="number" min="1" value={formData.maxParticipants || ''} 
                    onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Ilimitado"
                    className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
                ) : (
                  <p className="text-text-light-secondary dark:text-text-dark-secondary">
                    {program.maxParticipants || 'Ilimitado'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  Participantes Atuais
                </label>
                <p className="text-text-light-secondary dark:text-text-dark-secondary">{program.activeParticipantsCount}</p>
              </div>
            </div>
          </div>

          {/* Preço */}
          <div className="border-t border-border-light dark:border-border-dark pt-6">
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Preço e Pagamento
            </h3>
            
            {isEditing ? (
              <div className="space-y-6">
                {/* Tipo */}
                <div className="grid grid-cols-2 gap-4">
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, isFree: false }))}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      !formData.isFree ? 'border-primary bg-primary/5' : 'border-border-light dark:border-border-dark'
                    }`}>
                    <DollarSign className="w-8 h-8 mx-auto mb-2" />
                    <span className="font-semibold block">Paga</span>
                  </button>
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, isFree: true, priceInCash: 0, priceInstallment: 0 }))}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.isFree ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-border-light dark:border-border-dark'
                    }`}>
                    <Check className="w-8 h-8 mx-auto mb-2" />
                    <span className="font-semibold block">Gratuita</span>
                  </button>
                </div>

                {!formData.isFree && (
                  <>
                    {/* Preço à vista */}
                    <div>
                      <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                        Preço À Vista (R$) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light-secondary text-xl font-semibold">R$</span>
                        <input type="number" value={formData.priceInCash || ''} 
                          onChange={(e) => setFormData(prev => ({ ...prev, priceInCash: parseFloat(e.target.value) || 0 }))}
                          placeholder="0,00" min={0} step={0.01}
                          className="w-full pl-16 pr-4 py-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                    </div>

                    {/* Toggle parcelado */}
                    <div className="flex items-center justify-between p-4 bg-background-light dark:bg-background-dark rounded-xl">
                      <div>
                        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                          Oferecer Opção Parcelada?
                        </label>
                      </div>
                      <button type="button"
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          priceInstallment: prev.priceInstallment > 0 ? 0 : (prev.priceInCash || 0)
                        }))}
                        className={`relative w-14 h-7 rounded-full transition-colors ${
                          formData.priceInstallment > 0 ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                        }`}>
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          formData.priceInstallment > 0 ? 'translate-x-8' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    {formData.priceInstallment > 0 && (
                      <>
                        {/* Preço parcelado */}
                        <div>
                          <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                            Preço Total Parcelado (R$) *
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light-secondary text-xl font-semibold">R$</span>
                            <input type="number" value={formData.priceInstallment || ''} 
                              onChange={(e) => setFormData(prev => ({ ...prev, priceInstallment: parseFloat(e.target.value) || 0 }))}
                              placeholder="0,00" min={0} step={0.01}
                              className="w-full pl-16 pr-4 py-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-primary/30" />
                          </div>
                        </div>

                        {/* Parcelas */}
                        <div>
                          <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-3">
                            Número de Parcelas Sugerido
                          </label>
                          <div className="grid grid-cols-6 gap-3">
                            {[2, 3, 4, 5, 6, 12].map((n) => (
                              <button key={n} type="button"
                                onClick={() => setFormData(prev => ({ ...prev, suggestedInstallments: n }))}
                                className={`py-3 rounded-xl font-bold transition-all ${
                                  formData.suggestedInstallments === n
                                    ? 'bg-primary text-white shadow-lg'
                                    : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark'
                                }`}>
                                {n}x
                              </button>
                            ))}
                          </div>

                          {formData.priceInstallment > 0 && (
                            <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
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
                      </>
                    )}

                    {/* Formas de pagamento */}
                    <div>
                      <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-3">
                        Formas de Pagamento Aceitas *
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {paymentMethodsConfig.map(({ id, label, icon: Icon }) => {
                          const isSelected = formData.acceptedPaymentMethods.includes(id);
                          return (
                            <button key={id} type="button" onClick={() => togglePaymentMethod(id)}
                              className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                                isSelected ? 'border-primary bg-primary/5' : 'border-border-light dark:border-border-dark'
                              }`}>
                              <Icon className="w-5 h-5" />
                              <span className="text-sm font-medium">{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
                    Tipo
                  </label>
                  <p className="text-text-light-secondary dark:text-text-dark-secondary">
                    {program.isFree ? '✓ Gratuita' : 'Paga'}
                  </p>
                </div>
                {!program.isFree && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
                        Preço À Vista
                      </label>
                      <p className="text-text-light-secondary dark:text-text-dark-secondary">
                        R$ {(program.priceInCash || program.price || 0).toFixed(2)}
                      </p>
                    </div>
                    {program.priceInstallment && program.priceInstallment > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
                          Preço Parcelado
                        </label>
                        <p className="text-text-light-secondary dark:text-text-dark-secondary">
                          {program.suggestedInstallments}x de R$ {(program.priceInstallment / (program.suggestedInstallments || 1)).toFixed(2)}
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
                        Formas de Pagamento
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {(program.acceptedPaymentMethods || ['pix']).map((method) => {
                          const config = paymentMethodsConfig.find(m => m.id === method);
                          return config ? (
                            <span key={method} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                              {config.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="border-t border-border-light dark:border-border-dark pt-6">
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">label</span>
              Tags e Categorias
            </h3>
            
            {isEditing ? (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <input type="text" value={newTag} onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Digite uma tag e pressione Enter"
                    className="flex-1 px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <button type="button" onClick={addTag}
                    className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90">
                    Adicionar
                  </button>
                </div>

                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium border border-primary/20">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)}
                          className="hover:bg-primary/20 rounded-full p-1 transition-colors">
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
                    {['Revalida', 'Residência Médica', 'Clínica Médica', 'Cirurgia', 'Pediatria', 'Ginecologia', 'Cardiologia', 'Neurologia', 'Intensivo', 'Preparatório'].map((suggestion) => (
                      <button key={suggestion} type="button"
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
                        }`}>
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {formData.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-light-secondary dark:text-text-dark-secondary">Nenhuma tag adicionada</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {isEditing && (
          <div className="p-6 border-t border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark flex justify-end gap-3">
            <button onClick={() => setIsEditing(false)} disabled={isSubmitting}
              className="px-4 py-2 border border-border-light dark:border-border-dark rounded-xl font-medium text-text-light-primary dark:text-text-dark-primary hover:bg-surface-light dark:hover:bg-surface-dark">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={isSubmitting}
              className="px-4 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </button>
          </div>
        )}
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
