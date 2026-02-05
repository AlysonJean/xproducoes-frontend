import { ExperienceLevel, KitExperienceLevel } from '../../types/types';
import { formatPrice } from '../../utils/typeSafeFormatters';

interface ExperienceLevelSelectorProps {
  levels: KitExperienceLevel[];
  selected: ExperienceLevel | null;
  onSelect: (level: ExperienceLevel) => void;
  basePrice?: number;
}

const LEVEL_CONFIG = {
  [ExperienceLevel.SILVER]: {
    name: 'Silver',
    icon: '🥈',
    color: 'from-gray-400 to-gray-500',
    borderColor: 'border-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-800/50',
    defaultIncludes: ['Kit de Equipamentos', 'Manual de montagem', 'Suporte por WhatsApp'],
  },
  [ExperienceLevel.GOLD]: {
    name: 'Gold',
    icon: '🥇',
    color: 'from-yellow-400 to-amber-500',
    borderColor: 'border-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    defaultIncludes: ['Kit de Equipamentos', 'Montagem Profissional', 'Desmontagem incluída', 'Teste de som no local'],
  },
  [ExperienceLevel.PLATINUM]: {
    name: 'Platinum',
    icon: '💎',
    color: 'from-purple-400 to-indigo-500',
    borderColor: 'border-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    defaultIncludes: ['Kit de Equipamentos', 'Montagem Profissional', 'Técnico de Som', 'DJ Profissional', 'Operação completa'],
  },
};

export function ExperienceLevelSelector({ 
  levels, 
  selected, 
  onSelect,
  basePrice 
}: ExperienceLevelSelectorProps) {
  if (!levels || levels.length === 0) {
    return null;
  }

  // Ordenar por preço (Silver < Gold < Platinum)
  const sortedLevels = [...levels].sort((a, b) => {
    const order = { SILVER: 0, GOLD: 1, PLATINUM: 2 };
    return order[a.level] - order[b.level];
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <span className="text-2xl">🎯</span>
        Escolha seu Nível de Experiência
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sortedLevels.map((level) => {
          const config = LEVEL_CONFIG[level.level];
          const isSelected = selected === level.level;
          const savings = basePrice ? Number(level.price) - basePrice : 0;
          
          return (
            <button
              key={level.id}
              onClick={() => onSelect(level.level)}
              className={`
                relative p-5 rounded-xl border-2 transition-all duration-300
                ${isSelected 
                  ? `${config.borderColor} ${config.bgColor} shadow-lg scale-[1.02]` 
                  : 'border-border hover:border-primary/50 bg-card hover:shadow-md'
                }
              `}
            >
              {/* Badge Popular */}
              {level.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-md">
                  Mais Popular
                </div>
              )}

              {/* Header */}
              <div className="text-center mb-4">
                <span className="text-4xl mb-2 block">{config.icon}</span>
                <h4 className={`text-xl font-bold bg-gradient-to-r ${config.color} bg-clip-text text-transparent`}>
                  {config.name}
                </h4>
              </div>

              {/* Preço */}
              <div className="text-center mb-4">
                <span className="text-3xl font-extrabold text-foreground">
                  {formatPrice(Number(level.price))}
                </span>
                <span className="text-sm text-muted-foreground">/hora</span>
                {savings > 0 && level.level !== ExperienceLevel.SILVER && (
                  <p className="text-xs text-muted-foreground mt-1">
                    +{formatPrice(savings)} do Silver
                  </p>
                )}
              </div>

              {/* Descrição */}
              {level.description && (
                <p className="text-sm text-muted-foreground text-center mb-4">
                  {level.description}
                </p>
              )}

              {/* O que inclui */}
              <ul className="space-y-2 text-left">
                {(level.includes.length > 0 ? level.includes : config.defaultIncludes).map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <svg 
                      className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>

              {/* Indicador de seleção */}
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${config.color} flex items-center justify-center`}>
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Dica */}
      <p className="text-xs text-muted-foreground text-center">
        💡 Não sabe qual escolher? O nível <strong>Gold</strong> é o mais popular entre nossos clientes em Belo Horizonte.
      </p>
    </div>
  );
}

export default ExperienceLevelSelector;
