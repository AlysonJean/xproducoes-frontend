import type React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const { apiFetch, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { NewsletterSubscribersPage } from '../NewsletterSubscribersPage';

// D8c (aprovada em 02/11/2026), pergunta 5: o formulário de newsletter saiu do site e a inscrição saiu do servidor. A
// tela do painel fica só para consulta das inscrições antigas, com o aviso de que nada é enviado a essa lista (apagar
// as linhas é decisão do dono). Antes ela dizia "E-mails cadastrados no site para receber novidades" e "As inscrições
// feitas no site aparecem aqui".
describe('Newsletter no painel — lista antiga, só consulta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mostra o aviso, a lista antiga e não chama outra rota além da leitura', async () => {
    apiFetch.mockResolvedValue([{ id: 'n1', email: 'antigo@teste.com', isActive: true, createdAt: '2026-03-01T12:00:00.000Z' }]);

    render(<NewsletterSubscribersPage />);

    expect(await screen.findByText('antigo@teste.com')).toBeInTheDocument();
    expect(
      screen.getByText('O formulário de newsletter saiu do site em novembro de 2026. Nenhuma mensagem é enviada a esta lista.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/para receber novidades/i)).toBeNull();
    expect(apiFetch.mock.calls).toEqual([['/newsletter/subscribers']]);
  });

  it('lista vazia: não promete inscrições novas', async () => {
    apiFetch.mockResolvedValue([]);

    render(<NewsletterSubscribersPage />);

    expect(await screen.findByText('Nenhum inscrito encontrado')).toBeInTheDocument();
    expect(screen.queryByText(/inscrições feitas no site aparecem aqui/i)).toBeNull();
    expect(screen.getByText('Não há inscrições antigas nesta lista.')).toBeInTheDocument();
  });
});
