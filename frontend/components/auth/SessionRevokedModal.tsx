'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface SessionRevokedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SessionRevokedModal({ isOpen, onClose }: SessionRevokedModalProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleConfirm = async () => {
    setIsLoggingOut(true);
    
    // Deslogar
    const supabase = createClient();
    await supabase.auth.signOut();
    
    // Redirecionar para login
    router.push('/login');
    onClose();
  };

  // Prevenir scroll quando modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()} // Prevenir fechar ao clicar no backdrop
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
        {/* Ícone */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
            <span 
              className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-4xl"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              logout
            </span>
          </div>
        </div>

        {/* Título */}
        <h2 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
          Sessão Encerrada
        </h2>

        {/* Mensagem */}
        <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
          Você foi desconectado porque fez login em outro dispositivo. 
          <br />
          <span className="text-sm text-gray-500 dark:text-gray-400 mt-2 block">
            Limite: 2 dispositivos simultâneos
          </span>
        </p>

        {/* Botão */}
        <button
          onClick={handleConfirm}
          disabled={isLoggingOut}
          className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {isLoggingOut ? (
            <>
              <span className="material-symbols-outlined animate-spin">
                progress_activity
              </span>
              Saindo...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">
                check_circle
              </span>
              Entendi
            </>
          )}
        </button>
      </div>
    </div>
  );
}
