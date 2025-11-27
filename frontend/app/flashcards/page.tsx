import { redirect } from 'next/navigation';

// Redirect permanente para evitar flash de loading
export default function FlashcardsPage() {
  redirect('/flashcards/colecoes');
}

// Força redirect no lado do servidor
export const dynamic = 'force-static';
