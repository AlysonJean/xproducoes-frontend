// packages/web/src/shared/modals/ShareModal.tsx
import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { BaseModalProps } from '../../types/types';

interface ShareModalProps extends BaseModalProps {
  url?: string;
  title?: string;
  description?: string;
  onShare?: (platform: string) => void;
  imageUrl?: string;
  customPlatforms?: SharePlatform[];
}

interface SharePlatform {
  name: string;
  icon: string;
  url: string;
  /** Fundo + texto (classes completas). Cores de marca de terceiros são exceção legítima. */
  color: string;
}

export const ShareModal: React.FC<ShareModalProps> = (props) => {
  const {
    isOpen,
    onClose,
    url,
    title: shareTitle = 'Compartilhar',
    description = 'Confira este conteúdo',
    onShare,
    imageUrl,
    customPlatforms = [],
  } = props;
  const safeUrl = url || '';
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const encodedUrl = encodeURIComponent(safeUrl);
  const encodedTitle = encodeURIComponent(shareTitle);
  const encodedDescription = encodeURIComponent(description);

  const defaultPlatforms: SharePlatform[] = [
    {
      name: 'Facebook',
      icon: '📘',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: 'bg-[#1877F2] text-white hover:bg-[#166FE5]',
    },
    {
      name: 'Twitter',
      icon: '🐦',
      url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      color: 'bg-black text-white hover:bg-black/80',
    },
    {
      name: 'LinkedIn',
      icon: '💼',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: 'bg-[#0A66C2] text-white hover:bg-[#004182]',
    },
    {
      name: 'WhatsApp',
      icon: '💬',
      url: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      color: 'bg-[#25D366] text-black hover:bg-[#1EBE5A]',
    },
    {
      name: 'Telegram',
      icon: '✈️',
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      color: 'bg-[#229ED9] text-black hover:bg-[#1C8BC0]',
    },
    {
      name: 'Email',
      icon: '📧',
      url: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%20${encodedUrl}`,
      color: 'bg-primary text-primary-foreground hover:bg-primary/90',
    },
  ];

  const platforms = [...defaultPlatforms, ...customPlatforms];

  const handlePlatformClick = (platform: SharePlatform) => {
    setSelectedPlatform(platform.name);
    window.open(platform.url, '_blank', 'width=600,height=400');

    if (onShare) {
      onShare(platform.name);
    }

    // Reset selection after a short delay
    setTimeout(() => setSelectedPlatform(null), 1000);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(safeUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // Silenciar erro para evitar console.log
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: description,
          url: safeUrl,
        });
        if (onShare) {
          onShare('native');
        }
      } catch {
        // Silenciar erro para evitar console.log
      }
    }
  };

  return (
    <Modal isOpen={!!isOpen} onClose={() => onClose?.()} title={shareTitle} size="md">
      <div className="space-y-4">
        {/* Content Preview */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-start space-x-3">
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Preview"
                className="w-16 h-16 object-cover rounded-md flex-shrink-0"
              />
            )}
            <div className="flex-1">
              <h3 className="font-medium text-foreground mb-1">{shareTitle}</h3>
              <p className="text-sm text-muted-foreground mb-2">{description}</p>
              <p className="text-xs text-muted-foreground truncate">{safeUrl}</p>
            </div>
          </div>
        </div>

        {/* Native Share (if available) */}
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <Button
            type="button"
            size="sm"
            fullWidth
            onClick={handleNativeShare}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
              />
            </svg>
            <span>Compartilhar</span>
          </Button>
        )}

        {/* Platform Buttons */}
        <div>
          <h4 className="text-sm font-medium text-card-foreground mb-3">Compartilhar em:</h4>
          <div className="grid grid-cols-2 gap-2">
            {platforms.map((platform) => (
              <button
                key={platform.name}
                type="button"
                onClick={() => handlePlatformClick(platform)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background ${platform.color} ${
                  selectedPlatform === platform.name ? 'opacity-75' : ''
                }`}
                disabled={selectedPlatform === platform.name}
              >
                <span className="text-lg" aria-hidden="true">{platform.icon}</span>
                <span className="font-medium">{platform.name}</span>
                {selectedPlatform === platform.name && (
                  <div className="ml-auto">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Copy Link */}
        <div className="border-t border-border pt-4">
          <label htmlFor="share-modal-link" className="block text-sm font-medium text-card-foreground mb-2">Ou copie o link:</label>
          <div className="flex rounded-md shadow-sm">
            <input
              id="share-modal-link"
              type="text"
              value={safeUrl}
              readOnly
              className="flex-1 min-w-0 px-3 py-2 border border-input rounded-l-md bg-muted text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-4 py-2 border-l-0 border border-input rounded-r-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                copySuccess
                  ? 'bg-success text-success-foreground'
                  : 'bg-muted text-card-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {copySuccess ? (
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>Copiado!</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Copiar</span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Achado (auditoria do design system): havia um botão "Gerar código QR" sem ação
            (onClick vazio, "implementar futuramente") — removido; botão morto não aparece. */}

        {/* Share Statistics (if available) */}
        <div className="text-center text-xs text-muted-foreground">
          Compartilhe este conteúdo com seus amigos e colegas
        </div>
      </div>
    </Modal>
  );
};
