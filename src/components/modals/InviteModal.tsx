import React from 'react';
import { BaseModal } from './BaseModal';
import { Button } from '../ui/StandardComponents';

export const InviteModal: React.FC<{
  isOpen: boolean;
  onClose?: () => void;
  onResend?: () => void;
  inviteUrl?: string;
  tempPassword?: string;
}> = ({ isOpen, onClose, onResend, inviteUrl, tempPassword }) => {
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
       
      console.log('copied');
    } catch (e) {
       
      console.error('failed copy', e);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Convite criado" size="md">
      <div className="space-y-4">
        {tempPassword && (
          <div>
            <p className="text-sm">Senha temporária:</p>
            <p className="font-mono bg-gray-100 p-2 rounded mt-1">{tempPassword}</p>
          </div>
        )}

        {inviteUrl && (
          <div>
            <p className="text-sm">Link de convite:</p>
            <div className="flex gap-2 mt-1">
              <input readOnly value={inviteUrl} className="flex-1 border rounded px-3 py-2" aria-label="invite-url" />
              <Button onClick={() => copy(inviteUrl)}>Copiar</Button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          {onResend && (
            <Button variant="outline" onClick={onResend}>
              Reenviar convite
            </Button>
          )}
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default InviteModal;
