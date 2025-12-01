'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/lib/contexts/ToastContext';
import Image from 'next/image';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { PasswordStrengthInput } from '@/components/auth/PasswordStrengthInput';

const supabase = createClient();

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidToken, setIsValidToken] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // Verificar se há um token de recuperação válido
    const checkToken = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsValidToken(true);
      } else {
        toast.error('Link inválido', 'Este link de recuperação expirou ou é inválido.');
        router.push('/esqueci-senha');
      }
    };

    checkToken();
  }, [router, toast]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!newPassword) {
      newErrors.newPassword = 'Nova senha é obrigatória';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Senha deve ter no mínimo 8 caracteres';
    } else if (!/[A-Z]/.test(newPassword)) {
      newErrors.newPassword = 'Senha deve conter pelo menos uma letra maiúscula';
    } else if (!/[a-z]/.test(newPassword)) {
      newErrors.newPassword = 'Senha deve conter pelo menos uma letra minúscula';
    } else if (!/\d/.test(newPassword)) {
      newErrors.newPassword = 'Senha deve conter pelo menos um número';
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      newErrors.newPassword = 'Senha deve conter pelo menos um caractere especial';
    }

    if (newPassword !== confirmPassword) {
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
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      toast.success('Senha redefinida!', 'Sua senha foi alterada com sucesso.');
      
      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      console.error('Erro ao redefinir senha:', err);
      setErrors({ general: 'Erro ao redefinir senha. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isValidToken) {
    return (
      <div className="bg-background-light dark:bg-background-dark font-display flex items-center justify-center min-h-screen p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
              Crie uma nova senha segura
            </p>
          </div>

          <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary text-center mb-6">
            Redefinir Senha
          </h3>

          {/* Error Message */}
          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm animate-fade-in">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nova Senha */}
            <PasswordStrengthInput
              value={newPassword}
              onChange={setNewPassword}
              label="Nova Senha"
              placeholder="Digite sua nova senha"
              error={errors.newPassword}
            />

            {/* Confirmar Senha */}
            <div className="group">
              <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2 group-focus-within:text-primary transition-colors">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border ${
                  errors.confirmPassword ? 'border-red-500' : 'border-border-light dark:border-border-dark'
                } rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-text-light-primary dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-gray-500 transition-all outline-none shadow-inner dark:shadow-none focus:shadow-lg`}
                placeholder="Confirme sua nova senha"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 animate-fade-in">{errors.confirmPassword}</p>
              )}
            </div>

            <button
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 mt-6"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Redefinindo...' : 'Redefinir Senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
