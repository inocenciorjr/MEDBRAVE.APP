/**
 * Componente que exibe um padrão de tabuleiro xadrez para indicar transparência
 * Similar ao usado em editores de imagem como Photoshop, GIMP, etc.
 */
export function TransparentBackground({ className = '' }: { className?: string }) {
  return (
    <div 
      className={`absolute inset-0 ${className}`}
      style={{
        backgroundImage: `
          linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
          linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
          linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)
        `,
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
      }}
    />
  );
}
