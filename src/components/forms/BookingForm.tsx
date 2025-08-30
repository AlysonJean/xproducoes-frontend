import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Form, 
  FormSection, 
  FormActions, 
  Input, 
  Select, 
  Textarea, 
  Button, 
  Alert 
} from '../ui/StandardComponents';

// Zod schema for form validation
const quoteRequestSchema = z.object({
  eventType: z.string().min(1, 'Tipo de evento é obrigatório'),
  eventDate: z.string().min(1, 'Data do evento é obrigatória'),
  location: z.string().min(1, 'Local do evento é obrigatório'),
  guestCount: z.number().min(1, 'O número de convidados é obrigatório'),
  clientName: z.string().min(1, 'Nome é obrigatório'),
  clientEmail: z.string().email('Email inválido'),
  clientPhone: z.string().min(1, 'Telefone é obrigatório'),
  description: z.string().optional(),
  budget: z.string().optional(),
  equipmentIds: z.array(z.string()).optional(),
  kitIds: z.array(z.string()).optional(),
});

type QuoteRequestFormData = z.infer<typeof quoteRequestSchema>;

interface BookingFormProps {
  onSubmit: (data: QuoteRequestFormData) => void | Promise<void>;
  isSubmitting?: boolean;
  serverError?: string;
}

export const BookingForm = ({ onSubmit, isSubmitting, serverError }: BookingFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<QuoteRequestFormData>({
    resolver: zodResolver(quoteRequestSchema),
    defaultValues: {
      eventType: 'OTHER',
      eventDate: '',
      location: '',
      guestCount: 1,
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      description: '',
      budget: '',
      equipmentIds: [],
      kitIds: [],
    },
  });

  const eventTypeOptions = [
    { value: '', label: 'Selecione o tipo de evento' },
    { value: 'WEDDING', label: 'Casamento' },
    { value: 'CORPORATE', label: 'Corporativo' },
    { value: 'BIRTHDAY', label: 'Aniversário' },
    { value: 'OTHER', label: 'Outro' },
  ];

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <FormSection 
        title="Detalhes do Evento"
        description="Informações básicas sobre seu evento"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Tipo de Evento"
            {...register('eventType')}
            options={eventTypeOptions}
            error={errors.eventType?.message}
            placeholder="Selecione o tipo de evento"
          />

          <Input
            label="Data do Evento"
            type="date"
            {...register('eventDate')}
            error={errors.eventDate?.message}
          />
        </div>

        <Input
          label="Local do Evento"
          {...register('location')}
          error={errors.location?.message}
          placeholder="Digite o endereço ou nome do local"
        />

        <Input
          label="Número de Convidados"
          type="number"
          min="1"
          {...register('guestCount', { valueAsNumber: true })}
          error={errors.guestCount?.message}
          placeholder="Ex: 50"
          description="Aproximadamente quantas pessoas participarão do evento"
        />
      </FormSection>

      <FormSection 
        title="Informações de Contato"
        description="Dados para entrarmos em contato com você"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Nome Completo"
            {...register('clientName')}
            error={errors.clientName?.message}
            placeholder="Digite seu nome completo"
          />

          <Input
            label="Email"
            type="email"
            {...register('clientEmail')}
            error={errors.clientEmail?.message}
            placeholder="seu@email.com"
          />
        </div>

        <Input
          label="Telefone"
          type="tel"
          {...register('clientPhone')}
          error={errors.clientPhone?.message}
          placeholder="(11) 99999-9999"
          description="Incluir DDD para contato mais rápido"
        />
      </FormSection>

      <FormSection 
        title="Detalhes Adicionais"
        description="Informações extras sobre seu evento (opcional)"
      >
        <Textarea
          label="Descrição do Evento"
          {...register('description')}
          rows={4}
          placeholder="Descreva detalhes do seu evento, estilo, preferências especiais, equipamentos específicos..."
          description="Opcional - nos ajuda a preparar um orçamento mais preciso"
        />

        <Input
          label="Orçamento Estimado"
          {...register('budget')}
          placeholder="Ex: R$ 5.000,00"
          description="Opcional - range de investimento previsto para ajudar na customização"
        />
      </FormSection>

      {/* Server Error */}
      {serverError && (
        <Alert variant="error" title="Erro no envio">
          <p>{serverError}</p>
        </Alert>
      )}

      <FormActions>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          disabled={isSubmitting}
          fullWidth
        >
          {isSubmitting ? 'Enviando...' : 'Solicitar Orçamento'}
        </Button>
      </FormActions>
    </Form>
  );
};
