export default function Loading() {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
      <div className="animate-pulse text-text-light-secondary dark:text-text-dark-secondary">
        Carregando...
      </div>
    </div>
  );
}
