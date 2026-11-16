import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Decisões de Alyson em 16/11/2026, depois do teste do aceite na produção:
// 1. Baixar pelo link o contrato aceito (CPF ou CNPJ, endereço, e-mail e telefone do contratante) pede um código enviado
//    ao e-mail que aceitou; logo depois do aceite, o botão baixa o PDF que a página acabou de mostrar, sem código.
// 2. PIX com o prazo da parcela inicial vencido (e o código ainda na tela): o QR Code fica, com o aviso de confirmar a
//    data com a equipe antes de pagar e o WhatsApp com a mensagem pronta.
// 3. A desistência vale em até 7 dias do aceite ou até o início do evento, o que vier primeiro (o texto do passo 2).

const { contractAPI, saveBlob } = vi.hoisted(() => ({
  contractAPI: { download: vi.fn(), pdfCode: vi.fn(), withdrawCode: vi.fn(), withdraw: vi.fn(), proof: vi.fn() },
  saveBlob: vi.fn(),
}));
vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  return { contractAPI, saveBlob, readApiError: actual.readApiError };
});

import { ContractPdfDownload } from '@/components/proposal/ContractPdfDownload';
import { ContractPixPayment } from '@/components/proposal/ContractPixPayment';
import { ContractConfirmation } from '@/components/proposal/ContractConfirmation';

const CODIGO = 'p1.TESTE';
const COPIA_E_COLA =
  '00020126360014br.gov.bcb.pix0114553438240001565204000053039865406450.005802BR5921X PRODUCOES E EVENTOS6014BELO HORIZONTE62190515CT20271130ABCD6304ABCD';
const ENVIADO = { sentTo: 'an***@cliente.test', expiresAt: '2099-01-01T00:10:00.000Z' };
const apiError = (status: number, body: Record<string, unknown> = {}) => Object.assign(new Error((body.message as string) ?? `HTTP ${status}`), { status, body });

const texto = () => (document.body.textContent ?? '').replace(/\s+/g, ' ');
const botaoBaixar = () => screen.getByRole('button', { name: 'Baixar contrato (PDF)' });
const campoCodigo = () => screen.getByLabelText('Código para baixar o contrato');

