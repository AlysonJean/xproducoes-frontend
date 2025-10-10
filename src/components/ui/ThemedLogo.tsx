import React, { useEffect, useMemo, useState } from 'react';
import { normalizeString } from '../../utils/string';

interface ThemedLogoProps {
  src: string;
  className?: string;
  title?: string;
}

// Sanitiza SVG e aplica currentColor para permitir mudança de cor via CSS
function sanitizeSvg(svg: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');

    // Remove scripts por segurança
    doc.querySelectorAll('script').forEach((el) => el.remove());
    
    // Remove atributos perigosos
    doc.querySelectorAll('*').forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        if (attr.name.startsWith('on')) {
          el.removeAttribute(attr.name);
        }
      });
    });

    // Aplica currentColor em elementos pintáveis, respeitando 'none' e ignorando defs/gradients
    const skipTags = new Set([
      'defs', 'lineargradient', 'radialgradient', 'stop', 'clippath', 
      'mask', 'filter', 'pattern', 'metadata', 'symbol'
    ]);
    
    doc.querySelectorAll('*').forEach((el: any) => {
      const tag = normalizeString(el.tagName);
      if (skipTags.has(tag)) return;
      
  const fill = el.getAttribute('fill');
  if (fill && normalizeString(fill) !== 'none' && normalizeString(fill) !== 'currentcolor') {
        el.setAttribute('fill', 'currentColor');
      }
      
  const stroke = el.getAttribute('stroke');
  if (stroke && normalizeString(stroke) !== 'none' && normalizeString(stroke) !== 'currentcolor') {
        el.setAttribute('stroke', 'currentColor');
      }
    });

    const svgEl = doc.querySelector('svg');
    if (svgEl) {
      // Permitir que o tamanho seja controlado via CSS
      const hasViewBox = svgEl.hasAttribute('viewBox');
      if (hasViewBox) {
        svgEl.removeAttribute('width');
        svgEl.removeAttribute('height');
      }
      
      // Aplicar classe para estilização
      const existingClass = svgEl.getAttribute('class') || '';
      const nextClass = `${existingClass} themed-logo-svg`.trim();
      svgEl.setAttribute('class', nextClass);
    }

    const serializer = new XMLSerializer();
    return serializer.serializeToString(doc);
  } catch (error) {
    console.error('Erro ao sanitizar SVG:', error);
    return svg;
  }
}

