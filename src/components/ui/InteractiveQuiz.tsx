import { useState } from 'react';
import { GlassCard } from './StandardComponents';
import { 
  ChevronRight, 
  ArrowLeft, 
  ArrowRight, 
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
    { id: 'Casamento', label: 'Casamento', icon: Heart, color: 'text-rose-400' },
    { id: 'Festa de 15 Anos', label: 'Festa de 15 Anos', icon: Star, color: 'text-amber-400' },
    { id: 'Evento Corporativo', label: 'Evento Corporativo', icon: Building2, color: 'text-blue-400' },
    { id: 'Formatura', label: 'Formatura', icon: GraduationCap, color: 'text-indigo-400' },
    { id: 'Festa Particular', label: 'Festa Particular', icon: PartyPopper, color: 'text-emerald-400' },
    { id: 'Outro', label: 'Outro', icon: MoreHorizontal, color: 'text-slate-400' },
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

  const progressValue = 
    currentStep === 'event_type' ? '25%' :
    currentStep === 'audience_size' ? '50%' :
    currentStep === 'environment' ? '75%' : '100%';

  return (
    <GlassCard className="max-w-4xl mx-auto border-white/10 bg-zinc-950/80 backdrop-blur-2xl relative overflow-hidden shadow-[0_0_80px_-20px_rgba(0,0,0,0.8)]">
      {/* Progress Bar - More visible */}
      <div className="absolute top-0 left-0 h-1.5 bg-white/5 w-full z-50">
        <div 
          className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-1000 ease-in-out"
          style={{ width: progressValue }}
        />
      </div>

      <div className="p-6 md:p-12">
        <div className="flex items-center justify-between mb-12">
          {currentStep !== 'event_type' ? (
            <button 
              onClick={handleBack}
              className="group flex items-center gap-2 text-slate-400 hover:text-white transition-all font-black uppercase text-[10px] tracking-widest"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
              Voltar
            </button>
          ) : <div className="w-16" />}

          <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-sky-400 animate-pulse">
            Passo {currentStep === 'event_type' ? '01' : currentStep === 'audience_size' ? '02' : currentStep === 'environment' ? '03' : 'Concluído'} / 03
          </div>
          
          <div className="w-16" />
        </div>

        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white uppercase leading-none italic">
            {currentStep === 'event_type' && 'Qual a natureza do evento?'}
            {currentStep === 'audience_size' && 'Qual a magnitude do público?'}
            {currentStep === 'environment' && 'Como é o espaço físico?'}
            {currentStep === 'result' && 'Perfil Mapeado'}
          </h2>
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-8 bg-sky-500/50" />
            <p className="text-sky-400 font-black uppercase text-[11px] tracking-[0.3em]">
              {currentStep === 'result' 
                ? 'Engenharia de som e luz pronta' 
                : 'Configuração em tempo real'}
            </p>
            <div className="h-px w-8 bg-sky-500/50" />
          </div>
        </div>

        <div className="relative min-h-[360px]">
          {/* Step 1: Event Type */}
          <div className={`transition-all duration-500 absolute inset-0 ${currentStep === 'event_type' ? 'opacity-100 translate-y-0 pointer-events-auto scale-100' : 'opacity-0 translate-y-4 pointer-events-none scale-95'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eventTypes.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleSelect('eventType', opt.id)}
                  className={`group relative flex items-center gap-4 p-6 rounded-[2rem] border transition-all duration-300 text-left ${
                    answers.eventType === opt.id 
                    ? 'bg-sky-500 border-sky-400 shadow-[0_20px_40px_-10px_rgba(14,165,233,0.4)] translate-y-[-4px]' 
                    : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  <div className={`p-4 rounded-2xl transition-all duration-300 ${
                    answers.eventType === opt.id ? 'bg-white text-sky-600' : 'bg-white/5 text-white group-hover:scale-110'
                  }`}>
                    <opt.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <span className={`text-lg font-black uppercase tracking-tight transition-colors ${
                      answers.eventType === opt.id ? 'text-sky-950' : 'text-white'
                    }`}>{opt.label}</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 transition-all ${
                    answers.eventType === opt.id ? 'text-sky-900 group-hover:translate-x-1' : 'text-white/20'
                  }`} />
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Audience Size */}
          <div className={`transition-all duration-500 absolute inset-0 ${currentStep === 'audience_size' ? 'opacity-100 translate-y-0 pointer-events-auto scale-100' : 'opacity-0 translate-y-4 pointer-events-none scale-95'}`}>
            <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
              {audienceSizes.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleSelect('audienceSize', opt.id)}
                  className={`group flex items-center gap-6 p-6 rounded-[2rem] border transition-all duration-300 text-left ${
                    answers.audienceSize === opt.id 
                    ? 'bg-sky-500 border-sky-400 shadow-[0_20px_40px_-10px_rgba(14,165,233,0.4)]' 
                    : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  <div className={`p-4 rounded-2xl transition-all ${
                    answers.audienceSize === opt.id ? 'bg-white text-sky-600' : 'bg-white/5 text-white group-hover:scale-110'
                  }`}>
                    <opt.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-lg font-black uppercase tracking-tight leading-none ${
                        answers.audienceSize === opt.id ? 'text-sky-950' : 'text-white'
                    }`}>{opt.label}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 opacity-60 ${
                        answers.audienceSize === opt.id ? 'text-sky-900' : 'text-sky-400'
                    }`}>{opt.sublabel}</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${
                    answers.audienceSize === opt.id ? 'text-sky-900' : 'text-white/20'
                  }`} />
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Environment */}
          <div className={`transition-all duration-500 absolute inset-0 ${currentStep === 'environment' ? 'opacity-100 translate-y-0 pointer-events-auto scale-100' : 'opacity-0 translate-y-4 pointer-events-none scale-95'}`}>
            <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
              {environments.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleSelect('environment', opt.id)}
                  className={`group flex items-center gap-6 p-6 rounded-[2rem] border transition-all duration-300 text-left ${
                    answers.environment === opt.id 
                    ? 'bg-sky-500 border-sky-400 shadow-[0_20px_40px_-10px_rgba(14,165,233,0.4)]' 
                    : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  <div className={`p-4 rounded-2xl transition-all ${
                    answers.environment === opt.id ? 'bg-white text-sky-600' : 'bg-white/5 text-white group-hover:scale-110'
                  }`}>
                    <opt.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-lg font-black uppercase tracking-tight leading-none ${
                        answers.environment === opt.id ? 'text-sky-950' : 'text-white'
                    }`}>{opt.label}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 opacity-60 ${
                        answers.environment === opt.id ? 'text-sky-900' : 'text-sky-400'
                    }`}>{opt.sublabel}</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${
                    answers.environment === opt.id ? 'text-sky-900' : 'text-white/20'
                  }`} />
                </button>
              ))}
            </div>
          </div>

          {/* Step 4: Result */}
          <div className={`transition-all duration-700 absolute inset-0 flex flex-col items-center justify-center ${currentStep === 'result' ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none'}`}>
            <div className="relative mb-10">
                <div className="absolute inset-0 bg-sky-500 blur-3xl opacity-20 animate-pulse" />
                <div className="relative h-28 w-28 bg-white/5 rounded-[3rem] flex items-center justify-center border border-white/10">
                  <Sparkles className="w-12 h-12 text-sky-400 animate-bounce" />
                </div>
            </div>
            
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4 text-center">Temos a configuração exata para você.</h3>
            
            <a 
              href={generateWhatsAppMessage()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="group relative px-12 py-6 bg-sky-500 text-sky-950 text-xl font-black rounded-full hover:bg-white hover:scale-105 transition-all duration-500 shadow-[0_20px_50px_-10px_rgba(14,165,233,0.5)] flex items-center gap-4 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              SOLICITAR PROPOSTA AGORA
              <Send className="w-6 h-6 group-hover:translate-x-2 group-hover:-translate-y-1 transition-transform" />
            </a>
            
            <p className="mt-8 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 max-w-sm text-center leading-relaxed">
              Atendimento prioritário • Suporte técnico imediato • Projeto personalizado
            </p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
