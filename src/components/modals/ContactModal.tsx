/* eslint-disable react-hooks/incompatible-library */
import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FormModal } from './FormModal';
import { ContactModalProps, ContactType } from '../../types/types';
import { Input, Textarea, Button, FormSection, Alert } from '../ui/StandardComponents';
import { AttachmentIcon, ClockIcon } from '../icons/index';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 5;
const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
];

const contactFormSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  email: z.string().email('Por favor, insira um email válido.'),
  phone: z.string().optional().default(''),
  subject: z.string().min(5, 'O assunto deve ter pelo menos 5 caracteres.'),
  message: z.string().min(10, 'A mensagem deve ter pelo menos 10 caracteres.'),
  urgent: z.boolean().default(false),
  type: z
    .enum(['general', 'quote', 'complaint', 'partnership', 'support', 'other'])
    .default('general'),
});

type ContactFormSchema = z.infer<typeof contactFormSchema>;

const contactTypesConfig: { value: ContactType; label: string; icon: string }[] = [
  { value: 'quote', label: 'Pedido de Orçamento', icon: '💰' },
  { value: 'complaint', label: 'Reclamação', icon: '⚠️' },
  { value: 'partnership', label: 'Parceria', icon: '🤝' },
  { value: 'support', label: 'Suporte', icon: '🛠️' },
  { value: 'general', label: 'Geral', icon: '✉️' },
  { value: 'other', label: 'Outro', icon: '📋' },
];

