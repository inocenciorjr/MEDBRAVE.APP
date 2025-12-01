'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/lib/contexts/ToastContext';
import { useUser } from '@/contexts/UserContext';
import Image from 'next/image';
import { ChangePasswordModal } from '@/components/profile/ChangePasswordModal';
import { CountryPhoneInput } from '@/components/auth/CountryPhoneInput';

const supabase = createClient();

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  phone?: string;
  country_code?: string;
  photo_url?: string;
  created_at: string;
}

export default function PerfilPage() {
  const { user: contextUser, loading: contextLoading } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const toast = useToast();

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('BR');

  // Calcular dias restantes do plano
  const daysRemaining = useMemo(() => {
    if (!contextUser?.activePlan?.endDate) return null;
    
    const end = new Date(contextUser.activePlan.endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }, [contextUser?.activePlan?.endDate]);

  useEffect(() => {
    if (!contextLoading && contextUser) {
      loadUserData();
    }
  }, [contextLoading, contextUser]);

  const loadUserData = async () => {
    try {
      // Get current user from Supabase Auth
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Erro ao obter usuário:', userError);
        return;
      }

      // Verificar se é usuário do Google
      const isGoogle = user.app_metadata.provider === 'google';
      setIsGoogleUser(isGoogle);

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Erro ao carregar perfil:', profileError);
      } else {
        setProfile(profileData);
        setDisplayName(profileData.display_name || '');
        setPhone(profileData.phone || '');
        setCountryCode(profileData.country_code || 'BR');
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !contextUser) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Erro', 'A imagem deve ter no máximo 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Erro', 'Por favor, selecione uma imagem válida');
      return;
    }

    setUploadingAvatar(true);

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${contextUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath);

      // Update user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({ photo_url: publicUrl })
        .eq('id', contextUser.id);

      if (updateError) {
        throw updateError;
      }

      setProfile(prev => prev ? { ...prev, photo_url: publicUrl } : null);
      toast.success('Sucesso', 'Foto de perfil atualizada!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro', 'Falha ao atualizar foto de perfil');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!contextUser || !profile) return;

    const newErrors: Record<string, string> = {};

    if (!displayName.trim()) {
      newErrors.displayName = 'Nome é obrigatório';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      const { error } = await supabase
        .from('users')
        .update({
          display_name: displayName,
          phone: phone || null,
          country_code: countryCode,
        })
        .eq('id', contextUser.id);

      if (error) {
        throw error;
      }

      setProfile(prev => prev ? {
        ...prev,
        display_name: displayName,
        phone: phone || undefined,
        country_code: countryCode,
      } : null);

      toast.success('Sucesso', 'Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast.error('Erro', 'Falha ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getPlanStatusColor = () => {
    if (!daysRemaining) return 'text-text-light-secondary dark:text-text-dark-secondary';
    if (daysRemaining <= 3) return 'text-red-600 dark:text-red-400';
    if (daysRemaining <= 7) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  if (loading) {
    return null; // Loading skeleton will be shown
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark p-6 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <h1 className="text-3xl font-bold text-text-light-primary dark:text-text-dark-primary">
            Meu Perfil
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-2 bg-white dark:bg-surface-dark rounded-lg shadow-lg p-6 transition-all duration-300 hover:shadow-xl animate-slide-in-from-left">
            <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary mb-6">
              Informações Pessoais
            </h2>

            <div className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center space-x-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center ring-4 ring-gray-100 dark:ring-gray-800 transition-all duration-300 group-hover:ring-primary/30">
                    {profile?.photo_url || contextUser?.photoURL ? (
                      <Image
                        src={profile?.photo_url || contextUser?.photoURL || ''}
                        alt="Avatar"
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-4xl text-gray-400">
                        person
                      </span>
                    )}
                  </div>
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="cursor-pointer bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-all duration-200 inline-flex items-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95">
                    <span className="material-symbols-outlined text-sm">
                      upload
                    </span>
                    Alterar Foto
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={uploadingAvatar}
                    />
                  </label>
                  <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
                    JPG, PNG ou GIF. Máximo 5MB.
                  </p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome */}
                <div className="group">
                  <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2 group-focus-within:text-primary transition-colors">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border ${
                      errors.displayName ? 'border-red-500' : 'border-border-light dark:border-border-dark'
                    } rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-text-light-primary dark:text-text-dark-primary transition-all outline-none shadow-inner dark:shadow-none focus:shadow-lg`}
                    placeholder="Seu nome completo"
                  />
                  {errors.displayName && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 animate-fade-in">{errors.displayName}</p>
                  )}
                </div>

                {/* E-mail (readonly) */}
                <div>
                  <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={profile?.email || ''}
                    readOnly
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-border-light dark:border-border-dark rounded-lg text-text-light-secondary dark:text-text-dark-secondary cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                    Para alterar o e-mail, entre em contato com o suporte
                  </p>
                </div>
              </div>

              {/* Telefone */}
              <CountryPhoneInput
                value={phone}
                onChange={(phone, country) => {
                  setPhone(phone);
                  setCountryCode(country);
                }}
                error={errors.phone}
              />

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">
                        save
                      </span>
                      Salvar Alterações
                    </>
                  )}
                </button>

                {!isGoogleUser && (
                  <button
                    onClick={() => setShowChangePassword(true)}
                    className="border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary hover:bg-gray-50 dark:hover:bg-gray-800 px-6 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm">
                      lock
                    </span>
                    Alterar Senha
                  </button>
                )}
                
                {isGoogleUser && (
                  <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary italic">
                    Você fez login com Google. A senha é gerenciada pelo Google.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Plan Card */}
          <div className="bg-white dark:bg-surface-dark rounded-lg shadow-lg p-6 transition-all duration-300 hover:shadow-xl animate-slide-in-from-right">
            <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary mb-6">
              Meu Plano
            </h2>

            {contextUser?.activePlan && contextUser.activePlan.status.toUpperCase() === 'ACTIVE' ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 transition-transform duration-300 hover:scale-110">
                    <span className="material-symbols-outlined text-2xl text-primary">
                      {contextUser.activePlan.isTrial ? 'schedule' : 'workspace_premium'}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
                    {contextUser.activePlan.planName}
                    {contextUser.activePlan.isTrial && (
                      <span className="ml-2 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-full">
                        Trial
                      </span>
                    )}
                  </h3>
                  <p className={`text-sm font-medium ${getPlanStatusColor()}`}>
                    Ativo
                  </p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-light-secondary dark:text-text-dark-secondary">
                      Início:
                    </span>
                    <span className="text-text-light-primary dark:text-text-dark-primary">
                      {formatDate(contextUser.activePlan.startDate)}
                    </span>
                  </div>
                  {contextUser.activePlan.endDate && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-text-light-secondary dark:text-text-dark-secondary">
                          Vencimento:
                        </span>
                        <span className={`font-medium ${getPlanStatusColor()}`}>
                          {formatDate(contextUser.activePlan.endDate)}
                        </span>
                      </div>
                      {daysRemaining !== null && (
                        <div className="flex justify-between">
                          <span className="text-text-light-secondary dark:text-text-dark-secondary">
                            Dias restantes:
                          </span>
                          <span className={`font-bold ${getPlanStatusColor()}`}>
                            {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  {!contextUser.activePlan.endDate && (
                    <div className="flex justify-between">
                      <span className="text-text-light-secondary dark:text-text-dark-secondary">
                        Validade:
                      </span>
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        Vitalício
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border-light dark:border-border-dark">
                  <button className="w-full bg-primary hover:bg-primary/90 text-white py-2 px-4 rounded-lg transition-all duration-200 text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95">
                    Gerenciar Plano
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-2xl text-gray-400">
                    error
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                    Nenhum Plano Ativo
                  </h3>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-4">
                    Você não possui um plano ativo no momento.
                  </p>
                  <button className="w-full bg-primary hover:bg-primary/90 text-white py-2 px-4 rounded-lg transition-all duration-200 text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95">
                    Escolher Plano
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-white dark:bg-surface-dark rounded-lg shadow-lg p-6 transition-all duration-300 hover:shadow-xl animate-fade-in">
          <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
            Informações da Conta
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-light-secondary dark:text-text-dark-secondary">
                Membro desde:
              </span>
              <span className="ml-2 text-text-light-primary dark:text-text-dark-primary">
                {profile?.created_at ? formatDate(profile.created_at) : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-text-light-secondary dark:text-text-dark-secondary">
                ID do usuário:
              </span>
              <span className="ml-2 text-text-light-primary dark:text-text-dark-primary font-mono text-xs">
                {profile?.id}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal
          isOpen={showChangePassword}
          onClose={() => setShowChangePassword(false)}
        />
      )}
    </div>
  );
}
