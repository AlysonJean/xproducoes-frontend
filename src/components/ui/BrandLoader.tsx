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



  // Determinar cores para o filtro baseado no tema (pode-se usar um observador de classe ou apenas checar o documento)
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  
  // Cores alvo em escala 0-1 para o feComponentTransfer
  // Light: #003049 (0, 0.188, 0.286)
  // Dark: #c9d1d9 (0.788, 0.820, 0.851)
  const colors = isDarkMode 
    ? { r: '0.788', g: '0.820', b: '0.851' } 
    : { r: '0', g: '0.188', b: '0.286' };

  return (
    <div className={`${containerClass} ${className}`}>
      {/* SVG Filter para colorização absoluta e agressiva */}
      <svg width="0" height="0" className="absolute pointer-events-none overflow-hidden h-0 w-0">
        <filter id="brand-recolor-final" colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR type="table" tableValues={`${colors.r} ${colors.r}`} />
            <feFuncG type="table" tableValues={`${colors.g} ${colors.g}`} />
            <feFuncB type="table" tableValues={`${colors.b} ${colors.b}`} />
          </feComponentTransfer>
        </filter>
      </svg>

      <div 
        className={`brand-loader-animation ${sizeClass} flex items-center justify-center relative`}
        style={sizeStyle}
      >
        {isClient ? (
          <div 
            className="w-full h-full transform-gpu"
            style={{ filter: 'url(#brand-recolor-final)' }}
          >
            <DotLottieReact
              src="/animations/Logo-xproducoes-eventos.lottie"
              loop
              autoplay
              className="w-full h-full block"
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
