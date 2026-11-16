import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Semanas 2 e 3 do teste do aceite (16/11/2026; doc "Aceite online X Produções — erros, fricções e melhorias"):
// - "PIX com valor já preenchido: QR Code e copia e cola do sinal, não só a chave" (antes: só a chave do CNPJ e "mande o
//   comprovante pelo WhatsApp");
// - "enviar o comprovante pela própria página, com aviso automático para a equipe";
// - "mostrar o contrato como texto na página, além do PDF" (celular e navegadores do WhatsApp e do Instagram).
const { apiFetch, quotePdfAPI, contractAPI } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  quotePdfAPI: { fromProposal: vi.fn() },
  contractAPI: {
    prepare: vi.fn(),
    pdf: vi.fn(),
    download: vi.fn(),
    sendCode: vi.fn(),
    accept: vi.fn(),
    withdrawCode: vi.fn(),
    withdraw: vi.fn(),
    proof: vi.fn(),
  },
}));
vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  return { apiFetch, quotePdfAPI, contractAPI, readApiError: actual.readApiError };
});
vi.mock('react-ga4', () => ({ default: { event: vi.fn(), initialize: vi.fn(), send: vi.fn(), set: vi.fn() } }));

import PublicProposalPage from '../PublicProposalPage';
import { ContractDocumentText } from '@/components/proposal/ContractDocumentText';
import type { ContractDocument } from '@/types/contract';

const CODIGO = 'p1.TESTE';
const SHA = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
const BLOB_URL = 'blob:http://localhost/contrato-1';
const COPIA_E_COLA =
  '00020126360014br.gov.bcb.pix0114553438240001565204000053039865406900.005802BR5921X PRODUCOES E EVENTOS6014BELO HORIZONTE62200516CT20271130ABCDEF6304B1C2';

const proposta = (contract?: object | null) => ({
  state: 'open',
  eventTitle: 'Formatura da Ana',
  eventDate: '2027-12-21T01:00:00.000Z',
  eventEndDate: '2027-12-21T07:00:00.000Z',
  city: 'Belo Horizonte',
  neighborhood: 'Savassi',
  pricing: { lines: [{ description: 'Kit Som (4 h incluídas)', quantity: 1, total: 1800 }], discount: null, adjustment: 0, total: 1800 },
  validUntil: '2027-12-15T02:59:59.999Z',
  ...(contract === undefined ? {} : { contract }),
});

const DOCUMENTO: ContractDocument = {
  code: 'XP-ANA-20271220-2200-AB1',
  templateVersion: '2026-11-13',
  title: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS',
  subtitle: 'Som e iluminação para evento',
  contractor: '55.343.824 ERNANE MOURA DA SILVA, nome comercial X Produções e Eventos, inscrita no CNPJ sob o nº 55.343.824/0001-56.',
  intro: 'As partes acima identificadas celebram este contrato de prestação de serviços.',
  clauses: [
    {
      title: 'CLÁUSULA 1ª - DO OBJETO',
      blocks: [
        { kind: 'item', num: '1.1', text: 'Locação de equipamentos de som e iluminação.' },
        { kind: 'event', rows: [{ label: 'Evento', value: 'Formatura da Ana' }] },
        { kind: 'sub', letter: 'a)', text: 'montagem antes do evento;' },
      ],
    },
    {
      title: 'CLÁUSULA 7ª - DO CANCELAMENTO',
      blocks: [
        { kind: 'item', num: '7.1', text: 'Cancelamento com antecedência: vale a tabela abaixo.', highlight: true },
        { kind: 'table', caption: 'Retenção do valor total', head: ['Quando cancela', 'Fica retido'], rows: [['61 dias ou mais antes', '10%']] },
      ],
    },
  ],
  closing: ['E, por estarem de acordo, as partes formalizam este contrato por meio eletrônico.', 'Belo Horizonte, 30 de novembro de 2027.'],
  annex1: { title: 'ANEXO I - RIDER TÉCNICO', groups: [{ title: 'Kit Som', items: ['2× Caixa ativa'] }], note: 'O frete está no Anexo II.' },
  annex2: {
    title: 'ANEXO II - RESUMO DO ORÇAMENTO',
    rows: [{ label: 'Kit Som (4 h incluídas)', detail: 'Locação de equipamentos com os serviços do kit', value: 'R$ 1.800,00' }],
    totals: [{ label: 'Preço de tabela', value: 'R$ 2.000,00', tone: 'struck' }],
    totalLabel: 'VALOR TOTAL',
    total: 'R$ 1.800,00',
    notes: ['Preços de tabela do catálogo da X Produções na data da proposta.'],
  },
};

