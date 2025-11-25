import { Metadata } from 'next';
import MainLayout from '@/components/layout/MainLayout';
import ResolucaoQuestoesClient from './ResolucaoQuestoesClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  
  return {
    title: `Resolução de Questões | MedBRAVE`,
    description: 'Seja Corajoso, Seja BRAVE!',
  };
}

export default async function ResolucaoQuestoesPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <MainLayout showGreeting={false}>
      <ResolucaoQuestoesClient id={id} />
    </MainLayout>
  );
}
