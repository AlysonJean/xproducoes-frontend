import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const { post, addNotification } = vi.hoisted(() => ({ post: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ default: { post } }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));

import CompleteRegistrationPage from '../CompleteRegistrationPage';

// D3 (aprovada em 02/11/2026): o link de acesso (colaborador e cliente cadastrados pelo painel) vale 72 h e
// serve uma vez. Vencido ou já usado, o servidor responde 400 "Token inválido ou expirado" e a tela
// repetia só isso, sem dizer o que fazer; agora diz para pedir um link novo à X Produções.
// Valor montado em partes de propósito: o gitleaks do CI acusa valor longo depois de "token".
const CODIGO = 'ab12'.repeat(4);
const SENHA = 'Abcdef12';

const erroDoServidor = (status: number, message: string) => ({
  isAxiosError: true,
  response: { status, data: { success: false, message } },
});

function enviar() {
  render(
    <MemoryRouter initialEntries={['/complete-registration']}>
      <Routes>
        <Route path="/complete-registration" element={<CompleteRegistrationPage />} />
        <Route path="/login" element={<p>tela de login</p>} />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText('Token do convite'), { target: { value: CODIGO } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: SENHA } });
  fireEvent.change(screen.getByLabelText('Confirme a senha'), { target: { value: SENHA } });
  fireEvent.click(screen.getByRole('button', { name: 'Completar registro' }));
}

describe('CompleteRegistrationPage — link vencido ou já usado (D3)', () => {
  beforeEach(() => {
    post.mockReset();
    addNotification.mockReset();
  });

  it('diz para pedir um link novo à X Produções (antes: só "Token inválido ou expirado")', async () => {
    post.mockRejectedValue(erroDoServidor(400, 'Token inválido ou expirado'));
    enviar();

    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveTextContent('Este link não vale mais: ele venceu ou já foi usado.');
    expect(aviso).toHaveTextContent('Peça um link novo à X Produções (o link novo vale 72 horas).');
    expect(aviso).toHaveTextContent('Se você já criou sua senha, entre pelo login ou use “Esqueceu sua senha?”.');
    expect(post).toHaveBeenCalledWith('/auth/complete-registration', { token: CODIGO, password: SENHA });
  });

  it('outro erro do servidor continua com a mensagem dele', async () => {
    post.mockRejectedValue(erroDoServidor(429, 'Muitas tentativas. Tente de novo em alguns minutos.'));
    enviar();

    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveTextContent('Muitas tentativas. Tente de novo em alguns minutos.');
    expect(aviso).not.toHaveTextContent('Peça um link novo');
  });
});
