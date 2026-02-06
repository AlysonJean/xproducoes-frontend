// Componente para editar níveis de experiência de um kit no admin
import { useState, useEffect } from 'react';
import { ExperienceLevel, type KitExperienceLevel } from '../../types/types';
import { formatPrice } from '../../utils/typeSafeFormatters';
import { Plus, Trash2, Star, Sparkles } from 'lucide-react';
import { Button } from '../ui/StandardComponents';

interface ExperienceLevelsEditorProps {
  kitId: string;
  initialLevels?: KitExperienceLevel[];
  onChange: (levels: Partial<KitExperienceLevel>[]) => void;
  basePrice?: number;
}

const LEVEL_INFO = {
  [ExperienceLevel.SILVER]: {
    name: 'Silver',
    icon: '🥈',
    color: 'border-gray-400 bg-gray-50 dark:bg-gray-800/50',
    description: 'Self-service - apenas equipamentos',
    defaultIncludes: ['Kit de Equipamentos', 'Manual de montagem', 'Suporte por WhatsApp'],
    suggestedMarkup: 1.0,
  },
  [ExperienceLevel.GOLD]: {
    name: 'Gold',
    icon: '🥇',
    color: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20',
    description: 'Com montagem e desmontagem profissional',
    defaultIncludes: ['Kit de Equipamentos', 'Montagem Profissional', 'Desmontagem incluída', 'Teste de som no local'],
    suggestedMarkup: 1.4,
  },
  [ExperienceLevel.PLATINUM]: {
    name: 'Platinum',
    icon: '💎',
    color: 'border-purple-400 bg-purple-50 dark:bg-purple-900/20',
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
      isPopular: level === ExperienceLevel.GOLD,
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
        isPopular: level === ExperienceLevel.GOLD,
        kitId,
      };
    });
    setLevels(allLevels);
    setShowAddPanel(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Níveis de Experiência
        </h3>
        {levels.length === 0 && basePrice > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerateAll}
            className="text-xs"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Gerar Todos (sugerido)
          </Button>
        )}
      </div>

      {levels.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-20" />
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
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{info.icon}</span>
                    <h4 className="font-bold text-lg">{info.name}</h4>
                    {level.isPopular && (
                      <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" /> Popular
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveLevel(index)}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                    title="Remover nível"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Price & Description */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Preço/hora</label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        aria-label="Preço por hora"
                        value={level.price || 0}
                        onChange={(e) => handleUpdateLevel(index, 'price', Number(e.target.value))}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-shadow"
                      />
                    </div>
                    {basePrice > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Sugerido: {formatPrice(basePrice * info.suggestedMarkup)} ({(info.suggestedMarkup * 100).toFixed(0)}%)
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Descrição curta</label>
                    <input
                      type="text"
                      aria-label="Descrição curta do nível"
                      value={level.description || ''}
                      onChange={(e) => handleUpdateLevel(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-primary/20 outline-none mt-1 transition-shadow"
                      placeholder="Ex: Self-service"
                    />
                  </div>
                </div>

                {/* Popular Toggle */}
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={level.isPopular || false}
                    onChange={(e) => handleUpdateLevel(index, 'isPopular', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm group-hover:text-primary transition-colors">Marcar como "Mais Popular"</span>
                </label>

                {/* Includes */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                    <span>O que inclui</span>
                    <button
                      type="button"
                      onClick={() => handleAddInclude(index)}
                      className="text-primary hover:underline text-xs flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Adicionar
                    </button>
                  </label>
                  <div className="space-y-2 mt-2">
                    {(level.includes || []).map((inc, incIdx) => (
                      <div key={incIdx} className="flex items-center gap-2">
                        <input
                          type="text"
                          aria-label={`Item incluso ${incIdx + 1}`}
                          value={inc}
                          onChange={(e) => handleUpdateIncludes(index, incIdx, e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded border bg-background focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-shadow"
                          placeholder="Ex: Montagem profissional"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveInclude(index, incIdx)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                          title="Remover item"
                          aria-label="Remover item incluso"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Level Button */}
      {availableLevels.length > 0 && (
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAddPanel(!showAddPanel)}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Nível
          </Button>

          {showAddPanel && (
            <div className="absolute z-10 top-full left-0 right-0 mt-2 bg-popover border rounded-lg shadow-lg p-3 space-y-2">
              {availableLevels.map(level => {
                const info = LEVEL_INFO[level];
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handleAddLevel(level)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted rounded-lg text-left transition-colors"
                  >
                    <span className="text-2xl">{info.icon}</span>
                    <div>
                      <p className="font-medium">{info.name}</p>
                      <p className="text-xs text-muted-foreground">{info.description}</p>
                    </div>
                  </button>
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
