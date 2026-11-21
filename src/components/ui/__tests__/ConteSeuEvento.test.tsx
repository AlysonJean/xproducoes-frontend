import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));

import { ConteSeuEvento } from '../ConteSeuEvento';
import { briefingTextState } from '../../../utils/briefing';

// "Conte seu evento" (20/11/2026): o texto vai ao servidor (POST /briefing/interpret, IA da Cloudflare) e o briefing
// abre com as respostas no estado da navegação, nunca no endereço. Se a leitura falhar, o briefing abre do mesmo jeito,
// com o texto e sem respostas.

function BriefingFalso() {
  const location = useLocation();
  return (
    <div>
      <p>briefing aberto</p>
      <p data-testid="search">{location.search}</p>
      <pre data-testid="estado">{JSON.stringify(location.state)}</pre>
    </div>
  );
}

const renderCaixa = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<ConteSeuEvento />} />
        <Route path="/briefing" element={<BriefingFalso />} />
      </Routes>
    </MemoryRouter>,
  );

const caixa = () => screen.getByLabelText('Como vai ser o seu evento?') as HTMLTextAreaElement;
const escrever = (texto: string) => fireEvent.change(caixa(), { target: { value: texto } });
const enviar = () => fireEvent.click(screen.getByRole('button', { name: /Preencher o pedido/ }));
const estado = () => JSON.parse(screen.getByTestId('estado').textContent || 'null');

const TEXTO = 'Casamento em Contagem, umas 150 pessoas, dia 14 de março, com banda';

beforeEach(() => {
  apiFetch.mockReset();
});

describe('ConteSeuEvento', () => {
  it('manda o texto (sem os espaços das pontas) e abre o briefing com as respostas no estado, não no endereço', async () => {
    const prefill = { eventType: 'Casamento', guests: '100 a 200', city: 'Contagem' };
    apiFetch.mockResolvedValueOnce({ success: true, prefill });
    renderCaixa();

    escrever(`  ${TEXTO}  `);
    enviar();

    expect(await screen.findByText('briefing aberto')).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith('/briefing/interpret', { method: 'POST', body: JSON.stringify({ text: TEXTO }), timeoutMs: 15_000 });
    expect(estado()).toEqual(briefingTextState(TEXTO, prefill));
    expect(screen.getByTestId('search')).toBeEmptyDOMElement();
  });

  it('leitura indisponível (503, rede, limite): abre o briefing do mesmo jeito, com o texto e sem respostas', async () => {
    apiFetch.mockRejectedValueOnce(Object.assign(new Error('HTTP 503'), { status: 503 }));
    renderCaixa();

    escrever(TEXTO);
    enviar();

    expect(await screen.findByText('briefing aberto')).toBeInTheDocument();
    expect(estado()).toEqual(briefingTextState(TEXTO, {}));
  });

  it('resposta sem respostas lidas: abre com o texto e as respostas vazias', async () => {
    apiFetch.mockResolvedValueOnce({ success: true });
    renderCaixa();

    escrever(TEXTO);
    enviar();

    expect(await screen.findByText('briefing aberto')).toBeInTheDocument();
    expect(estado()).toEqual(briefingTextState(TEXTO, {}));
  });

  it('texto curto: pede mais, sem chamar o servidor; ao escrever de novo, o aviso some', () => {
    renderCaixa();

    escrever('   festa   ');
    enviar();

    expect(screen.getByText(/Conte um pouco mais/)).toBeInTheDocument();
    expect(caixa()).toHaveAttribute('aria-invalid', 'true');
    expect(apiFetch).not.toHaveBeenCalled();

    escrever('festa de 15 anos');
    expect(screen.queryByText(/Conte um pouco mais/)).not.toBeInTheDocument();
  });

  it('enquanto lê: botão "Lendo o seu texto...", caixa travada e um envio só', async () => {
    let responder: (value: unknown) => void = () => {};
    apiFetch.mockImplementationOnce(() => new Promise((resolve) => (responder = resolve)));
    renderCaixa();

    escrever(TEXTO);
    enviar();

    const botao = screen.getByRole('button', { name: /Lendo o seu texto/ });
    expect(botao).toBeDisabled();
    expect(caixa()).toBeDisabled();
    fireEvent.submit(botao.closest('form') as HTMLFormElement);
    expect(apiFetch).toHaveBeenCalledTimes(1);

    await act(async () => responder({ success: true, prefill: {} }));
    expect(screen.getByText('briefing aberto')).toBeInTheDocument();
  });

  it('até 800 caracteres, com a contagem; avisa para não escrever dados pessoais e liga para a política', () => {
    renderCaixa();

    expect(caixa()).toHaveAttribute('maxLength', '800');
    escrever(TEXTO);
    expect(screen.getByText(`${TEXTO.length}/800`)).toBeInTheDocument();
    expect(screen.getByText(/Não escreva nome, telefone nem e-mail aqui/)).toBeInTheDocument();
    expect(screen.getByText(/Uma inteligência artificial \(Cloudflare\) lê o texto/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade');
    expect(screen.getByRole('link', { name: /Prefiro responder passo a passo/ })).toHaveAttribute('href', '/briefing');
  });
});
