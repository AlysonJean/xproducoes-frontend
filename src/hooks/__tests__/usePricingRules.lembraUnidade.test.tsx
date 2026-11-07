import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('../../services/api', () => ({ apiFetch }));

// Lote 13, diária nas telas (decisão do dono de 06/11). No catálogo a unidade vem com o equipamento (priceUnit)
// e a chave do servidor nunca é consultada; o carrinho, a comparação e o orçamento leem a chave. Sem guardar a
// unidade que veio com o equipamento, quem ia do catálogo ao carrinho via "/ hora" até a consulta voltar, e só
// então "/ diária". Cada teste carrega o módulo de novo (estado limpo).
const carregar = async () => {
  vi.resetModules();
  return import('../usePricingRules');
};
const semResposta = () => new Promise(() => undefined);
const esperar = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

describe('useEquipmentUnitOf guarda a unidade que veio com o equipamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('depois de um equipamento com priceUnit "day", a tela que lê a chave já começa em "day", antes da resposta', async () => {
    const { useEquipmentUnitOf, useEquipmentPriceUnit } = await carregar();
    apiFetch.mockImplementation(semResposta);
    const Cartao = () => <p data-testid="cartao">{useEquipmentUnitOf({ id: 'eq', priceUnit: 'day' })}</p>;
    const catalogo = render(<Cartao />);
    expect(screen.getByTestId('cartao')).toHaveTextContent('day');
    catalogo.unmount();

    const Carrinho = () => <p data-testid="carrinho">{useEquipmentPriceUnit()}</p>;
    render(<Carrinho />);
    expect(screen.getByTestId('carrinho')).toHaveTextContent('day');
  });

  it('no servidor (SSR) nada fica guardado: o HTML de um cartão com "day" não muda a partida "hour" do navegador', async () => {
    const { useEquipmentUnitOf, useEquipmentPriceUnit } = await carregar();
    apiFetch.mockImplementation(semResposta);
    const Cartao = () => <p>{useEquipmentUnitOf({ id: 'eq', priceUnit: 'day' })}</p>;
    expect(renderToString(<Cartao />)).toContain('day');

    const Carrinho = () => <p data-testid="carrinho">{useEquipmentPriceUnit()}</p>;
    render(<Carrinho />);
    expect(screen.getByTestId('carrinho')).toHaveTextContent('hour');
  });

  it.each([
    ['valor desconhecido', { equipmentPriceUnit: 'DAY' }],
    ['sem o campo', {}],
    ['resposta vazia', null],
  ])('resposta da chave com %s: "hour", a regra de hoje', async (_nome, resposta) => {
    const { useEquipmentPriceUnit } = await carregar();
    apiFetch.mockResolvedValue(resposta);
    const Unidade = () => <p data-testid="u">{useEquipmentPriceUnit()}</p>;
    render(<Unidade />);
    await esperar();
    expect(apiFetch).toHaveBeenCalledWith('/equipments/pricing-rules');
    expect(screen.getByTestId('u')).toHaveTextContent('hour');
  });
});
