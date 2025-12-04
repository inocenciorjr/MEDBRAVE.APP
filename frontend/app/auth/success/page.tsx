'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AuthSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Finalizando login...');

  useEffect(() => {
    const redirect = searchParams.get('redirect') || '/';
    
    // Verificar se a sessão está no localStorage
    const checkSession = (attempt: number) => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1] || '';
      const storageKey = `sb-${projectRef}-auth-token`;
      
      const hasSession = localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey);
      const hasUser = localStorage.getItem('user');
      const hasToken = localStorage.getItem('authToken');
      
      setStatus(`Verificando sessão... (${attempt}/10)`);
      
      if (hasSession && hasUser && hasToken) {
        setStatus('Sessão confirmada! Redirecionando...');
        // Usar replace para não adicionar ao histórico
        // E adicionar _auth=1 para o AuthContext saber que veio do login
        const separator = redirect.includes('?') ? '&' : '?';
        const finalUrl = `${redirect}${separator}_auth=1`;
        
        // Log para debug
        fetch('/api/debug-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'auth-success-redirect', redirect, finalUrl })
        }).catch(() => {});
        
        setTimeout(() => {
          window.location.replace(finalUrl);
        }, 300);
        return;
      }
      
      if (attempt < 10) {
        setTimeout(() => checkSession(attempt + 1), 500);
      } else {
        setStatus('Erro ao verificar sessão. Redirecionando...');
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      }
    };
    
    // Começar a verificar após um pequeno delay
    setTimeout(() => checkSession(1), 100);
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center">
      <div className="flex items-center gap-2 mb-8">
        <img src="/medbravelogo-dark.png" alt="MedBrave" className="w-10 h-10 object-contain" />
        <span className="text-white font-bold text-xl tracking-wide" style={{ fontFamily: 'Azonix, sans-serif' }}>
          MEDBRAVE
        </span>
      </div>
      <div className="flex flex-col items-center">
        <h1 className="text-white text-xl font-semibold mb-4">{status}</h1>
        <div className="w-10 h-10 border-4 border-white/20 border-t-amber-400 rounded-full animate-spin" />
      </div>
    </div>
  );
}

export default function AuthSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white/20 border-t-amber-400 rounded-full animate-spin" />
      </div>
    }>
      <AuthSuccessContent />
    </Suspense>
  );
}
