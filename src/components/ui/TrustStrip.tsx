import { Shield, MessageCircle, Landmark, Award } from 'lucide-react';
import { EXPERIENCE_SINCE } from '../../data/site';

// Selos de confiança nos momentos de maior decisão (hero e antes do envio do orçamento). P20 (aprovada em 02/11/2026 e
// decisão do dono de 08/11): não há pagamento online, então o selo diz como se paga (PIX na conta da empresa), e o
// tempo de casa vem da frase única de data/site.ts.
const badges = [
  { icon: Shield, label: 'Equipamento com Garantia' },
  { icon: MessageCircle, label: 'Suporte via WhatsApp' },
  { icon: Landmark, label: 'PIX direto na conta da empresa (CNPJ)' },
  { icon: Award, label: EXPERIENCE_SINCE },
];

export function TrustStrip({ className }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-8 gap-y-3 ${className || ''}`}>
      {badges.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="w-4 h-4 text-primary shrink-0" />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
