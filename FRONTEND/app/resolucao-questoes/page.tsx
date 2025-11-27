'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PagePlanGuard } from '@/components/guards/PagePlanGuard';

export default function ResolucaoQuestoesIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/banco-questoes');
  }, [router]);

  return (
    <PagePlanGuard>
      <div>Redirecionando...</div>
    </PagePlanGuard>
  );
}

/*
// Versão antiga com server component
import { redirect } from 'next/navigation';
import { getQuestionList } from '@/lib/api/questions';

export default async function ResolucaoQuestoesIndexPageOld() {
  // Redirect to first question
  const questions = await getQuestionList();
  
  if (questions.length > 0) {
    redirect(`/resolucao-questoes/${questions[0].id}`);
  }

  return (
    <div className="w-full py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center p-8 bg-surface-light dark:bg-surface-dark rounded-lg shadow-lg dark:shadow-dark-xl">
            <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">
              Nenhuma questão disponível
            </h2>
            <p className="text-text-light-secondary dark:text-text-dark-secondary">
              Não há questões cadastradas no momento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
