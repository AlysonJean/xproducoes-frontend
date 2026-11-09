import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import UploadSocialPage from '../UploadSocialPage';
import { SUPPORT_EMAIL } from '../../../data/site';

// D8c (aprovada em 02/11/2026): "Aviso na página de envio de fotos pelo QR." O convidado mandava a foto sem saber
// que ela vai para o telão, por quanto tempo fica guardada e como pedir para tirar. O aviso fica logo antes do botão
// de envio, com o e-mail de atendimento e o link para a Política de Privacidade (a página do mural não tem rodapé).

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const renderUpload = async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
    json(200, { success: true, data: { linked: true, eventName: 'Festa da Ana', hashtag: 'festadaana' } })
  );
  render(
    <MemoryRouter initialEntries={['/upload/festa-da-ana']}>
      <Routes>
        <Route path="/upload/:slug" element={<UploadSocialPage />} />
      </Routes>
    </MemoryRouter>
  );
  await screen.findByText('Festa da Ana');
};

describe('UploadSocialPage — aviso antes do envio da foto (D8c)', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:previa');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => vi.restoreAllMocks());

  it('diz para que a foto serve, por quanto tempo fica e como pedir para tirar, com os links', async () => {
    await renderUpload();
    const notice = screen.getByText(/Sua foto aparece no telão deste evento/);
    const text = (notice.textContent ?? '').replace(/\s+/g, ' ').trim();
    expect(text).toBe(
      `Sua foto aparece no telão deste evento, com o nome e a legenda que você escrever. As fotos são apagadas 90 dias depois do evento. Se quiser tirar a sua do telão, escreva para ${SUPPORT_EMAIL}. Saiba mais na Política de Privacidade.`
    );
    expect(screen.getByRole('link', { name: SUPPORT_EMAIL })).toHaveAttribute('href', `mailto:${SUPPORT_EMAIL}`);
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade');
  });

  it('o aviso vem logo antes do botão "Enviar para o mural"', async () => {
    await renderUpload();
    const notice = screen.getByText(/Sua foto aparece no telão deste evento/);
    const send = screen.getByRole('button', { name: /Enviar para o mural/ });
    expect(notice.compareDocumentPosition(send) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(notice.nextElementSibling).toBe(send);
  });
});
