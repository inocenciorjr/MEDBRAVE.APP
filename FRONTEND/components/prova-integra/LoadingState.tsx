export default function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="flex gap-2">
        <div className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse" 
             style={{ animationDelay: '0s' }} />
        <div className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse" 
             style={{ animationDelay: '0.2s' }} />
        <div className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse" 
             style={{ animationDelay: '0.4s' }} />
      </div>
      <p className="mt-3 text-sm text-text-light-secondary dark:text-text-dark-secondary">
        Carregando...
      </p>
    </div>
  );
}
