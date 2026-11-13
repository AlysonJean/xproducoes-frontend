import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch, recommendationAPI: { getByBudget: apiFetch } }));
vi.mock('@/services/api', () => ({ apiFetch, recommendationAPI: { getByBudget: apiFetch } }));

import { InteractiveQuiz } from '../InteractiveQuiz';
import { briefingPrefill } from '../../../utils/briefing';

const renderQuiz = () =>
  render(
    <MemoryRouter>
      <InteractiveQuiz />
    </MemoryRouter>,
  );

// Os três passos ficam na página o tempo todo (só a opacidade muda): dá para responder em sequência.
const responder = (tipo: string, publico: RegExp, ambiente: RegExp) => {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(tipo) }));
  fireEvent.click(screen.getByRole('button', { name: publico }));
  fireEvent.click(screen.getByRole('button', { name: ambiente }));
};

const linkDoPedido = () => screen.getByRole('link', { name: /CONTINUAR O PEDIDO/, hidden: true }) as HTMLAnchorElement;

// Auditoria do orçamento (12/11/2026), O27, E9 e B13: o teste da Home mostrava uma faixa de preço por diária inventada,
// públicos de "300 a 600" e "mais de 600" (o maior kit atende até 500), "Temos a configuração exata para você" e o
// botão final abria o WhatsApp sem gravar nada. Agora: públicos até 500 e "Mais de 500 (sob consulta)", sem preço, e o
// botão leva ao briefing com o tipo de evento, o público e o ambiente já preenchidos.
describe('InteractiveQuiz — leva ao briefing preenchido, sem preço inventado (O27)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetch.mockResolvedValue([]);
  });

  it('públicos até 500 e acima disso sob consulta; nada de 600', () => {
    renderQuiz();

    for (const faixa of ['Até 50 pessoas', '50 a 100 pessoas', '100 a 200 pessoas', '200 a 500 pessoas', 'Mais de 500 pessoas']) {
      expect(screen.getByRole('button', { name: new RegExp(faixa) })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: /Mais de 500 pessoas/ })).toHaveTextContent('Sob consulta');
    expect(screen.queryByText(/600/)).not.toBeInTheDocument();
  });

  it('o botão final abre o briefing com as três respostas; sem faixa de preço, sem "configuração exata", sem WhatsApp', () => {
    renderQuiz();
    responder('Casamento', /200 a 500 pessoas/, /Fechado/);

    const href = linkDoPedido().getAttribute('href') ?? '';
    expect(href.startsWith('/briefing?')).toBe(true);
    expect(briefingPrefill(href.slice('/briefing'.length))).toEqual({ eventType: 'Casamento', guests: '200 a 500', environment: 'Fechado' });
    expect(screen.queryByText(/Faixa estimada/)).not.toBeInTheDocument();
    expect(screen.queryByText(/configuração exata/)).not.toBeInTheDocument();
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
    expect(document.querySelector('a[href*="wa.me"]')).toBeNull();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('mais de 500 pessoas: diz que é sob consulta e leva a resposta ao briefing', () => {
    renderQuiz();
    responder('Show ou festival', /Mais de 500 pessoas/, /Ao ar livre/);

    expect(screen.getByText(/Para mais de 500 pessoas, o projeto é sob consulta/)).toBeInTheDocument();
    expect(briefingPrefill(linkDoPedido().getAttribute('href')!.slice('/briefing'.length))).toMatchObject({ guests: 'Mais de 500 (sob consulta)' });
  });

  it('o que não está na tela fica inert: o "Continuar o pedido" só entra no Tab depois das três respostas', async () => {
    renderQuiz();
    const casamento = screen.getByRole('button', { name: /Casamento/ });
    expect(casamento.closest('[inert]')).toBeNull();
    expect(linkDoPedido().closest('[inert]')).not.toBeNull();
    expect(screen.getByRole('button', { name: /200 a 500 pessoas/, hidden: true }).closest('[inert]')).not.toBeNull();

    responder('Casamento', /200 a 500 pessoas/, /Fechado/);

    await waitFor(() => expect(linkDoPedido().closest('[inert]')).toBeNull());
    expect(casamento.closest('[inert]')).not.toBeNull();
  });

  it('sugere ver os kits, sem números', () => {
    renderQuiz();
    expect(screen.getByRole('link', { name: 'Ver kits', hidden: true })).toHaveAttribute('href', '/kits');
  });
});
