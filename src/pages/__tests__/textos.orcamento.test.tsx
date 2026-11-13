import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const { apiFetch, useCart } = vi.hoisted(() => ({ apiFetch: vi.fn(), useCart: vi.fn() }));
vi.mock('../../services/api', () => ({ apiFetch }));
vi.mock('../../hooks/useCart', () => ({ useCart }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../hooks/useRecommendations', () => ({ useRecommendations: () => ({ recommendations: [], loading: false }) }));
vi.mock('../../components/ui/RecommendationSection', () => ({ RecommendationSection: () => null }));
vi.mock('../../components/ui/FavoriteButton', () => ({ FavoriteButton: () => null }));
vi.mock('../../components/ui/CompareButton', () => ({ default: () => null }));
vi.mock('../../components/ui/AskOnWhatsAppButton', () => ({ AskOnWhatsAppButton: () => null }));
vi.mock('../../components/ui/ZoomableProductPhoto', () => ({ ZoomableProductPhoto: () => null }));
vi.mock('../../components/TestimonialCarousel', () => ({ TestimonialCarousel: () => null }));
// O <SEO> vira texto na página, para conferir a descrição que vai ao Google.
vi.mock('../../components/SEO', () => ({ SEO: ({ description }: { description?: string }) => <p data-testid="seo">{description}</p> }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import { ContactPage } from '../ContactPage';
import { EquipmentDetailPage } from '../EquipmentDetailPage';
import { CityLandingPage } from '../CityLandingPage';
import { ServiceListPage } from '../ServiceListPage';
import { TermsPage } from '../TermsPage';
import { TARGET_SERVICES, getServiceBySlug } from '../../utils/localSeoConfig';
import { NEED_LED, briefingPrefill } from '../../utils/briefing';

const comRotas = (ui: ReactElement, path = '/', entry = '/') =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path={path} element={ui} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
const normalizado = (texto: string | null | undefined) => (texto ?? '').replace(/\s+/g, ' ');

beforeEach(() => {
  vi.clearAllMocks();
  apiFetch.mockResolvedValue([]);
  useCart.mockReturnValue({ cart: null, addItem: vi.fn() });
});

// Auditoria do orçamento (12/11/2026), E5, E12 e B14: o FAQ do Contato dizia "nossa equipe cuida de toda a logística e
// montagem técnica" e "suporte remoto ou presencial". A regra real (decisões da dona de 06 e 12/11): kit de entrega com
// entrega e montagem incluídas e frete só acima de 15 km; avulso com frete a partir de R$ 50 e montagem à parte;
// técnico no evento como item do pedido.
describe('Contato — FAQ com a regra real de montagem, frete e técnico (E12)', () => {
  it('kit de entrega, equipamento avulso e técnico, sem "toda a logística e montagem"', () => {
    comRotas(<ContactPage />);

    const entrega = normalizado(screen.getByText('Fazem entrega e montagem?').nextElementSibling?.textContent);
    expect(entrega).toContain('Nos kits de entrega, sim: a entrega, a montagem e a retirada estão incluídas, e o frete só é cobrado pelos km acima de 15 km da nossa sede.');
    expect(entrega).toContain('No equipamento avulso, o frete começa em R$ 50 e a montagem é à parte, pelo serviço de montagem do catálogo.');
    const tecnico = normalizado(screen.getByText('Tem técnico durante o evento?').nextElementSibling?.textContent);
    expect(tecnico).toContain('Sim, como item do pedido: marque "Quero um técnico durante todo o evento" no orçamento.');
    expect(screen.queryByText(/toda a logística e montagem/)).not.toBeInTheDocument();
    expect(screen.queryByText(/suporte remoto ou presencial/)).not.toBeInTheDocument();
    expect(screen.queryByText(/garantir a disponibilidade/)).not.toBeInTheDocument();
  });
});

// Auditoria do orçamento (12/11/2026), E5: a página do equipamento dizia "Nossa equipe técnica disponível para auxiliar
// na configuração". A montagem do avulso é cobrada à parte, pelo serviço de montagem do catálogo.
describe('Equipamento — montagem à parte (E5)', () => {
  it('o cartão diz que a montagem é à parte, com o serviço de montagem, e incluída nos kits de entrega', async () => {
    apiFetch.mockImplementation((url: string) =>
      Promise.resolve(url === '/equipments/caixa-ativa'
        ? { id: 'eq-caixa', slug: 'caixa-ativa', name: 'Caixa Ativa', description: 'Caixa ativa', pricePerHour: 720, priceUnit: 'day', minimumRentalDuration: 1, quantity: 2, status: 'ACTIVE', categoryId: 'cat', category: { id: 'cat', name: 'Som' }, tags: [] }
        : []),
    );
    comRotas(<EquipmentDetailPage />, '/equipamentos/:slug', '/equipamentos/caixa-ativa');

    expect(await screen.findByText('Montagem à Parte')).toBeInTheDocument();
    expect(screen.getByText('Precisa de ajuda para montar? Acrescente o serviço de montagem no pedido. Nos kits de entrega, a montagem já vem incluída.')).toBeInTheDocument();
    expect(screen.queryByText(/equipe técnica disponível para auxiliar/)).not.toBeInTheDocument();
  });
});

// Auditoria do orçamento (12/11/2026), E5, E10 e E16: páginas por cidade com "Entrega e montagem em {cidade}", "pacote
// básico" e "Instalação feita pela equipe técnica"; a de painel de LED prometia "Equipamento Profissional, revisado
// antes de cada evento" (o LED é por parceiro) e levava a um briefing sem a opção de LED.
describe('Páginas por cidade — montagem, LED sob consulta e sem "pacote básico" (E5, E10, E16)', () => {
  it('textos dos serviços: sem "pacote básico" e sem montagem incluída para tudo', () => {
    const textos = JSON.stringify(TARGET_SERVICES);
    expect(textos).not.toContain('pacote básico');
    expect(textos).not.toContain('Instalação feita pela equipe técnica');
    expect(textos).not.toContain('Montagem organizada pela equipe técnica');
    expect(getServiceBySlug('aluguel-iluminacao')?.benefits).toContain('Montagem incluída nos kits de entrega (no avulso, à parte)');
    expect(getServiceBySlug('aluguel-som')?.longDescription).toContain('**Montagem:** incluída nos kits de entrega; no equipamento avulso, é à parte, pelo serviço de montagem.');
  });

  it('som em BH: a descrição diz entrega com montagem nos kits de entrega, e o botão vai ao briefing', async () => {
    comRotas(<CityLandingPage />, '/:seoSlug', '/aluguel-som-belo-horizonte');

    const seo = normalizado((await screen.findByTestId('seo')).textContent);
    expect(seo).toContain('Entrega em Belo Horizonte e região, com montagem incluída nos kits de entrega.');
    expect(seo).not.toContain('Entrega e montagem em');
    expect(screen.getByRole('link', { name: 'Solicitar Orçamento Grátis' })).toHaveAttribute('href', '/briefing');
    expect(screen.queryByText(/Garanta a data/)).not.toBeInTheDocument();
    expect(normalizado(screen.getByText('Quer um orçamento?').nextElementSibling?.textContent)).toContain('a data fica confirmada depois do aceite e da parcela inicial');
  });

  it('painel de LED: sob consulta, por parceiro, sem prometer equipamento próprio; o botão abre o briefing com o LED marcado', async () => {
    comRotas(<CityLandingPage />, '/:seoSlug', '/aluguel-painel-led-contagem');

    const seo = normalizado((await screen.findByTestId('seo')).textContent);
    expect(seo).toContain('Atendemos Contagem e região, sob consulta.');
    expect(seo).not.toContain('montagem');
    expect(screen.getByText('Sob consulta, com parceiro')).toBeInTheDocument();
    expect(screen.getByText(/não faz parte do nosso estoque/)).toBeInTheDocument();
    expect(screen.queryByText('Equipamento Profissional')).not.toBeInTheDocument();
    for (const link of [screen.getByRole('link', { name: 'Solicitar Orçamento Grátis' }), screen.getByRole('link', { name: 'Solicitar Cotação' })]) {
      const href = link.getAttribute('href') ?? '';
      expect(briefingPrefill(href.replace(/^\/briefing/, ''))).toEqual({ needs: [NEED_LED] });
    }
  });
});

// Auditoria do orçamento (12/11/2026), E16: textos institucionais que ofereciam o que não existe.
describe('Textos institucionais sem o que não existe (E16)', () => {
  it('Serviços: sem "Produtores" nem "produção de eventos"', async () => {
    comRotas(<ServiceListPage />);

    await screen.findByText('Conheça nossos serviços de DJ, técnico de som, técnico de iluminação, montagem e logística.');
    for (const seo of screen.getAllByTestId('seo')) {
      expect(seo).toHaveTextContent('DJ, técnico de som, técnico de iluminação, montagem e logística para o seu evento em Belo Horizonte e região.');
    }
    expect(screen.queryByText(/Produtores/)).not.toBeInTheDocument();
    expect(screen.queryByText(/produção de eventos/)).not.toBeInTheDocument();
  });

  it('Termos: sem "Consultoria em eventos" nem "Venda de acessórios", com a data da revisão', () => {
    comRotas(<TermsPage />);

    expect(screen.getByText('Locação de equipamentos de som, iluminação e estrutura para eventos')).toBeInTheDocument();
    expect(screen.getByText('Serviços para o evento: DJ, técnico de som, técnico de iluminação, montagem e logística')).toBeInTheDocument();
    expect(screen.queryByText('Consultoria em eventos')).not.toBeInTheDocument();
    expect(screen.queryByText('Venda de acessórios')).not.toBeInTheDocument();
    // Textos legais (13/11/2026): Termos revistos (objeto, contratação, aceite pelo site e foro).
    expect(screen.getByText('Última atualização: 13/11/2026')).toBeInTheDocument();
  });
});
