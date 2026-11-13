import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const { post, useAuth, setAuthenticatedUser, addNotification } = vi.hoisted(() => ({
  post: vi.fn(),
  useAuth: vi.fn(),
  setAuthenticatedUser: vi.fn(),
  addNotification: vi.fn(),
}));
vi.mock('../../../services/api', () => ({ api: { post } }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../components/SEO', () => ({ SEO: () => null }));

import { BriefingPage } from '../BriefingPage';

const Sucesso = () => {
  const { pathname, state } = useLocation();
  return <p>{`Tela de sucesso ${pathname} ${(state as { briefingAccount?: string })?.briefingAccount}`}</p>;
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/briefing']}>
      <Routes>
        <Route path="/briefing" element={<BriefingPage />} />
        <Route path="/orcamento-sucesso/:id" element={<Sucesso />} />
      </Routes>
    </MemoryRouter>,
  );

const tap = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const FUTURE = '2030-03-20';

const fillEvent = () => {
  tap('Casamento');
  type('Qual é a data?', FUTURE);
  tap('100 a 200');
  tap('Continuar');
};
const fillVenueUnknown = () => {
  tap('Ainda não sei');
  type('Cidade', 'Contagem');
  tap('Continuar');
};
const goToContact = () => {
  fillEvent();
  fillVenueUnknown();
  tap('Som');
  tap('Continuar');
  tap('Pular esta etapa');
};
const fillContactAndSend = () => {
  type('Seu nome', 'Ana Souza');
  type('WhatsApp com DDD', '31988887777');
  type('E-mail', 'ana@cliente.test');
  fireEvent.click(screen.getByRole('checkbox', { name: /Estou ciente/ }));
  tap(/Enviar e receber/);
};

describe('BriefingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuth.mockReturnValue({ user: null, setAuthenticatedUser });
    post.mockResolvedValue({ data: { booking: { id: 'XP-ANA-1' }, user: { id: 'u1', name: 'Ana' } } });
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('não avança sem as respostas e diz o que falta', () => {
    renderPage();
    tap('Continuar');
    expect(screen.getByText('Escolha o tipo de evento.')).toBeInTheDocument();
    expect(screen.getByText('Passo 1 de 5')).toBeInTheDocument();
  });

  it('do começo ao fim: envia sem login, cria o acesso e vai para a tela de sucesso', async () => {
    renderPage();
    fillEvent();
    expect(screen.getByText('Passo 2 de 5')).toBeInTheDocument();
    fillVenueUnknown();

    tap('Som');
    // Auditoria do orçamento (12/11/2026), E11: o rótulo da banda mudou.
    tap('Vai ter banda ao vivo (som para a banda)');
    type(/Quantas pessoas na banda/, '5');
    tap('Continuar');

    // Detalhes são opcionais: dá para pular sem responder nada.
    tap('Pular esta etapa');

    type('Seu nome', 'Ana Souza');
    type('WhatsApp com DDD', '(31) 98888-7777');
    type('E-mail', 'ana@cliente.test');
    tap(/Enviar e receber/);
    expect(screen.getByText('Para enviar, é preciso marcar que está ciente.')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('checkbox', { name: /Estou ciente/ }));
    tap(/Enviar e receber/);

    await screen.findByText('Tela de sucesso /orcamento-sucesso/XP-ANA-1 created');
    const [url, body, config] = post.mock.calls[0];
    expect(url).toBe('/bookings/guest');
    expect(body).toMatchObject({ source: 'briefing', status: 'PENDING', eventTitle: 'Casamento', location: 'A definir', city: 'Contagem', clientName: 'Ana Souza', clientEmail: 'ana@cliente.test' });
    expect(body.specialRequests).toContain('Precisa de: Som, Vai ter banda ao vivo (som para a banda)');
    expect(body.specialRequests).toContain('Integrantes da banda: 5');
    expect(config.headers['Idempotency-Key']).toBeTruthy();
    expect(setAuthenticatedUser).toHaveBeenCalledWith({ id: 'u1', name: 'Ana' });
    expect(localStorage.getItem('briefing-draft')).toBeNull();
  });

  it('mostra as perguntas de banda e de chuva só para quem marcou banda e área aberta', () => {
    renderPage();
    fillEvent();
    tap('Ainda não sei');
    type('Cidade', 'Contagem');
    tap('Fechado');
    tap('Continuar');
    tap('Som');
    expect(screen.queryByLabelText(/Quantas pessoas na banda/)).toBeNull();
    tap('Continuar');
    expect(screen.queryByText(/A banda leva/)).toBeNull();
    expect(screen.queryByText(/se chover/)).toBeNull();

    tap('Voltar');
    tap('Vai ter banda ao vivo (som para a banda)');
    tap('Continuar');
    expect(screen.getByText(/A banda leva/)).toBeInTheDocument();

    tap('Voltar');
    tap('Voltar');
    tap('Ao ar livre');
    tap('Continuar');
    tap('Continuar');
    expect(screen.getByText(/se chover/)).toBeInTheDocument();
  });

  it('preenche o endereço pelo CEP', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ logradouro: 'Av. Brasil', bairro: 'Centro', localidade: 'Belo Horizonte', uf: 'MG' }),
    } as Response);
    renderPage();
    fillEvent();
    tap('Já sei o local');
    type('CEP', '30110000');

    await waitFor(() => expect(screen.getByLabelText('Rua')).toHaveValue('Av. Brasil'));
    expect(fetch).toHaveBeenCalledWith('https://viacep.com.br/ws/30110000/json/', expect.anything());
    expect(screen.getByLabelText('Bairro')).toHaveValue('Centro');
    expect(screen.getByLabelText('Cidade')).toHaveValue('Belo Horizonte');
  });

  it('CEP não encontrado: avisa e deixa preencher à mão', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ erro: true }) } as Response);
    renderPage();
    fillEvent();
    tap('Já sei o local');
    type('CEP', '00000000');

    await screen.findByText(/Não achamos esse CEP/);
    expect(screen.getByLabelText('Rua')).toHaveValue('');
  });

  it('falha no envio: mantém as respostas e repete a mesma chave para não duplicar', async () => {
    post.mockRejectedValueOnce(new Error('rede'));
    renderPage();
    goToContact();
    fillContactAndSend();

    await screen.findByText(/Suas respostas continuam aqui/);
    expect(screen.getByLabelText('Seu nome')).toHaveValue('Ana Souza');

    tap(/Enviar e receber/);
    await screen.findByText(/Tela de sucesso/);
    expect(post.mock.calls[1][2].headers['Idempotency-Key']).toBe(post.mock.calls[0][2].headers['Idempotency-Key']);
  });

  it('e-mail que já tem conta: a tela de sucesso sabe que não há sessão nova', async () => {
    post.mockResolvedValue({ data: { booking: { id: 'XP-ANA-2' }, existingAccount: true } });
    renderPage();
    goToContact();
    fillContactAndSend();

    await screen.findByText('Tela de sucesso /orcamento-sucesso/XP-ANA-2 existing');
    expect(setAuthenticatedUser).not.toHaveBeenCalled();
  });

  it('logado: envia para a conta dele, com nome e telefone preenchidos e sem pedir e-mail', async () => {
    useAuth.mockReturnValue({ user: { id: 'u9', name: 'Bia Lima', phone: '31977776666' }, setAuthenticatedUser });
    post.mockResolvedValue({ data: { id: 'XP-BIA-1' } });
    renderPage();
    goToContact();
    expect(screen.getByLabelText('Seu nome')).toHaveValue('Bia Lima');
    expect(screen.queryByLabelText('E-mail')).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: /Estou ciente/ }));
    tap(/Enviar e receber/);

    await screen.findByText(/Tela de sucesso \/orcamento-sucesso\/XP-BIA-1/);
    expect(post.mock.calls[0][0]).toBe('/bookings');
    expect(post.mock.calls[0][1]).not.toHaveProperty('clientEmail');
  });

  it('volta de onde parou, mas nunca guarda nome, telefone e e-mail no aparelho', () => {
    const first = renderPage();
    goToContact();
    type('Seu nome', 'Ana Souza');
    type('E-mail', 'ana@cliente.test');

    const saved = localStorage.getItem('briefing-draft') ?? '';
    expect(saved).toContain('Casamento');
    expect(saved).not.toContain('Ana Souza');
    expect(saved).not.toContain('ana@cliente.test');
    first.unmount();

    renderPage();
    expect(screen.getByText('Passo 5 de 5')).toBeInTheDocument();
    expect(screen.getByText(/pode continuar de onde parou/)).toBeInTheDocument();
    tap('Recomeçar');
    expect(screen.getByText('Passo 1 de 5')).toBeInTheDocument();
    expect(localStorage.getItem('briefing-draft')).toBeNull();
  });
});
