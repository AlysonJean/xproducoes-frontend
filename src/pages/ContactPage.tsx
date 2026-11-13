import { useState } from 'react';
import ReactGA from 'react-ga4';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Phone, MapPin, Send, HelpCircle, CheckCircle2, MessageSquare } from 'lucide-react';
import { clsx } from 'clsx';
import { apiFetch } from '../services/api';
import { getWhatsAppPhone } from '../utils/whatsapp';
import {
  COMPANY_ADDRESS_LINE,
  COMPANY_CITY_LINE,
  COMPANY_CNPJ,
  COMPANY_POSTAL_CODE,
  COMPANY_REGISTERED_NAME,
  EXPERIENCE_SINCE,
  OPENING_HOURS_LABEL,
  SUPPORT_EMAIL,
  SUPPORT_RESPONSE_LABEL,
  formatPhoneDisplay,
} from '../data/site';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const whatsAppPhone = getWhatsAppPhone();
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

  // Achado: havia um "carregamento" falso de 800ms (sem dado nenhum para buscar). No SSR a página
  // saía sempre como "Contato / Preparando canais de atendimento", sem o formulário e sem <SEO>.
  return (
    <PageLayout
      title="Entre em Contato"
      description="Estamos aqui para ajudar você a tornar o seu evento inesquecível. Entre em contato conosco!"
    >
      <SEO 
        title="Fale Conosco - Orçamento de Som e Luz" 
        description="Solicite seu orçamento para aluguel de som, iluminação, estruturas e painel de LED (sob consulta). Atendimento pelo WhatsApp todos os dias, 24 horas, e também por e-mail e telefone."
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Informações de Contato */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-8 h-full shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-2xl font-bold mb-8 text-foreground flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" aria-hidden="true" />
              Canais de Contato
            </h2>

            {/* Achado: e-mail, telefone, endereço e CNPJ estavam escritos à mão aqui e em outros
                10 arquivos (com divergências) — agora vêm de src/data/site.ts e getWhatsAppPhone(). */}
            <div className="space-y-8">
              {/* Email */}
              <div className="flex items-start space-x-4 group">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 shadow-sm border border-primary/20">
                  <Mail className="w-6 h-6 text-primary" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground mb-1">Email</h3>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-muted-foreground text-sm hover:text-primary transition-colors break-all block">
                    {SUPPORT_EMAIL}
                  </a>
                  {/* Textos legais (13/11/2026): o prazo do Decreto 7.962/2013 (art. 4º), de src/data/site.ts. Era
                      "Respondemos em até 24h". */}
                  <p className="text-xs text-muted-foreground mt-1">{SUPPORT_RESPONSE_LABEL}</p>
                </div>
              </div>

              {/* WhatsApp (ícone na cor da marca WhatsApp — exceção de terceiros do guia) */}
              <div className="flex items-start space-x-4 group">
                <div className="w-12 h-12 bg-[#25D366]/10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 shadow-sm border border-[#25D366]/20">
                  <Phone className="w-6 h-6 text-[#25D366]" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">WhatsApp / Telefone</h3>
                  <a href={`https://wa.me/${whatsAppPhone}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground text-sm hover:text-primary transition-colors">
                    {formatPhoneDisplay(whatsAppPhone)}
                  </a>
                  <p className="text-xs text-muted-foreground mt-1">{OPENING_HOURS_LABEL}</p>
                </div>
              </div>

              {/* Endereço */}
              <div className="flex items-start space-x-4 group">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 shadow-sm border border-primary/20">
                  <MapPin className="w-6 h-6 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Localização</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {COMPANY_ADDRESS_LINE}<br />
                    {COMPANY_CITY_LINE}, CEP {COMPANY_POSTAL_CODE}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Atendemos toda a região</p>
                </div>
              </div>

              {/* CNPJ */}
              <div className="flex items-start space-x-4 group">
                <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border border-success/20">
                  <CheckCircle2 className="w-6 h-6 text-success" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Empresa Registrada</h3>
                  {/* Textos legais (13/11/2026): o nome empresarial do CNPJ junto do número. */}
                  <p className="text-muted-foreground text-sm">{COMPANY_REGISTERED_NAME}</p>
                  <p className="text-muted-foreground text-sm font-mono">CNPJ {COMPANY_CNPJ}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {EXPERIENCE_SINCE}
                  </p>
                </div>
              </div>
            </div>

            {/* Horários */}
            <div className="mt-8 p-6 bg-muted/50 rounded-2xl border border-border/50">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-muted-foreground">Horário de atendimento</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex justify-between">
                  <span>Atendimento pelo WhatsApp</span>
                  <span className="font-medium text-foreground">{OPENING_HOURS_LABEL}</span>
                </li>
              </ul>
            </div>
          </Card>
        </div>

        {/* Formulário */}
        <div className="lg:col-span-2">
          <Card className="p-8 shadow-sm">
            <h2 className="text-2xl font-bold mb-8 text-foreground">Envie sua Mensagem</h2>

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
                  placeholder="(31) 90000-0000"
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
                  <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
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
                    "text-xs font-medium transition-colors",
                    (messageValue?.length || 0) > 480 ? "text-destructive" : "text-muted-foreground"
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
                  leftIcon={!isSubmitting && <Send className="h-4 w-4" aria-hidden="true" />}
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
        <h2 className="text-2xl font-bold mb-10 text-center text-foreground flex items-center justify-center gap-2">
          <HelpCircle className="h-6 w-6 text-primary" aria-hidden="true" />
          Dúvidas Frequentes
        </h2>

        {/* Auditoria do orçamento (12/11/2026), E5, E12 e B14: "toda a logística e montagem técnica" e "suporte remoto
            ou presencial" valiam para tudo. A regra real (decisões da dona de 06 e 12/11): o kit de entrega inclui a
            entrega e a montagem, com frete só pelos km acima de 15 km; o equipamento avulso paga frete (a partir de
            R$ 50) e a montagem é à parte; o técnico no evento é um item do pedido. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center sm:text-left">
          <div className="space-y-3">
            <h3 className="text-foreground font-bold text-lg">Com quanta antecedência pedir?</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Recomendamos pedir o orçamento com 7 a 15 dias de antecedência. A data fica confirmada depois que você
              aceita a proposta e paga a parcela inicial.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-foreground font-bold text-lg">Fazem entrega e montagem?</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Nos kits de entrega, sim: a entrega, a montagem e a retirada estão incluídas, e o frete só é cobrado pelos
              km acima de 15 km da nossa sede. No equipamento avulso, o frete começa em R$ 50 e a montagem é à parte,
              pelo serviço de montagem do catálogo.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-foreground font-bold text-lg">Tem técnico durante o evento?</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Sim, como item do pedido: marque "Quero um técnico durante todo o evento" no orçamento. O valor segue as
              horas do evento, e alguns kits já trazem o técnico de som.
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default ContactPage;
