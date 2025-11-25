import { Metadata } from 'next';
import CollectionPageClient from './CollectionPageClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  
  return {
    title: `Coleção | MedBRAVE`,
    description: 'Seja Corajoso, Seja BRAVE!',
  };
}

export default async function CollectionPage({ params }: PageProps) {
  const { id } = await params;

  return <CollectionPageClient id={id} />;
}
