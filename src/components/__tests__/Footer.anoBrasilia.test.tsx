import { describe, it, expect, vi, afterEach, afterAll } from 'vitest';
import { render, act } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';

// P5 (aprovada em 02/11/2026): o ano do "©" do rodapé é o de Brasília. Era new Date().getFullYear(), no fuso de
// quem desenha: o servidor do site (Vercel, em UTC) virava o ano às 21:00 de 31/12, e o navegador no Brasil, à
// meia-noite. Das 21:00 à meia-noite o HTML vinha com o ano seguinte e o React acusava a diferença ao assumir a
// página. Aqui o fuso do processo é trocado de propósito (o Node aceita mudar process.env.TZ em execução), para
// fazer o papel do servidor em UTC e do navegador em Brasília. O rodapé é carregado já em UTC, como no servidor:
// um formatador sem fuso explícito guarda o fuso do momento em que foi montado.
const { ORIGINAL_TZ } = vi.hoisted(() => {
  const original = process.env.TZ;
  process.env.TZ = 'UTC';
  return { ORIGINAL_TZ: original };
});

vi.mock('../../contexts/SettingsContext', () => ({ useSettings: () => ({ companyName: 'X Produções', googleReviewUrl: null }) }));
vi.mock('../modals/ModalContext', () => ({ useModal: () => ({ openModal: vi.fn() }) }));
vi.mock('../ui/ThemedLogo', () => ({ default: () => <span>logo</span> }));

import { Footer } from '../Footer';

const setTimeZone = (tz: string) => {
  process.env.TZ = tz;
};
const at = (iso: string) => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(iso));
};

const page = () => (
  <MemoryRouter>
    <Footer />
  </MemoryRouter>
);
const yearIn = (node: ParentNode) => /©\s*(\d{4})\s/.exec(node.textContent ?? '')?.[1];

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  setTimeZone('UTC');
  document.body.innerHTML = '';
});

afterAll(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

describe('Footer — ano do © em Brasília', () => {
  it.each([
    ['2027-01-01T00:00:00Z', '31/12 às 21:00', '2026'],
    ['2027-01-01T02:59:59Z', '31/12 às 23:59:59', '2026'],
    ['2027-01-01T03:00:00Z', '01/01 à 00:00', '2027'],
  ])('com o processo em UTC (como a Vercel), %s (%s em Brasília) → © %s', (iso, _label, year) => {
    setTimeZone('UTC');
    at(iso);

    const { container } = render(page());

    expect(yearIn(container)).toBe(year);
  });

  it('HTML do servidor em UTC às 22:00 de 31/12, aberto no navegador em Brasília: o React assume a página sem erro', async () => {
    at('2027-01-01T01:00:00Z');
    setTimeZone('UTC');
    const container = document.createElement('div');
    container.innerHTML = renderToString(page());
    document.body.appendChild(container);

    setTimeZone('America/Sao_Paulo');
    const onRecoverableError = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let root: Root | undefined;
    await act(async () => {
      root = hydrateRoot(container, page(), { onRecoverableError });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(yearIn(container)).toBe('2026');
    act(() => root?.unmount());
  });

  it('HTML do cache feito às 23:59:59 de 31/12 e aberto à 00:00:01 de 01/01: a diferença do ano não vira erro', async () => {
    setTimeZone('America/Sao_Paulo');
    at('2027-01-01T02:59:59Z');
    const container = document.createElement('div');
    container.innerHTML = renderToString(page());
    document.body.appendChild(container);
    expect(yearIn(container)).toBe('2026');

    vi.setSystemTime(new Date('2027-01-01T03:00:01Z'));
    const onRecoverableError = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let root: Root | undefined;
    await act(async () => {
      root = hydrateRoot(container, page(), { onRecoverableError });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    act(() => root?.unmount());
  });
});
