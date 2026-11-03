import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const { sendTestEmail } = vi.hoisted(() => ({ sendTestEmail: vi.fn() }));
vi.mock('../../../services/monitoringService', () => ({ monitoringAPI: { sendTestEmail } }));

import { AdminEmailTestCard } from '../AdminEmailTestCard';

// D1 (aprovado em 02/11/2026): botão no Monitoramento que manda na hora um e-mail de teste ao dono e
// mostra o resultado, inclusive o erro do servidor de e-mail.
describe('AdminEmailTestCard', () => {
  beforeEach(() => {
    sendTestEmail.mockReset();
  });

  it('enviado: mostra a confirmação', async () => {
    sendTestEmail.mockResolvedValue({ success: true, to: 'dono@x.com', message: 'E-mail de teste enviado para dono@x.com.' });
    render(<AdminEmailTestCard />);
    fireEvent.click(screen.getByRole('button', { name: /Enviar e-mail de teste/ }));

    await waitFor(() => expect(screen.getByTestId('email-test-result')).toHaveTextContent('E-mail enviado'));
    expect(screen.getByTestId('email-test-result')).toHaveTextContent('E-mail de teste enviado para dono@x.com.');
  });

  it('recusado pelo SMTP: mostra o motivo e o código do servidor de e-mail', async () => {
    sendTestEmail.mockResolvedValue({
      success: false,
      message: 'O servidor de e-mail recusou o envio.',
      error: { code: 'EAUTH', responseCode: 535, message: '535 Authentication Failed' },
    });
    render(<AdminEmailTestCard />);
    fireEvent.click(screen.getByRole('button', { name: /Enviar e-mail de teste/ }));

    await waitFor(() => expect(screen.getByTestId('email-test-result')).toHaveTextContent('O e-mail não saiu'));
    expect(screen.getByTestId('email-test-result')).toHaveTextContent('535 · EAUTH · 535 Authentication Failed');
  });

  it('sem conexão com o servidor: mensagem de rede', async () => {
    sendTestEmail.mockImplementation(async () => { throw new Error('Network Error'); });
    render(<AdminEmailTestCard />);
    fireEvent.click(screen.getByRole('button', { name: /Enviar e-mail de teste/ }));

    await waitFor(() => expect(screen.getByTestId('email-test-result')).toHaveTextContent('Não foi possível falar com o servidor'));
  });
});
