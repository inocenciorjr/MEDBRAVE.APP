'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useToast } from '@/lib/contexts/ToastContext';
import { CountryPhoneInput } from '@/components/auth/CountryPhoneInput';
import { PasswordStrengthInput } from '@/components/auth/PasswordStrengthInput';

const supabase = createClient();

const CAROUSEL_IMAGES = [
  '/login/login-1.png',
  '/login/login-2.png',
  '/login/login-3.png',
];

export default function RegistroPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const toast = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('BR');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-transition for carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [currentSlide]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Nome completo é obrigatório';
    }

    if (!email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'E-mail inválido';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Telefone é obrigatório';
    }

    if (!password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (password.length < 8) {
      newErrors.password = 'Senha deve ter no mínimo 8 caracteres';
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = 'Senha deve conter pelo menos uma letra maiúscula';
    } else if (!/[a-z]/.test(password)) {
      newErrors.password = 'Senha deve conter pelo menos uma letra minúscula';
    } else if (!/\d/.test(password)) {
      newErrors.password = 'Senha deve conter pelo menos um número';
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      newErrors.password = 'Senha deve conter pelo menos um caractere especial';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Registrar usuário no Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            display_name: fullName,
            phone: phone,
            country_code: countryCode,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setErrors({ email: 'Este e-mail já está cadastrado' });
        } else {
          setErrors({ general: signUpError.message });
        }
        return;
      }

      if (authData.user) {
        // Criar registro na tabela users
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: email,
            display_name: fullName,
            phone: phone,
            country_code: countryCode,
            role: 'user',
            created_at: new Date().toISOString(),
          });

        if (userError) {
          console.error('Erro ao criar usuário:', userError);
        }

        toast.success(
          'Conta criada com sucesso!',
          'Enviamos um e-mail de confirmação. Por favor, verifique sua caixa de entrada.'
        );

        // Redirecionar para página de confirmação
        router.push('/auth/confirmar-email');
      }
    } catch (err) {
      console.error('Erro no registro:', err);
      setErrors({ general: 'Erro ao criar conta. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setErrors({});

    try {
      localStorage.setItem('auth_redirect', redirect);
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const redirectUrl = `${siteUrl}/auth/callback`;

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: false,
        },
      });

      if (signInError) {
        setErrors({ general: 'Erro ao registrar com Google. Tente novamente.' });
        setLoading(false);
      }
    } catch (err) {
      console.error('Erro no registro com Google:', err);
      setErrors({ general: 'Erro ao registrar com Google. Tente novamente.' });
      setLoading(false);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display flex items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="w-full max-w-6xl mx-auto">
        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl overflow-hidden flex flex-col lg:flex-row min-h-[750px] animate-fade-in">
          
          {/* Left Side - Carousel */}
          <div className="w-full lg:w-1/2 relative bg-gray-900 hidden lg:block overflow-hidden">
            <div 
              className="flex h-full transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {CAROUSEL_IMAGES.map((src, index) => (
                <div
                  key={index}
                  className="min-w-full h-full relative"
                >
                   <Image
                      src={src}
                      alt={`Slide ${index + 1}`}
                      fill
                      className="object-cover"
                      priority={index === 0}
                      sizes="50vw"
                   />
                   <div className="absolute inset-0 bg-black/10"></div>
                   <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent"></div>
                </div>
              ))}
            </div>

            {/* Carousel Dots */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex justify-center items-center space-x-2 z-10">
              {CAROUSEL_IMAGES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    index === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Right Side - Register Form */}
          <div className="w-full lg:w-1/2 bg-white dark:bg-surface-dark p-8 sm:p-12 lg:p-16 flex flex-col justify-center transition-colors duration-300 relative overflow-y-auto max-h-screen">
            {/* Theme Toggle Button */}
            <div className="absolute top-4 right-4">
              <ThemeToggle />
            </div>

            <div className="max-w-md w-full mx-auto">
              
              {/* Logo */}
              <div className="flex flex-col items-center justify-center mb-8 animate-slide-in-from-top">
                <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16">
                      {/* Light mode logo */}
                      <Image
                        src="/medbravelogo.png"
                        alt="MEDBRAVE Logo"
                        fill
                        className="object-contain dark:hidden"
                        priority
                      />
                      {/* Dark mode logo */}
                      <Image
                        src="/medbravelogo-dark.png"
                        alt="MEDBRAVE Logo"
                        fill
                        className="object-contain hidden dark:block"
                        priority
                      />
                    </div>
                    <h2 className="text-3xl font-bold tracking-wider text-text-light-primary dark:text-text-dark-primary font-azonix">
                    MEDBRAVE
                    </h2>
                </div>
                <p className="mt-4 text-sm text-text-light-secondary dark:text-text-dark-secondary text-center">
                  Crie sua conta e comece sua jornada de estudos!
                </p>
              </div>

              {/* Error Message */}
              {errors.general && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm animate-fade-in">
                  {errors.general}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 animate-slide-in-from-bottom">
                {/* Nome Completo */}
                <div className="group">
                  <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2 group-focus-within:text-primary transition-colors" htmlFor="fullName">
                    Nome Completo
                  </label>
                  <input
                    className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border ${
                      errors.fullName ? 'border-red-500' : 'border-border-light dark:border-border-dark'
                    } rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-text-light-primary dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-gray-500 transition-all outline-none`}
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="João da Silva"
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.fullName}</p>
                  )}
                </div>

                {/* E-mail */}
                <div className="group">
                  <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2 group-focus-within:text-primary transition-colors" htmlFor="email">
                    E-mail
                  </label>
                  <input
                    className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border ${
                      errors.email ? 'border-red-500' : 'border-border-light dark:border-border-dark'
                    } rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-text-light-primary dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-gray-500 transition-all outline-none`}
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                  )}
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

                {/* Senha */}
                <PasswordStrengthInput
                  value={password}
                  onChange={setPassword}
                  label="Senha"
                  placeholder="••••••••"
                  error={errors.password}
                />

                {/* Confirmar Senha */}
                <div className="group">
                  <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2 group-focus-within:text-primary transition-colors" htmlFor="confirmPassword">
                    Confirmar Senha
                  </label>
                  <input
                    className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border ${
                      errors.confirmPassword ? 'border-red-500' : 'border-border-light dark:border-border-dark'
                    } rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-text-light-primary dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-gray-500 transition-all outline-none`}
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword}</p>
                  )}
                </div>

                <button
                  className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Criando conta...' : 'Criar Conta'}
                </button>
              </form>

              <div className="flex items-center my-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <hr className="flex-grow border-border-light dark:border-border-dark" />
                <span className="mx-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">ou</span>
                <hr className="flex-grow border-border-light dark:border-border-dark" />
              </div>

              <button
                onClick={handleGoogleSignUp}
                disabled={loading}
                className="w-full flex items-center justify-center py-3 px-4 border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 animate-slide-in-from-bottom"
                style={{ animationDelay: '0.3s' }}
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
                  <path d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.35 6.53C12.91 13.46 18.06 9.5 24 9.5z" fill="#4285F4"></path>
                  <path d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6.02C43.91 39.53 46.98 32.68 46.98 24.55z" fill="#34A853"></path>
                  <path d="M10.91 28.75c-.22-.66-.35-1.36-.35-2.08s.13-1.42.35-2.08l-8.35-6.53C.73 19.25 0 21.55 0 24s.73 4.75 2.56 6.53l8.35-6.53z" fill="#FBBC05"></path>
                  <path d="M24 48c6.48 0 11.93-2.13 15.89-5.82l-7.73-6.02c-2.11 1.42-4.78 2.27-7.66 2.27-5.94 0-11.09-3.96-12.91-9.35L2.56 34.78C6.51 42.62 14.62 48 24 48z" fill="#EA4335"></path>
                  <path d="M0 0h48v48H0z" fill="none"></path>
                </svg>
                Registrar com Google
              </button>

              <p className="text-center text-sm text-text-light-secondary dark:text-text-dark-secondary mt-8 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                Já tem uma conta? <a className="font-semibold text-primary hover:text-primary/80 transition-colors" href="/login">Fazer login</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
