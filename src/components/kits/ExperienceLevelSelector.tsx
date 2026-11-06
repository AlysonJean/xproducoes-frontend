import { ExperienceLevel, KitExperienceLevel } from '../../types/types';
import { formatPrice } from '../../utils/typeSafeFormatters';

interface ExperienceLevelSelectorProps {
  levels: KitExperienceLevel[];
  selected: ExperienceLevel | null;
  onSelect: (level: ExperienceLevel) => void;
  basePrice?: number;
}

// Cores por token (antes: gradientes cinza/amarelo/índigo fixos e fundos -50 claros).
const LEVEL_CONFIG = {
  [ExperienceLevel.SILVER]: {
    name: 'Silver',
    icon: '🥈',
    nameColor: 'text-muted-foreground',
    defaultIncludes: ['Kit de Equipamentos', 'Manual de montagem', 'Suporte por WhatsApp'],
  },
  [ExperienceLevel.GOLD]: {
    name: 'Gold',
    icon: '🥇',
    nameColor: 'text-warning',
    defaultIncludes: ['Kit de Equipamentos', 'Montagem Profissional', 'Desmontagem incluída', 'Teste de som no local'],
  },
  [ExperienceLevel.PLATINUM]: {
    name: 'Platinum',
    icon: '💎',
    nameColor: 'text-primary',
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

  // A dica usa o nível marcado como "Mais Popular" no admin — antes dizia sempre "Gold é o mais
  // popular entre nossos clientes em Belo Horizonte", mesmo quando outro nível era o destacado.
  const popularLevel = sortedLevels.find((level) => level.isPopular);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <span className="text-2xl" aria-hidden="true">🎯</span>
        Escolha seu Nível de Experiência
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sortedLevels.map((level) => {
          const config = LEVEL_CONFIG[level.level];
          const isSelected = selected === level.level;
          const aboveBase = basePrice ? Number(level.price) - basePrice : 0;

          return (
            <button
              key={level.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(level.level)}
              className={`
                relative p-5 rounded-xl border-2 text-left transition-all duration-300
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
                ${isSelected
                  ? 'border-primary bg-primary/5 shadow-lg scale-[1.02]'
                  : 'border-border hover:border-primary/50 bg-card hover:shadow-md'
                }
              `}
            >
              {/* Selo "Mais Popular" */}
              {level.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-md whitespace-nowrap">
                  Mais Popular
                </div>
              )}

              {/* Cabeçalho */}
              <div className="text-center mb-4">
                <span className="text-4xl mb-2 block" aria-hidden="true">{config.icon}</span>
                <h4 className={`text-xl font-bold ${config.nameColor}`}>
                  {config.name}
                </h4>
              </div>

              {/* Preço */}
              <div className="text-center mb-4">
                <span className="text-3xl font-extrabold text-foreground">
                  {formatPrice(Number(level.price))}
                </span>
                {/* Decisão do dono de 06/11: o preço do kit (e de cada nível) é por evento. */}
                <span className="text-sm text-muted-foreground ml-1">por evento</span>
                {/* A diferença é sobre o preço base do kit (o texto dizia "do Silver"). */}
                {aboveBase > 0 && level.level !== ExperienceLevel.SILVER && (
                  <p className="text-xs text-muted-foreground mt-1">
                    +{formatPrice(aboveBase)} sobre o preço base
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
                      aria-hidden="true"
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
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
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
      {popularLevel && (
        <p className="text-xs text-muted-foreground text-center">
          💡 Na dúvida? Comece pelo nível <strong>{LEVEL_CONFIG[popularLevel.level].name}</strong>, o mais popular.
        </p>
      )}
    </div>
  );
}

export default ExperienceLevelSelector;
