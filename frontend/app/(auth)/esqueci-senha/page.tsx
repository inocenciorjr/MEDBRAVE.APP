'use client';

import { useState, FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/lib/contexts/ToastContext';
import Image from 'next/image';
import ThemeToggle from '@/components/ui/ThemeToggle';
import Link from 'next/link';

const supabase = createClient();

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Por favor, digite seu e-mail');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('E-mail inválido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/redefinir-senha`,
      });

      if (resetError) {
        throw resetError;
      }

      setEmailSent(true);
      toast.success(
        'E-mail enviado!',
        'Verifique sua caixa de entrada para redefinir sua senha.'
      );
    } catch (err: any) {
      console.error('Erro ao enviar e-mail:', err);
      setError('Erro ao enviar e-mail. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="bg-background-light dark:bg-background-dark font-display flex items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8 transition-colors duration-300">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl overflow-hidden p-8 sm:p-12 animate-fade-in">
            {/* Theme Toggle */}
            <div className="absolute top-4 right-4">
              <ThemeToggle />
            </div>

            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-green-600 dark:text-green-400">
                  mark_email_read
                </span>
              </div>
            </div>

            {/* Logo */}
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16">
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
                <h2 className="text-2xl font-bold tracking-wider text-text-light-primary dark:text-text-dark-primary font-azonix">
                  MEDBRAVE
                </h2>
              </div>
            </div>

            <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary text-center mb-4">
              E-mail Enviado!
            </h3>

            <p className="text-text-light-secondary dark:text-text-dark-secondary text-center mb-6">
              Enviamos um link de recuperação para <strong>{email}</strong>. 
              Verifique sua caixa de entrada e spam.
            </p>

            <div className="space-y-3">
              <Link
                href="/login"
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">
                  arrow_back
                </span>
                Voltar para Login
              </Link>

              <button
                onClick={() => {
                  setEmailSent(false);
                  setEmail('');
                }}
                className="w-full border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary hover:bg-gray-50 dark:hover:bg-gray-800 py-3 px-4 rounded-lg transition-all duration-200"
              >
                Enviar novamente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-light dark:bg-background-dark font-display flex items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl overflow-hidden p-8 sm:p-12 animate-fade-in">
          {/* Theme Toggle */}
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>

          {/* Logo */}
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16">
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
              <h2 className="text-2xl font-bold tracking-wider text-text-light-primary dark:text-text-dark-primary font-azonix">
                MEDBRAVE
              </h2>
            </div>
            <p className="mt-4 text-sm text-text-light-secondary dark:text-text-dark-secondary text-center">
              Esqueceu sua senha? Sem problemas!
            </p>
          </div>

          <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary text-center mb-2">
            Recuperar Senha
          </h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary text-center mb-6">
            Digite seu e-mail e enviaremos um link para redefinir sua senha.
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="group">
              <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2 group-focus-within:text-primary transition-colors" htmlFor="email">
                E-mail
              </label>
              <input
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-text-light-primary dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-gray-500 transition-all outline-none shadow-inner dark:shadow-none focus:shadow-lg"
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>

            <button
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">
                arrow_back
              </span>
              Voltar para Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
