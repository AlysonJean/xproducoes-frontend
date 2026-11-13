import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { apiFetch, gaEvent } = vi.hoisted(() => ({ apiFetch: vi.fn(), gaEvent: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'CLIENT', name: 'Ana da Conta' } }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../components/client/BookingChatPanel', () => ({ BookingChatPanel: () => <p>Chat antigo da reserva</p> }));
vi.mock('react-ga4', () => ({ default: { event: gaEvent } }));

import { BookingDetailsPage } from '../BookingDetailsPage';

// D20 (aprovada em 02/11/2026): "Mensagens sobre esta reserva" virou "Fale com a equipe": o cliente
// escrevia num chat que ninguém lia. Agora há um WhatsApp com nome, código e data já escritos, e o e-mail
// como alternativa; o chat só volta com VITE_CLIENT_BOOKING_CHAT_ENABLED=true.
// O processo roda em UTC aqui: 01:30 UTC do dia 11 é 22:30 do dia 10 em Brasília, e a mensagem tem de
// levar o dia do evento para a empresa, não o do fuso do aparelho.
const RESERVA = {
  id: 'XP-ANA-20261210-2230-K4Q',
  status: 'CONFIRMED',
  eventDate: '2026-12-11T01:30:00.000Z',
  totalPrice: '1200',
  attachments: [],
  eventCollaborators: [],
  clientName: 'Ana Souza',
};

const renderPage = async (reserva: object = RESERVA) => {
  apiFetch.mockResolvedValue(reserva);
  render(
    <MemoryRouter initialEntries={['/cliente/reservas/XP-ANA-20261210-2230-K4Q']}>
      <Routes>
        <Route path="/cliente/reservas/:id" element={<BookingDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByText('Fale com a equipe sobre esta reserva');
};

const whatsApp = () => {
  const link = screen.getByRole('link', { name: /Chamar no WhatsApp/ });
  const url = new URL(link.getAttribute('href') ?? '');
  return { link, url, texto: url.searchParams.get('text') ?? '' };
};

describe('BookingDetailsPage (cliente) — D20: "Fale com a equipe sobre esta reserva"', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    gaEvent.mockReset();
    vi.stubEnv('TZ', 'UTC');
    vi.stubEnv('VITE_WHATSAPP_PHONE', '(31) 98925-2272');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('WhatsApp do site com o nome, o código inteiro e a data do evento em Brasília já escritos', async () => {
    await renderPage();

    const { link, url, texto } = whatsApp();
    expect(`${url.origin}${url.pathname}`).toBe('https://wa.me/5531989252272');
    expect(link).toHaveAttribute('target', '_blank');
    expect(texto).toContain('Ana Souza');
    expect(texto).toContain('XP-ANA-20261210-2230-K4Q');
    expect(texto).toContain('10/12/2026');
    expect(texto).not.toContain('11/12/2026');
  });

  it('sem nome informado na reserva, vai o nome da conta', async () => {
    await renderPage({ ...RESERVA, clientName: null });

    expect(whatsApp().texto).toContain('Ana da Conta');
  });

  it('o e-mail é a alternativa: o endereço de suporte do site, com o código no assunto', async () => {
    await renderPage();

    const href = screen.getByRole('link', { name: /Enviar e-mail/ }).getAttribute('href') ?? '';
    expect(href.startsWith('mailto:suporte@xproducoeseeventos.com.br?')).toBe(true);
    expect(decodeURIComponent(href.split('subject=')[1].split('&')[0])).toBe('Reserva XP-ANA-20261210-2230-K4Q');
    expect(screen.getByText(/suporte@xproducoeseeventos\.com\.br/)).toBeInTheDocument();
  });

  it('o clique vai ao GA como no botão flutuante, sem nome, código ou contato', async () => {
    await renderPage();
    const { link } = whatsApp();
    link.addEventListener('click', (event) => event.preventDefault()); // o jsdom não abre outra aba

    fireEvent.click(link);

    expect(gaEvent).toHaveBeenCalledWith({ category: 'contact', action: 'whatsapp_click', label: 'area_cliente' });
    expect(JSON.stringify(gaEvent.mock.calls)).not.toMatch(/Ana|XP-|98925|suporte@/);
  });

  it('o chat antigo ("Mensagens sobre esta reserva") não aparece por padrão', async () => {
    await renderPage();

    expect(screen.queryByText('Chat antigo da reserva')).toBeNull();
  });

  // Revisão: só "true" mostra o chat; "false" na Vercel tem de deixar o chat escondido.
  it('com VITE_CLIENT_BOOKING_CHAT_ENABLED=false (qualquer valor que não seja "true") o chat continua escondido', async () => {
    vi.stubEnv('VITE_CLIENT_BOOKING_CHAT_ENABLED', 'false');

    await renderPage();

    expect(screen.queryByText('Chat antigo da reserva')).toBeNull();
  });

  it('com VITE_CLIENT_BOOKING_CHAT_ENABLED=true o chat volta a aparecer, junto do cartão', async () => {
    vi.stubEnv('VITE_CLIENT_BOOKING_CHAT_ENABLED', 'true');

    await renderPage();

    expect(screen.getByText('Chat antigo da reserva')).toBeInTheDocument();
    expect(screen.getByText('Fale com a equipe sobre esta reserva')).toBeInTheDocument();
  });
});
