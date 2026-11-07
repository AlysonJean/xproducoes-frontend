import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('../CompareButton', () => ({ default: () => null }));
vi.mock('../FavoriteButton', () => ({ FavoriteButton: () => null }));

import { EquipmentCard } from '../EquipmentCard';
import type { Equipment } from '../../../types/types';

// Lote 13, diária nas telas (decisão do dono de 06/11). O cartão dizia "/ hora" fixo. Agora a unidade vem com
// o equipamento (priceUnit, que o servidor põe nas respostas públicas), então o HTML do servidor e a primeira
// pintura do navegador já dizem "/ diária", e a hidratação não diverge (no servidor a chave nunca é consultada).
const CAIXA = { id: 'eq-caixa', slug: 'caixa-ativa', name: 'Caixa Ativa', pricePerHour: 720, isAvailable: true, status: 'ACTIVE' };
const ui = (equipment: object) => (
  <MemoryRouter>
    <EquipmentCard equipment={equipment as Equipment} />
  </MemoryRouter>
);

describe('EquipmentCard — unidade do preço pelo servidor', () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    apiFetch.mockResolvedValue({ equipmentPriceUnit: 'hour', kitPrice: 'PER_EVENT' });
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it('HTML do servidor (SSR) com priceUnit "day": "/ diária", nada de "hora"', () => {
    const html = renderToString(ui({ ...CAIXA, priceUnit: 'day' }));
    expect(html).toContain('/ diária');
    expect(html).not.toMatch(/hora/);
  });

  it('HTML do servidor com priceUnit "hour": o texto de hoje, "/ hora"', () => {
    const html = renderToString(ui({ ...CAIXA, priceUnit: 'hour' }));
    expect(html).toContain('/ hora');
    expect(html).not.toContain('diária');
  });

  it('hidratação do HTML com "/ diária": sem aviso de divergência e sem consultar a chave', async () => {
    const element = ui({ ...CAIXA, priceUnit: 'day' });
    container = document.createElement('div');
    container.innerHTML = renderToString(element);
    document.body.appendChild(container);
    const erros = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await act(async () => {
      root = hydrateRoot(container!, element, { onRecoverableError: (e) => console.error(e) });
    });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    expect(erros).not.toHaveBeenCalled();
    expect(container.textContent).toContain('/ diária');
    expect(container.textContent).not.toMatch(/hora/);
    expect(apiFetch).not.toHaveBeenCalledWith('/equipments/pricing-rules');
    erros.mockRestore();
  });

  it('sem priceUnit (lista do painel vista no site, API anterior): segue a chave do servidor', async () => {
    apiFetch.mockResolvedValue({ equipmentPriceUnit: 'day', kitPrice: 'PER_EVENT' });
    container = document.createElement('div');
    document.body.appendChild(container);
    const { createRoot } = await import('react-dom/client');
    await act(async () => {
      root = createRoot(container!);
      root.render(ui(CAIXA));
    });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    expect(apiFetch).toHaveBeenCalledWith('/equipments/pricing-rules');
    expect(container.textContent).toContain('/ diária');
  });
});
