import { Metadata } from 'next';
import EstudoClient from './EstudoClient';

interface PageProps {
  params: Promise<{ deckId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { deckId } = await params;
  
  return {
    title: 'Estudar Flashcards | MedBRAVE',
    description: 'Seja Corajoso, Seja BRAVE!',
  };
}

export default async function EstudoPage({ params }: PageProps) {
  const { deckId } = await params;

  return <EstudoClient deckId={deckId} />;
}