export const ThemedLogo: React.FC<ThemedLogoProps> = ({ src, className = '', title }) => {
  const [inlineSvg, setInlineSvg] = useState<string | null>(null);
  const [inlineSvgNode, setInlineSvgNode] = useState<React.ReactNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const proxiedSrc = useMemo(() => {
    // Se for um caminho local (começando com /), usar diretamente
    if (src.startsWith('/')) {
      return src;
    }
    
    try {
      const url = new URL(src);
      const isCloudinary = /(^|\.)cloudinary\.com$/i.test(url.hostname) ||
                          /(^|\.)res\.cloudinary\.com$/i.test(url.hostname);

      // Para Cloudinary, usar proxy para checar Content-Type e inline SVG
      if (isCloudinary) {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
        const query = new URLSearchParams({ url: src });
        return `${apiBase}/api/logo/svg-proxy?${query.toString()}`;
      }
      return src;
    } catch {
      return src;
    }
  }, [src]);

  // Verificar se é um caminho local (não Cloudinary, não URL externa)
  const isLocalPath = useMemo(() => {
    if (!src.startsWith('/')) return false;
    // Verificar se não é uma URL absoluta disfarçada
    try {
      new URL(src);
      return false; // É uma URL válida
    } catch {
      return true; // É um caminho relativo local
    }
  }, [src]);

  useEffect(() => {
    // SVGs locais (public/) não precisam de fetch/sanitização
    if (isLocalPath) {
      setIsLoading(false);
      setHasError(false);
      return;
    }
    
    let isActive = true;
    setIsLoading(true);
    setHasError(false);
    setInlineSvg(null);

    // Tentar buscar e detectar se é SVG pelo Content-Type ou conteúdo
    // Adicionar header x-svg-proxy-token se for proxy Cloudinary
    const fetchOptions: RequestInit = {};
  if (proxiedSrc.includes('/api/logo/svg-proxy?')) {
      fetchOptions.headers = {
        'x-svg-proxy-token': import.meta.env.VITE_SVG_PROXY_TOKEN || 'svg-proxy-dev-token',
      };
    }
    fetch(proxiedSrc, fetchOptions)
      .then(async (response) => {
        if (!isActive) return;
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();
        const seemsSvg = contentType.includes('image/svg') || /<svg[\s\S]*>/i.test(text);
        
        if (seemsSvg) {
          const sanitized = sanitizeSvg(text);
          // Converter SVG sanitizado em elementos React para evitar uso de innerHTML
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(sanitized, 'image/svg+xml');
            const svgEl = doc.querySelector('svg');
            if (svgEl) {
              const node = convertDomNodeToReact(svgEl);
              setInlineSvgNode(node);
              setInlineSvg(sanitized);
            } else {
              setInlineSvgNode(null);
              setInlineSvg(null);
            }
          } catch (e) {
            console.error('Erro ao converter SVG para React nodes:', e);
            setInlineSvgNode(null);
            setInlineSvg(null);
          }
        } else {
          // Não é SVG, usar fallback de imagem
          setInlineSvgNode(null);
          setInlineSvg(null);
        }
      })
      .catch((error) => {
        if (!isActive) return;
        console.error('Erro ao carregar logo:', error);
        setHasError(true);
        setInlineSvg(null);
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [proxiedSrc, isLocalPath]);

  // Para caminhos locais, usar img diretamente
  if (isLocalPath) {
    return (
      <img
        src={src}
        alt={title || 'Logo'}
        className={`h-8 lg:h-10 w-auto object-contain ${className}`}
      />
    );
  }

  if (isLoading) {
    return (
      <div className={`bg-muted rounded animate-pulse ${className}`}>
        <div className="h-8 w-16 bg-muted-foreground/20 rounded"></div>
      </div>
    );
  }

  if (hasError) {
    // Tentar usar logo local como fallback final
    return (
      <img
        src="/xproducoes-logo.svg"
        alt={title || 'Logo'}
        className={`h-8 lg:h-10 w-auto object-contain ${className}`}
        onError={(e) => {
          // Se até a logo local falhar, mostrar texto
          e.currentTarget.style.display = 'none';
          const parent = e.currentTarget.parentElement;
          if (parent) {
            const textFallback = document.createElement('span');
            textFallback.className = `font-semibold text-foreground ${className}`;
            textFallback.textContent = title || 'X Produçoes e Eventos';
            parent.appendChild(textFallback);
          }
        }}
      />
    );
  }

  if (!inlineSvg) {
    // Fallback para <img> quando não for SVG ou falhar o fetch
    // Usar SafeImage para ter fallback automático
    return (
      <img
        src={src}
        alt={title || 'Logo'}
        className={`h-8 lg:h-10 w-auto object-contain ${className}`}
        onError={(e) => {
          console.warn('Failed to load logo from:', src, '- trying local fallback');
          // Tentar logo local como fallback
          e.currentTarget.src = '/xproducoes-logo.svg';
          e.currentTarget.onerror = () => {
            // Se até a logo local falhar, esconder
            e.currentTarget.style.display = 'none';
            const parent = e.currentTarget.parentElement;
            if (parent) {
              const textFallback = document.createElement('span');
              textFallback.className = `font-semibold text-foreground ${className}`;
              textFallback.textContent = title || 'X Produçoes e Eventos';
              parent.appendChild(textFallback);
            }
          };
        }}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center leading-none text-current min-h-8 ${className}`}
      role="img"
      aria-label={title || 'Logo'}
    >
      {inlineSvgNode || <span className="h-8 w-16 bg-muted rounded" aria-hidden />}
    </span>
  );
};

// Converte um nó DOM (SVG) para elementos React recursivamente
function convertDomNodeToReact(node: any): React.ReactNode {
  if (!node) return null;
  const nodeType = node.nodeType;
  // Text node
  if (nodeType === 3) {
    return node.nodeValue;
  }
  if (nodeType !== 1) return null; // não-elemento

  const tagName = normalizeString(node.tagName);
  const attrs: { [key: string]: any } = {};
  Array.from(node.attributes || []).forEach((attr: any) => {
    const name = attr.name === 'class' ? 'className' : attr.name;
    attrs[name] = attr.value;
  });

  const children: React.ReactNode[] = [];
  node.childNodes && Array.from(node.childNodes).forEach((child: any, idx: number) => {
    const childNode = convertDomNodeToReact(child);
    if (childNode === null || childNode === undefined) return;

    // Se for um elemento React, garantir que tenha uma key única para evitar warnings
    if (React.isValidElement(childNode)) {
      try {
        const key = `${tagName}-${idx}`;
        children.push(React.cloneElement(childNode as React.ReactElement, { key }));
        return;
      } catch (e) {
        // fallback para empurrar sem clone
      }
    }

    children.push(childNode);
  });

  // Garantir que cada child element React tenha uma key (evita warnings do React)
  const normalizedChildren = children.length
    ? children.map((c, i) => {
        if (React.isValidElement(c)) {
          const el = c as React.ReactElement;
          if (el.key == null) {
            try {
              return React.cloneElement(el, { key: `${tagName}-${i}` });
            } catch (e) {
              return c;
            }
          }
        }
        return c;
      })
    : undefined;

  return React.createElement(tagName, attrs, normalizedChildren as any);
}

export default ThemedLogo;
