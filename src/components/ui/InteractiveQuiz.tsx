import { useState } from 'react';
import { GlassCard } from './StandardComponents';
import { ChevronRight, ArrowLeft, ArrowRight, Send } from 'lucide-react';
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
    { id: 'Casamento', label: 'Casamento' },
    { id: 'Festa de 15 Anos', label: 'Festa de 15 Anos' },
    { id: 'Evento Corporativo', label: 'Evento Corporativo' },
    { id: 'Formatura', label: 'Formatura' },
    { id: 'Festa Particular', label: 'Festa Particular' },
    { id: 'Outro', label: 'Outro' },
  ];

  const audienceSizes = [
    { id: 'Até 100 pessoas', label: 'Projeto Íntimo (até 100 pessoas)' },
    { id: '100 - 300 pessoas', label: 'Médio Porte (100 - 300 pessoas)' },
    { id: '300 - 600 pessoas', label: 'Grande Escala (300 - 600 pessoas)' },
    { id: 'Mais de 600 pessoas', label: 'Festival / Mega Evento (+600 pessoas)' },
  ];

  const environments = [
    { id: 'Salão Fechado', label: 'Salão Fechado (Acústica controlada)' },
    { id: 'Ambiente Aberto', label: 'Ambiente Aberto (Sítio, fazenda)' },
    { id: 'Misto', label: 'Semi-aberto / Misto' },
  ];

  const handleSelect = (category: keyof QuizState, value: string) => {
    setAnswers(prev => ({ ...prev, [category]: value }));
    
    // Automatically advance
    if (category === 'eventType') setTimeout(() => setCurrentStep('audience_size'), 300);
    if (category === 'audienceSize') setTimeout(() => setCurrentStep('environment'), 300);
    if (category === 'environment') setTimeout(() => setCurrentStep('result'), 300);
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

  const progressClass = 
    currentStep === 'event_type' ? 'w-1/4' :
    currentStep === 'audience_size' ? 'w-2/4' :
    currentStep === 'environment' ? 'w-3/4' : 'w-full';

  return (
    <GlassCard className="max-w-4xl mx-auto border-sky-500/20 bg-gradient-to-br from-sky-950/40 via-background to-transparent relative overflow-hidden">
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 h-1 bg-sky-500/10 w-full">
        <div 
          className={`h-full bg-sky-500 transition-all duration-700 ease-out ${progressClass}`}
        />
      </div>

      <div className="p-8 md:p-12">
        {currentStep !== 'event_type' && (
          <button 
            onClick={handleBack}
            className="absolute top-8 left-8 text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        )}

        <div className="text-center space-y-4 mb-10 pt-6">
          <h2 className="text-2xl md:text-4xl font-black tracking-tight text-white">
            {currentStep === 'event_type' && 'Qual é a natureza do seu evento?'}
            {currentStep === 'audience_size' && 'Qual a magnitude do público?'}
            {currentStep === 'environment' && 'Como é o espaço físico?'}
            {currentStep === 'result' && 'Visão Mapeada com Sucesso'}
          </h2>
          <p className="text-sky-400/80 font-medium">
            {currentStep === 'result' 
              ? 'Temos a configuração exata para a sua necessidade.' 
              : 'Configure seu perfil em 3 passos rápidos.'}
          </p>
        </div>

        <div className="relative min-h-[300px]">
          {/* Step 1: Event Type */}
          <div className={`transition-all duration-500 absolute inset-0 ${currentStep === 'event_type' ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 -translate-x-full pointer-events-none'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eventTypes.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleSelect('eventType', opt.id)}
                  className={`border border-white/5 p-6 rounded-2xl text-left bg-white/5 hover:bg-sky-500/10 hover:border-sky-500/30 transition-all group flex items-center justify-between ${answers.eventType === opt.id ? 'ring-2 ring-sky-500 border-transparent bg-sky-500/10' : ''}`}
                >
                  <span className="text-lg font-semibold text-white group-hover:text-sky-400 transition-colors">{opt.label}</span>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Audience Size */}
          <div className={`transition-all duration-500 absolute inset-0 ${currentStep === 'audience_size' ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-12 pointer-events-none'}`}>
            <div className="flex flex-col gap-4 max-w-2xl mx-auto">
              {audienceSizes.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleSelect('audienceSize', opt.id)}
                  className={`border border-white/5 p-6 rounded-2xl text-left bg-white/5 hover:bg-sky-500/10 hover:border-sky-500/30 transition-all group flex items-center justify-between ${answers.audienceSize === opt.id ? 'ring-2 ring-sky-500 border-transparent bg-sky-500/10' : ''}`}
                >
                  <span className="text-lg font-semibold text-white group-hover:text-sky-400 transition-colors">{opt.label}</span>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Environment */}
          <div className={`transition-all duration-500 absolute inset-0 ${currentStep === 'environment' ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-12 pointer-events-none'}`}>
            <div className="flex flex-col gap-4 max-w-2xl mx-auto">
              {environments.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleSelect('environment', opt.id)}
                  className={`border border-white/5 p-6 rounded-2xl text-left bg-white/5 hover:bg-sky-500/10 hover:border-sky-500/30 transition-all group flex items-center justify-between ${answers.environment === opt.id ? 'ring-2 ring-sky-500 border-transparent bg-sky-500/10' : ''}`}
                >
                  <span className="text-lg font-semibold text-white group-hover:text-sky-400 transition-colors">{opt.label}</span>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>

          {/* Step 4: Result */}
          <div className={`transition-all duration-700 absolute inset-0 flex flex-col items-center justify-center ${currentStep === 'result' ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
            <div className="h-20 w-20 bg-sky-500/20 rounded-[2rem] flex items-center justify-center mb-8 border border-sky-500/30 shadow-[0_0_50px_-10px_rgba(14,165,233,0.3)]">
              <Send className="w-10 h-10 text-sky-400" />
            </div>
            <a 
              href={generateWhatsAppMessage()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-10 py-5 bg-sky-500 text-sky-950 text-xl font-black rounded-full hover:bg-sky-400 hover:scale-105 transition-all duration-300 shadow-[0_0_30px_-5px_rgba(14,165,233,0.5)] flex items-center gap-3"
            >
              Falar com um Especialista Agora
              <ArrowRight className="w-6 h-6" />
            </a>
            <p className="mt-6 text-sm text-slate-500 max-w-md text-center">
              Você será direcionado para o nosso WhatsApp com suas respostas pré-preenchidas para um atendimento ultrarrápido.
            </p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
