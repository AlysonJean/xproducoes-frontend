import { useState } from 'react';
import { GlassCard } from './StandardComponents';
import { 
  ChevronRight, 
  ArrowLeft, 
  Send, 
  Heart, 
  Star, 
  Building2, 
  GraduationCap, 
  PartyPopper, 
  MoreHorizontal,
  User,
  Users,
  Globe,
  Home,
  Sun,
  Combine,
  Sparkles
} from 'lucide-react';
import { getWhatsAppPhone } from '../../utils/whatsapp';

type Step = 'event_type' | 'audience_size' | 'environment' | 'result';

interface QuizState {
  eventType: string;
  audienceSize: string;
  environment: string;
}

export const InteractiveQuiz = () => {
  const [currentStep, setCurrentStep] = useState<Step>('event_type');
  const [answers, setAnswers] = useState<QuizState>({
    eventType: '',
    audienceSize: '',
    environment: ''
  });

  const eventTypes = [
    { id: 'Casamento', label: 'Casamento', icon: Heart, color: 'text-primary' },
    { id: 'Festa de 15 Anos', label: 'Festa de 15 Anos', icon: Star, color: 'text-primary' },
    { id: 'Evento Corporativo', label: 'Evento Corporativo', icon: Building2, color: 'text-primary' },
    { id: 'Formatura', label: 'Formatura', icon: GraduationCap, color: 'text-primary' },
    { id: 'Festa Particular', label: 'Festa Particular', icon: PartyPopper, color: 'text-primary' },
    { id: 'Outro', label: 'Outro', icon: MoreHorizontal, color: 'text-muted-foreground' },
  ];

  const audienceSizes = [
    { id: 'Até 100 pessoas', label: 'Projeto Íntimo', sublabel: 'Até 100 pessoas', icon: User },
    { id: '100 - 300 pessoas', label: 'Médio Porte', sublabel: '100 a 300 pessoas', icon: Users },
    { id: '300 - 600 pessoas', label: 'Grande Escala', sublabel: '300 a 600 pessoas', icon: Users },
    { id: 'Mais de 600 pessoas', label: 'Festival / Mega Evento', sublabel: 'Mais de 600 convidados', icon: Globe },
  ];

  const environments = [
    { id: 'Salão Fechado', label: 'Salão Fechado', sublabel: 'Acústica controlada', icon: Home },
    { id: 'Ambiente Aberto', label: 'Ambiente Aberto', sublabel: 'Sítio, fazenda, ar livre', icon: Sun },
    { id: 'Misto', label: 'Semi-aberto / Misto', sublabel: 'Áreas internas e externas', icon: Combine },
  ];

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

  const generateWhatsAppMessage = () => {
    const message = `Olá! Fiz o teste no site e gostaria de um orçamento pré-qualificado.\n\n*Meu evento:*\n📍 Formato: ${answers.eventType}\n👥 Público: ${answers.audienceSize}\n🏛️ Local: ${answers.environment}\n\nPodem me ajudar com a infraestrutura ideal?`;
    return `https://wa.me/${getWhatsAppPhone()}?text=${encodeURIComponent(message)}`;
  };



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
              className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all font-black uppercase text-[10px] tracking-widest"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
              Voltar
            </button>
          ) : <div className="w-16" />}

          <div className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-[0.2em] text-primary animate-pulse">
            Passo {currentStep === 'event_type' ? '01' : currentStep === 'audience_size' ? '02' : currentStep === 'environment' ? '03' : 'Concluído'} / 03
          </div>
          
          <div className="w-16" />
        </div>

        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground uppercase leading-none italic">
            {currentStep === 'event_type' && 'Qual a natureza do evento?'}
            {currentStep === 'audience_size' && 'Qual a magnitude do público?'}
            {currentStep === 'environment' && 'Como é o espaço físico?'}
            {currentStep === 'result' && 'Perfil Mapeado'}
          </h2>
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-8 bg-primary/30" />
            <p className="text-primary font-black uppercase text-[11px] tracking-[0.3em]">
              {currentStep === 'result' 
                ? 'Engenharia de som e luz pronta' 
                : 'Configuração em tempo real'}
            </p>
            <div className="h-px w-8 bg-primary/30" />
          </div>
        </div>

        <div className="relative min-h-[550px] md:min-h-[400px]">
          {/* Step 1: Event Type */}
          <div className={`transition-all duration-500 absolute inset-0 pt-2 ${currentStep === 'event_type' ? 'opacity-100 translate-y-0 pointer-events-auto scale-100' : 'opacity-0 translate-y-4 pointer-events-none scale-95'}`}>
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
          <div className={`transition-all duration-500 absolute inset-0 pt-2 pb-6 overflow-y-auto ${currentStep === 'audience_size' ? 'opacity-100 translate-y-0 pointer-events-auto scale-100' : 'opacity-0 translate-y-4 pointer-events-none scale-95'}`}>
            <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
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
                    <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 opacity-60 ${
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
          <div className={`transition-all duration-500 absolute inset-0 pt-2 pb-6 overflow-y-auto ${currentStep === 'environment' ? 'opacity-100 translate-y-0 pointer-events-auto scale-100' : 'opacity-0 translate-y-4 pointer-events-none scale-95'}`}>
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
                    <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 opacity-60 ${
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
          <div className={`transition-all duration-700 absolute inset-0 flex flex-col items-center justify-center ${currentStep === 'result' ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none'}`}>
            <div className="relative mb-10">
                <div className="absolute inset-0 bg-primary blur-3xl opacity-20 animate-pulse" />
                <div className="relative h-28 w-28 bg-primary/10 rounded-[3rem] flex items-center justify-center border border-primary/20">
                  <Sparkles className="w-12 h-12 text-primary animate-bounce" />
                </div>
            </div>
            
            <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter mb-4 text-center">Temos a configuração exata para você.</h3>
            
            <a 
              href={generateWhatsAppMessage()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="group relative px-12 py-6 bg-primary text-primary-foreground text-xl font-black rounded-full hover:bg-primary/90 hover:scale-105 transition-all duration-500 shadow-xl shadow-primary/20 flex items-center gap-4 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              SOLICITAR PROPOSTA AGORA
              <Send className="w-6 h-6 group-hover:translate-x-2 group-hover:-translate-y-1 transition-transform" />
            </a>
            
            <p className="mt-8 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground max-w-sm text-center leading-relaxed">
              Atendimento prioritário • Suporte técnico imediato • Projeto personalizado
            </p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
