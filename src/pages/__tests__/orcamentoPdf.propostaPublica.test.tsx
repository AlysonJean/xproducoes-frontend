import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Orçamento em PDF (13/11/2026): a página da proposta (/proposta#token=...) ganhou "Baixar orçamento (PDF)". O PDF é
// o que o servidor gera na hora, a partir da reserva atual; o código do link vai no corpo do POST /proposals/pdf
// (quotePdfAPI.fromProposal), com o mesmo controle do /proposals/view. Antes o cliente do link não tinha PDF nenhum.
const { apiFetch, quotePdfAPI } = vi.hoisted(() => ({ apiFetch: vi.fn(), quotePdfAPI: { fromProposal: vi.fn() } }));
vi.mock('@/services/api', () => ({ apiFetch, quotePdfAPI }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn(), initialize: vi.fn(), send: vi.fn(), set: vi.fn() } }));

import PublicProposalPage from '../PublicProposalPage';

const CODIGO = 'p1.TESTE';
const aberta = {
  state: 'open',
  eventTitle: 'Formatura da Ana',
  eventDate: '2027-12-21T01:00:00.000Z',
  eventEndDate: '2027-12-21T07:00:00.000Z',
  city: 'Belo Horizonte',
  neighborhood: 'Savassi',
  pricing: { lines: [{ description: 'Kit Som (4 h incluídas)', quantity: 1, total: 900 }], discount: null, adjustment: 0, total: 900 },
  validUntil: '2027-12-15T02:59:59.999Z',
};

const montar = (hash = `#token=${CODIGO}`) => {
  window.history.replaceState(null, '', `/proposta${hash}`);
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/proposta']}>
        <Routes>
          <Route path="/proposta" element={<PublicProposalPage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
};
const httpError = (status: number, message = 'falhou') => Object.assign(new Error(message), { status });
const botao = () => screen.getByRole('button', { name: /Baixar orçamento \(PDF\)|Gerando PDF/ });

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  window.history.replaceState(null, '', '/');
  document.head.innerHTML = '';
});

describe('orçamento em PDF — página da proposta', () => {
  it('proposta aberta: "Baixar orçamento (PDF)" manda o código do link (o do "#") para o servidor', async () => {
    apiFetch.mockResolvedValue(aberta);
    let terminar: () => void = () => undefined;
    quotePdfAPI.fromProposal.mockImplementation(() => new Promise<void>((resolve) => { terminar = resolve; }));
    montar();
    await screen.findByRole('heading', { name: 'Formatura da Ana' });

    fireEvent.click(screen.getByRole('button', { name: 'Baixar orçamento (PDF)' }));

    expect(quotePdfAPI.fromProposal).toHaveBeenCalledWith(CODIGO);
    expect(await screen.findByText('Gerando PDF...')).toBeInTheDocument();
    terminar();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Baixar orçamento (PDF)' })).toBeEnabled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    [410, 'Este link venceu ou foi trocado. Peça um novo link à equipe.'],
    [404, 'Este link não é válido. Peça um novo link à equipe.'],
    [409, 'Esta proposta já foi confirmada.'],
    [503, 'Link de proposta indisponível no momento.'],
    [500, 'Não conseguimos gerar o PDF agora. Tente de novo em alguns minutos ou fale com a equipe.'],
  ])('o servidor responde %i: a página diz por quê', async (status, mensagem) => {
    apiFetch.mockResolvedValue(aberta);
    quotePdfAPI.fromProposal.mockRejectedValue(httpError(status));
    montar();
    await screen.findByRole('heading', { name: 'Formatura da Ana' });

    fireEvent.click(botao());

    expect(await screen.findByRole('alert')).toHaveTextContent(mensagem);
  });

  it('muitos downloads (429): a mensagem do servidor', async () => {
    apiFetch.mockResolvedValue(aberta);
    quotePdfAPI.fromProposal.mockRejectedValue(httpError(429, 'Muitos downloads do orçamento. Aguarde alguns minutos e tente de novo.'));
    montar();
    await screen.findByRole('heading', { name: 'Formatura da Ana' });

    fireEvent.click(botao());

    expect(await screen.findByRole('alert')).toHaveTextContent('Muitos downloads do orçamento. Aguarde alguns minutos e tente de novo.');
  });

  it('o botão só existe na proposta aberta: confirmada, link vencido ou sem código, nada de PDF', async () => {
    apiFetch.mockResolvedValue(aberta);
    const aberto = montar();
    expect(await screen.findByRole('button', { name: 'Baixar orçamento (PDF)' })).toBeInTheDocument();
    aberto.unmount();

    apiFetch.mockResolvedValue({ state: 'closed' });
    const confirmada = montar();
    await screen.findByText('Esta proposta já foi confirmada.');
    expect(screen.queryByRole('button', { name: /Baixar orçamento/ })).not.toBeInTheDocument();
    confirmada.unmount();

    apiFetch.mockRejectedValue(httpError(410));
    const vencida = montar();
    await screen.findByText('Este link venceu ou foi trocado. Peça um novo link à equipe.');
    expect(screen.queryByRole('button', { name: /Baixar orçamento/ })).not.toBeInTheDocument();
    vencida.unmount();

    montar('');
    await screen.findByText('Este link não é válido. Peça um novo link à equipe.');
    expect(screen.queryByRole('button', { name: /Baixar orçamento/ })).not.toBeInTheDocument();
    expect(quotePdfAPI.fromProposal).not.toHaveBeenCalled();
  });
});
