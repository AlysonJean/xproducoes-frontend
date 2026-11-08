import React, { useEffect, useState, useMemo } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import brandLottieUrl from '../../assets/animations/Logo-xproducoes-eventos.lottie?url';

type LoaderSize = 'sm' | 'md' | 'lg' | 'xl' | number;

interface BrandLoaderProps {
  /** Tamanho do loader: 'sm' (80px), 'md' (120px), 'lg' (180px), 'xl' (240px) ou número em pixels */
  size?: LoaderSize;
  /** Classe CSS adicional */
  className?: string;
  /** Texto do carregamento — não aparece na tela (pedido de design), mas é anunciado a leitores de tela */
  label?: string;
  /** Se deve ocupar a tela inteira (centralizado) */
  fullScreen?: boolean;
}

// Um download do .lottie para todas as instâncias. Com `src`, cada player baixava o arquivo
// sozinho — o painel admin, com vários cards carregando juntos, pedia 8 vezes em paralelo
// (sem cache, porque as requisições saem ao mesmo tempo). Falhou: libera para tentar de novo.
// D8b (aprovada em 02/11/2026): o arquivo entra pelo build (?url), com um hash no nome, e vai para /assets, onde o
// navegador guarda por 1 ano e só baixa de novo quando o arquivo muda. Antes ficava em /animations, com o nome fixo,
// e a regra geral do vercel.json anulava o cache longo.
const BRAND_LOTTIE_URL = brandLottieUrl;
let brandLottieBytes: Promise<ArrayBuffer> | null = null;

function loadBrandLottie(): Promise<ArrayBuffer> {
  brandLottieBytes ??= fetch(BRAND_LOTTIE_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.arrayBuffer();
    })
    .catch((error: unknown) => {
      brandLottieBytes = null;
      throw error;
    });
  return brandLottieBytes;
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
  label,
  fullScreen = false,
}) => {
  const [isClient, setIsClient] = useState(false);
  // undefined = baixando; null = download falhou (o player tenta sozinho pelo src)
  const [lottieData, setLottieData] = useState<ArrayBuffer | null | undefined>(undefined);

  useEffect(() => {
    const timer = setTimeout(() => setIsClient(true), 20);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let active = true;
    loadBrandLottie()
      // Cópia por instância: o player não pode compartilhar (nem esvaziar) o buffer dos outros.
      .then((bytes) => { if (active) setLottieData(bytes.slice(0)); })
      .catch(() => { if (active) setLottieData(null); });
    return () => { active = false; };
  }, []);
  
  const sizeClass = useMemo(() => {
    if (typeof size === 'number') return '';
    return SIZE_MAP[size] || SIZE_MAP.lg;
  }, [size]);

  const containerClass = fullScreen
    ? 'fixed inset-0 flex flex-col items-center justify-center bg-background z-[9999]'
    : 'flex flex-col items-center justify-center relative';



  // Determinar cores para o filtro baseado no tema (pode-se usar um observador de classe ou apenas checar o documento)
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  
  // Cores alvo em escala 0-1 para o feComponentTransfer
  // Light: #003049 (0, 0.188, 0.286)
  // Dark: #c9d1d9 (0.788, 0.820, 0.851)
  const colors = isDarkMode 
    ? { r: '0.788', g: '0.820', b: '0.851' } 
    : { r: '0', g: '0.188', b: '0.286' };

  return (
    // role="status": o carregamento é anunciado (antes, nenhum loading do app era).
    <div className={`${containerClass} ${className}`} role="status" aria-live="polite">
      <span className="sr-only">{label || 'Carregando…'}</span>
      {isClient && (
        <div
          // Tamanho numérico via style: a classe montada em tempo de execução (`w-[140px]`) não existe
          // no CSS gerado pelo Tailwind, e o loader ficava sem tamanho.
          className={`brand-loader-animation flex items-center justify-center relative ${sizeClass}`}
          style={typeof size === 'number' ? { width: size, height: size } : undefined}
          aria-hidden="true"
        >
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

          <div className="w-full h-full transform-gpu brand-loader-filter-layer">
            {lottieData !== undefined && (
              <DotLottieReact
                {...(lottieData ? { data: lottieData } : { src: BRAND_LOTTIE_URL })}
                loop
                autoplay
                className="w-full h-full block"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export { BrandLoader };
export default BrandLoader;
