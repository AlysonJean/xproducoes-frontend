import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Alert } from '../ui/Alert';
import { logger } from '../../utils/logger';

// Achado (auditoria do design system): a senha temporária ficava num `bg-gray-100` sem cor de texto
// — no tema escuro, texto branco sobre cinza claro (ilegível) justamente no dado que o admin precisa
// copiar. O link usava um <input> cru com aria-label "invite-url" e "Copiar" não dava retorno.
export const InviteModal: React.FC<{
  isOpen: boolean;
  onClose?: () => void;
  onResend?: () => void;
  inviteUrl?: string;
  tempPassword?: string;
  /** D3: aviso junto do link (ex.: o e-mail com o link não saiu e o admin precisa mandar). */
  notice?: string;
}> = ({ isOpen, onClose, onResend, inviteUrl, tempPassword, notice }) => {
  const [copied, setCopied] = useState(false);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      logger.error('failed copy', 'InviteModal', e);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => onClose?.()} title="Convite criado" size="md">
      <div className="space-y-4">
        {notice && <Alert variant="warning" description={notice} />}

        {tempPassword && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Senha temporária:</p>
            <p className="rounded-lg border border-border bg-muted px-3 py-2 font-mono text-sm text-foreground break-all">
              {tempPassword}
            </p>
          </div>
        )}

        {inviteUrl && (
          <div className="flex items-end gap-2">
            <Input readOnly value={inviteUrl} label="Link de convite" size="sm" onFocus={(e) => e.currentTarget.select()} />
            <Button
              type="button"
              size="sm"
              onClick={() => copy(inviteUrl)}
              leftIcon={copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            >
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
        )}

        {/* Anuncia "copiado" para leitor de tela. */}
        <p className="sr-only" role="status" aria-live="polite">
          {copied ? 'Link copiado' : ''}
        </p>

        <div className="flex justify-end gap-2 mt-4">
          {onResend && (
            <Button type="button" variant="outline" size="sm" onClick={onResend}>
              Reenviar convite
            </Button>
          )}
          <Button type="button" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default InviteModal;
