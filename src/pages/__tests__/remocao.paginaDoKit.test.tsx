import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const { apiFetch, useCart, useCompare, addNotification, addItem } = vi.hoisted(() => ({
  apiFetch: vi.fn(), useCart: vi.fn(), useCompare: vi.fn(), addNotification: vi.fn(), addItem: vi.fn(),
}));
vi.mock('../../services/api', () => ({ apiFetch }));
vi.mock('../../hooks/useCart', () => ({ useCart }));
vi.mock('../../contexts/CompareContext', () => ({ useCompare }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../hooks/useRecommendations', () => ({ useRecommendations: () => ({ recommendations: [], loading: false }) }));
vi.mock('../../components/ui/RecommendationSection', () => ({ RecommendationSection: () => null }));
vi.mock('../../components/ui/FavoriteButton', () => ({ FavoriteButton: () => null }));
vi.mock('../../components/ui/CompareButton', () => ({ default: () => null }));
vi.mock('../../components/ui/AskOnWhatsAppButton', () => ({ AskOnWhatsAppButton: () => null }));
vi.mock('../../components/ui/ZoomableProductPhoto', () => ({ ZoomableProductPhoto: () => null }));
vi.mock('../../components/SEO', () => ({ SEO: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import { KitDetailPage } from '../KitDetailPage';

// Auditoria do orçamento (12/11/2026):
// - O4/B1 (decisão de 12/11: os níveis Silver/Gold/Platinum saem do site): a página do kit mostrava um seletor de
//   nível com preço e itens próprios, mas o pedido levava o kit pelo preço base. A mensagem ao adicionar dizia
//   "incluído no seu orçamento com desconto".
// - E1/E4: a frase do kit de entrega oferecia "um técnico durante todo o evento, cobrado à parte" também nos kits que
//   já trazem o Técnico de Som (Kits 05–08), e não dizia o frete (decisão de 12/11: o frete até 15 km vem no kit;
//   acima disso, só os km a mais). A frase segue a composição do kit (o serviço marcado "Pode acompanhar o evento
//   todo"), nunca o nome.

const servico = (id: string, name: string, coversWholeEvent: boolean) => ({
  id: `it-${id}`, kitId: 'kit', serviceId: id, quantity: 1,
  service: { id, name, slug: id, description: name, price: '100.00', duration: 180, status: 'ACTIVE', coversWholeEvent },
});
const CAIXA = {
  id: 'it-caixa', kitId: 'kit', equipmentId: 'eq-caixa', quantity: 2,
  equipment: { id: 'eq-caixa', name: 'Caixa Ativa', pricePerHour: '100.00', priceUnit: 'day' },
};
const LOGISTICA = servico('sv-log', 'Logística de Entrega e Retirada Especializada', false);
const ROADIE = servico('sv-roadie', 'Roadie / Auxiliar de Montagem', false);
const TECNICO = servico('sv-tec', 'Técnico de Som e Operação Profissional', true);

// O kit como a API devolve (Decimal em texto).
const BASE = {
  id: 'kit-festa', slug: 'kit-festa', name: 'Kit Festa', description: 'Som e luz', price: '650', imageUrl: '',
  status: 'ACTIVE', minimumRentalDuration: 5, extraHourPrice: '90.00', fulfillment: 'DELIVERY_SETUP', experienceLevels: [],
};
const SEM_TECNICO = { ...BASE, items: [CAIXA, LOGISTICA, ROADIE] };
const COM_TECNICO = { ...BASE, id: 'kit-show', slug: 'kit-show', name: 'Kit Show', price: '990', items: [CAIXA, TECNICO, ROADIE, LOGISTICA] };
// O nome fala de técnico, a composição não traz: vale a composição.
const NOME_COM_TECNICO = { ...SEM_TECNICO, name: 'Kit Show com Técnico de Som incluso' };
// Kit sem a composição na resposta: sem o campo items, ou com a lista vazia.
const SEM_ITENS = { ...BASE, id: 'kit-novo', slug: 'kit-novo', name: 'Kit Novo' };
const ITENS_VAZIOS = { ...SEM_ITENS, items: [] };
const RETIRADA = { ...BASE, id: 'kit-resenha', slug: 'kit-resenha', name: 'Kit Resenha', fulfillment: 'CLIENT_PICKUP', items: [CAIXA] };

const nivel = (id: string, level: string, price: string, isPopular = false) => ({
  id, level, price, description: `Nível ${level}`, includes: ['Técnico', 'DJ'], isPopular, kitId: 'kit-festa',
});
const COM_NIVEIS = {
  ...SEM_TECNICO,
  experienceLevels: [nivel('n1', 'SILVER', '650.00'), nivel('n2', 'GOLD', '900.00', true), nivel('n3', 'PLATINUM', '1400.00')],
};

const ENTREGA = 'A equipe da X Produções leva o kit ao local do evento, monta e busca depois.';
const FRETE = 'O frete até 15 km da X Produções já vem no kit; acima disso, só os km a mais entram como frete.';
const FRASE_SEM_TECNICO = `${ENTREGA} ${FRETE} Se preferir, um técnico fica durante todo o evento, cobrado à parte.`;
const FRASE_COM_TECNICO = `${ENTREGA} ${FRETE} O técnico que acompanha todo o evento já vem incluso neste kit.`;
const FRASE_RETIRADA = 'Você retira o kit na X Produções, em Belo Horizonte, monta no local e devolve depois do evento.';

const comRotas = (ui: ReactElement, entry: string) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/kits/:slug" element={ui} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );

const paginaDoKit = async (kit: { slug: string }) => {
  apiFetch.mockResolvedValue(kit);
  comRotas(<KitDetailPage />, `/kits/${kit.slug}`);
  await screen.findByText('por evento');
};

describe('Página do kit — sem níveis e com a frase da composição do kit (auditoria do orçamento, 12/11/2026)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addItem.mockResolvedValue(true);
    useCart.mockReturnValue({ cart: null, addItem, removeItem: vi.fn(), clearCart: vi.fn(), itemCount: 0 });
    useCompare.mockReturnValue({ items: [], removeItem: vi.fn(), clearCompare: vi.fn() });
  });

  it('kit que ainda tem níveis no banco: nada de seletor, preço de nível ou "Mais Popular" (O4/B1)', async () => {
    await paginaDoKit(COM_NIVEIS);

    expect(screen.queryByText('Configuração do Kit')).not.toBeInTheDocument();
    expect(screen.queryByText('Escolha seu Nível de Experiência')).not.toBeInTheDocument();
    expect(screen.queryAllByText(/Silver|Gold|Platinum/)).toHaveLength(0);
    expect(screen.queryByText('Mais Popular')).not.toBeInTheDocument();
    expect(screen.queryAllByText(/R\$\s900,00|R\$\s1\.400,00/)).toHaveLength(0);
    // O preço que aparece é o do kit, o mesmo que o pedido cobra.
    expect(screen.getAllByText(/R\$\s650,00/).length).toBeGreaterThan(0);
  });

  it('kit de entrega com o Técnico de Som na composição: o técnico vem incluso, sem oferta à parte, e diz o frete (E1/E4)', async () => {
    await paginaDoKit(COM_TECNICO);

    expect(screen.getByText(FRASE_COM_TECNICO)).toBeInTheDocument();
    expect(screen.queryByText(/cobrado à parte/)).not.toBeInTheDocument();
  });

  it('kit de entrega sem técnico: a oferta do técnico à parte segue, com o frete; kit de retirada: sem entrega e sem frete', async () => {
    await paginaDoKit(SEM_TECNICO);
    expect(screen.getByText(FRASE_SEM_TECNICO)).toBeInTheDocument();
    expect(screen.queryByText(/já vem incluso/)).not.toBeInTheDocument();
    cleanup();

    await paginaDoKit(RETIRADA);
    expect(screen.getByText(FRASE_RETIRADA)).toBeInTheDocument();
    expect(screen.queryByText(/frete/)).not.toBeInTheDocument();
    expect(screen.queryByText(/15 km|km a mais/)).not.toBeInTheDocument();
    expect(screen.queryByText(/técnico/)).not.toBeInTheDocument();
  });

  it('o nome do kit fala de técnico, mas a composição não traz o serviço: vale a composição (técnico à parte)', async () => {
    await paginaDoKit(NOME_COM_TECNICO);

    expect(screen.getByText(FRASE_SEM_TECNICO)).toBeInTheDocument();
    expect(screen.queryByText(FRASE_COM_TECNICO)).not.toBeInTheDocument();
  });

  it('kit de entrega sem itens na resposta (sem o campo ou com a lista vazia): a página abre, com o frete e o técnico à parte', async () => {
    await paginaDoKit(SEM_ITENS);
    expect(screen.getByText(FRASE_SEM_TECNICO)).toBeInTheDocument();
    cleanup();

    await paginaDoKit(ITENS_VAZIOS);
    expect(screen.getByText(FRASE_SEM_TECNICO)).toBeInTheDocument();
  });

  it('adicionar ao orçamento: a mensagem não fala em desconto (O4)', async () => {
    await paginaDoKit(SEM_TECNICO);

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar combo ao orçamento' }));

    await waitFor(() => expect(addNotification).toHaveBeenCalledTimes(1));
    expect(addItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'kit-festa' }), 'kit');
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', message: 'Kit Festa foi incluído no seu orçamento.' }));
    expect(JSON.stringify(addNotification.mock.calls)).not.toMatch(/desconto/);
  });

  it('kit mantido no modal de troca (addItem devolve false): nenhum aviso de sucesso (junção, O24)', async () => {
    addItem.mockResolvedValue(false);
    await paginaDoKit(SEM_TECNICO);

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar combo ao orçamento' }));

    await waitFor(() => expect(addItem).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(addNotification).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });
});
