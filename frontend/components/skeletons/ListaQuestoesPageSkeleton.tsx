// Este skeleton é usado durante o redirect de /lista-questoes para /lista-questoes/minhas-listas
// Mostra um loading mínimo já que o redirect é rápido
export function ListaQuestoesPageSkeleton() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700" />
    </div>
  );
}
