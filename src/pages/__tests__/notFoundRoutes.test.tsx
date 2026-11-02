import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { CityLandingPage } from '../CityLandingPage';
import { GuideDetailPage } from '../GuideDetailPage';
import { NotFoundPage } from '../NotFoundPage';
import { GUIDES } from '../../data/guides';
import { apiFetch } from '../../services/api';

// A landing busca as avaliações e o carrossel busca os depoimentos (em efeitos): sem o mock, iriam à rede.
vi.mock('../../services/api', () => ({
  apiFetch: vi.fn(),
}));

function CurrentPath() {
  return <output data-testid="pathname">{useLocation().pathname}</output>;
}

// Mesma relação entre estas rotas em src/App.tsx: /guias/:slug, /:seoSlug (landings de SEO local,
// que pega qualquer endereço de um segmento sem rota fixa) e o "*" final.
function renderAt(url: string) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/guias/:slug" element={<GuideDetailPage />} />
          <Route path="/:seoSlug" element={<CityLandingPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <CurrentPath />
      </MemoryRouter>
    </HelmetProvider>
  );
}

async function expectNotFoundPageAt(pathname: string) {
  expect(await screen.findByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeInTheDocument();
  expect(screen.getByTestId('pathname')).toHaveTextContent(pathname);
  await waitFor(() => {
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
  });
}

// Achado (auditoria ponta a ponta): endereço errado de um segmento (/contatos, /pagina-que-nao-existe)
// caía em /:seoSlug, e CityLandingPage fazia <Navigate to="/404" /> — mas /404 também casa com
// /:seoSlug, então o redirecionamento voltava para a mesma página e terminava em branco, sem título e
// sem noindex. GuideDetailPage redirecionava para o mesmo /404.
describe('endereço inexistente mostra a página 404 no próprio endereço', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
    vi.mocked(apiFetch).mockImplementation(() => new Promise(() => {}));
  });

  afterEach(() => {
    cleanup();
    document.head.querySelectorAll('meta[name="robots"]').forEach((el) => el.remove());
  });

  it('segmento único que não é serviço×cidade', async () => {
    renderAt('/pagina-que-nao-existe');
    await expectNotFoundPageAt('/pagina-que-nao-existe');
  });

  it('/404 (destino do redirecionamento antigo) também mostra a página 404', async () => {
    renderAt('/404');
    await expectNotFoundPageAt('/404');
  });

  it('guia inexistente', async () => {
    renderAt('/guias/guia-que-nao-existe');
    await expectNotFoundPageAt('/guias/guia-que-nao-existe');
  });

  it('as landings de SEO local e os guias que existem continuam abrindo', async () => {
    renderAt('/aluguel-som-belo-horizonte');
    expect(await screen.findByRole('heading', { level: 1, name: 'Aluguel de Som em Belo Horizonte' })).toBeInTheDocument();
    cleanup();

    renderAt(`/guias/${GUIDES[0].slug}`);
    expect(await screen.findByRole('heading', { level: 1, name: GUIDES[0].title })).toBeInTheDocument();
    expect(screen.queryByText('Página não encontrada')).not.toBeInTheDocument();
  });
});
