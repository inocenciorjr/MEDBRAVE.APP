'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function ConfirmarEmailPage() {
  const router = useRouter();

  return (
    <div className="bg-background-light dark:bg-background-dark font-display flex items-center justify-center min-h-screen p-4 transition-colors duration-300">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl p-8 sm:p-12 relative animate-fade-in">
          {/* Theme Toggle */}
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>

          {/* Logo */}
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="relative w-20 h-20 mb-4">
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
            <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary text-center">
              Verifique seu e-mail
            </h1>
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-6xl text-primary">
                mail
              </span>
            </div>
          </div>

          {/* Message */}
          <div className="text-center space-y-4 mb-8">
            <p className="text-text-light-primary dark:text-text-dark-primary">
              Enviamos um link de confirmação para o seu e-mail.
            </p>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.
            </p>
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
              Não se esqueça de verificar a pasta de spam!
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5"
            >
              Ir para Login
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold py-3 px-4 rounded-lg transition-all duration-200"
            >
              Reenviar e-mail
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
