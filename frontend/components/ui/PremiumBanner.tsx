'use client';

interface PremiumBannerProps {
  onSubscribe?: () => void;
}

export default function PremiumBanner({ onSubscribe }: PremiumBannerProps) {
  const handleSubscribe = () => {
    if (onSubscribe) {
      onSubscribe();
    } else {
      console.log('Assinar premium');
    }
  };

  return (
    <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-900 to-purple-900 dark:from-indigo-900 dark:to-purple-900 text-center relative overflow-hidden shadow-2xl dark:shadow-dark-2xl max-w-full">
      {/* Círculo decorativo */}
      <div className="absolute -top-3 -left-3 w-12 h-12 bg-white/10 rounded-full"></div>
      
      {/* Conteúdo */}
      <h3 className="font-bold text-white dark:text-white relative z-10 text-sm">
        Seja premium
      </h3>
      <p className="text-[10px] text-indigo-200 dark:text-indigo-200 mt-1 mb-3 relative z-10 leading-tight">
        Acesse nossos recursos especiais assinando nosso pacote
      </p>
      <button
        onClick={handleSubscribe}
        className="w-full bg-surface-light dark:bg-surface-dark text-primary font-semibold py-1.5 text-sm rounded-lg shadow-sm hover:opacity-90 transition-opacity relative z-10"
      >
        Assine
      </button>
    </div>
  );
}
