'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CadernoErrosEstudoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initSession();
  }, []);

  const initSession = async () => {
    try {
      // Buscar IDs da URL (quando vem da lista de cadernos)
      const urlParams = new URLSearchParams(window.location.search);
      const idsParam = urlParams.get('ids');

      if (!idsParam) {
        alert('Nenhuma entrada selecionada para estudo!');
        router.push('/caderno-erros');
        return;
      }

      const entryIds = idsParam.split(',');

      if (entryIds.length === 0) {
        alert('Nenhuma entrada selecionada para estudo!');
        router.push('/caderno-erros');
        return;
      }

      // Criar um "sessionId" temporário para estudos (não precisa salvar no backend)
      const sessionId = `study-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Armazenar os IDs no sessionStorage para a página de sessão
      sessionStorage.setItem(`study-session-${sessionId}`, JSON.stringify(entryIds));

      // Redirecionar para rota dinâmica
      router.push(`/caderno-erros/sessao/${sessionId}`);
    } catch (error) {
      console.error('Erro ao iniciar sessão de estudo:', error);
      alert('Erro ao iniciar estudo. Tente novamente.');
      router.push('/caderno-erros');
    } finally {
      setLoading(false);
    }
  };

  // Página sempre redireciona, loading tratado pelo loading.tsx (skeleton)
  return null;
}