const preparado = (document?: ContractDocument) => ({
  contractId: 'ct1',
  templateVersion: '2026-11-13',
  sha256: SHA,
  summary: {
    object: 'Locação de equipamentos de som e iluminação e serviços de montagem, operação técnica e desmontagem',
    eventDate: '2027-12-21T01:00:00.000Z',
    eventEndDate: '2027-12-21T07:00:00.000Z',
    location: 'Rua do Evento, 100, Savassi, Belo Horizonte - MG',
    total: 1800,
    initialPayment: { amount: 900, dueDate: '2027-12-03T02:59:59.999Z' },
    balance: { amount: 900, dueDate: '2027-12-19T01:00:00.000Z' },
    freight: 'Frete incluído no kit até 15 km',
    cancellation: [{ range: '61 dias ou mais antes do evento', percent: 10 }],
    withdrawalDays: 7,
    forum: 'Foro do seu domicílio',
  },
  otp: { sentTo: 'a***@cliente.test', expiresAt: '2027-11-30T13:10:00.000Z' },
  ...(document ? { document } : {}),
});

const ACEITO = {
  acceptedAt: '2027-11-30T13:00:00.000Z',
  protocol: 'CT-20271130-ABCDEF',
  sha256: SHA,
  initialPayment: { amount: 900, dueDate: '2027-12-03T02:59:59.999Z' },
  balance: { amount: 900, dueDate: '2027-12-19T01:00:00.000Z' },
  withdrawUntil: '2027-12-07T13:00:00.000Z',
  pix: { key: '55343824000156', keyType: 'CNPJ', copyPaste: COPIA_E_COLA },
  initialPaymentReceived: false,
};

/** O contract do /proposals/view de um contrato aceito (reabrir o link). */
const aceitoNoView = (over: object = {}) => ({
  enabled: true,
  state: 'ACCEPTED',
  contractId: 'ct1',
  acceptedAt: ACEITO.acceptedAt,
  withdrawUntil: ACEITO.withdrawUntil,
  canWithdraw: true,
  sha256: SHA,
  protocol: ACEITO.protocol,
  initialPayment: ACEITO.initialPayment,
  balance: ACEITO.balance,
  pix: ACEITO.pix,
  initialPaymentReceived: false,
  proofs: [],
  ...over,
});

const apiError = (status: number, body: object, message = 'falhou') => Object.assign(new Error(message), { status, body });

const montar = () => {
  window.history.replaceState(null, '', `/proposta#token=${CODIGO}`);
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/proposta']}>
        <Routes>
          <Route path="/proposta" element={<PublicProposalPage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
};
const texto = () => (document.body.textContent ?? '').replace(/\s+/g, ' ');
const digitar = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const ARQUIVO = /Arquivo do comprovante/;
const escolher = (file: File) => fireEvent.change(screen.getByLabelText(ARQUIVO), { target: { files: [file] } });
const png = (name = 'comprovante.png') => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], name, { type: 'image/png' });

