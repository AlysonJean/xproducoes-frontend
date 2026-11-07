import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('../../services/api', () => ({ apiFetch }));

// Lote 13, diária nas telas (decisão do dono de 06/11). O cartão do catálogo passa a ler a unidade: sem
// dividir a consulta, uma lista com 40 cartões faria 40 consultas a /equipments/pricing-rules. A unidade que
// vem com o equipamento (priceUnit) dispensa a consulta. Cada teste carrega o módulo de novo (estado limpo).
const carregar = async () => {
  vi.resetModules();
  return import('../usePricingRules');
};
const regras = (unidade: 'hour' | 'day') => Promise.resolve({ equipmentPriceUnit: unidade, kitPrice: 'PER_EVENT' });
const chamadasDasRegras = () => apiFetch.mock.calls.filter((c) => c[0] === '/equipments/pricing-rules').length;

describe('useEquipmentPriceUnit — a chave do servidor, uma consulta para a tela toda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('três componentes montados juntos fazem uma consulta só e todos mostram "day"', async () => {
    const { useEquipmentPriceUnit } = await carregar();
    apiFetch.mockImplementation(() => regras('day'));
    const Unidade = ({ n }: { n: number }) => <p>{`${n}:${useEquipmentPriceUnit()}`}</p>;
    render(<><Unidade n={1} /><Unidade n={2} /><Unidade n={3} /></>);

    expect(await screen.findByText('3:day')).toBeInTheDocument();
    expect(screen.getByText('1:day')).toBeInTheDocument();
    expect(chamadasDasRegras()).toBe(1);
  });

  it('a próxima tela começa com a última resposta (sem "hour" piscando antes de "day")', async () => {
    const { useEquipmentPriceUnit } = await carregar();
    apiFetch.mockImplementation(() => regras('day'));
    const Unidade = ({ id }: { id: string }) => <p data-testid={id}>{useEquipmentPriceUnit()}</p>;
    const primeira = render(<Unidade id="a" />);
    await waitFor(() => expect(screen.getByTestId('a')).toHaveTextContent('day'));
    primeira.unmount();

    apiFetch.mockImplementation(() => new Promise(() => undefined)); // a nova consulta ainda não voltou
    render(<Unidade id="b" />);
    expect(screen.getByTestId('b')).toHaveTextContent('day');
  });

  it('consulta com falha: "hour", a regra de hoje', async () => {
    const { useEquipmentPriceUnit } = await carregar();
    apiFetch.mockRejectedValue(new Error('fora do ar'));
    const Unidade = () => <p data-testid="u">{useEquipmentPriceUnit()}</p>;
    render(<Unidade />);
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(screen.getByTestId('u')).toHaveTextContent('hour');
  });

  it('enabled false não consulta', async () => {
    const { useEquipmentPriceUnit } = await carregar();
    apiFetch.mockImplementation(() => regras('day'));
    const Unidade = () => <p data-testid="u">{useEquipmentPriceUnit(false)}</p>;
    render(<Unidade />);
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(chamadasDasRegras()).toBe(0);
    expect(screen.getByTestId('u')).toHaveTextContent('hour');
  });
});

describe('useEquipmentUnitOf — a unidade que vem com o equipamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('com priceUnit no equipamento: usa a dele já na primeira pintura e não consulta a chave', async () => {
    const { useEquipmentUnitOf } = await carregar();
    apiFetch.mockImplementation(() => regras('hour'));
    const Unidade = () => <p data-testid="u">{useEquipmentUnitOf({ id: 'eq', priceUnit: 'day' })}</p>;
    render(<Unidade />);
    expect(screen.getByTestId('u')).toHaveTextContent('day');
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(chamadasDasRegras()).toBe(0);
  });

  it('sem priceUnit (painel, carrinho da conta, API anterior): consulta a chave do servidor', async () => {
    const { useEquipmentUnitOf } = await carregar();
    apiFetch.mockImplementation(() => regras('day'));
    const Unidade = () => <p data-testid="u">{useEquipmentUnitOf({ id: 'eq', pricePerHour: 10 })}</p>;
    render(<Unidade />);
    await waitFor(() => expect(screen.getByTestId('u')).toHaveTextContent('day'));
    expect(chamadasDasRegras()).toBe(1);
  });

  it('ready false (dados ainda carregando): não consulta', async () => {
    const { useEquipmentUnitOf } = await carregar();
    apiFetch.mockImplementation(() => regras('day'));
    const Unidade = () => <p data-testid="u">{useEquipmentUnitOf(null, false)}</p>;
    render(<Unidade />);
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(chamadasDasRegras()).toBe(0);
  });
});
