'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import Link from 'next/link';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useToast } from '@/lib/contexts/ToastContext';

const supabase = createClient();

export default function MentorLoginPage() {
  const router = useRouter();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Verificar se já está autenticado
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('[Mentor Login] Verificando autenticação...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[Mentor Login] Sessão:', session ? 'existe' : 'não existe');
        
        if (session) {
          // Verificar se é mentor
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();

          console.log('[Mentor Login] Role do usuário:', userData?.role);

          if (userData?.role === 'MENTOR') {
            console.log('[Mentor Login] É mentor, redirecionando para /mentor');
            router.push('/mentor');
            return;
          } else {
            console.log('[Mentor Login] Não é mentor, permanecendo na página');
          }
        } else {
          console.log('[Mentor Login] Sem sessão, mostrando formulário de login');
        }
      } catch (err) {
        console.error('[Mentor Login] Erro ao verificar auth:', err);
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError('Email ou senha incorretos.');
        return;
      }

      if (data.user) {
        // Verificar se é mentor
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (userData?.role === 'MENTOR') {
          router.push('/mentor');
        } else {
          setError('Acesso restrito a mentores. Entre em contato com o suporte.');
          await supabase.auth.signOut();
        }
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      localStorage.setItem('auth_redirect', '/mentor');
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
        setError('Erro ao fazer login com Google. Tente novamente.');
        setLoading(false);
      }
    } catch (err) {
      setError('Erro ao fazer login com Google. Tente novamente.');
      console.error('Erro no login com Google:', err);
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-background-light dark:bg-background-dark font-display flex items-center justify-center min-h-screen p-4 transition-colors duration-300">
      <div className="w-full max-w-md mx-auto relative">
        {/* Theme Toggle */}
        <div className="absolute -top-12 right-0">
          <ThemeToggle />
        </div>

        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl overflow-hidden p-8 animate-fade-in">
          {/* Logo */}
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-12 h-12">
                <Image
                  src="/medbravelogo.png"
                  alt="MEDBRAVE Logo"
                  fill
                  className="object-contain dark:hidden"
                  priority
                />
                <Image
                  src="/medbravelogo-dark.png"
                  alt="MEDBRAVE Logo"
                  fill
                  className="object-contain hidden dark:block"
                  priority
                />
              </div>
              <h2 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary font-azonix">
                MEDBRAVE
              </h2>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
              <span className="material-symbols-outlined text-primary">school</span>
              <span className="text-primary font-semibold">Portal do Mentor</span>
            </div>
            <p className="mt-4 text-sm text-text-light-secondary dark:text-text-dark-secondary text-center">
              Acesse sua área de mentoria e gerencie seus mentorados
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-text-light-primary dark:text-text-dark-primary outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-text-light-primary dark:text-text-dark-primary outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'Entrar como Mentor'}
            </button>
          </form>

          <div className="flex items-center my-6">
            <hr className="flex-grow border-border-light dark:border-border-dark" />
            <span className="mx-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">ou</span>
            <hr className="flex-grow border-border-light dark:border-border-dark" />
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center py-3 px-4 border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
              <path d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.35 6.53C12.91 13.46 18.06 9.5 24 9.5z" fill="#4285F4"></path>
              <path d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6.02C43.91 39.53 46.98 32.68 46.98 24.55z" fill="#34A853"></path>
              <path d="M10.91 28.75c-.22-.66-.35-1.36-.35-2.08s.13-1.42.35-2.08l-8.35-6.53C.73 19.25 0 21.55 0 24s.73 4.75 2.56 6.53l8.35-6.53z" fill="#FBBC05"></path>
              <path d="M24 48c6.48 0 11.93-2.13 15.89-5.82l-7.73-6.02c-2.11 1.42-4.78 2.27-7.66 2.27-5.94 0-11.09-3.96-12.91-9.35L2.56 34.78C6.51 42.62 14.62 48 24 48z" fill="#EA4335"></path>
              <path d="M0 0h48v48H0z" fill="none"></path>
            </svg>
            Entrar com Google
          </button>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-primary hover:text-primary/80 transition-colors">
              ← Voltar para login normal
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-border-light dark:border-border-dark">
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary text-center">
              Quer se tornar um mentor? <br />
              <a href="mailto:contato@medbrave.com" className="text-primary hover:underline">
                Entre em contato conosco
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