const subjectSuggestions: Record<ContactType, string[]> = {
  quote: ['Pedido de orçamento para evento', 'Solicitação de cotação', 'Dúvida sobre valores'],
  complaint: ['Problema com equipamento', 'Dificuldade no site', 'Erro na reserva'],
  partnership: ['Parceria comercial', 'Fornecedor de equipamentos', 'Colaboração em eventos'],
  support: ['Problema técnico', 'Ajuda com reserva', 'Dificuldade de acesso'],
  general: ['Informação geral', 'Dúvida sobre funcionamento', 'Outro'],
  other: ['Sugestão de melhoria', 'Feedback sobre serviço', 'Outro assunto'],
};

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  initialData,
  contactType = 'general',
  title = 'Entrar em Contato',
  ...props
}) => {
  const [attachments, setAttachments] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  const {
    register,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      ...initialData,
      type: initialData?.type || contactType,
      urgent: initialData?.urgent ?? false,
    },
  });

    const selectedType = watch('type');

  useEffect(() => {
    if (initialData) {
      reset({
        ...initialData,
        type: initialData.type || contactType,
        urgent: initialData.urgent || false,
      });
      setAttachments(initialData.attachments || []);
    }
  }, [initialData, contactType, reset]);

  const handleFormSubmit: SubmitHandler<ContactFormSchema> = (data) => {
    if (fileErrors.length > 0) {
      // Prevent submission if there are file errors
      return;
    }
    // Garante que attachments é passado corretamente
    onSubmit({ ...data, attachments } as ContactFormSchema & { attachments: File[] });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    const newErrors: string[] = [];

    if (attachments.length + files.length > MAX_FILES) {
      newErrors.push(`Você pode anexar no máximo ${MAX_FILES} arquivos.`);
    }

    const validFiles = files.filter((file) => {
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        newErrors.push(`Arquivo '${file.name}' tem um formato não suportado.`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        newErrors.push(`Arquivo '${file.name}' excede o tamanho máximo de 5MB.`);
        return false;
      }
      return true;
    });

    setFileErrors(newErrors);
    if (newErrors.length === 0) {
      setAttachments((prev) => [...prev, ...validFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const renderResponseType = () => {
    switch (selectedType) {
      case 'support':
        return '(Suporte: até 4 horas)';
      case 'complaint':
        return '(Reclamações: até 12 horas)';
      default:
        return '';
    }
  };

  // onSubmit do FormModal espera dados do formulário, não evento
  // Adapta o onSubmit do FormModal para aceitar dados crus do formulário
  const handleFormModalSubmit = (rawData: unknown) => {
    const data = rawData as Record<string, unknown>;
    handleFormSubmit({
      ...data,
      urgent: data.urgent === 'on' || data.urgent === true,
      type: (data.type as ContactType) || contactType,
    } as ContactFormSchema);
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleFormModalSubmit}
      title={title}
      isLoading={isLoading}
      submitText="Enviar Mensagem"
      size="lg"
      {...props}
    >
      <div className="space-y-4">
        <FormSection 
          title="Tipo de Contato"
          className="mb-6"
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {contactTypesConfig.map((type) => (
              <Button
                key={type.value}
                type="button"
                variant={selectedType === type.value ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setValue('type', type.value)}
                className="p-3 text-left"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{type.icon}</span>
                  <span className="text-sm font-medium">{type.label}</span>
                </div>
              </Button>
            ))}
          </div>
        </FormSection>

        <FormSection title="Informações Pessoais">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome Completo"
              {...register('name')}
              error={errors.name?.message}
              placeholder="Digite seu nome completo"
              required
            />
            <Input
              label="Email"
              type="email"
              {...register('email')}
              error={errors.email?.message}
              placeholder="Digite seu e-mail"
              required
            />
          </div>

          <Input
            label="Telefone"
            type="tel"
            {...register('phone')}
            placeholder="Digite seu telefone (opcional)"
            description="Opcional - para contato mais rápido"
          />
        </FormSection>

        <FormSection title="Detalhes da Mensagem">
          <Input
            label="Assunto"
            {...register('subject')}
            error={errors.subject?.message}
            placeholder="Descreva brevemente o motivo do contato"
            list="subject-suggestions"
            required
          />
          <datalist id="subject-suggestions">
            {(subjectSuggestions[selectedType as ContactType] || []).map((suggestion: string) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>

          <Textarea
            label="Mensagem"
            {...register('message')}
            error={errors.message?.message}
            rows={5}
            placeholder="Descreva detalhadamente sua solicitação, dúvida ou comentário..."
            required
          />

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              {...register('urgent')}
              className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
              id="urgent-checkbox"
            />
            <label htmlFor="urgent-checkbox" className="text-sm text-foreground font-medium">
              Este é um assunto urgente
            </label>
          </div>
        </FormSection>

        <FormSection title="Anexos">
          <Input
            type="file"
            label="Anexar arquivos"
            multiple
            onChange={handleFileChange}
            accept={ACCEPTED_FILE_TYPES.join(',')}
            description={`Máximo ${MAX_FILES} arquivos. Formatos aceitos: PDF, DOC, TXT, JPG, PNG (máx. 5MB cada)`}
          />
          
          {fileErrors.length > 0 && (
            <Alert variant="error" title="Erros nos arquivos">
              <div className="space-y-1">
                {fileErrors.map((error, index) => (
                  <p key={index} className="text-sm">{error}</p>
                ))}
              </div>
            </Alert>
          )}

          {attachments.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Arquivos Selecionados</h4>
              <div className="space-y-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-card border border-border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <AttachmentIcon className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <span className="text-sm font-medium text-foreground">{file.name}</span>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </FormSection>

        <Alert variant="info" title="Outras formas de contato">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="space-y-2">
              <p className="flex items-center gap-2">
                <span>📞</span> <strong>Telefone:</strong> +351 123 456 789
              </p>
              <p className="flex items-center gap-2">
                <span>📧</span> <strong>Email:</strong> <span>suporte@xproducoeseventos.com.br</span>
              </p>
            </div>
            <div className="space-y-2">
              <p className="flex items-center gap-2">
                <span>📍</span> <strong>Endereço:</strong> Rua das Produções, 123, Lisboa
              </p>
              <p className="flex items-center gap-2">
                <span>🕐</span> <strong>Horário:</strong> Segunda a Sexta, 9h às 18h
              </p>
            </div>
          </div>
        </Alert>

        <Alert variant="default">
          <div className="flex items-center space-x-2">
            <ClockIcon className="w-5 h-5 text-muted-foreground" />
            <p className="text-sm">
              <strong>Tempo de resposta:</strong> Até 24 horas em dias úteis {renderResponseType()}
            </p>
          </div>
        </Alert>
      </div>
    </FormModal>
  );
};
