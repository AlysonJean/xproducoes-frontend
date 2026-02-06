// packages/web/src/shared/modals/WhatsAppModal.tsx
import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { BaseModalProps } from '../../types/types';
import { Button, Textarea } from '../ui/StandardComponents';
import { getWhatsAppPhone, normalizePhone, openWhatsApp } from '../../utils/whatsapp';

interface WhatsAppModalProps extends BaseModalProps {
  phoneNumber?: string;
  message?: string;
  subject?: string;
  isLoading?: boolean;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  phoneNumber = '+351123456789',
  message = '',
  subject = '',
  title = 'Contato via WhatsApp',
  isLoading = false,
  ...props
}) => {
  const [customMessage, setCustomMessage] = useState<string>(message);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');

  const messageTemplates = {
    custom: {
      label: 'Mensagem personalizada',
      text: customMessage,
    },
    booking: {
      label: 'Fazer reserva',
      text: 'Olá! Gostaria de fazer uma reserva de equipamento. Podem me ajudar?',
    },
    quote: {
      label: 'Pedir orçamento',
      text: 'Olá! Gostaria de receber um orçamento para o meu evento. Podem me contactar?',
    },
    support: {
      label: 'Suporte técnico',
      text: 'Olá! Preciso de ajuda com um equipamento. Podem me dar suporte?',
    },
    info: {
      label: 'Informações gerais',
      text: 'Olá! Gostaria de saber mais sobre os vossos serviços. Podem me ajudar?',
    },
    urgent: {
      label: 'Urgente',
      text: 'Olá! Tenho uma questão urgente. Podem me contactar rapidamente?',
    },
  };

  const handleSendWhatsApp = () => {
    const selectedText = messageTemplates[selectedTemplate as keyof typeof messageTemplates].text;
    const finalMessage = selectedTemplate === 'custom' ? customMessage : selectedText;

    const formattedMessage = subject ? `*${subject}*\n\n${finalMessage}` : finalMessage;

    const number = phoneNumber ? normalizePhone(phoneNumber) : getWhatsAppPhone();
    openWhatsApp(number, formattedMessage);
    if (onClose) onClose();
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('351')) {
      return `+351 ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
    }
    return phone;
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={title} size="md" {...props}>
      <div className="space-y-4">
        {/* WhatsApp Info */}
        <div className="flex items-center space-x-3 p-4 bg-success/10 border border-green-200 rounded-lg">
          <div className="w-12 h-12 bg-success/100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-green-900">WhatsApp Business</h3>
            <p className="text-sm text-success">{formatPhoneNumber(phoneNumber)}</p>
          </div>
        </div>

        {/* Message Templates */}
        <div>
          <label className="block text-sm font-medium text-card-foreground mb-2">
            Escolha um modelo de mensagem
          </label>
          <div className="space-y-2">
            {Object.entries(messageTemplates).map(([key, template]) => (
              <label key={key} className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="template"
                  value={key}
                  checked={selectedTemplate === key}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSelectedTemplate(e.target.value)
                  }
                  className="h-4 w-4 text-success focus:ring-green-500 border"
                />
                <span className="text-sm text-card-foreground">{template.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Custom Message */}
        {selectedTemplate === 'custom' && (
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1">Sua mensagem</label>
            <Textarea
              value={customMessage}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomMessage(e.target.value)}
              rows={4}
              placeholder="Digite sua mensagem personalizada..."
            />
          </div>
        )}

        {/* Message Preview */}
        <div>
          <label className="block text-sm font-medium text-card-foreground mb-1">Pré-visualização</label>
          <div className="p-3 bg-muted border rounded-md">
            <div className="text-sm text-card-foreground whitespace-pre-wrap">
              {subject && <div className="font-medium mb-2">{subject}</div>}
              {selectedTemplate === 'custom'
                ? customMessage || 'Digite sua mensagem...'
                : messageTemplates[selectedTemplate as keyof typeof messageTemplates].text}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <Button
            type="button"
            variant="success"
            onClick={handleSendWhatsApp}
            isLoading={isLoading}
            disabled={isLoading || (selectedTemplate === 'custom' && !customMessage.trim())}
            fullWidth
          >
            Abrir WhatsApp
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            fullWidth
          >
            Cancelar
          </Button>
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground text-center">
          Ao clicar em "Abrir WhatsApp", você será redirecionado para o WhatsApp
        </div>
      </div>
    </BaseModal>
  );
};
