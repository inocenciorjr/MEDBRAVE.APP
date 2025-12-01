'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useToast } from '@/lib/contexts/ToastContext';

interface MentorProfile {
  name: string;
  bio: string;
  specialties: string[];
  avatar?: string;
  socialLinks: {
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };
}

const availableSpecialties = [
  'Cardiologia', 'Pneumologia', 'Neurologia', 'Gastroenterologia',
  'Nefrologia', 'Endocrinologia', 'Reumatologia', 'Infectologia',
  'Cirurgia Geral', 'Pediatria', 'Ginecologia', 'Psiquiatria',
];

export default function ConfiguracoesPage() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<MentorProfile>({
    name: '',
    bio: '',
    specialties: [],
    socialLinks: {},
  });
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single();

        const { data: mentorData } = await supabase
          .from('mentor_profiles')
          .select('*')
          .eq('userId', user.id)
          .single();

        setProfile({
          name: profileData?.full_name || '',
          bio: mentorData?.bio || '',
          specialties: mentorData?.specialties || [],
          avatar: profileData?.avatar_url,
          socialLinks: mentorData?.socialLinks || {},
        });
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setAvatarFile(file);
    setPreviewAvatar(URL.createObjectURL(file));
  };

  const toggleSpecialty = (specialty: string) => {
    setProfile(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty],
    }));
  };

  const handleSave = async () => {
    if (!profile.name.trim()) {
      toast.error('Digite seu nome');
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let avatarUrl = profile.avatar;

      // Upload do avatar se houver novo arquivo
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          avatarUrl = publicUrl;
        }
      }

      // Atualizar profile
      await supabase
        .from('profiles')
        .update({
          full_name: profile.name,
          avatar_url: avatarUrl,
        })
        .eq('id', user.id);

      // Atualizar mentor_profiles
      await supabase
        .from('mentor_profiles')
        .upsert({
          userId: user.id,
          bio: profile.bio,
          specialties: profile.specialties,
          socialLinks: profile.socialLinks,
        });

      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast.error('Erro ao salvar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: 'Mentor', icon: 'school', href: '/mentor' },
            { label: 'Configurações', icon: 'settings', href: '/mentor/configuracoes' },
          ]}
        />
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 border border-border-light dark:border-border-dark">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
              <div className="space-y-2">
                <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Mentor', icon: 'school', href: '/mentor' },
          { label: 'Configurações', icon: 'settings', href: '/mentor/configuracoes' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-text-light-primary dark:text-text-dark-primary">
            Configurações
          </h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Configure seu perfil de mentor
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 bg-primary text-white rounded-xl font-semibold
            hover:bg-primary/90 transition-all duration-200
            shadow-lg hover:shadow-xl shadow-primary/30
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">save</span>
              Salvar Alterações
            </>
          )}
        </button>
      </div>

      {/* Info card */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20
        rounded-2xl p-5 border border-primary/20">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 dark:bg-primary/20 rounded-xl">
            <span className="material-symbols-outlined text-primary text-2xl">
              info
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-primary mb-1">
              Sobre seu perfil de mentor
            </h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Seu perfil será exibido na página inicial para potenciais mentorados.
              O administrador da plataforma pode ativar ou desativar sua visibilidade.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações básicas */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6
          border border-border-light dark:border-border-dark">
          <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-6">
            Informações Básicas
          </h2>

          <div className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-primary/10
                  ring-4 ring-primary/20">
                  {previewAvatar || profile.avatar ? (
                    <Image
                      src={previewAvatar || profile.avatar!}
                      alt="Avatar"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-4xl">person</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 p-2 bg-primary text-white rounded-full
                    shadow-lg hover:bg-primary/90 transition-all duration-200"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <div>
                <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                  Foto de Perfil
                </p>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  JPG, PNG ou GIF. Máximo 5MB.
                </p>
              </div>
            </div>

            {/* Nome */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                Nome Completo *
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
                placeholder="Seu nome"
                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark
                  border border-border-light dark:border-border-dark rounded-xl
                  text-text-light-primary dark:text-text-dark-primary
                  placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                Biografia
              </label>
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                placeholder="Conte um pouco sobre você e sua experiência..."
                rows={4}
                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark
                  border border-border-light dark:border-border-dark rounded-xl
                  text-text-light-primary dark:text-text-dark-primary
                  placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                  resize-none"
              />
            </div>
          </div>
        </div>

        {/* Especialidades e Redes */}
        <div className="space-y-6">
          {/* Especialidades */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6
            border border-border-light dark:border-border-dark">
            <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
              Especialidades
            </h2>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-4">
              Selecione as áreas em que você pode mentorar
            </p>
            <div className="flex flex-wrap gap-2">
              {availableSpecialties.map((specialty) => (
                <button
                  key={specialty}
                  onClick={() => toggleSpecialty(specialty)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                    ${profile.specialties.includes(specialty)
                      ? 'bg-primary text-white shadow-lg shadow-primary/30'
                      : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary hover:border-primary/30'
                    }`}
                >
                  {specialty}
                </button>
              ))}
            </div>
          </div>

          {/* Redes Sociais */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6
            border border-border-light dark:border-border-dark">
            <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
              Redes Sociais
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-pink-500">photo_camera</span>
                  Instagram
                </label>
                <input
                  type="text"
                  value={profile.socialLinks.instagram || ''}
                  onChange={(e) => setProfile(p => ({ ...p, socialLinks: { ...p.socialLinks, instagram: e.target.value } }))}
                  placeholder="@seuusuario"
                  className="w-full px-4 py-3 bg-background-light dark:bg-background-dark
                    border border-border-light dark:border-border-dark rounded-xl
                    text-text-light-primary dark:text-text-dark-primary
                    placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary
                    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">work</span>
                  LinkedIn
                </label>
                <input
                  type="text"
                  value={profile.socialLinks.linkedin || ''}
                  onChange={(e) => setProfile(p => ({ ...p, socialLinks: { ...p.socialLinks, linkedin: e.target.value } }))}
                  placeholder="linkedin.com/in/seuusuario"
                  className="w-full px-4 py-3 bg-background-light dark:bg-background-dark
                    border border-border-light dark:border-border-dark rounded-xl
                    text-text-light-primary dark:text-text-dark-primary
                    placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary
                    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-500">play_circle</span>
                  YouTube
                </label>
                <input
                  type="text"
                  value={profile.socialLinks.youtube || ''}
                  onChange={(e) => setProfile(p => ({ ...p, socialLinks: { ...p.socialLinks, youtube: e.target.value } }))}
                  placeholder="youtube.com/@seucanal"
                  className="w-full px-4 py-3 bg-background-light dark:bg-background-dark
                    border border-border-light dark:border-border-dark rounded-xl
                    text-text-light-primary dark:text-text-dark-primary
                    placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary
                    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
