import { Shield, MessageCircle, Lock, Award } from 'lucide-react';

// Selos de confiança reaproveitando afirmações já publicadas em outros pontos do site
// (WarrantyPage, rodapé "SSL Seguro"/"desde 2015") — não são promessas novas inventadas,
// só elevadas para os momentos de maior decisão (hero e antes do envio do orçamento).
const badges = [
  { icon: Shield, label: 'Equipamento com Garantia' },
  { icon: MessageCircle, label: 'Suporte via WhatsApp' },
  { icon: Lock, label: 'Pagamento Seguro' },
  { icon: Award, label: 'Desde 2015' },
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
