import React from 'react';
import Lottie from 'lottie-react';

// Importar JSON diretamente via fetch para evitar problemas de tipagem
// O arquivo está em public/animations/brand-loader.json
import { useEffect, useState } from 'react';

interface BrandLoaderProps {
  /** Tamanho do loader em pixels */
  size?: number;
  /** Classe CSS adicional */
  className?: string;
  /** Texto exibido abaixo do loader */
  label?: string;
  /** Se deve ocupar a tela inteira (centralizado) */
  fullScreen?: boolean;
}

/**
 * Componente de loading animado com a marca X Produções
 * Usa animação Lottie exportada do After Effects
 */
const BrandLoader: React.FC<BrandLoaderProps> = ({
  size = 120,
  className = '',
  label,
  fullScreen = false,
}) => {
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    fetch('/animations/brand-loader.json')
      .then((res) => res.json())
      .then(setAnimationData)
      .catch(console.error);
  }, []);

  const containerClass = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50'
    : 'flex flex-col items-center justify-center';

  // Fallback enquanto carrega a animação
  if (!animationData) {
    return (
      <div className={`${containerClass} ${className}`}>
        <div 
          className="animate-pulse rounded-full bg-primary/20"
          style={{ width: size, height: size }}
        />
        {label && (
          <p className="mt-3 text-sm text-muted-foreground animate-pulse">
            {label}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`${containerClass} ${className}`}>
      <div style={{ width: size, height: size }}>
        <Lottie
          animationData={animationData}
          loop={true}
          autoplay={true}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      {label && (
        <p className="mt-3 text-sm text-muted-foreground animate-pulse">
          {label}
        </p>
      )}
    </div>
  );
};

export default BrandLoader;
