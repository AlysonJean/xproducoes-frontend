// Componente para editar níveis de experiência de um kit no admin
import { useState, useEffect } from 'react';
import { ExperienceLevel, type KitExperienceLevel } from '../../types/types';
import { formatPrice } from '../../utils/typeSafeFormatters';
import { Plus, Trash2, Star, Sparkles } from 'lucide-react';
import { Button, Input, Checkbox } from '../ui/StandardComponents';

interface ExperienceLevelsEditorProps {
  kitId: string;
  initialLevels?: KitExperienceLevel[];
  onChange: (levels: Partial<KitExperienceLevel>[]) => void;
  basePrice?: number;
}

// Destaque "Mais Popular" escondido até a coluna existir. A tabela de produção kit_experience_levels
// não tem isPopular (information_schema, 05/11/2026) e o servidor descarta o campo desde 50f1ff3. A
// caixa, o selo e o Gold marcado de saída prometiam um destaque que nunca era gravado. Volta a true na
// migração de base (lote 16), junto com a gravação no kitService. O site público não muda.
export const POPULAR_LEVEL_SUPPORTED = false;

// Cores por token (antes: border-gray/yellow/slate-400 com fundos -50 fixos).
const LEVEL_INFO = {
  [ExperienceLevel.SILVER]: {
    name: 'Silver',
    icon: '🥈',
    color: 'border-border bg-muted/40',
    description: 'Só os equipamentos, sem montagem',
    defaultIncludes: ['Kit de Equipamentos', 'Manual de montagem', 'Suporte por WhatsApp'],
    suggestedMarkup: 1.0,
  },
  [ExperienceLevel.GOLD]: {
    name: 'Gold',
    icon: '🥇',
    color: 'border-warning/40 bg-warning/5',
    description: 'Com montagem e desmontagem profissional',
    defaultIncludes: ['Kit de Equipamentos', 'Montagem Profissional', 'Desmontagem incluída', 'Teste de som no local'],
    suggestedMarkup: 1.4,
  },
  [ExperienceLevel.PLATINUM]: {
    name: 'Platinum',
    icon: '💎',
    color: 'border-primary/40 bg-primary/5',
    description: 'Solução completa com técnico e DJ',
    defaultIncludes: ['Kit de Equipamentos', 'Montagem Profissional', 'Técnico de Som', 'DJ Profissional', 'Operação completa'],
    suggestedMarkup: 2.0,
  },
};

