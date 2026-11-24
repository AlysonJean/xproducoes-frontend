import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Onda 4 da auditoria de 19/11, primeiro lote do site, telas do painel e da proposta: "Salvar Equipe" travado durante o
// envio (F4-18), escala no horário do evento (F4-22), cupom até 100% (F4-19), capa do serviço removida e o motivo do
// servidor nos formulários (F4-16, F4-17), banner sem salvar com a imagem subindo (F4-20), convite sem e-mail (F6P1-12),
// teste do Sentry (F3-13), números do cartão de indicação (F3-21) e o contrato todo pago (F5-15).
const { apiFetch, api, addNotification, getAvailable, getReferral, collaborators, loggerError, captureMessage } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  addNotification: vi.fn(),
  getAvailable: vi.fn(),
  getReferral: vi.fn(),
  collaborators: [] as unknown[],
  loggerError: vi.fn(),
  captureMessage: vi.fn(),
}));
vi.mock('../services/api', () => ({
  apiFetch, api, collaboratorsAPI: { getAvailable }, authAPI: { getReferral }, collaboratorFunctionsAPI: { getAll: vi.fn() },
}));
vi.mock('@/services/api', () => ({
  apiFetch, api, collaboratorsAPI: { getAvailable }, authAPI: { getReferral }, collaboratorFunctionsAPI: { getAll: vi.fn() },
}));
vi.mock('../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('@/hooks', () => ({
  useCollaborators: () => ({ collaborators, isLoading: false, error: null, fetchCollaborators: vi.fn(), deleteCollaborator: vi.fn() }),
}));
vi.mock('@/components/admin/AdminLayout', () => ({ AdminLayout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../utils/logger', () => ({ logger: { error: loggerError, warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));
vi.mock('@sentry/react', () => ({ captureMessage, addBreadcrumb: vi.fn(), captureException: vi.fn() }));

import { EventManagement } from '../components/modals/EventManagement';
import { BookingCollaborators } from '../components/bookings/BookingCollaborators';
import { CouponForm } from '../components/forms/CouponForm';
import { ServiceForm } from '../components/forms/ServiceFormPage';
import { BannerForm } from '../components/forms/BannerForm';
import { ModalProvider } from '@/components/modals/ModalContext';
import { ModalManager } from '@/components/modals/ModalManager';
import AdminCollaboratorsPage from '../pages/admin/AdminCollaboratorsPage';
import { SentryTestButton } from '../components/SentryTestButton';
import { ReferralCard } from '../components/ui/ReferralCard';
import { ContractConfirmation } from '../components/proposal/ContractConfirmation';
import { ECollaboratorRole, type Banner, type ICollaborator, type Service } from '../types/types';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('F4-18: "Salvar Equipe" durante o envio', () => {
  const evento = { id: 'b1', title: 'Casamento', startTime: '2027-01-10T21:00:00.000Z', startDate: '2027-01-10T21:00:00.000Z', location: 'Espaço' };
  const ana = { id: 'c1', name: 'Ana Lima', role: ECollaboratorRole.DJ, hourlyRate: '40', user: { email: 'ana@t.com' } } as unknown as ICollaborator;

  it('gravando: o botão trava (o segundo clique não chama onSave); sem gravar, salva', () => {
    const onSave = vi.fn();
    const { rerender } = render(<EventManagement event={evento} collaborators={[ana]} onSave={onSave} onClose={vi.fn()} isSaving />);
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Ana Lima à equipe' }));
    const salvar = screen.getByRole('button', { name: 'Salvar Equipe (1)' });
    expect(salvar).toBeDisabled();
    fireEvent.click(salvar);
    expect(onSave).not.toHaveBeenCalled();

    rerender(<EventManagement event={evento} collaborators={[ana]} onSave={onSave} onClose={vi.fn()} isSaving={false} />);
    expect(screen.getByRole('button', { name: 'Salvar Equipe (1)' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Equipe (1)' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});

describe('F4-22: a escala abre no horário do evento', () => {
  beforeEach(() => {
    apiFetch.mockImplementation(async (url: string) => {
      if (url === '/collaborators/search?limit=100') return [{ id: 'c1', user: { name: 'Bruno Reis' }, collaboratorRole: 'DJ', specialties: [] }];
      if (url === '/collaborators/events/b1/collaborators') return [];
      return {};
    });
    getAvailable.mockResolvedValue({ data: [{ id: 'c1' }] });
  });

  it('início e fim do evento em Brasília (antes 14:00–18:00 fixo)', async () => {
    render(<BookingCollaborators bookingId="b1" eventDate="2026-12-05T21:30:00.000Z" eventEndDate="2026-12-06T04:00:00.000Z" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar' }));
    const janela = await screen.findByRole('dialog', { name: 'Atribuir Colaborador' });
    expect(within(janela).getByLabelText('Início')).toHaveValue('18:30');
    expect(within(janela).getByLabelText('Fim')).toHaveValue('01:00');
  });
});

describe('F4-19: cupom percentual até 100%', () => {
  it('150%: o formulário avisa e não envia; 150 em valor fixo envia', async () => {
    api.post.mockResolvedValue({ data: { id: 'novo' } });
    render(<CouponForm onSuccess={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Código *'), { target: { value: 'TUDO' } });
    fireEvent.change(screen.getByLabelText('Valor *'), { target: { value: '150' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar Cupom' }));
    expect(await screen.findByText('O percentual vai até 100%.')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Tipo *'), { target: { value: 'FIXED' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar Cupom' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post.mock.calls[0][1]).toMatchObject({ discountType: 'FIXED', discountValue: 150 });
  });
});

describe('F4-16 e F4-17: formulário do serviço', () => {
  const SERVICO = {
    id: 'sv-1', name: 'Técnico de Som', description: 'Operação de som do começo ao fim', price: 300, duration: 180,
    status: 'ACTIVE', imageUrl: 'https://res.cloudinary.com/x/image/upload/capa.jpg',
  } as unknown as Service;
  const enviadoPut = async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(apiFetch.mock.calls.some((c) => c[1]?.method === 'PUT')).toBe(true));
    return apiFetch.mock.calls.find((c) => c[1]?.method === 'PUT')![1].body as FormData;
  };

  it('"Remover imagem de capa" na edição manda imageUrl vazio; sem mexer na capa, o campo não vai', async () => {
    apiFetch.mockResolvedValue({ id: 'sv-1' });
    const { unmount } = render(<ServiceForm initialData={SERVICO} onSuccess={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remover imagem de capa' }));
    expect((await enviadoPut()).get('imageUrl')).toBe('');
    unmount();

    apiFetch.mockClear();
    render(<ServiceForm initialData={SERVICO} onSuccess={vi.fn()} onCancel={vi.fn()} />);
    expect((await enviadoPut()).has('imageUrl')).toBe(false);
  });

  it('o servidor recusa: aparece o motivo dele (antes, sempre "Erro ao salvar serviço")', async () => {
    apiFetch.mockRejectedValue(new Error('Já existe um serviço com este nome.'));
    render(<ServiceForm initialData={SERVICO} onSuccess={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: 'Já existe um serviço com este nome.' })));
  });
});

describe('F4-20 e F4-16: formulário do banner', () => {
  it('com a imagem subindo, "Criar Banner" fica travado', async () => {
    api.post.mockImplementation(() => new Promise(() => {}));
    render(<BannerForm initialData={null} onSuccess={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Criar Banner' })).toBeEnabled();
    await userEvent.upload(screen.getByLabelText('Enviar imagem (desktop)'), new File(['png'], 'b.png', { type: 'image/png' }));
    expect(await screen.findByText('Enviando...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar Banner' })).toBeDisabled();
  });

  it('o servidor recusa: aparece o motivo dele', async () => {
    const BANNER = { id: 'bn-1', title: 'Verão', description: '', imageUrl: 'https://img.test/b.jpg', mobileImageUrl: '', linkUrl: '', sortOrder: 0, active: true } as unknown as Banner;
    apiFetch.mockRejectedValue(new Error('A imagem do banner é obrigatória.'));
    render(<BannerForm initialData={BANNER} onSuccess={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar Alterações' }));
    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: 'A imagem do banner é obrigatória.' })));
  });
});

describe('F6P1-12: convite de colaborador', () => {
  const LINK = 'https://site.test/convite?token=t0k3n';
  const abrirEConvidar = async () => {
    render(
      <MemoryRouter>
        <ModalProvider>
          <AdminCollaboratorsPage />
          <ModalManager />
        </ModalProvider>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Convidar/ }));
    fireEvent.change(await screen.findByLabelText('E-mail profissional'), { target: { value: 'novo@t.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar convite' }));
  };

  it('o e-mail não saiu: a janela do link diz para mandar o link', async () => {
    api.post.mockResolvedValue({ data: { inviteId: 'i1', inviteUrl: LINK, emailSent: false } });
    await abrirEConvidar();
    expect(await screen.findByLabelText('Link de convite')).toHaveValue(LINK);
    expect(screen.getByRole('alert')).toHaveTextContent('O e-mail não foi enviado: copie este link e mande ao colaborador, por WhatsApp por exemplo.');
  });

  it('o e-mail saiu: a janela do link sem aviso', async () => {
    api.post.mockResolvedValue({ data: { inviteId: 'i1', inviteUrl: LINK, emailSent: true } });
    await abrirEConvidar();
    expect(await screen.findByLabelText('Link de convite')).toHaveValue(LINK);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('o servidor recusa: aparece o motivo dele', async () => {
    api.post.mockRejectedValue({ response: { data: { message: 'Este e-mail já tem cadastro.' } } });
    await abrirEConvidar();
    await waitFor(() => expect(addNotification).toHaveBeenCalledWith({ type: 'error', title: 'Convite não enviado', message: 'Este e-mail já tem cadastro.' }));
  });
});

describe('F3-13: teste do Sentry no Monitoramento', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('aparece também em produção, sem o aviso de "remover antes do deploy", e a exceção vai uma vez só', () => {
    vi.stubEnv('VITE_NODE_ENV', 'production');
    render(<SentryTestButton position="inline" />);
    expect(screen.queryByText(/Remover antes do deploy/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Capturar Exceção/ }));
    expect(loggerError).toHaveBeenCalledTimes(1);
    expect(addNotification).toHaveBeenCalledTimes(1);
  });
});

describe('F3-21: cartão de indicação com os números do servidor', () => {
  it('o teto e a validade que o servidor manda (antes 150 e 90 fixos)', async () => {
    getReferral.mockResolvedValue({ data: { code: 'ANA7K2', discountPercent: 10, timesUsed: 0, rewardsEarned: 0, maxDiscount: 200, rewardDiscountPercent: 15, rewardMaxDiscount: 120, rewardValidityDays: 60 } });
    render(<ReferralCard />);
    const texto = (await screen.findByText(/Seu amigo ganha/)).textContent?.replace(/\s+/g, ' ');
    expect(texto).toContain('10% de desconto nos itens (até R$ 200; não vale para frete nem pedágio; uma vez por cliente)');
    expect(texto).toContain('você ganha um código de 15% nos itens (até R$ 120), válido por 60 dias');
  });

  it('código sem teto: sem "até R$"', async () => {
    getReferral.mockResolvedValue({ data: { code: 'ANA7K2', discountPercent: 10, timesUsed: 0, rewardsEarned: 0, maxDiscount: null } });
    render(<ReferralCard />);
    const texto = (await screen.findByText(/Seu amigo ganha/)).textContent?.replace(/\s+/g, ' ');
    expect(texto).toContain('10% de desconto nos itens (não vale para frete nem pedágio; uma vez por cliente)');
  });
});

describe('F5-15: contrato todo pago', () => {
  const base = {
    acceptedAt: '2026-11-17T20:00:00.000Z', protocol: 'CT-1', withdrawUntil: null, canWithdraw: false, initialPaymentReceived: true,
    initialPayment: { amount: 450, dueDate: '2026-11-20T02:59:59.000Z' }, balance: { amount: 450, dueDate: '2026-12-19T01:00:00.000Z' },
  };

  it('pagamento total: "Pagamento concluído", sem PIX, saldo nem envio de comprovante', () => {
    render(<MemoryRouter><ContractConfirmation token="t" onWithdrawn={vi.fn()} data={{ ...base, balanceReceived: true }} /></MemoryRouter>);
    expect(screen.getByText('Pagamento concluído.')).toBeInTheDocument();
    expect(screen.queryByText(/Pague só na chave PIX/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Saldo:/)).not.toBeInTheDocument();
    expect(screen.queryByText('Enviar o comprovante')).not.toBeInTheDocument();
  });

  it('só o sinal: segue com o PIX do saldo e o envio do comprovante', () => {
    render(<MemoryRouter><ContractConfirmation token="t" onWithdrawn={vi.fn()} data={{ ...base, balanceReceived: false }} /></MemoryRouter>);
    expect(screen.getByText('Parcela inicial recebida.')).toBeInTheDocument();
    expect(screen.getByText(/Pague só na chave PIX/)).toBeInTheDocument();
    expect(screen.getByText('Enviar o comprovante')).toBeInTheDocument();
  });
});
