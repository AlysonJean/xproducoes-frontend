import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { api } from '../../../services/api';
import UploadSocialPage from '../UploadSocialPage';

// Achado (auditoria ponta a ponta): a página do convidado mostrava "Falha ao enviar a foto. Verifique
// sua conexão e tente de novo." para qualquer falha — também para foto grande demais (413), formato
// não aceito (400), mural ocupado (503) e limite de envios (429), que o servidor explica e que tentar
// de novo do mesmo jeito não resolve. apiFetch de verdade; só o fetch e o token CSRF são de mentira.

const GENERICA = 'Falha ao enviar a foto. Verifique sua conexão e tente de novo.';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const enviarComResposta = async (resposta: Response) => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    if (String(input).includes('/tv/config')) {
      return json(200, { success: true, data: { linked: true, eventName: 'Festa da Ana', hashtag: 'festadaana' } });
    }
    return resposta;
  });

  const { container } = render(
    <MemoryRouter initialEntries={['/upload/festa-da-ana']}>
      <Routes>
        <Route path="/upload/:slug" element={<UploadSocialPage />} />
      </Routes>
    </MemoryRouter>,
  );

  await screen.findByText('Festa da Ana');
  const input = container.querySelector('#photo-input') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [new File([new Uint8Array([0xff, 0xd8, 0xff])], 'foto.jpg', { type: 'image/jpeg' })] } });
  fireEvent.click(screen.getByRole('button', { name: /Enviar para o mural/ }));
  return screen.findByRole('alert');
};

describe('UploadSocialPage — erro do envio', () => {
  beforeEach(() => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { csrfToken: 't0k3n' } });
    // jsdom não implementa a prévia da foto (URL.createObjectURL).
    URL.createObjectURL = vi.fn(() => 'blob:previa');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => vi.restoreAllMocks());

  it.each([
    [413, 'Foto muito grande (máx. 10 MB).'],
    [400, 'Envie uma foto (JPG, PNG, WEBP, GIF ou HEIC).'],
    [503, 'Muitos envios ao mesmo tempo, tente de novo em instantes.'],
    [429, 'Muitas fotos enviadas desta rede em poucos minutos. Aguarde um pouco e tente de novo.'],
    [429, 'Muitas fotos no mural na última hora. Tente de novo mais tarde.'],
    [404, 'Mural não encontrado'],
  ])('HTTP %i: mostra a explicação do servidor (%s)', async (status, message) => {
    const alerta = await enviarComResposta(json(status, { success: false, message }));
    expect(alerta).toHaveTextContent(message);
    expect(alerta).not.toHaveTextContent('Verifique sua conexão');
  });

  it.each([
    ['erro do proxy em texto', new Response('An error occurred with your deployment\n\nROUTER_EXTERNAL_TARGET_ERROR', { status: 502 })],
    ['limite global em inglês', json(429, { success: false, message: 'Too many requests. Please try again later.' })],
    ['falha interna', json(500, { success: false, message: 'Falha ao enviar foto' })],
  ])('%s: segue com a mensagem genérica', async (_nome, resposta) => {
    const alerta = await enviarComResposta(resposta);
    expect(alerta).toHaveTextContent(GENERICA);
  });
});
