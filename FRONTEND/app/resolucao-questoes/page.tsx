import { redirect } from 'next/navigation';
import { getQuestionList } from '@/lib/api/questions';

export default async function ResolucaoQuestoesIndexPage() {
  // Redirect to first question
  const questions = await getQuestionList();
  
  if (questions.length > 0) {
    redirect(`/resolucao-questoes/${questions[0].id}`);
  }

  return (
    <div className="-m-4 md:-m-8 min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
