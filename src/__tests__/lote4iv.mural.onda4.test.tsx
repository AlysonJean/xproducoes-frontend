import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { api } from '../services/api';
import UploadSocialPage from '../pages/social/UploadSocialPage';
import ParticipatePage from '../pages/social/ParticipatePage';

// Onda 4 da auditoria de 19/11, lote 4-IV, mural do convidado: mural que não existe não vira "verifique sua conexão"
// e o slug vai codificado (F8-09); a foto é conferida ao escolher (F8-20).
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const abrir = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/upload/:slug" element={<UploadSocialPage />} />
        <Route path="/participate/:slug" element={<ParticipatePage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.spyOn(api, 'get').mockResolvedValue({ data: { csrfToken: 't0k3n' } });
  URL.createObjectURL = vi.fn(() => 'blob:previa');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => vi.restoreAllMocks());

describe('F8-09: mural que não existe', () => {
  it.each(['/upload/festa%20sumida', '/participate/festa%20sumida'])('%s: 404 mostra "Mural não encontrado" (antes, "verifique sua conexão")', async (path) => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json(404, { success: false, message: 'Mural não encontrado' }));
    abrir(path);
    expect(await screen.findByRole('heading', { name: 'Mural não encontrado' })).toBeInTheDocument();
    expect(screen.queryByText(/Verifique sua conexão/)).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([url]) => String(url)).some((url) => url.includes('/tv/config?slug=festa%20sumida'))).toBe(true);
  });

  it('queda de rede segue com o aviso de conexão', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    abrir('/participate/festa');
    expect(await screen.findByText(/Verifique sua conexão/, {}, { timeout: 4000 })).toBeInTheDocument();
  });
});

describe('F8-20: foto conferida ao escolher', () => {
  const escolher = async (file: File) => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json(200, { success: true, data: { linked: true, eventName: 'Festa da Ana', hashtag: 'festa' } }));
    const { container } = abrir('/upload/festa-da-ana');
    await screen.findByText('Festa da Ana');
    fireEvent.change(container.querySelector('#photo-input') as HTMLInputElement, { target: { files: [file] } });
  };

  it('arquivo que não é foto: a frase do servidor, sem enviar nada', async () => {
    await escolher(new File(['%PDF'], 'contrato.pdf', { type: 'application/pdf' }));
    expect(await screen.findByText('Envie uma foto (JPG, PNG, WEBP, GIF ou HEIC).')).toBeInTheDocument();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('acima de 10 MB (e que não dá para reduzir): "Foto muito grande"', async () => {
    await escolher(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'animacao.gif', { type: 'image/gif' }));
    expect(await screen.findByText('Foto muito grande (máx. 10 MB).')).toBeInTheDocument();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('foto pequena entra na hora, com a prévia', async () => {
    await escolher(new File([new Uint8Array([0xff, 0xd8, 0xff])], 'foto.jpg', { type: 'image/jpeg' }));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });
});