beforeEach(() => {
  vi.clearAllMocks();
  contractAPI.pdfCode.mockResolvedValue(ENVIADO);
  contractAPI.download.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('baixar o contrato aceito pela página da proposta', () => {
  it('logo depois do aceite: baixa o PDF lido no passo 2, sem código e sem chamar o servidor', () => {
    const blob = new Blob(['%PDF-'], { type: 'application/pdf' });
    render(<ContractPdfDownload token={CODIGO} contractId="ct1" pdfFile={{ blob, filename: 'contrato-XP-ANA-1.pdf' }} />);
    expect(texto()).not.toContain('pede um código');
    fireEvent.click(botaoBaixar());
    expect(saveBlob).toHaveBeenCalledWith(blob, 'contrato-XP-ANA-1.pdf');
    expect(contractAPI.pdfCode).not.toHaveBeenCalled();
    expect(contractAPI.download).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Contrato baixado.');
  });

  it('ao reabrir o link: pede o código, errado diz as tentativas, certo baixa; o mesmo código baixa de novo sem pedir outro', async () => {
    render(<ContractPdfDownload token={CODIGO} contractId="ct1" />);
    expect(texto()).toContain('Para proteger os seus dados, baixar o contrato por esta página pede um código');
    fireEvent.click(botaoBaixar());
    expect(contractAPI.pdfCode).toHaveBeenCalledWith(CODIGO);
    await waitFor(() => expect(campoCodigo()).toHaveFocus());
    expect(texto()).toContain('Enviamos um código de 6 dígitos para an***@cliente.test');
    // "Baixar" só com os 6 dígitos; só números entram no campo.
    const baixar = screen.getByRole('button', { name: 'Baixar' });
    expect(baixar).toBeDisabled();
    fireEvent.change(campoCodigo(), { target: { value: '12a34' } });
    expect(campoCodigo()).toHaveValue('1234');

    contractAPI.download.mockRejectedValueOnce(apiError(400, { code: 'INVALID_CODE', attemptsLeft: 3 }));
    fireEvent.change(campoCodigo(), { target: { value: '111111' } });
    fireEvent.click(screen.getByRole('button', { name: 'Baixar' }));
    expect(await screen.findByText('Código incorreto. Restam 3 tentativas.')).toBeInTheDocument();
    expect(campoCodigo()).toHaveValue('');
    expect(campoCodigo()).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(campoCodigo(), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Baixar' }));
    await waitFor(() => expect(contractAPI.download).toHaveBeenLastCalledWith(CODIGO, 'ct1', '123456'));
    expect(await screen.findByRole('status')).toHaveTextContent('Contrato baixado.');
    expect(screen.queryByLabelText('Código para baixar o contrato')).not.toBeInTheDocument();
    await waitFor(() => expect(botaoBaixar()).toHaveFocus());

    fireEvent.click(botaoBaixar());
    await waitFor(() => expect(contractAPI.download).toHaveBeenCalledTimes(3));
    expect(contractAPI.download).toHaveBeenLastCalledWith(CODIGO, 'ct1', '123456');
    expect(contractAPI.pdfCode).toHaveBeenCalledTimes(1);
  });

  it('código vencido: pede outro; "Voltar" fecha o campo e reabre com o código que ainda vale', async () => {
    render(<ContractPdfDownload token={CODIGO} contractId="ct1" />);
    fireEvent.click(botaoBaixar());
    await screen.findByLabelText('Código para baixar o contrato');
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.queryByLabelText('Código para baixar o contrato')).not.toBeInTheDocument();
    fireEvent.click(botaoBaixar());
    await screen.findByLabelText('Código para baixar o contrato');
    expect(contractAPI.pdfCode).toHaveBeenCalledTimes(1);

    contractAPI.download.mockRejectedValueOnce(apiError(410, { code: 'CODE_EXPIRED' }));
    fireEvent.change(campoCodigo(), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Baixar' }));
    expect(await screen.findByText('O código venceu ou foi bloqueado. Peça outro código.')).toBeInTheDocument();
    // 410 aqui é o código, não o link: nada de "Este link venceu".
    expect(texto()).not.toContain('Este link venceu');
    const outro = screen.getByRole('button', { name: 'Enviar outro código' });
    expect(outro).toBeEnabled();
    fireEvent.click(outro);
    await waitFor(() => expect(contractAPI.pdfCode).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('status')).toHaveTextContent('Enviamos um novo código para an***@cliente.test.');
  });

  it('pedido cedo demais (429): abre o campo para o código já enviado; serviço fora (503): o PDF está no e-mail e na área do cliente', async () => {
    contractAPI.pdfCode.mockRejectedValueOnce(apiError(429, { code: 'OTP_RATE_LIMIT', retryAfter: 42, message: 'Aguarde um pouco para pedir outro código.' }));
    const { unmount } = render(<ContractPdfDownload token={CODIGO} contractId="ct1" />);
    fireEvent.click(botaoBaixar());
    await screen.findByLabelText('Código para baixar o contrato');
    // Esta tela ainda não tinha pedido código: o que chegou pode ser o da desistência, que também serve.
    expect(screen.getByRole('status')).toHaveTextContent(
      'Você pediu um código há pouco. Digite abaixo o código que chegou por e-mail (o código da desistência também serve).',
    );
    expect(screen.getByRole('button', { name: /Enviar outro código em 4\d s/ })).toBeDisabled();
    unmount();

    contractAPI.pdfCode.mockRejectedValueOnce(apiError(503, { code: 'CONTRACT_UNAVAILABLE' }));
    render(<ContractPdfDownload token={CODIGO} contractId="ct1" />);
    fireEvent.click(botaoBaixar());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Baixar o contrato por esta página está indisponível agora. O PDF está anexado ao e-mail do aceite e na sua área do cliente.',
    );
    expect(screen.queryByLabelText('Código para baixar o contrato')).not.toBeInTheDocument();
  });
});

describe('um código por vez (revisão de 16/11/2026): baixar e desistir', () => {
  it('com o código da desistência valendo, o servidor não manda outro: a tela pede aquele e não avisa a confirmação', async () => {
    const onCodeIssued = vi.fn();
    contractAPI.pdfCode.mockResolvedValueOnce({ ...ENVIADO, reused: 'withdraw' });
    render(<ContractPdfDownload token={CODIGO} contractId="ct1" onCodeIssued={onCodeIssued} />);
    fireEvent.click(botaoBaixar());
    await screen.findByLabelText('Código para baixar o contrato');
    expect(screen.getByRole('status')).toHaveTextContent('Use o código da desistência que enviamos para an***@cliente.test: ele também serve para baixar.');
    expect(onCodeIssued).not.toHaveBeenCalled();
    fireEvent.change(campoCodigo(), { target: { value: '271828' } });
    fireEvent.click(screen.getByRole('button', { name: 'Baixar' }));
    await waitFor(() => expect(contractAPI.download).toHaveBeenCalledWith(CODIGO, 'ct1', '271828'));
  });

  it('código novo de baixar avisa a confirmação; pedido o da desistência (codeReset), o código que baixou não é reenviado sozinho', async () => {
    const onCodeIssued = vi.fn();
    const { rerender } = render(<ContractPdfDownload token={CODIGO} contractId="ct1" onCodeIssued={onCodeIssued} codeReset={0} />);
    fireEvent.click(botaoBaixar());
    await screen.findByLabelText('Código para baixar o contrato');
    expect(onCodeIssued).toHaveBeenCalledTimes(1);
    fireEvent.change(campoCodigo(), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Baixar' }));
    await waitFor(() => expect(contractAPI.download).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(botaoBaixar()).toBeEnabled());

    rerender(<ContractPdfDownload token={CODIGO} contractId="ct1" onCodeIssued={onCodeIssued} codeReset={1} />);
    fireEvent.click(botaoBaixar());
    await waitFor(() => expect(contractAPI.pdfCode).toHaveBeenCalledTimes(2));
    expect(contractAPI.download).toHaveBeenCalledTimes(1);
  });

  it('acabadas as tentativas, a tela esquece o código: "Baixar contrato" pede outro em vez de reabrir o velho', async () => {
    render(<ContractPdfDownload token={CODIGO} contractId="ct1" />);
    fireEvent.click(botaoBaixar());
    await screen.findByLabelText('Código para baixar o contrato');
    contractAPI.download.mockRejectedValueOnce(apiError(400, { code: 'INVALID_CODE', attemptsLeft: 0 }));
    fireEvent.change(campoCodigo(), { target: { value: '111111' } });
    fireEvent.click(screen.getByRole('button', { name: 'Baixar' }));
    expect(await screen.findByText('Código incorreto, e as tentativas deste código acabaram. Peça outro código.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    fireEvent.click(botaoBaixar());
    await waitFor(() => expect(contractAPI.pdfCode).toHaveBeenCalledTimes(2));
  });

  it('confirmação: o código de baixar digitado para desistir tem a frase própria; pedir o da desistência zera o código de baixar da tela', async () => {
    const data = {
      acceptedAt: '2099-01-01T12:00:00.000Z',
      protocol: 'CT-20990101-ABCDEF',
      withdrawUntil: '2099-01-08T02:59:59.999Z',
      canWithdraw: true,
      contractId: 'ct1',
      proofs: [],
    };
    contractAPI.withdrawCode.mockResolvedValue(ENVIADO);
    render(<ContractConfirmation token={CODIGO} data={data} onWithdrawn={vi.fn()} />);
    // Baixa com um código de baixar...
    fireEvent.click(botaoBaixar());
    fireEvent.change(await screen.findByLabelText('Código para baixar o contrato'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Baixar' }));
    await waitFor(() => expect(contractAPI.download).toHaveBeenCalledTimes(1));
    // ...pede o da desistência e digita o de baixar no campo errado.
    fireEvent.click(screen.getByRole('button', { name: 'Desistir da contratação' }));
    const campo = await screen.findByLabelText('Código para desistir');
    contractAPI.withdraw.mockRejectedValueOnce(
      apiError(400, { code: 'CODE_OTHER_PURPOSE', message: 'Este é o código para baixar o contrato. Para desistir, peça o código da desistência em "Enviar outro código".' }),
    );
    fireEvent.change(campo, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar desistência' }));
    expect(await screen.findByText(/Este é o código para baixar o contrato/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar outro código' })).toBeEnabled();
    // O código de baixar daquela visita não é reenviado sozinho: baixar de novo pede código.
    fireEvent.click(botaoBaixar());
    await waitFor(() => expect(contractAPI.pdfCode).toHaveBeenCalledTimes(2));
    expect(contractAPI.download).toHaveBeenCalledTimes(1);
  });
});

describe('PIX com o prazo da parcela inicial vencido', () => {
  it('vencido e com o código: aviso com a data, o QR Code continua e o WhatsApp abre com a mensagem pronta', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2027-12-05T12:00:00.000Z'));
    render(<ContractPixPayment copyPaste={COPIA_E_COLA} pixKey="55343824000156" amount={450} dueDate="2027-12-03T02:59:59.999Z" />);
    expect(screen.getByText('O prazo da parcela inicial venceu em 02/12/2027.')).toBeInTheDocument();
    expect(texto()).toContain('Antes de pagar, confirme com a equipe se a data do evento continua reservada.');
    expect(screen.getByRole('img', { name: 'QR Code do PIX, já com o valor' })).toBeInTheDocument();
    expect(screen.getByLabelText('Código PIX copia e cola')).toHaveValue(COPIA_E_COLA);
    const link = screen.getByRole('link', { name: 'Falar com a equipe no WhatsApp' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    const href = link.getAttribute('href') ?? '';
    expect(href).toMatch(/^https:\/\/wa\.me\/55\d{10,11}\?text=/);
    expect(decodeURIComponent(href)).toContain('O prazo da parcela inicial da minha proposta venceu em 02/12/2027. A data do evento continua reservada?');
  });

  it('comprovante já enviado pela página: sem o aviso (a pessoa já pagou; a equipe confere)', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2027-12-05T12:00:00.000Z'));
    render(<ContractPixPayment copyPaste={COPIA_E_COLA} pixKey="55343824000156" amount={450} dueDate="2027-12-03T02:59:59.999Z" proofSent />);
    expect(screen.queryByText(/O prazo da parcela inicial venceu/)).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'QR Code do PIX, já com o valor' })).toBeInTheDocument();
  });

  it('no prazo, sem o código (parcela registrada) ou sem data: nenhum aviso', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2027-12-01T12:00:00.000Z'));
    const { unmount } = render(<ContractPixPayment copyPaste={COPIA_E_COLA} pixKey="55343824000156" amount={450} dueDate="2027-12-03T02:59:59.999Z" />);
    expect(screen.queryByText(/O prazo da parcela inicial venceu/)).not.toBeInTheDocument();
    unmount();

    vi.setSystemTime(new Date('2027-12-05T12:00:00.000Z'));
    const semCodigo = render(<ContractPixPayment pixKey="55343824000156" dueDate="2027-12-03T02:59:59.999Z" />);
    expect(screen.queryByText(/O prazo da parcela inicial venceu/)).not.toBeInTheDocument();
    semCodigo.unmount();

    render(<ContractPixPayment copyPaste={COPIA_E_COLA} pixKey="55343824000156" dueDate="não é data" />);
    expect(screen.queryByText(/O prazo da parcela inicial venceu/)).not.toBeInTheDocument();
  });
});