const preencherEContinuar = async () => {
  apiFetch.mockResolvedValue(proposta({ enabled: true, state: 'NONE' }));
  montar();
  fireEvent.click(await screen.findByRole('button', { name: 'Aceitar proposta' }));
  digitar('Nome completo', 'Ana Souza');
  digitar('CPF', '529.982.247-25');
  digitar('E-mail', 'ana@cliente.test');
  digitar('Telefone com DDD', '(31) 98888-7777');
  digitar('CEP', '30140-000');
  digitar('Número', '10');
  digitar('Rua', 'Rua A');
  digitar('Bairro', 'Savassi');
  digitar('Cidade', 'Belo Horizonte');
  digitar('Estado', 'MG');
  fireEvent.click(screen.getByLabelText(/Para o meu próprio evento/));
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  await screen.findByRole('heading', { name: 'Passo 2 de 3: resumo, contrato e código' });
};
const chegarAoPasso2 = async () => {
  await preencherEContinuar();
  await screen.findByTitle('Contrato completo (PDF)');
};

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(URL, { createObjectURL: vi.fn(() => BLOB_URL), revokeObjectURL: vi.fn() });
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  contractAPI.prepare.mockResolvedValue(preparado(DOCUMENTO));
  contractAPI.pdf.mockResolvedValue({ blob: new Blob(['%PDF-'], { type: 'application/pdf' }), filename: 'contrato-XP-ANA-1.pdf' });
  contractAPI.accept.mockResolvedValue(ACEITO);
  contractAPI.proof.mockResolvedValue({ sentAt: '2027-11-30T14:05:00.000Z', proofs: [{ sentAt: '2027-11-30T14:05:00.000Z' }] });
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })));
});

