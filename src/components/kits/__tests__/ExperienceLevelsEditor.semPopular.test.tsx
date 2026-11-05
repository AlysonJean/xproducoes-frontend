import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExperienceLevel, type KitExperienceLevel } from '../../../types/types';
import { ExperienceLevelsEditor } from '../ExperienceLevelsEditor';

// Achado (auditoria, item A de 05/11/2026): o editor de níveis do painel mostrava a caixa
// 'Marcar como "Mais Popular"', já trazia o Gold marcado e exibia o selo "Popular". Nada disso era
// gravado: a tabela de produção kit_experience_levels não tem a coluna isPopular e o servidor descarta o
// campo desde 50f1ff3. Até a coluna existir (migração de base, lote 16), a caixa e o selo ficam escondidos
// e o Gold deixa de vir marcado. O seletor de níveis do site público não é tocado.
const CAIXA = 'Marcar como "Mais Popular"';

const ultimosNiveis = (onChange: ReturnType<typeof vi.fn>) =>
  onChange.mock.calls[onChange.mock.calls.length - 1]?.[0] as Partial<KitExperienceLevel>[];

describe('ExperienceLevelsEditor — destaque "Mais Popular" escondido até a coluna existir', () => {
  it('"Gerar todos": três níveis, sem a caixa, sem o selo e sem o Gold marcado', () => {
    const onChange = vi.fn();
    render(<ExperienceLevelsEditor kitId="kit1" basePrice={300} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /Gerar todos/ }));

    expect(screen.getByText('Silver')).toBeInTheDocument();
    expect(screen.getByText('Gold')).toBeInTheDocument();
    expect(screen.getByText('Platinum')).toBeInTheDocument();
    expect(screen.queryByText(CAIXA)).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByText('Popular')).not.toBeInTheDocument();

    const niveis = ultimosNiveis(onChange);
    expect(niveis.map((n) => n.level)).toEqual(['SILVER', 'GOLD', 'PLATINUM']);
    expect(niveis.filter((n) => n.isPopular)).toEqual([]);
  });

  it('"Adicionar Nível" Gold: não vem marcado como popular', () => {
    const onChange = vi.fn();
    render(<ExperienceLevelsEditor kitId="kit1" basePrice={300} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Nível' }));
    fireEvent.click(screen.getByRole('button', { name: /Gold/ }));

    const [gold] = ultimosNiveis(onChange);
    expect(gold.level).toBe(ExperienceLevel.GOLD);
    expect(gold.isPopular).toBeFalsy();
    expect(screen.queryByText('Popular')).not.toBeInTheDocument();
    expect(screen.queryByText(CAIXA)).not.toBeInTheDocument();
  });

  it('nível já marcado (rascunho antigo): o selo e a caixa continuam escondidos', () => {
    const inicial = [
      { id: 'l1', level: ExperienceLevel.GOLD, price: 420, description: 'Com montagem', includes: ['Caixas'], isPopular: true, kitId: 'kit1' },
    ] as KitExperienceLevel[];
    render(<ExperienceLevelsEditor kitId="kit1" basePrice={300} initialLevels={inicial} onChange={vi.fn()} />);

    expect(screen.getByText('Gold')).toBeInTheDocument();
    expect(screen.queryByText('Popular')).not.toBeInTheDocument();
    expect(screen.queryByText(CAIXA)).not.toBeInTheDocument();
  });
});
