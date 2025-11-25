'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function QuestoesRevisaoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initSession();
  }, []);

  const initSession = async () => {
    try {
      const { supabase } = await import('@/config/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      // Buscar revisões pendentes de questões de hoje
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/unified-reviews/future?limit=200&startDate=${today}&endDate=${today}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error('Erro ao buscar revisões');
      }

      const questionReviews = result.data.reviews.filter(
        (r: any) => r.content_type === 'QUESTION'
      );

      if (questionReviews.length === 0) {
        alert('Não há questões para revisar hoje!');
        router.push('/revisoes');
        return;
      }

      const reviewIds = questionReviews.map((r: any) => r.id);
      const token = session.access_token;

      // Verificar se já existe uma sessão ativa de hoje
      const activeSessionResponse = await fetch(`/api/review-sessions/active?contentType=QUESTION`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      let sessionId: string;

      if (activeSessionResponse.ok) {
        const activeResult = await activeSessionResponse.json();

        if (activeResult.success && activeResult.data.session) {
          // Usar sessão existente
          sessionId = activeResult.data.session.id;
          console.log('✅ Usando sessão ativa existente:', sessionId);
        } else {
          // Criar nova sessão
          const createResponse = await fetch('/api/review-sessions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              content_type: 'QUESTION',
              review_ids: reviewIds,
              date: today
            }),
          });

          if (!createResponse.ok) {
            throw new Error('Erro ao criar sessão');
          }

          const createResult = await createResponse.json();

          if (!createResult.success) {
            throw new Error(createResult.message || 'Erro ao criar sessão');
          }

          sessionId = createResult.data.session.id;
          console.log('✅ Nova sessão criada:', sessionId);
        }
      } else {
        // Se falhar ao buscar sessão ativa, criar nova
        const createResponse = await fetch('/api/review-sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            content_type: 'QUESTION',
            review_ids: reviewIds,
            date: today
          }),
        });

        if (!createResponse.ok) {
          throw new Error('Erro ao criar sessão');
        }

        const createResult = await createResponse.json();

        if (!createResult.success) {
          throw new Error(createResult.message || 'Erro ao criar sessão');
        }

        sessionId = createResult.data.session.id;
        console.log('✅ Nova sessão criada:', sessionId);
      }

      // Redirecionar para rota dinâmica
      router.push(`/revisoes/questoes/sessao/${sessionId}`);
    } catch (error) {
      console.error('Erro ao iniciar sessão:', error);
      alert('Erro ao iniciar revisão. Tente novamente.');
      router.push('/revisoes');
    } finally {
      setLoading(false);
    }
  };

  // Página sempre redireciona, loading tratado pelo loading.tsx (skeleton)
  return null;
}
