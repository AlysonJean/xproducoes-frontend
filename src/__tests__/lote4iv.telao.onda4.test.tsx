// @vitest-environment-options {"url": "https://telao.exemplo.com/tv"}
// (Fora de localhost de propósito: em localhost o TVPage abre com o mural de teste, sem a tela de pareamento.)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

// Onda 4 da auditoria de 19/11, lote 4-IV, telão: código de 6 dígitos sorteado no navegador (F8-10), endereço pelo
// slug depois de pareada (F8-18) e "Mural não encontrado" para slug errado, com o slug codificado (F8-09).
const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../services/api', () => ({ apiFetch }));
vi.mock('../services/socialService', () => ({ socialService: { getAnnouncements: vi.fn().mockResolvedValue([]) } }));
vi.mock('socket.io-client', () => ({ io: () => ({ on: vi.fn(), emit: vi.fn(), disconnect: vi.fn() }) }));

import TVPage from '../pages/tv/TVPage';

const avancar = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
function Endereco() {
  const { search } = useLocation();
  return <p data-testid="endereco">{search}</p>;
}
const abrir = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <TVPage />
      <Endereco />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-12-10T20:00:00.000Z') });
  apiFetch.mockReset();
});
afterEach(() => vi.useRealTimers());

describe('F8-10 e F8-18: pareamento do telão', () => {
  it('sorteia 6 dígitos depois de montar, consulta por eles e, pareada, passa a ser endereçada pelo slug', async () => {
    let pareada = false;
    apiFetch.mockImplementation(async (url: string) => {
      if (url.startsWith('/tv/config?pairingCode=')) {
        return pareada
          ? { linked: true, settingId: 'm1', slug: 'festa-ana', eventName: 'Festa da Ana', hashtag: 'festa', serverNow: new Date().toISOString(), activeRule: 'eventEnd', activeUntil: new Date(Date.now() + 3600_000).toISOString() }
          : { linked: false };
      }
      if (url.startsWith('/tv/config?slug=')) return { linked: true, settingId: 'm1', slug: 'festa-ana', eventName: 'Festa da Ana', hashtag: 'festa' };
      return [];
    });
    abrir('/tv');
    await avancar(0);
    await avancar(0);
    const codigo = screen.getByRole('heading', { level: 1 }).textContent ?? '';
    expect(codigo).toMatch(/^[1-9]\d{5}$/);
    expect(apiFetch).toHaveBeenCalledWith(`/tv/config?pairingCode=${codigo}`);

    pareada = true;
    await avancar(5000);
    await avancar(0);
    expect(screen.getByTestId('endereco')).toHaveTextContent('?slug=festa-ana');
  });

  it('com ?code= no endereço, usa esse código', async () => {
    apiFetch.mockResolvedValue({ linked: false });
    abrir('/tv?code=482913');
    await avancar(0);
    expect(screen.getByText('482913')).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith('/tv/config?pairingCode=482913');
  });
});

describe('F8-09: slug que não existe', () => {
  it('"Mural não encontrado", sem código de pareamento e sem continuar consultando; o slug vai codificado', async () => {
    apiFetch.mockRejectedValue(Object.assign(new Error('Mural não encontrado'), { status: 404 }));
    abrir('/tv?slug=festa%20errada');
    await avancar(0);
    await avancar(0);
    expect(screen.getByRole('alert')).toHaveTextContent('Mural não encontrado. Confira o endereço do telão.');
    expect(screen.queryByText('Código de pareamento')).not.toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith('/tv/config?slug=festa%20errada');
    const chamadas = apiFetch.mock.calls.length;
    await avancar(20_000);
    expect(apiFetch.mock.calls.length).toBe(chamadas);
  });
});
