// Loading mínimo para evitar flash de skeleton sem layout
// Cada seção (flashcards, simulados, etc) tem seu próprio loading.tsx
// que é renderizado dentro do layout correto
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700" />
    </div>
  )
}
