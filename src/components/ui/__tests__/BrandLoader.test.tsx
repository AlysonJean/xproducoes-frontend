import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// O player recebe os bytes prontos (prop `data`) em vez de baixar sozinho (prop `src`).
vi.mock('@lottiefiles/dotlottie-react', () => ({
  DotLottieReact: (props: { src?: string; data?: ArrayBuffer }) => (
    <div data-testid="lottie" data-src={props.src ?? ''} data-bytes={props.data ? String(props.data.byteLength) : ''} />
  ),
}));

// Auditoria do painel: o .lottie era pedido 8 vezes em paralelo, uma por instância do player
// (cada card carregando no painel tem um BrandLoader) — sem cache, porque saem ao mesmo tempo.
describe('BrandLoader — um download do .lottie para todas as instâncias', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(16) });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('8 loaders na tela: 1 requisição, e todos recebem os bytes', async () => {
    const { BrandLoader } = await import('../BrandLoader');
    render(<>{Array.from({ length: 8 }, (_, i) => <BrandLoader key={i} size="sm" />)}</>);

    // Espera os 8 players (findAllByTestId resolve com o primeiro que aparecer — no CI, mais
    // lento por causa da cobertura, voltava com 2) e todos com os bytes.
    await vi.waitFor(() => {
      const players = screen.getAllByTestId('lottie');
      expect(players).toHaveLength(8);
      expect(players.every((p) => p.getAttribute('data-bytes') === '16')).toBe(true);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/animations/Logo-xproducoes-eventos.lottie');
  });

  it('se o download falhar, o player volta a buscar sozinho pelo src (não some da tela)', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503, arrayBuffer: async () => new ArrayBuffer(0) });
    const { BrandLoader } = await import('../BrandLoader');
    render(<BrandLoader size="sm" />);

    const player = await screen.findByTestId('lottie');
    await vi.waitFor(() => expect(player.getAttribute('data-src')).toBe('/animations/Logo-xproducoes-eventos.lottie'));
  });
});
