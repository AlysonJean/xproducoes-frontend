import React, { useState } from 'react';
import ReactGA from 'react-ga4';
import { useRevealOnView } from '../hooks/useRevealOnView';
import { apiFetch } from '../services/api';
import { useNotifications } from '../contexts/NotificationContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { PageLayout } from '../components/layouts/PageLayout';
import { Button } from '../components/ui/StandardComponents';
import { BrandLoader } from '../components/ui/BrandLoader';
import { SEO } from '../components/SEO';



export const ContactPage = () => {
  const { ref: infoTitleRef } = useRevealOnView<HTMLHeadingElement>({ threshold: 0.2 });
  const { ref: formTitleRef } = useRevealOnView<HTMLHeadingElement>({ threshold: 0.2 });
  const { ref: faqTitleRef } = useRevealOnView<HTMLHeadingElement>({ threshold: 0.2 });
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    eventType: '',
    eventDate: '',
    budget: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(true);

  // Simular carregamento inicial para mostrar skeleton
  useState(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    // Limpa o erro do campo quando o usuário começa a digitar
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formState.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formState.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formState.email)) {
      newErrors.email = 'Email inválido';
    }
    if (!formState.message.trim()) newErrors.message = 'Mensagem é obrigatória';
    if (formState.message.length < 10)
      newErrors.message = 'Mensagem deve ter pelo menos 10 caracteres';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      addNotification({
        type: 'error',
        title: 'Erro no formulário',
        message: 'Por favor, corrija os erros no formulário',
      });
      // GA Tracking
      ReactGA.event({
        category: "contact",
        action: "form_validation_error",
        label: "contact_page"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await apiFetch('/contact', {
        method: 'POST',
        body: JSON.stringify(formState),
      });

      // GA Tracking
      ReactGA.event({
        category: "contact",
        action: "form_submit_success",
        label: formState.eventType || "general_inquiry"
      });

      addNotification({
        type: 'success',
        title: 'Mensagem enviada!',
        message: 'Sua mensagem foi enviada com sucesso. Entraremos em contato em breve!',
      });

      // Reset form
      setFormState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        eventType: '',
        eventDate: '',
        budget: '',
      });
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
        <div className="lg:col-span-1">
          <div className="bg-card border border-border p-8 rounded-xl h-full shadow-sm">
            <h2 ref={infoTitleRef} className="text-2xl font-bold mb-8 text-foreground heading-elegant">
              Informações de Contato
            </h2>

            <div className="space-y-8">
              {/* Email */}
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <svg
                    className="w-6 h-6 text-primary-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Email</h3>
                  <p className="text-muted-foreground text-sm">suporte@xproducoeseventos.com.br</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Respondemos em até 24h
                  </p>
                </div>
              </div>

              {/* Telefone */}
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Telefone</h3>
                  <p className="text-muted-foreground text-sm">(31) 98925-2272</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Seg-Sex, 9h às 18h</p>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">WhatsApp</h3>
                  <p className="text-muted-foreground text-sm">(31) 98925-2272</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Disponível 24/7</p>
                </div>
              </div>

              {/* Endereço */}
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <svg
                    className="w-6 h-6 text-primary-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Localização</h3>
                  <p className="text-muted-foreground text-sm">Rua flor d'agua 407 Jardim Alvorada Belo Horizonte MG</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Atendemos toda a região
                  </p>
                </div>
              </div>

              {/* CNPJ */}
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-success to-success/80 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Empresa Registrada</h3>
                  <p className="text-muted-foreground text-sm font-mono">CNPJ: 55.343.824/0001-56</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Empresa legal e registrada, com mais de 10 anos de experiência
                  </p>
                </div>
              </div>
            </div>

            {/* Horários de Funcionamento */}
            <div className="mt-8 p-6 bg-gradient-to-r from-muted/30 to-muted/20 rounded-xl border border-border/50">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Horário de Funcionamento</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex justify-between">
                  <span>Segunda a Sexta:</span>
                  <span className="font-medium">9h às 18h</span>
                </li>
                <li className="flex justify-between">
                  <span>Sábado:</span>
                  <span className="font-medium">9h às 15h</span>
                </li>
                <li className="flex justify-between">
                  <span>Domingo:</span>
                  <span className="font-medium">Plantão</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border p-8 rounded-xl shadow-sm">
            <h2 ref={formTitleRef} className="text-2xl font-bold mb-8 text-foreground heading-elegant">Envie sua Mensagem</h2>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Informações Pessoais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-3">Nome *</label>
                  <input
                    type="text"
                    name="name"
                    value={formState.name}
                    onChange={handleChange}
                    className={`w-full bg-background border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 ${
                      errors.name
                        ? 'border-red-500'
                        : 'border-border hover:border-border/80'
                    }`}
                    placeholder="Seu nome completo"
                  />
                  {errors.name && <p className="text-red-400 text-sm mt-2">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-3">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formState.email}
                    onChange={handleChange}
                    className={`w-full bg-background border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 ${
                      errors.email
                        ? 'border-red-500'
                        : 'border-border hover:border-border/80'
                    }`}
                    placeholder="seu@email.com"
                  />
                  {errors.email && <p className="text-red-400 text-sm mt-2">{errors.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-3">Telefone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formState.phone}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-border/80 transition-all duration-200"
                    placeholder="(31) 98925-2272"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-3">Assunto</label>
                  <select
                    name="subject"
                    value={formState.subject}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-border/80 transition-all duration-200"
                    title="Selecione o assunto do seu contato"
                    aria-label="Assunto do contato"
                  >
                    <option value="">Selecione um assunto</option>
                    <option value="orcamento">Orçamento</option>
                    <option value="duvida">Dúvida sobre equipamentos</option>
                    <option value="suporte">Suporte técnico</option>
                    <option value="parceria">Parceria</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>

              {/* Informações do Evento */}
              <div className="bg-gradient-to-r from-muted/30 to-muted/20 p-6 rounded-xl border border-border/50">
                <h3 className="text-foreground font-semibold mb-6 text-lg">Informações do Evento (Opcional)</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Tipo de Evento
                    </label>
                    <select
                      name="eventType"
                      value={formState.eventType}
                      onChange={handleChange}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-border/80 transition-all duration-200"
                      title="Selecione o tipo de evento"
                      aria-label="Tipo de evento"
                    >
                      <option value="">Selecione</option>
                      <option value="casamento">Casamento</option>
                      <option value="festa-aniversario">Festa de Aniversário</option>
                      <option value="evento-corporativo">Evento Corporativo</option>
                      <option value="formatura">Formatura</option>
                      <option value="show-musical">Show Musical</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Data do Evento
                    </label>
                    <input
                      type="date"
                      name="eventDate"
                      value={formState.eventDate}
                      onChange={handleChange}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-border/80 transition-all duration-200"
                      title="Selecione a data do evento"
                      aria-label="Data do evento"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Orçamento Aproximado
                    </label>
                    <select
                      name="budget"
                      value={formState.budget}
                      onChange={handleChange}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-border/80 transition-all duration-200"
                      title="Selecione o orçamento aproximado"
                      aria-label="Orçamento aproximado"
                    >
                      <option value="">Selecione</option>
                      <option value="ate-1000">Até R$ 1.000</option>
                      <option value="1000-3000">R$ 1.000 - R$ 3.000</option>
                      <option value="3000-5000">R$ 3.000 - R$ 5.000</option>
                      <option value="5000-10000">R$ 5.000 - R$ 10.000</option>
                      <option value="acima-10000">Acima de R$ 10.000</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Mensagem */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">Mensagem *</label>
                <textarea
                  name="message"
                  value={formState.message}
                  onChange={handleChange}
                  rows={6}
                  className={`w-full bg-background border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-border/80 transition-all duration-200 resize-none ${
                    errors.message
                      ? 'border-red-500'
                      : 'border-border'
                  }`}
                  placeholder="Descreva detalhes do seu evento, equipamentos necessários, ou qualquer dúvida que tenha..."
                />
                {errors.message && <p className="text-red-400 text-sm mt-2">{errors.message}</p>}
                <p className="text-muted-foreground text-sm mt-2">
                  {formState.message.length}/500 caracteres
                </p>
              </div>

              {/* Botão de Envio */}
              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  variant="primary"
                  size="lg"
                  className="min-w-[200px]"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                      <span>Enviar Mensagem</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* FAQ Rápido */}
      <div className="bg-gradient-to-r from-card to-card/80 border border-border p-8 rounded-xl shadow-sm">
  <h2 ref={faqTitleRef} className="text-2xl font-bold mb-8 text-center text-foreground heading-elegant">Perguntas Frequentes</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-gradient-to-br from-muted/30 to-muted/20 p-6 rounded-xl border border-border/50 hover:shadow-lg transition-all duration-200">
            <h3 className="text-foreground font-semibold mb-3 text-lg">
              Qual o prazo mínimo para reserva?
            </h3>
            <p className="text-muted-foreground">
              Recomendamos reservar com pelo menos 7 dias de antecedência para garantir
              disponibilidade.
            </p>
          </div>

          <div className="bg-gradient-to-br from-muted/30 to-muted/20 p-6 rounded-xl border border-border/50 hover:shadow-lg transition-all duration-200">
            <h3 className="text-foreground font-semibold mb-3 text-lg">Fazem entrega?</h3>
            <p className="text-muted-foreground">
              Sim, fazemos entrega e retirada dos equipamentos. Taxa varia conforme a distância.
            </p>
          </div>

          <div className="bg-gradient-to-br from-muted/30 to-muted/20 p-6 rounded-xl border border-border/50 hover:shadow-lg transition-all duration-200">
            <h3 className="text-foreground font-semibold mb-3 text-lg">
              E se houver problemas técnicos?
            </h3>
            <p className="text-muted-foreground">
              Oferecemos suporte técnico 24h durante seu evento e equipamentos reserva.
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};
