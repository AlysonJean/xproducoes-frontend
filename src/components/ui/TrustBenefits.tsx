import type { LucideIcon } from 'lucide-react';

export interface TrustBenefitItem {
  icon: LucideIcon;
  iconColor: 'success' | 'blue-500' | 'primary';
  title: string;
  description: string;
}

const iconWrapperClasses: Record<TrustBenefitItem['iconColor'], string> = {
  success: 'bg-success/10 border-success/20 shadow-success/5 text-success rotate-3',
  'blue-500': 'bg-blue-500/10 border-blue-500/20 shadow-blue-500/5 text-blue-500 -rotate-3',
  primary: 'bg-primary/10 border-primary/20 shadow-primary/5 text-primary rotate-1',
};

// Extraído de EquipmentDetailPage/ServiceDetailPage — cada página mantém seu próprio texto
// (o benefício de um kit não é o mesmo de um serviço avulso), só a estrutura é compartilhada.
// KitDetailPage não tinha nenhuma versão disto, apesar de Equipment/Service terem.
export function TrustBenefits({ items }: { items: TrustBenefitItem[] }) {
  return (
    <div className="mt-16 bg-muted/10 -mx-6 md:-mx-8 p-12 rounded-b-lg border-t border-border grid grid-cols-1 md:grid-cols-3 gap-10">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div key={index} className="flex flex-col items-center text-center space-y-4">
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center border shadow-xl ${iconWrapperClasses[item.iconColor]}`}>
              <Icon className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-foreground">{item.title}</h3>
            <p className="text-muted-foreground text-sm max-w-[200px]">{item.description}</p>
          </div>
        );
      })}
    </div>
  );
}