export function ExperienceLevelsEditor({
  kitId,
  initialLevels = [],
  onChange,
  basePrice = 0
}: ExperienceLevelsEditorProps) {
  const [levels, setLevels] = useState<Partial<KitExperienceLevel>[]>(() => {
    // Se já tem níveis, usar eles; senão, criar os 3 níveis com sugestões
    if (initialLevels.length > 0) {
      return initialLevels;
    }
    return [];
  });

  const [showAddPanel, setShowAddPanel] = useState(false);

  useEffect(() => {
    onChange(levels);
  }, [levels, onChange]);

  const handleAddLevel = (level: ExperienceLevel) => {
    const info = LEVEL_INFO[level];
    const suggestedPrice = basePrice * info.suggestedMarkup;

    const newLevel: Partial<KitExperienceLevel> = {
      level,
      price: Math.round(suggestedPrice * 100) / 100,
      description: info.description,
      includes: [...info.defaultIncludes],
      isPopular: POPULAR_LEVEL_SUPPORTED && level === ExperienceLevel.GOLD,
      kitId,
    };

    setLevels(prev => [...prev, newLevel].sort((a, b) => {
      const order = { SILVER: 0, GOLD: 1, PLATINUM: 2 };
      return order[a.level!] - order[b.level!];
    }));
    setShowAddPanel(false);
  };

  const handleRemoveLevel = (index: number) => {
    setLevels(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateLevel = (index: number, field: keyof KitExperienceLevel, value: unknown) => {
    setLevels(prev => prev.map((lvl, i) =>
      i === index ? { ...lvl, [field]: value } : lvl
    ));
  };

  const handleUpdateIncludes = (index: number, includeIndex: number, value: string) => {
    setLevels(prev => prev.map((lvl, i) => {
      if (i === index) {
        const newIncludes = [...(lvl.includes || [])];
        newIncludes[includeIndex] = value;
        return { ...lvl, includes: newIncludes };
      }
      return lvl;
    }));
  };

  const handleAddInclude = (index: number) => {
    setLevels(prev => prev.map((lvl, i) => {
      if (i === index) {
        return { ...lvl, includes: [...(lvl.includes || []), ''] };
      }
      return lvl;
    }));
  };

  const handleRemoveInclude = (levelIndex: number, includeIndex: number) => {
    setLevels(prev => prev.map((lvl, i) => {
      if (i === levelIndex) {
        const newIncludes = (lvl.includes || []).filter((_, j) => j !== includeIndex);
        return { ...lvl, includes: newIncludes };
      }
      return lvl;
    }));
  };

  const existingLevels = levels.map(l => l.level);
  const availableLevels = Object.values(ExperienceLevel).filter(l => !existingLevels.includes(l));

  const handleGenerateAll = () => {
    const allLevels = Object.values(ExperienceLevel).map(level => {
      const info = LEVEL_INFO[level];
      const suggestedPrice = basePrice * info.suggestedMarkup;
      return {
        level,
        price: Math.round(suggestedPrice * 100) / 100,
        description: info.description,
        includes: [...info.defaultIncludes],
        isPopular: POPULAR_LEVEL_SUPPORTED && level === ExperienceLevel.GOLD,
        kitId,
      };
    });
    setLevels(allLevels);
    setShowAddPanel(false);
  };

  return (
    <div className="space-y-4 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Níveis de Experiência
        </h3>
        {levels.length === 0 && basePrice > 0 && (
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={handleGenerateAll}
            leftIcon={<Sparkles className="w-3 h-3" />}
          >
            Gerar todos (sugerido)
          </Button>
        )}
      </div>

      {levels.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
          <Sparkles className="w-8 h-8 mx-auto mb-2" aria-hidden="true" />
          <p>Nenhum nível de experiência configurado.</p>
          <p className="text-xs mt-1">Adicione os níveis Silver, Gold e Platinum para profissionalizar sua oferta.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {levels.map((level, index) => {
            const info = LEVEL_INFO[level.level!];
            return (
              <div
                key={level.level}
                className={`p-4 rounded-xl border-2 ${info.color} space-y-4`}
              >
                {/* Cabeçalho */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-2xl" aria-hidden="true">{info.icon}</span>
                    <h4 className="font-bold text-lg text-foreground">{info.name}</h4>
                    {POPULAR_LEVEL_SUPPORTED && level.isPopular && (
                      <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" aria-hidden="true" /> Popular
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveLevel(index)}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Remover nível"
                    aria-label={`Remover nível ${info.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Preço e descrição */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Preço/hora"
                      type="number"
                      step="0.01"
                      min="0"
                      size="sm"
                      leftIcon={<span className="text-sm">R$</span>}
                      value={level.price || 0}
                      onChange={(e) => handleUpdateLevel(index, 'price', Number(e.target.value))}
                    />
                    {basePrice > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Sugerido: {formatPrice(basePrice * info.suggestedMarkup)} ({(info.suggestedMarkup * 100).toFixed(0)}%)
                      </p>
                    )}
                  </div>
                  <Input
                    label="Descrição curta"
                    type="text"
                    size="sm"
                    value={level.description || ''}
                    onChange={(e) => handleUpdateLevel(index, 'description', e.target.value)}
                    placeholder="Ex.: Só os equipamentos"
                  />
                </div>

                {/* Destaque (escondido até a coluna existir; ver POPULAR_LEVEL_SUPPORTED) */}
                {POPULAR_LEVEL_SUPPORTED && (
                  <Checkbox
                    label='Marcar como "Mais Popular"'
                    checked={level.isPopular || false}
                    onChange={(e) => handleUpdateLevel(index, 'isPopular', e.target.checked)}
                  />
                )}

                {/* O que inclui */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">O que inclui</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => handleAddInclude(index)}
                      className="text-primary"
                      leftIcon={<Plus className="w-3 h-3" />}
                    >
                      Adicionar
                    </Button>
                  </div>
                  <div className="space-y-2 mt-2">
                    {(level.includes || []).map((inc, incIdx) => (
                      <div key={incIdx} className="flex items-center gap-2">
                        <div className="flex-1">
                          <Input
                            type="text"
                            size="sm"
                            aria-label={`Item incluso ${incIdx + 1}`}
                            value={inc}
                            onChange={(e) => handleUpdateIncludes(index, incIdx, e.target.value)}
                            placeholder="Ex.: Montagem profissional"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveInclude(index, incIdx)}
                          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Remover item"
                          aria-label={`Remover item incluso ${incIdx + 1}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Adicionar nível */}
      {availableLevels.length > 0 && (
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAddPanel(!showAddPanel)}
            fullWidth
            aria-expanded={showAddPanel}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Adicionar Nível
          </Button>

          {showAddPanel && (
            <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg p-2 space-y-1">
              {availableLevels.map(level => {
                const info = LEVEL_INFO[level];
                return (
                  <Button
                    key={level}
                    type="button"
                    variant="ghost"
                    onClick={() => handleAddLevel(level)}
                    className="w-full h-auto justify-start p-3 text-left normal-case tracking-normal font-normal"
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-2xl" aria-hidden="true">{info.icon}</span>
                      <span className="flex flex-col">
                        <span className="font-medium">{info.name}</span>
                        <span className="text-xs text-muted-foreground">{info.description}</span>
                      </span>
                    </span>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ExperienceLevelsEditor;
