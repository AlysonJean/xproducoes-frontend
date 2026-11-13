import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const { post, useAuth } = vi.hoisted(() => ({ post: vi.fn(), useAuth: vi.fn() }));
vi.mock('../../../services/api', () => ({ api: { post } }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../components/SEO', () => ({ SEO: () => null }));

import { BriefingPage } from '../BriefingPage';
import { NEED_LED, briefingHref } from '../../../utils/briefing';

const Endereco = () => <output data-testid="endereco">{`${useLocation().pathname}${useLocation().search}`}</output>;

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/briefing" element={<><BriefingPage /><Endereco /></>} />
      </Routes>
    </MemoryRouter>,
  );

const pressed = (name: string) => screen.getByRole('button', { name }).getAttribute('aria-pressed');

// Auditoria do orçamento (12/11/2026), O27: o teste da Home abria o WhatsApp e não gravava nada. Agora leva ao briefing
// com o tipo de evento, o público e o ambiente já marcados (e a página de LED por cidade, com o LED marcado).
describe('BriefingPage — respostas que vêm no endereço (O27)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuth.mockReturnValue({ user: null, setAuthenticatedUser: vi.fn() });
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('tipo de evento e público já marcados, no primeiro passo; o endereço fica limpo', async () => {
    renderAt(briefingHref({ eventType: 'Corporativo', guests: 'Mais de 500 (sob consulta)', environment: 'Ao ar livre' }));

    await waitFor(() => expect(pressed('Corporativo')).toBe('true'));
    expect(pressed('Mais de 500 (sob consulta)')).toBe('true');
    expect(screen.getByText('Passo 1 de 5')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('endereco')).toHaveTextContent(/^\/briefing$/));

    // O ambiente aparece no passo do local, já marcado.
    fireEvent.change(screen.getByLabelText('Qual é a data?'), { target: { value: '2030-03-20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ainda não sei' }));
    expect(pressed('Ao ar livre')).toBe('true');
  });

  it('o que não é opção da página não marca nada', async () => {
    renderAt('/briefing?tipo=Hackeado&publico=9999');

    await waitFor(() => expect(screen.getByTestId('endereco')).toHaveTextContent('/briefing?tipo=Hackeado&publico=9999'));
    for (const opcao of ['Casamento', 'Corporativo', 'Outro', 'Até 50', 'Mais de 500 (sob consulta)']) {
      expect(pressed(opcao)).toBe('false');
    }
  });

  it('página de LED por cidade: o telão/LED sob consulta já vem marcado no passo do que precisa', async () => {
    renderAt(briefingHref({ needs: [NEED_LED] }));
    await waitFor(() => expect(screen.getByTestId('endereco')).toHaveTextContent(/^\/briefing$/));

    fireEvent.click(screen.getByRole('button', { name: 'Casamento' }));
    fireEvent.change(screen.getByLabelText('Qual é a data?'), { target: { value: '2030-03-20' } });
    fireEvent.click(screen.getByRole('button', { name: '100 a 200' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ainda não sei' }));
    fireEvent.change(screen.getByLabelText('Cidade'), { target: { value: 'Contagem' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(pressed(NEED_LED)).toBe('true');
  });
});

// Auditoria do orçamento (12/11/2026), E11: pergunta opcional "montar e buscar depois ou técnico durante o evento", no
// passo de detalhes (que já é todo opcional): não trava o fluxo e vai para o texto da reserva.
describe('BriefingPage — montar e buscar × técnico durante o evento (E11)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuth.mockReturnValue({ user: null, setAuthenticatedUser: vi.fn() });
    post.mockResolvedValue({ data: { booking: { id: 'XP-ANA-1' } } });
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('opcional: com resposta, o botão vira "Continuar" e a resposta vai para o briefing gravado', async () => {
    renderAt('/briefing');
    fireEvent.click(screen.getByRole('button', { name: 'Casamento' }));
    fireEvent.change(screen.getByLabelText('Qual é a data?'), { target: { value: '2030-03-20' } });
    fireEvent.click(screen.getByRole('button', { name: '100 a 200' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ainda não sei' }));
    fireEvent.change(screen.getByLabelText('Cidade'), { target: { value: 'Contagem' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Som' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    // A dica do preço do técnico é lida junto com a pergunta (aria-describedby no grupo).
    expect(screen.getByRole('group', { name: 'Montamos e buscamos depois, ou um técnico fica durante todo o evento?' })).toHaveAccessibleDescription(
      'O técnico entra na proposta como item, pelas horas do evento, quando não vem no kit.',
    );
    expect(screen.getByRole('button', { name: 'Pular esta etapa' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Técnico durante todo o evento' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    fireEvent.change(screen.getByLabelText('Seu nome'), { target: { value: 'Ana Souza' } });
    fireEvent.change(screen.getByLabelText('WhatsApp com DDD'), { target: { value: '31988887777' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@cliente.test' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Estou ciente/ }));
    fireEvent.click(screen.getByRole('button', { name: /Enviar e receber/ }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0][1].specialRequests).toContain('Durante o evento: Técnico durante todo o evento');
  });
});
