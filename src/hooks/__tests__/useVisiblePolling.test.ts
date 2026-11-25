import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useVisiblePolling } from '../useVisiblePolling';

// WhatsApp pelo painel (24/11/2026): a atualização automática roda só com a aba visível e alguém usando a tela,
// para não manter o servidor e o banco do plano gratuito acordados à toa.

let hidden = false;
const setHidden = (value: boolean) => {
  hidden = value;
  document.dispatchEvent(new Event('visibilitychange'));
};

beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useVisiblePolling', () => {
  it('chama a cada intervalo com a aba visível; escondida, não chama; ao voltar, chama na hora', async () => {
    const cb = vi.fn();
    renderHook(() => useVisiblePolling(cb, 1000, { idleMs: 60_000 }));

    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(cb).toHaveBeenCalledTimes(3);

    act(() => setHidden(true));
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(cb).toHaveBeenCalledTimes(3);

    act(() => setHidden(false));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(cb).toHaveBeenCalledTimes(4);
  });

  it('desligado, não chama', async () => {
    const cb = vi.fn();
    renderHook(() => useVisiblePolling(cb, 1000, { enabled: false }));
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(cb).not.toHaveBeenCalled();
  });

  it('sem ninguém mexer, pausa (paused) e volta no primeiro clique, já chamando', async () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useVisiblePolling(cb, 1000, { idleMs: 3000 }));

    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(cb).toHaveBeenCalledTimes(2);
    expect(result.current.paused).toBe(false);

    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(cb).toHaveBeenCalledTimes(2);
    expect(result.current.paused).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current.paused).toBe(false);
    expect(cb).toHaveBeenCalledTimes(3);

    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(cb).toHaveBeenCalledTimes(4);
  });

  it('mexer na tela adia a pausa', async () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useVisiblePolling(cb, 1000, { idleMs: 3000 }));
    for (let i = 0; i < 4; i++) {
      await act(() => vi.advanceTimersByTimeAsync(2000));
      act(() => {
        window.dispatchEvent(new Event('keydown'));
      });
    }
    expect(result.current.paused).toBe(false);
    expect(cb).toHaveBeenCalledTimes(8);
  });

  it('nunca duas chamadas ao mesmo tempo: espera a anterior terminar', async () => {
    let finish: () => void = () => undefined;
    const cb = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    renderHook(() => useVisiblePolling(cb, 1000, { idleMs: 60_000 }));

    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(cb).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish();
    });
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('um erro na chamada não para a atualização', async () => {
    const cb = vi.fn(() => Promise.reject(new Error('fora do ar')));
    renderHook(() => useVisiblePolling(cb, 1000, { idleMs: 60_000 }));
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it('ao sair da tela, para', async () => {
    const cb = vi.fn();
    const { unmount } = renderHook(() => useVisiblePolling(cb, 1000, { idleMs: 60_000 }));
    await act(() => vi.advanceTimersByTimeAsync(1000));
    unmount();
    await act(() => vi.advanceTimersByTimeAsync(5000));
    window.dispatchEvent(new Event('pointerdown'));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
