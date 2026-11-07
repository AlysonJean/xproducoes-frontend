import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('../../services/api', () => ({ apiFetch }));

// Frete por km (item frete-km do lote 13, decisões do dono de 06/11/2026): as regras do frete vêm na mesma
// resposta de GET /equipments/pricing-rules que a unidade do equipamento. useFreightRules divide a consulta com
// useEquipmentPriceUnit. Cada teste carrega o módulo de novo (estado limpo).
const carregar = async () => {
  vi.resetModules();
  return import('../usePricingRules');
};
const FRETE = { pricePerKm: 3.5, freeKm: 15, minimum: 50, roundTo: 10, trips: 2 };
const chamadasDasRegras = () => apiFetch.mock.calls.filter((c) => c[0] === '/equipments/pricing-rules').length;
const esperar = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

describe('useFreightRules — as regras do frete do servidor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('unidade e frete montados juntos: uma consulta só, e as duas respostas chegam', async () => {
    const { useEquipmentPriceUnit, useFreightRules } = await carregar();
    apiFetch.mockResolvedValue({ equipmentPriceUnit: 'day', kitPrice: 'PER_EVENT', freight: FRETE });
    const Tela = () => {
      const unidade = useEquipmentPriceUnit();
      const frete = useFreightRules();
      return <p data-testid="t">{`${unidade}:${frete ? `${frete.pricePerKm}/${frete.freeKm}` : 'sem'}`}</p>;
    };
    render(<Tela />);

    await waitFor(() => expect(screen.getByTestId('t')).toHaveTextContent('day:3.5/15'));
    expect(chamadasDasRegras()).toBe(1);
  });

  it('a próxima tela começa com as regras da última resposta', async () => {
    const { useFreightRules } = await carregar();
    apiFetch.mockResolvedValue({ equipmentPriceUnit: 'hour', freight: FRETE });
    const Frete = ({ id }: { id: string }) => <p data-testid={id}>{useFreightRules()?.freeKm ?? 'sem'}</p>;
    const primeira = render(<Frete id="a" />);
    await waitFor(() => expect(screen.getByTestId('a')).toHaveTextContent('15'));
    primeira.unmount();

    apiFetch.mockImplementation(() => new Promise(() => undefined));
    render(<Frete id="b" />);
    expect(screen.getByTestId('b')).toHaveTextContent('15');
  });

  it.each([
    ['consulta com falha', () => apiFetch.mockRejectedValue(new Error('fora do ar'))],
    ['API sem o campo freight', () => apiFetch.mockResolvedValue({ equipmentPriceUnit: 'hour' })],
    ['frete estranho', () => apiFetch.mockResolvedValue({ freight: { pricePerKm: 'muito' } })],
  ])('%s: null (a tela não mostra números sem o servidor)', async (_nome, preparar) => {
    const { useFreightRules } = await carregar();
    preparar();
    const Frete = () => <p data-testid="f">{useFreightRules() ? 'com' : 'sem'}</p>;
    render(<Frete />);
    await esperar();
    expect(screen.getByTestId('f')).toHaveTextContent('sem');
  });
});
