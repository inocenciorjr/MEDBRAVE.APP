import { Metadata } from 'next';
import AdminCollectionPageClient from './AdminCollectionPageClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  
  return {
    title: `Coleção Oficial | Admin MedBRAVE`,
    description: 'Seja Corajoso, Seja BRAVE!',
  };
}

export default async function AdminCollectionPage({ params }: PageProps) {
  const { id } = await params;

  return <AdminCollectionPageClient id={id} />;
}
