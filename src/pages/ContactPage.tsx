import { useState, useEffect } from 'react';
import ReactGA from 'react-ga4';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Phone, MapPin, Send, HelpCircle, CheckCircle2, MessageSquare } from 'lucide-react';
import { clsx } from 'clsx';
import { useRevealOnView } from '../hooks/useRevealOnView';
import { apiFetch } from '../services/api';
import { useNotifications } from '../contexts/NotificationContext';
import { PageLayout } from '../components/layouts/PageLayout';
import { 
  Button, 
  Input, 
  Select, 
  Textarea, 
  Card, 
  Form, 
} from '../components/ui/StandardComponents';
import { BrandLoader } from '../components/ui/BrandLoader';
import { SEO } from '../components/SEO';

const contactSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  subject: z.string().min(1, 'Selecione um assunto'),
  message: z.string().min(10, 'Mensagem deve ter pelo menos 10 caracteres').max(500, 'Máximo 500 caracteres'),
  eventType: z.string().optional(),
  eventDate: z.string().optional(),
  budget: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

export const ContactPage = () => {
  const { ref: infoTitleRef } = useRevealOnView<HTMLHeadingElement>({ threshold: 0.2 });
  const { ref: formTitleRef } = useRevealOnView<HTMLHeadingElement>({ threshold: 0.2 });
  const { ref: faqTitleRef } = useRevealOnView<HTMLHeadingElement>({ threshold: 0.2 });
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addNotification } = useNotifications();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
      eventType: '',
      eventDate: '',
      budget: '',
    },
  });

  const messageValue = watch('message');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      await apiFetch('/contact', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      ReactGA.event({
        category: "contact",
        action: "form_submit_success",
        label: data.eventType || "general_inquiry"
      });

      addNotification({
        type: 'success',
        title: 'Mensagem enviada!',
        message: 'Sua mensagem foi enviada com sucesso. Entraremos em contato em breve!',
      });

      reset();
    } catch (err: unknown) {
      addNotification({
        type: 'error',
        title: 'Erro ao enviar',
        message: err instanceof Error ? err.message : 'Ocorreu um erro ao enviar sua mensagem',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Contato" description="Preparando canais de atendimento.">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Preparando contato..." />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Entre em Contato"
      description="Estamos aqui para ajudar você a tornar o seu evento inesquecível. Entre em contato conosco!"
    >
      <SEO 
        title="Fale Conosco - Orçamento de Som e Luz" 
        description="Solicite seu orçamento para aluguel de som, iluminação e painel de LED. Atendimento rápido e personalizado via WhatsApp, E-mail ou Telefone."
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Informações de Contato */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-8 h-full shadow-sm hover:shadow-md transition-shadow">
            <h2 ref={infoTitleRef} className="text-2xl font-bold mb-8 text-foreground heading-elegant flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              Canais de Contato
            </h2>

            <div className="space-y-8">
              {/* Email */}
              <div className="flex items-start space-x-4 group">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 shadow-sm border border-primary/20">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground mb-1">Email</h3>
                  <a href="mailto:suporte@xproducoeseventos.com.br" className="text-muted-foreground text-sm hover:text-primary transition-colors truncate block">
                    suporte@xproducoeseventos.com.br
                  </a>
                  <p className="text-xs text-muted-foreground/70 mt-1">Respondemos em até 24h</p>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="flex items-start space-x-4 group">
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 shadow-sm border border-green-500/20">
                  <Phone className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">WhatsApp / Telefone</h3>
                  <a href="https://wa.me/5531989252272" target="_blank" rel="noopener noreferrer" className="text-muted-foreground text-sm hover:text-green-600 transition-colors">
                    (31) 98925-2272
                  </a>
                  <p className="text-xs text-muted-foreground/70 mt-1">Seg-Sex, 9h às 18h | Plantão FDS</p>
                </div>
              </div>

              {/* Endereço */}
              <div className="flex items-start space-x-4 group">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 shadow-sm border border-primary/20">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Localização</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Rua Flor d'Água, 407, Jardim Alvorada<br />
                    Belo Horizonte - MG
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Atendemos toda a região</p>
                </div>
              </div>

              {/* CNPJ */}
              <div className="flex items-start space-x-4 group">
                <div className="w-12 h-12 bg-green-600/10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border border-green-600/20">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Empresa Registrada</h3>
                  <p className="text-muted-foreground text-sm font-mono">55.343.824/0001-56</p>
                  <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">
                    Mais de 10 anos de experiência no mercado de eventos
                  </p>
                </div>
              </div>
            </div>

            {/* Horários */}
            <div className="mt-8 p-6 bg-muted/50 rounded-2xl border border-border/50">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-foreground/70">Horários</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex justify-between border-b border-border/50 pb-2">
                  <span>Segunda a Sexta</span>
                  <span className="font-medium text-foreground">9h às 18h</span>
                </li>
                <li className="flex justify-between border-b border-border/50 pb-2">
                  <span>Sábado</span>
                  <span className="font-medium text-foreground">9h às 15h</span>
                </li>
                <li className="flex justify-between">
                  <span>Domingo</span>
                  <span className="font-medium text-primary">Plantão</span>
                </li>
              </ul>
            </div>
          </Card>
        </div>

        {/* Formulário */}
        <div className="lg:col-span-2">
          <Card className="p-8 shadow-sm">
            <h2 ref={formTitleRef} className="text-2xl font-bold mb-8 text-foreground heading-elegant">Envie sua Mensagem</h2>

            <Form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Nome completo *"
                  {...register('name')}
                  error={errors.name?.message}
                  placeholder="Como gostaria de ser chamado?"
                />

                <Input
                  label="E-mail *"
                  type="email"
                  {...register('email')}
                  error={errors.email?.message}
                  placeholder="seu@email.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Telefone (WhatsApp)"
                  type="tel"
                  {...register('phone')}
                  error={errors.phone?.message}
                  placeholder="(31) 98925-2272"
                />

                <Select
                  label="Assunto *"
                  {...register('subject')}
                  error={errors.subject?.message}
                  options={[
                    { value: '', label: 'Selecione um assunto' },
                    { value: 'orcamento', label: 'Orçamento' },
                    { value: 'duvida', label: 'Dúvida sobre equipamentos' },
                    { value: 'suporte', label: 'Suporte técnico' },
                    { value: 'parceria', label: 'Parceria' },
                    { value: 'outro', label: 'Outro' },
                  ]}
                />
              </div>

              {/* Informações do Evento */}
              <div className="p-6 bg-muted/30 rounded-2xl border border-border/50 space-y-6">
                <h3 className="text-foreground font-semibold text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Detalhes do Evento (Opcional)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Select
                    label="Tipo de Evento"
                    {...register('eventType')}
                    options={[
                      { value: '', label: 'Selecione' },
                      { value: 'casamento', label: 'Casamento' },
                      { value: 'festa-aniversario', label: 'Festa de Aniversário' },
                      { value: 'evento-corporativo', label: 'Evento Corporativo' },
                      { value: 'formatura', label: 'Formatura' },
                      { value: 'show-musical', label: 'Show Musical' },
                      { value: 'outro', label: 'Outro' },
                    ]}
                  />

                  <Input
                    label="Data do Evento"
                    type="date"
                    {...register('eventDate')}
                  />

                  <Select
                    label="Orçamento Aproximado"
                    {...register('budget')}
                    options={[
                      { value: '', label: 'Selecione' },
                      { value: 'ate-1000', label: 'Até R$ 1.000' },
                      { value: '1000-3000', label: 'R$ 1.000 - R$ 3.000' },
                      { value: '3000-5000', label: 'R$ 3.000 - R$ 5.000' },
                      { value: '5000-10000', label: 'R$ 5.000 - R$ 10.000' },
                      { value: 'acima-10000', label: 'Acima de R$ 10.000' },
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Textarea
                  label="Sua Mensagem *"
                  {...register('message')}
                  error={errors.message?.message}
                  rows={5}
                  placeholder="Conte-nos detalhes sobre o seu evento, equipamentos que precisa, local e horários..."
                />
                <div className="flex justify-end pr-2">
                  <span className={clsx(
                    "text-[10px] font-medium transition-colors",
                    (messageValue?.length || 0) > 480 ? "text-destructive" : "text-muted-foreground/50"
                  )}>
                    {messageValue?.length || 0} / 500
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  size="lg"
                  isLoading={isSubmitting}
                  leftIcon={!isSubmitting && <Send className="h-4 w-4" />}
                  className="min-w-[220px]"
                >
                  Enviar Mensagem
                </Button>
              </div>
            </Form>
          </Card>
        </div>
      </div>

      {/* FAQ Rápido */}
      <div className="mt-12 p-8 bg-card border border-border rounded-2xl shadow-sm">
        <h2 ref={faqTitleRef} className="text-2xl font-bold mb-10 text-center text-foreground heading-elegant flex items-center justify-center gap-2">
          <HelpCircle className="h-6 w-6 text-primary" />
          Dúvidas Frequentes
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center sm:text-left">
          <div className="space-y-3">
            <h3 className="text-foreground font-bold text-lg">Qual o prazo para reserva?</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Recomendamos reservar com pelo menos 7 a 15 dias de antecedência para garantir a disponibilidade total.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-foreground font-bold text-lg">Fazem entrega e montagem?</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Sim! Nossa equipe cuida de toda a logística e montagem técnica no local do evento.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-foreground font-bold text-lg">Suporte técnico no evento?</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Oferecemos suporte remoto ou presencial (opcional) durante toda a duração do seu evento.
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default ContactPage;