afterEach(() => {
  window.history.replaceState(null, '', '/');
  document.head.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('PIX da parcela inicial com QR Code e copia e cola', () => {
  it('logo depois do aceite: QR Code e o código com o valor (copiar), a chave como alternativa; o texto não manda mais pelo WhatsApp', async () => {
    await chegarAoPasso2();
    fireEvent.click(screen.getByLabelText(/Li o contrato inteiro/));
    digitar('Código de confirmação', '123456');
    fireEvent.click(screen.getByRole('button', { name: 'Aceito' }));
    await screen.findByRole('heading', { name: 'Passo 3 de 3: contrato aceito' });

    const qr = screen.getByRole('img', { name: 'QR Code do PIX, já com o valor' });
    expect(qr.querySelector('svg')).not.toBeNull();
    expect(screen.getByLabelText('Código PIX copia e cola')).toHaveValue(COPIA_E_COLA);
    expect(texto()).toContain('Valor: R$ 900,00, até 02/12/2027.');
    expect(texto()).toContain('Ou use a chave PIX (CNPJ): 55.343.824/0001-56');
    expect(texto()).toContain('Depois de pagar, envie o comprovante logo abaixo.');
    expect(texto()).not.toContain('mande o comprovante para a equipe pelo WhatsApp');

    fireEvent.click(screen.getByRole('button', { name: 'Copiar código PIX' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(COPIA_E_COLA));
    expect(await screen.findByText('Código PIX copiado. Cole no app do banco, em Pix copia e cola.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copiar chave PIX' }));
    await waitFor(() => expect(writeText).toHaveBeenLastCalledWith('55343824000156'));
  });

  it('a cópia falhou (navegador sem área de transferência): pede para selecionar o código', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    apiFetch.mockResolvedValue(proposta(aceitoNoView()));
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Copiar código PIX' }));
    expect(await screen.findByText('Não deu para copiar. Selecione o código abaixo e copie.')).toBeInTheDocument();
  });

  it('ao reabrir com a parcela já registrada: "Parcela inicial recebida", sem QR Code nem código para pagar de novo', async () => {
    apiFetch.mockResolvedValue(proposta(aceitoNoView({ pix: { key: '55343824000156', keyType: 'CNPJ' }, initialPaymentReceived: true })));
    montar();
    await screen.findByRole('heading', { name: 'Pagamento por PIX' });
    expect(texto()).toContain('Parcela inicial recebida. A equipe já registrou o pagamento.');
    expect(texto()).toContain('A equipe já registrou a parcela inicial.');
    expect(screen.queryByRole('img', { name: /QR Code/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Código PIX copia e cola')).not.toBeInTheDocument();
    expect(texto()).toContain('Chave PIX (CNPJ): 55.343.824/0001-56');
    expect(texto()).toContain('Ao pagar o saldo, envie aqui o comprovante do PIX');
  });

  it('servidor antigo (sem o copia e cola): só a chave, como antes', async () => {
    apiFetch.mockResolvedValue(proposta(aceitoNoView({ pix: { key: '55343824000156', keyType: 'CNPJ' }, initialPaymentReceived: undefined, proofs: undefined })));
    montar();
    await screen.findByRole('heading', { name: 'Parcela inicial por PIX' });
    expect(screen.queryByRole('img', { name: /QR Code/ })).not.toBeInTheDocument();
    expect(texto()).toContain('Chave PIX (CNPJ): 55.343.824/0001-56');
    expect(screen.getByRole('heading', { name: 'Enviar o comprovante' })).toBeInTheDocument();
  });
});

describe('comprovante pela página da proposta', () => {
  it('escolhe o arquivo e envia: vai com o código do link; a página diz quando e lista os enviados', async () => {
    apiFetch.mockResolvedValue(proposta(aceitoNoView({ proofs: [{ sentAt: '2027-11-30T13:30:00.000Z' }] })));
    montar();
    await screen.findByRole('heading', { name: 'Enviar o comprovante' });
    expect(texto()).toContain('Comprovantes enviados por esta página:30/11 às 10:30');

    const enviar = screen.getByRole('button', { name: 'Enviar comprovante' });
    expect(enviar).toBeDisabled();
    const file = png();
    escolher(file);
    expect(enviar).toBeEnabled();
    fireEvent.click(enviar);

    await waitFor(() => expect(contractAPI.proof).toHaveBeenCalledWith(CODIGO, file));
    expect(
      await screen.findByText('Comprovante enviado em 30/11 às 11:05. A equipe recebeu o aviso, confere o PIX e confirma a reserva.'),
    ).toBeInTheDocument();
    // A lista passa a ser a da resposta (todos os enviados pela página).
    const lista = screen.getByText('Comprovantes enviados por esta página:').nextElementSibling as HTMLElement;
    expect(within(lista).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['30/11 às 11:05']);
    expect(screen.getByRole('button', { name: 'Enviar comprovante' })).toBeDisabled();
    // O botão ficou desabilitado: o foco volta ao campo do arquivo (não se perde no corpo da página).
    await waitFor(() => expect(screen.getByLabelText(ARQUIVO)).toHaveFocus());
  });

  it('tipo de arquivo errado ou grande demais: recusado na página, sem chamar o servidor', async () => {
    apiFetch.mockResolvedValue(proposta(aceitoNoView()));
    montar();
    await screen.findByRole('heading', { name: 'Enviar o comprovante' });

    escolher(new File(['oi'], 'nota.txt', { type: 'text/plain' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Tipo de arquivo não aceito. Envie JPG, PNG, WebP ou PDF até 10 MB.');
    expect(screen.getByRole('button', { name: 'Enviar comprovante' })).toBeDisabled();

    const grande = png('grande.png');
    Object.defineProperty(grande, 'size', { value: 11 * 1024 * 1024 });
    escolher(grande);
    expect(screen.getByRole('alert')).toHaveTextContent('Arquivo muito grande. Envie JPG, PNG, WebP ou PDF até 10 MB.');
    expect(contractAPI.proof).not.toHaveBeenCalled();
  });

  it.each([
    [409, { code: 'PROOF_LIMIT' }, 'Você já enviou 10 comprovantes por esta página. Para mandar outro, fale com a equipe pelo WhatsApp.', 'Você já enviou 10 comprovantes por esta página.'],
    [413, {}, 'HTTP 413', 'Arquivo muito grande. Envie JPG, PNG, WebP ou PDF até 10 MB.'],
    [429, { code: 'CONTRACT_RATE_LIMIT' }, 'Muitos envios de comprovante. Aguarde alguns minutos e tente de novo.', 'Muitos envios de comprovante.'],
    [503, {}, 'HTTP 503', 'O envio pelo site está indisponível agora. Mande o comprovante pelo WhatsApp'],
    [410, { code: 'PROPOSAL_GONE' }, 'HTTP 410', 'Este link venceu ou foi trocado.'],
    [500, {}, 'HTTP 500', 'Não conseguimos enviar o comprovante agora.'],
  ])('erro %s do servidor: a frase certa e o foco volta ao arquivo', async (status, body, message, shown) => {
    contractAPI.proof.mockRejectedValueOnce(apiError(status, body, message));
    apiFetch.mockResolvedValue(proposta(aceitoNoView()));
    montar();
    await screen.findByRole('heading', { name: 'Enviar o comprovante' });
    escolher(png());
    fireEvent.click(screen.getByRole('button', { name: 'Enviar comprovante' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(shown);
    await waitFor(() => expect(screen.getByLabelText(ARQUIVO)).toHaveFocus());
  });
});

describe('contrato em texto no passo 2', () => {
  it('"Ler o contrato completo nesta página": o mesmo texto do modelo (cláusulas, destaque, tabela e anexos), sem os dados do contratante', async () => {
    await chegarAoPasso2();
    expect(texto()).toContain('No celular, leia o contrato aqui mesmo, logo abaixo, ou abra o PDF em tela cheia (ou baixe o arquivo).');
    const resumo = screen.getByText('Ler o contrato completo nesta página');
    expect(resumo.closest('details')).not.toHaveAttribute('open');
    fireEvent.click(resumo);

    const doc = screen.getByTestId('contrato-texto');
    const t = (doc.textContent ?? '').replace(/\s+/g, ' ');
    expect(t).toContain('CONTRATO DE PRESTAÇÃO DE SERVIÇOS');
    expect(t).toContain('Pedido nº XP-ANA-20271220-2200-AB1 · Modelo 2026-11-13');
    expect(t).toContain('CONTRATANTE:Os dados que você informou no passo 1, como estão no PDF.');
    expect(t).toContain('inscrita no CNPJ sob o nº 55.343.824/0001-56');
    expect(within(doc).getByRole('heading', { name: 'CLÁUSULA 1ª - DO OBJETO' })).toBeInTheDocument();
    expect(t).toContain('1.1 Locação de equipamentos de som e iluminação.');
    expect(t).toContain('a) montagem antes do evento;');
    expect(t).toContain('EventoFormatura da Ana');
    // A cláusula em destaque sai destacada, como no PDF.
    expect(within(doc).getByText(/Cancelamento com antecedência/).closest('p')).toHaveClass('font-semibold');
    expect(within(doc).getByRole('table', { name: 'Retenção do valor total' })).toBeInTheDocument();
    expect(t).toContain('2× Caixa ativa');
    expect(t).toContain('VALOR TOTALR$ 1.800,00');
    expect(within(doc).getByText('R$ 2.000,00')).toHaveClass('line-through');
    for (const dado of ['529.982.247-25', 'ana@cliente.test', '98888-7777', 'Rua A']) expect(t).not.toContain(dado);
  });

  it('servidor antigo (preparo sem o texto): só o PDF, com o aviso de antes', async () => {
    contractAPI.prepare.mockResolvedValue(preparado());
    await chegarAoPasso2();
    expect(screen.queryByText('Ler o contrato completo nesta página')).not.toBeInTheDocument();
    expect(texto()).toContain('No celular, abra o contrato em tela cheia (ou baixe o arquivo) para ler todas as páginas.');
  });

  it('o PDF não abriu: o texto aparece mesmo assim, mas o "Aceito" continua pedindo o PDF (é ele que fica guardado com a impressão digital)', async () => {
    contractAPI.pdf.mockRejectedValue(apiError(503, {}, 'HTTP 503'));
    await preencherEContinuar();
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
    expect(screen.getByText('Ler o contrato completo nesta página')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Li o contrato inteiro/));
    digitar('Código de confirmação', '123456');
    expect(screen.getByRole('button', { name: 'Aceito' })).toBeDisabled();
    expect(texto()).toContain('Para aceitar, falta: o contrato completo aberto nesta página.');
  });

  it('o componente sozinho: fechado de início; os itens sem destaque saem sem a borda', () => {
    render(<ContractDocumentText document={DOCUMENTO} />);
    expect(screen.getByText('Ler o contrato completo nesta página').closest('details')).not.toHaveAttribute('open');
    expect(screen.getByText(/Locação de equipamentos de som e iluminação\./).closest('p')).not.toHaveClass('border-warning');
  });
});
