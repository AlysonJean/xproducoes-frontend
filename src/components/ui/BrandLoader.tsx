import React, { useEffect, useState, useMemo } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

type LoaderSize = 'sm' | 'md' | 'lg' | 'xl' | number;

interface BrandLoaderProps {
  /** Tamanho do loader: 'sm' (80px), 'md' (120px), 'lg' (180px), 'xl' (240px) ou número em pixels */
  size?: LoaderSize;
  /** Classe CSS adicional */
  className?: string;
  /** Texto exibido abaixo do loader (ignorado conforme pedido, mas mantido na interface para compatibilidade) */
  label?: string;
  /** Se deve ocupar a tela inteira (centralizado) */
  fullScreen?: boolean;
}

const SIZE_MAP: Record<string, string> = {
  sm: 'w-16 h-16 md:w-20 md:h-20',
  md: 'w-28 h-28 md:w-36 md:h-36',
  lg: 'w-40 h-40 md:w-56 md:h-56 lg:w-72 lg:h-72',
  xl: 'w-56 h-56 md:w-72 md:h-72 lg:w-[350px] lg:h-[350px] xl:w-[450px] xl:h-[450px]',
};

/**
 * Componente de loading animado com a marca X Produções
 * Responsivo ao tema e centralizado
 */
const BrandLoader: React.FC<BrandLoaderProps> = ({
  size = 'lg',
  className = '',
  fullScreen = false,
}) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsClient(true), 20);
    return () => clearTimeout(timer);
  }, []);
  
  const sizeClass = useMemo(() => {
    if (typeof size === 'number') return '';
    return SIZE_MAP[size] || SIZE_MAP.lg;
  }, [size]);

  const containerClass = fullScreen
    ? 'fixed inset-0 flex flex-col items-center justify-center bg-background z-[9999]'
    : 'flex flex-col items-center justify-center relative';

  const sizeStyle = typeof size === 'number' ? {
    width: `${size}px`,
    height: `${size}px`,
  } : {};

  return (
    <div className={`${containerClass} ${className}`}>
      <div 
        className={`brand-loader-animation ${sizeClass} flex items-center justify-center relative overflow-hidden`}
        style={sizeStyle}
      >
        {isClient ? (
          <div 
            className="w-full h-full relative"
            style={{ 
              filter: 'drop-shadow(1000px 0 0 hsl(var(--primary)))',
              transform: 'translateX(-1000px)',
              width: '100%',
              height: '100%'
            }}
          >
            <DotLottieReact
              src="/animations/Logo-xproducoes-eventos.lottie"
              loop
              autoplay
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>
        ) : (
          <div className="w-full h-full rounded-full bg-primary/5 animate-pulse" />
        )}
      </div>
    </div>
  );
};

export { BrandLoader };
export default BrandLoader;
