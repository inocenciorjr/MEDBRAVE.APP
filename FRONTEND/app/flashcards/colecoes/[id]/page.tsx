import { Metadata } from 'next';
import CollectionPageClient from './CollectionPageClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  
  return {
    title: `Coleção | MEDBRAVE`,
    description: 'Visualize os decks desta coleção',
  };
}

export default async function CollectionPage({ params }: PageProps) {
  const { id } = await params;

  return <CollectionPageClient id={id} />;
}
