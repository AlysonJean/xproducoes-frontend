import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { api } from '../../../services/api';
import UploadSocialPage from '../UploadSocialPage';
import ParticipatePage from '../ParticipatePage';

// Onda 2b da auditoria do status da reserva (B15): o mural de evento cancelado (ou reembolsado) não recebe mais fotos.
// O /tv/config diz eventCancelled; as páginas do convidado dizem que o evento foi cancelado, sem o formulário. Se o envio
// ainda chegar ao servidor, a resposta dele (410) aparece. apiFetch de verdade; só o fetch e o token CSRF são de mentira.

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const config = (extra: Record<string, unknown>) =>
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
    json(200, { success: true, data: { linked: true, eventName: 'Festa da Ana', hashtag: 'festadaana', ...extra } }));

const abrir = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/upload/:slug" element={<UploadSocialPage />} />
        <Route path="/participate/:slug" element={<ParticipatePage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('mural de evento cancelado (onda 2b, B15)', () => {
  beforeEach(() => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { csrfToken: 't0k3n' } });
    URL.createObjectURL = vi.fn(() => 'blob:previa');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => vi.restoreAllMocks());

  it.each(['/upload/festa-da-ana', '/participate/festa-da-ana'])('%s: "Este evento foi cancelado", sem o envio de foto', async (path) => {
    config({ eventCancelled: true });
    abrir(path);

    expect(await screen.findByRole('heading', { name: 'Este evento foi cancelado' })).toBeInTheDocument();
    expect(screen.getByText('O mural não recebe mais fotos.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Enviar para o mural/ })).not.toBeInTheDocument();
  });

  it('evento de pé: a página de envio segue como sempre', async () => {
    config({});
    abrir('/upload/festa-da-ana');

    expect(await screen.findByText('Festa da Ana')).toBeInTheDocument();
    expect(screen.queryByText('Este evento foi cancelado')).not.toBeInTheDocument();
  });
});
