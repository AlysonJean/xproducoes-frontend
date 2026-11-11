import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExperienceLevel, type KitExperienceLevel } from '../../../types/types';
import { ExperienceLevelsEditor, POPULAR_LEVEL_SUPPORTED } from '../ExperienceLevelsEditor';

// Item A (auditoria): o destaque "Mais Popular" de um nível do kit. Em 05/11/2026 (c49668f) a caixa
// 'Marcar como "Mais Popular"', o selo "Popular" e o Gold marcado de saída ficaram escondidos, porque a tabela de
// produção kit_experience_levels não tinha a coluna isPopular e o servidor descartava o campo. No lote 16 (A08,
// aprovada em 02/11/2026) a migration de base cria a coluna e o servidor volta a gravar o destaque, então a caixa e o
// selo voltam. O nome deste arquivo ficou do teste de 05/11.
const CAIXA = 'Marcar como "Mais Popular"';

const ultimosNiveis = (onChange: ReturnType<typeof vi.fn>) =>
  onChange.mock.calls[onChange.mock.calls.length - 1]?.[0] as Partial<KitExperienceLevel>[];

describe('ExperienceLevelsEditor — o destaque "Mais Popular" volta com a coluna (item A, lote 16)', () => {
  it('a trava está ligada', () => {
    expect(POPULAR_LEVEL_SUPPORTED).toBe(true);
  });

  it('"Gerar todos": três níveis, uma caixa por nível, o Gold marcado e o selo só nele', () => {
    const onChange = vi.fn();
    render(<ExperienceLevelsEditor kitId="kit1" basePrice={300} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /Gerar todos/ }));

    const caixas = screen.getAllByLabelText(CAIXA) as HTMLInputElement[];
    expect(caixas).toHaveLength(3);
    expect(caixas.map((c) => c.checked)).toEqual([false, true, false]);
    expect(screen.getAllByText('Popular')).toHaveLength(1);
    expect(screen.getByText('Popular').closest('div.p-4')).toHaveTextContent('Gold');

    const niveis = ultimosNiveis(onChange);
    expect(niveis.map((n) => [n.level, n.isPopular])).toEqual([
      ['SILVER', false],
      ['GOLD', true],
      ['PLATINUM', false],
    ]);
  });

  it('"Adicionar Nível": o Gold vem marcado como popular, o Silver não', () => {
    const onChange = vi.fn();
    render(<ExperienceLevelsEditor kitId="kit1" basePrice={300} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Nível' }));
    fireEvent.click(screen.getByRole('button', { name: /Gold/ }));
    expect(ultimosNiveis(onChange).map((n) => [n.level, n.isPopular])).toEqual([['GOLD', true]]);

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Nível' }));
    fireEvent.click(screen.getByRole('button', { name: /Silver/ }));
    expect(ultimosNiveis(onChange).map((n) => [n.level, n.isPopular])).toEqual([
      ['SILVER', false],
      ['GOLD', true],
    ]);
    expect(screen.getAllByText('Popular')).toHaveLength(1);
  });

  it('marcar e desmarcar a caixa muda o nível que vai ao formulário e o selo', () => {
    const onChange = vi.fn();
    render(<ExperienceLevelsEditor kitId="kit1" basePrice={300} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar todos/ }));

    const [prata, ouro] = screen.getAllByLabelText(CAIXA);
    fireEvent.click(ouro);
    expect(ultimosNiveis(onChange).map((n) => n.isPopular)).toEqual([false, false, false]);
    expect(screen.queryByText('Popular')).not.toBeInTheDocument();

    fireEvent.click(prata);
    expect(ultimosNiveis(onChange).map((n) => n.isPopular)).toEqual([true, false, false]);
    expect(screen.getByText('Popular').closest('div.p-4')).toHaveTextContent('Silver');
  });

  it('nível já marcado (vindo da API): o selo aparece e a caixa vem marcada', () => {
    const inicial = [
      { id: 'l1', level: ExperienceLevel.SILVER, price: 300, description: 'Som', includes: ['Caixas'], isPopular: false, kitId: 'kit1' },
      { id: 'l2', level: ExperienceLevel.GOLD, price: 420, description: 'Com montagem', includes: ['Caixas'], isPopular: true, kitId: 'kit1' },
    ] as KitExperienceLevel[];
    render(<ExperienceLevelsEditor kitId="kit1" basePrice={300} initialLevels={inicial} onChange={vi.fn()} />);

    expect((screen.getAllByLabelText(CAIXA) as HTMLInputElement[]).map((c) => c.checked)).toEqual([false, true]);
    expect(screen.getAllByText('Popular')).toHaveLength(1);
  });
});
