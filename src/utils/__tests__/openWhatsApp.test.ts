import { describe, it, expect, vi, afterEach } from 'vitest';

const { createAndClickAnchor } = vi.hoisted(() => ({ createAndClickAnchor: vi.fn() }));
vi.mock('../dom', () => ({ createAndClickAnchor }));

import { openWhatsApp } from '../whatsapp';

// Achado (revisão): window.open(url, '_blank', 'noopener,noreferrer') devolve sempre null, então
// o fallback com link também rodava — com pop-ups liberados, abriam duas abas do WhatsApp.
describe('openWhatsApp', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    createAndClickAnchor.mockReset();
  });

  it('abre uma aba só e corta o opener', () => {
    const fakeWindow = { opener: 'site' } as unknown as Window;
    const open = vi.spyOn(window, 'open').mockReturnValue(fakeWindow);

    openWhatsApp('5531989252272', 'Olá');

    expect(open).toHaveBeenCalledWith('https://wa.me/5531989252272?text=Ol%C3%A1', '_blank');
    expect(fakeWindow.opener).toBeNull();
    expect(createAndClickAnchor).not.toHaveBeenCalled();
  });

  it('usa o link como plano B só quando o pop-up é bloqueado', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);

    openWhatsApp('5531989252272', 'Olá');

    expect(createAndClickAnchor).toHaveBeenCalledTimes(1);
  });
});
