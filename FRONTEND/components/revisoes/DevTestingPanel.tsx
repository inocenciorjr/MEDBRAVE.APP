'use client';

import React, { useState } from 'react';

export function DevTestingPanel() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Verificar se está em desenvolvimento
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  // Verificar status do backend ao montar
  const checkBackend = async () => {
    try {
      const { supabase } = await import('@/config/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setBackendStatus('offline');
        return;
      }
      
      // Usar proxy do Next.js com autenticação
      const response = await fetch('/api/unified-reviews/due?limit=1', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      setBackendStatus(response.ok ? 'online' : 'offline');
    } catch (error) {
      setBackendStatus('offline');
    }
  };

  // Verificar ao montar
  React.useEffect(() => {
    checkBackend();
  }, []);

  const handleCreateCards = async (count: number) => {
    try {
      setLoading(true);
      setMessage('Criando cards...');
      
      const { supabase } = await import('@/config/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setMessage('❌ Você precisa estar logado!');
        return;
      }
      
      // Usar proxy do Next.js
      const response = await fetch('/api/unified-reviews/dev/create-test-cards', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count }),
      });
      
      if (!response.ok) {
        const text = await response.text();
        setMessage(`❌ Erro ${response.status}: Backend não respondeu. Verifique se está rodando em localhost:5000`);
        console.error('Response:', text);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ ${data.data.created_count} cards criados!`);
      } else {
        setMessage(`❌ ${data.message}`);
      }
    } catch (error: any) {
      setMessage(`❌ Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateOverdue = async (days: number, count: number) => {
    try {
      setLoading(true);
      setMessage('Simulando atraso...');
      
      const { supabase } = await import('@/config/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setMessage('❌ Você precisa estar logado!');
        return;
      }
      
      // Usar proxy do Next.js
      const response = await fetch('/api/unified-reviews/dev/simulate-overdue', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ days_overdue: days, count }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ ${data.data.modified} revisões atrasadas (até ${days} dias)!`);
      } else {
        setMessage(`❌ ${data.message}`);
      }
    } catch (error: any) {
      setMessage(`❌ Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetDates = async () => {
    try {
      setLoading(true);
      setMessage('Resetando datas...');
      
      const { supabase } = await import('@/config/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setMessage('❌ Você precisa estar logado!');
        return;
      }
      
      // Usar proxy do Next.js
      const response = await fetch('/api/unified-reviews/dev/reset-dates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ ${data.data.reset_count} revisões resetadas!`);
      } else {
        setMessage(`❌ ${data.message}`);
      }
    } catch (error: any) {
      setMessage(`❌ Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTestCards = async () => {
    try {
      setLoading(true);
      setMessage('Deletando cards de teste...');
      
      const { supabase } = await import('@/config/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setMessage('❌ Você precisa estar logado!');
        return;
      }
      
      // Usar proxy do Next.js
      const response = await fetch('/api/unified-reviews/dev/delete-test-cards', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ ${data.data.deleted_count} cards deletados!`);
      } else {
        setMessage(`❌ ${data.message}`);
      }
    } catch (error: any) {
      setMessage(`❌ Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-yellow-100 dark:bg-yellow-900 border-2 border-yellow-500 rounded-xl p-4 shadow-2xl max-w-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-yellow-600">science</span>
          <h3 className="font-bold text-yellow-900 dark:text-yellow-100">
            🧪 Painel de Testes
          </h3>
        </div>

        {/* Status do Backend */}
        <div className="mb-3 p-2 bg-white dark:bg-gray-800 rounded flex items-center justify-between">
          <span className="text-xs font-semibold">Backend:</span>
          {backendStatus === 'checking' && (
            <span className="text-xs text-gray-600">Verificando...</span>
          )}
          {backendStatus === 'online' && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-600 rounded-full"></span>
              Online
            </span>
          )}
          {backendStatus === 'offline' && (
            <span className="text-xs text-red-600 flex items-center gap-1">
              <span className="w-2 h-2 bg-red-600 rounded-full"></span>
              Offline
            </span>
          )}
        </div>

        {backendStatus === 'offline' && (
          <div className="mb-3 p-2 bg-red-100 dark:bg-red-900 rounded">
            <p className="text-xs text-red-800 dark:text-red-200">
              ⚠️ Backend não está rodando!
              <br />
              Execute: <code className="bg-red-200 dark:bg-red-800 px-1 rounded">npm run dev</code> na pasta BACKEND
            </p>
          </div>
        )}

        <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-3">
          Apenas em desenvolvimento
        </p>

        <div className="space-y-2">
          {/* Cenário 1: Setup Básico */}
          <div className="p-2 bg-white dark:bg-gray-800 rounded">
            <p className="text-xs font-semibold mb-2">Cenário 1: Setup Básico</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleCreateCards(50)}
                disabled={loading}
                className="flex-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                1. Criar 50 Cards
              </button>
              <button
                onClick={() => handleSimulateOverdue(45, 50)}
                disabled={loading}
                className="flex-1 px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
              >
                2. Simular 45d
              </button>
            </div>
          </div>

          {/* Cenário 2: Backlog Severo */}
          <div className="p-2 bg-white dark:bg-gray-800 rounded">
            <p className="text-xs font-semibold mb-2">Cenário 2: Backlog Severo</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleCreateCards(150)}
                disabled={loading}
                className="flex-1 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                150 Cards
              </button>
              <button
                onClick={() => handleSimulateOverdue(30, 150)}
                disabled={loading}
                className="flex-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                30d Atraso
              </button>
            </div>
          </div>

          {/* Limpeza */}
          <div className="p-2 bg-white dark:bg-gray-800 rounded">
            <p className="text-xs font-semibold mb-2">Limpeza</p>
            <div className="flex gap-2">
              <button
                onClick={handleResetDates}
                disabled={loading}
                className="flex-1 px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
              >
                Resetar Datas
              </button>
              <button
                onClick={handleDeleteTestCards}
                disabled={loading}
                className="flex-1 px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50"
              >
                Deletar Tudo
              </button>
            </div>
          </div>
        </div>

        {message && (
          <div className="mt-3 p-2 bg-white dark:bg-gray-800 rounded text-xs">
            {message}
          </div>
        )}

        {loading && (
          <div className="mt-2 flex items-center gap-2 text-xs text-yellow-800 dark:text-yellow-200">
            <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
            Processando...
          </div>
        )}
      </div>
    </div>
  );
}
