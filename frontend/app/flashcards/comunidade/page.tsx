import { redirect } from 'next/navigation';

// Redireciona para a página unificada de flashcards
// As tabs agora são gerenciadas internamente na página de coleções
export default function ComunidadePage() {
  redirect('/flashcards/colecoes');
}

export const dynamic = 'force-static';
