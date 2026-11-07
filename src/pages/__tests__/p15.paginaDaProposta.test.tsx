import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// P15 (aprovada em 02/11/2026), parte 1: a página /proposta (pages/PublicProposalPage.tsx) lê o código depois do "#"
// e o manda no CORPO de POST /proposals/view; o endereço antigo /proposta/<número> (pages/ProposalViewPage.tsx, que
// agora só tem esse aviso) só avisa que o link não vale mais. Antes, a página chamava GET /bookings/<número>, que
// exige login: o cliente via "Proposta não encontrada".
const { apiFetch, gaEvent } = vi.hoisted(() => ({ apiFetch: vi.fn(), gaEvent: vi.fn() }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('react-ga4', () => ({ default: { event: gaEvent, initialize: vi.fn(), send: vi.fn(), set: vi.fn() } }));

import PublicProposalPage from '../PublicProposalPage';
import LegacyProposalLinkPage from '../ProposalViewPage';
import { getWhatsAppPhone } from '../../utils/whatsapp';

const CODIGO = 'p1.TESTE';
const aberta = {
  state: 'open',
  eventTitle: 'Formatura da Ana',
  eventDate: '2027-12-21T01:00:00.000Z',
  eventEndDate: '2027-12-21T07:00:00.000Z',
  city: 'Belo Horizonte',
  neighborhood: 'Savassi',
  pricing: {
    lines: [
      { description: 'Kit Som (4 h incluídas)', quantity: 1, total: 650 },
      { description: 'Técnico de Som (6 h de evento: 3 h incluídas + 3 h a mais)', quantity: 1, total: 200 },
      { description: 'Caixa extra', quantity: 2, total: 80 },
    ],
    discount: 60,
    adjustment: 30,
    total: 900,
  },
  validUntil: '2027-12-15T02:59:59.999Z',
};

const montar = (path: string, hash = '') => {
  window.history.replaceState(null, '', `${path}${hash}`);
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/proposta" element={<PublicProposalPage />} />
          <Route path="/proposta/:id" element={<LegacyProposalLinkPage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
};
const httpError = (status: number) => Object.assign(new Error('falhou'), { status });
const texto = () => (document.body.textContent ?? '').replace(/\s/g, ' ');
const whatsapp = () => {
  const link = screen.getByRole('link', { name: 'Falar no WhatsApp' });
  const url = new URL(link.getAttribute('href') ?? '');
  return { link, url, text: url.searchParams.get('text') ?? '' };
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  window.history.replaceState(null, '', '/');
  document.head.innerHTML = '';
});

describe('P15 — página /proposta', () => {
  it('lê o código do "#" e manda no corpo de POST /proposals/view, nunca no endereço', async () => {
    apiFetch.mockResolvedValue(aberta);
    montar('/proposta', `#token=${CODIGO}`);

    await screen.findByRole('heading', { name: 'Formatura da Ana' });
    expect(apiFetch).toHaveBeenCalledTimes(1);
    const [endpoint, options] = apiFetch.mock.calls[0];
    expect(endpoint).toBe('/proposals/view');
    expect(endpoint).not.toContain(CODIGO);
    expect(options).toEqual({ method: 'POST', body: JSON.stringify({ token: CODIGO }), referrerPolicy: 'origin' });
  });

  it('proposta aberta: título, data e hora de Brasília, bairro e cidade, as linhas, desconto, ajuste, total, validade e dados da empresa', async () => {
    apiFetch.mockResolvedValue(aberta);
    montar('/proposta', `#token=${CODIGO}`);

    await screen.findByRole('heading', { name: 'Formatura da Ana' });
    const page = texto();
    expect(page).toContain('Início 20/12/2027 às 22:00 · término 21/12/2027 às 04:00');
    expect(page).toContain('Savassi, Belo Horizonte');
    expect(page).toContain('Kit Som (4 h incluídas)');
    expect(page).toContain('Técnico de Som (6 h de evento: 3 h incluídas + 3 h a mais)');
    expect(page).toContain('2× Caixa extra');
    expect(page).toMatch(/Desconto:\s*− R\$ 60,00/);
    expect(page).toMatch(/Ajuste no valor final:\s*\+ R\$ 30,00/);
    expect(page).toMatch(/Total:\s*R\$ 900,00/);
    expect(page).toContain('Válida até 14/12/2027');
    expect(page).toContain('CNPJ 55.343.824/0001-56');
    expect(page).not.toContain(CODIGO);
  });

  it('"Falar no WhatsApp": número da empresa, título e data no texto, sem link nem código, e sem evento do GA', async () => {
    apiFetch.mockResolvedValue(aberta);
    montar('/proposta', `#token=${CODIGO}`);
    await screen.findByRole('heading', { name: 'Formatura da Ana' });

    const { link, url, text } = whatsapp();
    fireEvent.click(link);

    expect(`${url.origin}${url.pathname}`).toBe(`https://wa.me/${getWhatsAppPhone()}`);
    expect(text).toBe('Olá! Vi a proposta do evento "Formatura da Ana", de 20/12/2027, e quero falar com a equipe.');
    expect(text).not.toMatch(/http|proposta#|token|p1\./);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(gaEvent).not.toHaveBeenCalled();
  });

  it.each([
    [404, 'Este link não é válido. Peça um novo link à equipe.'],
    [400, 'Este link não é válido. Peça um novo link à equipe.'],
    [410, 'Este link venceu ou foi trocado. Peça um novo link à equipe.'],
    [503, 'Link de proposta indisponível no momento.'],
    [429, 'Não conseguimos abrir a proposta agora. Tente de novo em alguns minutos ou fale com a equipe.'],
  ])('resposta %i: "%s", com o botão do WhatsApp e sem preço', async (status, mensagem) => {
    apiFetch.mockRejectedValue(httpError(status));
    montar('/proposta', `#token=${CODIGO}`);

    expect(await screen.findByRole('heading', { name: mensagem })).toBeInTheDocument();
    expect(whatsapp().text).not.toContain(CODIGO);
    expect(texto()).not.toContain('Total:');
  });

  it('falha de rede (sem status): mensagem genérica', async () => {
    apiFetch.mockRejectedValue(new TypeError('Failed to fetch'));
    montar('/proposta', `#token=${CODIGO}`);

    expect(await screen.findByRole('heading', { name: /Não conseguimos abrir a proposta agora/ })).toBeInTheDocument();
  });

  it('reserva já confirmada: "Esta proposta já foi confirmada.", sem dado nenhum da proposta', async () => {
    apiFetch.mockResolvedValue({ state: 'closed' });
    montar('/proposta', `#token=${CODIGO}`);

    expect(await screen.findByRole('heading', { name: 'Esta proposta já foi confirmada.' })).toBeInTheDocument();
    expect(texto()).not.toContain('Total:');
    expect(texto()).not.toContain('Válida até');
  });

  it('sem código no endereço (ou sem token=): link inválido, sem chamar a API', async () => {
    for (const hash of ['', '#outra=coisa', '#token=']) {
      const view = montar('/proposta', hash);
      expect(await screen.findByRole('heading', { name: 'Este link não é válido. Peça um novo link à equipe.' })).toBeInTheDocument();
      view.unmount();
    }
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('carregando: aviso de espera antes da resposta', () => {
    apiFetch.mockReturnValue(new Promise(() => {}));
    montar('/proposta', `#token=${CODIGO}`);

    expect(screen.getByText('Abrindo a proposta...')).toBeInTheDocument();
  });

  it('cabeçalho do documento: noindex, nofollow e no-referrer, sem canonical nem og:url', async () => {
    apiFetch.mockResolvedValue(aberta);
    montar('/proposta', `#token=${CODIGO}`);
    await screen.findByRole('heading', { name: 'Formatura da Ana' });

    await waitFor(() => expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow'));
    expect(document.head.querySelector('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.head.querySelector('meta[property="og:url"]')).toBeNull();
  });
});

describe('P15 — endereço antigo /proposta/<número>', () => {
  it('avisa que o link não vale mais, oferece o WhatsApp e não chama a API', async () => {
    montar('/proposta/XP-ANA-20271220-2200-AB1');

    expect(await screen.findByRole('heading', { name: 'Este link não vale mais. Peça um novo link à equipe.' })).toBeInTheDocument();
    const { url, text } = whatsapp();
    expect(`${url.origin}${url.pathname}`).toBe(`https://wa.me/${getWhatsAppPhone()}`);
    expect(text).toBe('Olá! O link da proposta XP-ANA-20271220-2200-AB1 não abre mais. Pode me mandar um novo?');
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('número com caractere estranho não entra no texto do WhatsApp', async () => {
    montar('/proposta/%3Cscript%3E');

    await screen.findByRole('heading', { name: 'Este link não vale mais. Peça um novo link à equipe.' });
    expect(whatsapp().text).toBe('Olá! Recebi um link de proposta que não abriu. Pode me mandar um novo?');
  });

  it('o arquivo da página antiga (ProposalViewPage.tsx) ficou só com o aviso: nada além do componente do endereço antigo', async () => {
    const legado = await import('../ProposalViewPage');

    expect(Object.keys(legado)).toEqual(['default']);
    expect(legado.default).toBe(LegacyProposalLinkPage);
    expect(legado.default.name).toBe('LegacyProposalLinkPage');
  });
});
