import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { getSimilar } = vi.hoisted(() => ({ getSimilar: vi.fn() }));
vi.mock('../../services/api', () => ({ recommendationAPI: { getSimilar } }));

import { useRecommendations } from '../useRecommendations';
import { RecommendationSection } from '../../components/ui/RecommendationSection';

// Auditoria do orçamento (12/11/2026), O41: as recomendações liam o preço em price/dailyPrice, mas a API manda o do
// equipamento em pricePerHour (com a unidade em priceUnit, a diária desde o lote 13) e o do kit em price. Todo
// equipamento recomendado aparecia "Consultar". Agora o preço real com a unidade: "/diária" ou "/h" no equipamento e
// "por evento" no kit (decisão de 06/11).

// Como a API devolve (o interceptor do axios já tira o envelope { success, data }): Decimal em texto.
const RESPOSTA = [
  { id: 'eq-mesa', slug: 'mesa-de-som', name: 'Mesa de Som', pricePerHour: '120.00', priceUnit: 'day', category: { name: 'Som' } },
  { id: 'eq-luz', slug: 'refletor', name: 'Refletor LED', pricePerHour: '45.50', priceUnit: 'hour', category: { name: 'Luz' } },
  {
    id: 'kit-festa', slug: 'kit-festa', name: 'Kit Festa', price: '650', discount: null, popular: false,
    items: [{ quantity: 1, equipment: { id: 'eq-mesa', name: 'Mesa de Som', pricePerHour: '120.00', priceUnit: 'day' } }],
  },
];

function Recomendacoes() {
  const { recommendations, loading } = useRecommendations({ type: 'similar', itemId: 'caixa-ativa', itemType: 'equipment', limit: 4 });
  return <RecommendationSection type="similar" title="Parecidos" items={recommendations} loading={loading} maxItems={4} />;
}

const norm = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();
const cartao = (nome: string) => norm(screen.getByText(nome).closest('a')?.textContent);

describe('Recomendações — preço real com a unidade, não "Consultar" (O41)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSimilar.mockResolvedValue({ data: RESPOSTA });
  });

  it('equipamento pela diária ou pela hora (pricePerHour + priceUnit) e kit "por evento"', async () => {
    render(<MemoryRouter><Recomendacoes /></MemoryRouter>);

    await screen.findByText('Mesa de Som');
    expect(getSimilar).toHaveBeenCalledWith('caixa-ativa', 'equipment', 4);
    expect(screen.queryByText('Consultar')).not.toBeInTheDocument();

    expect(cartao('Mesa de Som')).toContain('R$ 120,00/diária');
    expect(cartao('Refletor LED')).toContain('R$ 45,50/h');
    expect(cartao('Kit Festa')).toContain('R$ 650,00por evento');
    // Sem desconto, nada de "0" solto no canto do cartão.
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('o kit leva para a página do kit; o equipamento, para a do equipamento', async () => {
    render(<MemoryRouter><Recomendacoes /></MemoryRouter>);

    await screen.findByText('Kit Festa');
    expect(screen.getByText('Kit Festa').closest('a')).toHaveAttribute('href', '/kits/kit-festa');
    expect(screen.getByText('Mesa de Som').closest('a')).toHaveAttribute('href', '/equipamentos/eq-mesa');
  });
});
