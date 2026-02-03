import React, { useEffect, useState, useMemo } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

type LoaderSize = 'sm' | 'md' | 'lg' | 'xl' | number;

interface BrandLoaderProps {
  /** Tamanho do loader: 'sm' (80px), 'md' (120px), 'lg' (180px), 'xl' (240px) ou número em pixels */
  size?: LoaderSize;
  /** Classe CSS adicional */
  className?: string;
  /** Texto exibido abaixo do loader */
  label?: string;
  /** Se deve ocupar a tela inteira (centralizado) */
  fullScreen?: boolean;
}

// Mapear tamanho para classes Tailwind
const SIZE_CLASSES: Record<string, string> = {
  sm: 'w-20 h-20',           // 80px
  md: 'w-[120px] h-[120px]', // 120px
  lg: 'w-[180px] h-[180px]', // 180px
  xl: 'w-60 h-60',           // 240px
};

// Mapear número para tamanho mais próximo
function getClosestSize(px: number): string {
  if (px <= 80) return 'sm';
  if (px <= 120) return 'md';
  if (px <= 180) return 'lg';
  return 'xl';
}

/**
 * Componente de loading animado com a marca X Produções
 * Usa animação .lottie exportada do After Effects
 * Responsivo ao tema (claro/escuro)
 */
const BrandLoader: React.FC<BrandLoaderProps> = ({
  size = 'lg',
  className = '',
  label,
  fullScreen = false,
}) => {
  const [showDismiss, setShowDismiss] = useState(false);
  const [forceHidden, setForceHidden] = useState(false);
  
  // Resolver tamanho para classe CSS
  const sizeClass = useMemo(() => {
    if (typeof size === 'number') {
      return SIZE_CLASSES[getClosestSize(size)];
    }
    return SIZE_CLASSES[size] || SIZE_CLASSES.lg;
  }, [size]);
  
  // Se estiver em fullscreen por mais de 5 segundos, mostrar botão de fechar
  useEffect(() => {
    if (fullScreen) {
      const timer = setTimeout(() => {
        setShowDismiss(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [fullScreen]);

  if (forceHidden) return null;

  const containerClass = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-background z-[9999]'
    : 'flex flex-col items-center justify-center';

  return (
    <div className={`${containerClass} ${className}`}>
      {fullScreen && showDismiss && (
        <button 
          onClick={() => setForceHidden(true)}
          className="absolute top-4 right-4 text-xs text-muted-foreground hover:text-foreground underline z-[10000]"
        >
          Demorando muito? Fechar carregamento
        </button>
      )}
      <div 
        className={`brand-loader-animation ${sizeClass} transition-all duration-300`}
      >
        <DotLottieReact
          src="/animations/Logo-xproducoes-eventos.lottie"
          loop
          autoplay
        />
      </div>
      {label && (
        <p className="mt-4 text-base text-muted-foreground animate-pulse font-medium">
          {label}
        </p>
      )}
    </div>
  );
};

// Export named and default to support both import styles across the codebase
export { BrandLoader };
export default BrandLoader;
