import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GlassCard } from './StandardComponents';
import { buttonVariants } from './Button';
import {
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Heart,
  Cake,
  Building2,
  GraduationCap,
  Music,
  Church,
  MoreHorizontal,
  User,
  Users,
  Globe,
  HelpCircle,
  Home,
  Tent,
  Sun,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { ENVIRONMENTS, EVENT_TYPES, GUEST_OVER_500, GUEST_RANGES, briefingHref } from '../../utils/briefing';

type Step = 'event_type' | 'audience_size' | 'environment' | 'result';

interface QuizState {
  eventType: string;
  audienceSize: string;
  environment: string;
}

// Auditoria do orçamento (12/11/2026), O27, E9 e B13: o teste mostrava uma "faixa estimada de investimento por diária"
// inventada (não vinha do catálogo e contradizia o kit por evento), públicos de "300 a 600" e "mais de 600" (o maior
// kit atende até 500), "Temos a configuração exata para você" e abria o WhatsApp sem gravar nada. Agora as opções são
// as do briefing (as mesmas palavras, para as respostas irem junto) e o botão final abre o briefing já preenchido.
const EVENT_ICONS: Record<string, LucideIcon> = {
  Casamento: Heart,
  'Aniversário ou 15 anos': Cake,
  Corporativo: Building2,
  Formatura: GraduationCap,
  'Show ou festival': Music,
  'Evento religioso': Church,
  Outro: MoreHorizontal,
};

const AUDIENCE_LABELS: Record<string, { label: string; sublabel: string; icon: LucideIcon }> = {
  'Até 50': { label: 'Até 50 pessoas', sublabel: 'Reunião, festa em casa', icon: User },
  '50 a 100': { label: '50 a 100 pessoas', sublabel: 'Festa pequena', icon: Users },
  '100 a 200': { label: '100 a 200 pessoas', sublabel: 'Festa média', icon: Users },
  '200 a 500': { label: '200 a 500 pessoas', sublabel: 'Festa grande', icon: Users },
  [GUEST_OVER_500]: { label: 'Mais de 500 pessoas', sublabel: 'Sob consulta', icon: Globe },
  'Ainda não sei': { label: 'Ainda não sei', sublabel: 'A equipe ajuda a estimar', icon: HelpCircle },
};

const ENVIRONMENT_LABELS: Record<string, { sublabel: string; icon: LucideIcon }> = {
  Fechado: { sublabel: 'Salão ou casa de festas', icon: Home },
  Coberto: { sublabel: 'Tenda ou área coberta e aberta', icon: Tent },
  'Ao ar livre': { sublabel: 'Sítio, fazenda, jardim', icon: Sun },
  'Ainda não sei': { sublabel: 'O local ainda não está definido', icon: HelpCircle },
};

export const InteractiveQuiz = () => {
  const [currentStep, setCurrentStep] = useState<Step>('event_type');
  const [answers, setAnswers] = useState<QuizState>({
    eventType: '',
    audienceSize: '',
    environment: ''
  });

  const eventTypes = EVENT_TYPES.map((id) => ({ id, label: id, icon: EVENT_ICONS[id] ?? MoreHorizontal }));
  const audienceSizes = GUEST_RANGES.map((id) => ({ id, ...(AUDIENCE_LABELS[id] ?? { label: id, sublabel: '', icon: Users }) }));
  const environments = ENVIRONMENTS.map((id) => ({ id, label: id, ...(ENVIRONMENT_LABELS[id] ?? { sublabel: '', icon: HelpCircle }) }));

  const handleSelect = (category: keyof QuizState, value: string) => {
    setAnswers(prev => ({ ...prev, [category]: value }));

    // Automatically advance with smooth transition
    if (category === 'eventType') setTimeout(() => setCurrentStep('audience_size'), 400);
    if (category === 'audienceSize') setTimeout(() => setCurrentStep('environment'), 400);
    if (category === 'environment') setTimeout(() => setCurrentStep('result'), 400);
  };

  const handleBack = () => {
    if (currentStep === 'audience_size') setCurrentStep('event_type');
    if (currentStep === 'environment') setCurrentStep('audience_size');
    if (currentStep === 'result') setCurrentStep('environment');
  };

  // O briefing lê estas respostas do endereço (utils/briefing: briefingPrefill) e abre no primeiro passo para conferir.
  const briefingLink = briefingHref({ eventType: answers.eventType, guests: answers.audienceSize, environment: answers.environment });
  const audienceLabel = AUDIENCE_LABELS[answers.audienceSize]?.label ?? answers.audienceSize;

  return (
    <GlassCard className="max-w-4xl mx-auto border-border/50 bg-card/80 backdrop-blur-2xl relative overflow-hidden shadow-xl">
      {/* Progress Bar - Theme Aware */}
      <div className="absolute top-0 left-0 h-1.5 bg-muted w-full z-50">
        <div
          className={`h-full bg-primary transition-all duration-1000 ease-in-out ${
            currentStep === 'event_type' ? 'w-[25%]' :
            currentStep === 'audience_size' ? 'w-[50%]' :
            currentStep === 'environment' ? 'w-[75%]' : 'w-full'
          }`}
        />
      </div>

      <div className="p-6 md:p-12">
        <div className="flex items-center justify-between mb-12">
          {currentStep !== 'event_type' ? (
            <button
              onClick={handleBack}
              className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all font-black uppercase text-xs tracking-widest"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Voltar
            </button>
          ) : <div className="w-16" />}

          <div className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-black uppercase tracking-[0.2em] text-primary">
            Passo {currentStep === 'event_type' ? '01' : currentStep === 'audience_size' ? '02' : currentStep === 'environment' ? '03' : 'Concluído'} / 03
          </div>

          <div className="w-16" />
        </div>

        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground uppercase leading-none italic">
            {currentStep === 'event_type' && 'Qual a natureza do evento?'}
            {currentStep === 'audience_size' && 'Quantas pessoas, mais ou menos?'}
            {currentStep === 'environment' && 'Como é o espaço físico?'}
            {currentStep === 'result' && 'Perfil Mapeado'}
          </h2>
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-8 bg-primary/30" />
            <p className="text-primary font-black uppercase text-[11px] tracking-[0.3em]">
              {currentStep === 'result'
                ? 'Próximo passo: o pedido de orçamento'
                : 'Três perguntas rápidas'}
            </p>
            <div className="h-px w-8 bg-primary/30" />
          </div>
        </div>

        {/* Mais alto que antes: 7 tipos de evento (os do briefing) e o resultado com dois botões; o cartão corta o que passa. */}
        {/* Auditoria do orçamento (12/11/2026), O27: os quatro passos ficam na página e só a opacidade muda; o que
            não está na tela fica inert (fora do Tab e do leitor de tela), inclusive o "Continuar o pedido" antes das
            três respostas. */}
        <div className="relative min-h-[640px] md:min-h-[500px]">
          {/* Step 1: Event Type */}
          <div inert={currentStep !== 'event_type'} className={`transition-all duration-500 absolute inset-0 pt-2 pb-6 overflow-y-auto ${currentStep === 'event_type' ? 'opacity-100 translate-y-0 pointer-events-auto scale-100' : 'opacity-0 translate-y-4 pointer-events-none scale-95'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eventTypes.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleSelect('eventType', opt.id)}
                  className={`group relative flex items-center gap-4 p-6 rounded-[2rem] border transition-all duration-300 text-left ${
                    answers.eventType === opt.id
                    ? 'bg-primary border-primary shadow-lg shadow-primary/20 translate-y-[-4px]'
                    : 'bg-muted/50 border-border hover:border-primary/50 hover:bg-muted'
                  }`}
                >
                  <div className={`p-4 rounded-2xl transition-all duration-300 ${
                    answers.eventType === opt.id ? 'bg-primary-foreground text-primary' : 'bg-primary/10 text-primary group-hover:scale-110'
                  }`}>
                    <opt.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <span className={`text-lg font-black uppercase tracking-tight transition-colors ${
                      answers.eventType === opt.id ? 'text-primary-foreground' : 'text-foreground'
                    }`}>{opt.label}</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 transition-all ${
                    answers.eventType === opt.id ? 'text-primary-foreground/50 group-hover:translate-x-1' : 'text-muted-foreground/30'
                  }`} />
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Audience Size */}
          <div inert={currentStep !== 'audience_size'} className={`transition-all duration-500 absolute inset-0 pt-2 pb-6 overflow-y-auto ${currentStep === 'audience_size' ? 'opacity-100 translate-y-0 pointer-events-auto scale-100' : 'opacity-0 translate-y-4 pointer-events-none scale-95'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {audienceSizes.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleSelect('audienceSize', opt.id)}
                  className={`group flex items-center gap-6 p-6 rounded-[2rem] border transition-all duration-300 text-left ${
                    answers.audienceSize === opt.id
                    ? 'bg-primary border-primary shadow-lg shadow-primary/20'
                    : 'bg-muted/50 border-border hover:border-primary/50 hover:bg-muted'
                  }`}
                >
                  <div className={`p-4 rounded-2xl transition-all ${
                    answers.audienceSize === opt.id ? 'bg-primary-foreground text-primary' : 'bg-primary/10 text-primary group-hover:scale-110'
                  }`}>
                    <opt.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-lg font-black uppercase tracking-tight leading-none ${
                        answers.audienceSize === opt.id ? 'text-primary-foreground' : 'text-foreground'
                    }`}>{opt.label}</p>
                    <p className={`text-xs font-bold uppercase tracking-widest mt-1 opacity-60 ${
                        answers.audienceSize === opt.id ? 'text-primary-foreground/80' : 'text-primary'
                    }`}>{opt.sublabel}</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${
                    answers.audienceSize === opt.id ? 'text-primary-foreground/50' : 'text-muted-foreground/30'
                  }`} />
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Environment */}
          <div inert={currentStep !== 'environment'} className={`transition-all duration-500 absolute inset-0 pt-2 pb-6 overflow-y-auto ${currentStep === 'environment' ? 'opacity-100 translate-y-0 pointer-events-auto scale-100' : 'opacity-0 translate-y-4 pointer-events-none scale-95'}`}>
            <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
              {environments.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleSelect('environment', opt.id)}
                  className={`group flex items-center gap-6 p-6 rounded-[2rem] border transition-all duration-300 text-left ${
                    answers.environment === opt.id
                    ? 'bg-primary border-primary shadow-lg shadow-primary/20'
                    : 'bg-muted/50 border-border hover:border-primary/50 hover:bg-muted'
                  }`}
                >
                  <div className={`p-4 rounded-2xl transition-all ${
                    answers.environment === opt.id ? 'bg-primary-foreground text-primary' : 'bg-primary/10 text-primary group-hover:scale-110'
                  }`}>
                    <opt.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-lg font-black uppercase tracking-tight leading-none ${
                        answers.environment === opt.id ? 'text-primary-foreground' : 'text-foreground'
                    }`}>{opt.label}</p>
                    <p className={`text-xs font-bold uppercase tracking-widest mt-1 opacity-60 ${
                        answers.environment === opt.id ? 'text-primary-foreground/80' : 'text-primary'
                    }`}>{opt.sublabel}</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${
                    answers.environment === opt.id ? 'text-primary-foreground/50' : 'text-muted-foreground/30'
                  }`} />
                </button>
              ))}
            </div>
          </div>

          {/* Step 4: Result */}
          <div inert={currentStep !== 'result'} className={`transition-all duration-700 absolute inset-0 flex flex-col items-center justify-center ${currentStep === 'result' ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none'}`}>
            <div className="relative mb-10">
                <div className="absolute inset-0 bg-primary blur-3xl opacity-20 animate-pulse" />
                <div className="relative h-28 w-28 bg-primary/10 rounded-[3rem] flex items-center justify-center border border-primary/20">
                  <Sparkles className="w-12 h-12 text-primary animate-bounce" />
                </div>
            </div>

            <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter mb-4 text-center">Agora é só contar os detalhes.</h3>

            <div className="mb-8 w-full max-w-lg space-y-3 text-center">
              {answers.eventType && answers.audienceSize && answers.environment && (
                <p className="text-foreground font-semibold">
                  {answers.eventType} • {audienceLabel} • {answers.environment}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Levamos estas respostas para o pedido de orçamento. Lá você informa a data, o local e o que precisa, e a
                equipe confere a disponibilidade e manda a proposta.
              </p>
              {answers.audienceSize === GUEST_OVER_500 && (
                <p className="text-sm text-muted-foreground">
                  Para mais de 500 pessoas, o projeto é sob consulta: conte os detalhes no pedido e a equipe responde.
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link
                to={briefingLink}
                className="group relative px-12 py-6 bg-primary text-primary-foreground text-xl font-black rounded-full hover:bg-primary/90 hover:scale-105 transition-all duration-500 shadow-xl shadow-primary/20 flex items-center gap-4 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                CONTINUAR O PEDIDO
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </Link>
              <Link to="/kits" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                Ver kits
              </Link>
            </div>

            <p className="mt-8 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground max-w-sm text-center leading-relaxed">
              Proposta sem compromisso • Você acompanha o pedido pelo site
            </p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
