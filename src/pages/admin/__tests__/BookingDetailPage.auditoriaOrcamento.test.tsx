import { describe, it, expect, vi, beforeEach, afterEach, afterAll, type MockInstance } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// O fuso do processo vai para Tóquio ANTES de importar a ficha (vi.hoisted roda antes dos imports): um formatador
// sem fuso explícito guarda o fuso do momento em que foi montado, e as datas da ficha e do PDF têm de sair no horário
// de Brasília qualquer que seja o fuso do aparelho (D13). Volta ao fuso original no fim do arquivo.
const { ORIGINAL_TZ } = vi.hoisted(() => {
  const original = process.env.TZ;
  process.env.TZ = 'Asia/Tokyo';
  return { ORIGINAL_TZ: original };
});

const { bookingAPI, pdfText, autoTable } = vi.hoisted(() => ({
  bookingAPI: {
    getById: vi.fn(), updateStatus: vi.fn(), updateDeliveryStatus: vi.fn(), delete: vi.fn(), confirmWithDetails: vi.fn(),
    sendProposal: vi.fn(), getAuditHistory: vi.fn(),
  },
  pdfText: vi.fn(),
  autoTable: vi.fn(),
}));
vi.mock('../../../services/api', () => ({ bookingAPI, api: { post: vi.fn(), delete: vi.fn() }, apiFetch: vi.fn().mockResolvedValue({}) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));
vi.mock('@/hooks/useCollaborators', () => ({ useCollaborators: () => ({ collaborators: [], fetchCollaborators: vi.fn().mockResolvedValue(undefined) }) }));
// O formulário de edição de verdade não importa aqui: só o "salvou" dele.
vi.mock('@/components/forms/AdminBookingForm', () => ({
  AdminBookingForm: ({ onSuccess }: { onSuccess: () => void }) => (
    <button type="button" onClick={onSuccess}>Salvar edição (formulário)</button>
  ),
}));
vi.mock('@/components/bookings/BookingCollaborators', () => ({ BookingCollaborators: () => null }));
vi.mock('@/components/bookings/BookingFinancialSummary', () => ({ BookingFinancialSummary: () => null }));
vi.mock('../../../components/modals/EventManagement', () => ({ EventManagement: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));
vi.mock('jspdf-autotable', () => ({ default: autoTable }));
vi.mock('jspdf', () => ({
  jsPDF: class {
    text = pdfText;
    splitTextToSize = (texto: string) => [texto];
    setFillColor() {}
    rect() {}
    addImage() {}
    setTextColor() {}
    setFontSize() {}
    setFont() {}
    setDrawColor() {}
    setLineWidth() {}
    line() {}
    textWithLink() {}
    save() {}
  },
}));

import BookingDetailPage from '../BookingDetailPage';
import { formatPrice } from '../../../utils/formatPrice';

// Auditoria do orçamento (12/11/2026), onda 2, a ficha da reserva no painel (o fuso de Tóquio vem do vi.hoisted acima).
afterAll(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

// O resumo de preço como GET /bookings/:id manda: o servidor marca o pedágio sem preço com toArrange (O21).
const PRICING = {
  lines: [
    { description: 'Kit 05 (4 h incluídas + 1 hora extra de R$ 100,00)', quantity: 1, unitPrice: 1300, discount: 0, total: 1300, type: 'KIT', equipmentId: null, serviceId: null, kitId: 'kit5' },
    { description: 'Frete (32 km por trecho; até 15 km incluso no kit)', quantity: 1, unitPrice: 240, discount: 0, total: 240, type: 'CUSTOM', equipmentId: null, serviceId: null, kitId: null },
    { description: 'Pedágio à parte', quantity: 1, unitPrice: 0, discount: 0, total: 0, type: 'CUSTOM', equipmentId: null, serviceId: null, kitId: null, toArrange: 'toll' },
  ],
  itemsSubtotal: 1540,
  couponDiscount: { amount: 130, code: 'AMIGO10' },
  adjustment: 90,
  total: 1500,
};

// Pedido do site, pendente, de cliente cadastrado, com kit que traz serviços dentro.
const RESERVA = {
  id: 'XP-CARLA-20270110', status: 'PENDING', deliveryStatus: 'PENDING', totalPrice: '1500.00', discountAmount: '130.00',
  eventDate: '2027-01-10T21:00:00.000Z', eventEndDate: '2027-01-11T02:00:00.000Z', eventDuration: 3,
  setupTime: '2027-01-10T18:00:00.000Z', location: 'Sítio Bela Vista',
  requiresStairs: false, isCovered: true, hasParking: true,
  specialRequests: [
    '— Pedido de orçamento pelo site —',
    'Liberado para montar a partir de: 15:00',
    'Escadas no acesso: Não sei',
    'Local coberto: Não',
    'Estacionamento ou carga e descarga: Sim',
  ].join('\n'),
  clientId: 'cli-1', client: { id: 'cli-1', phone: '31955554444', user: { id: 'u1', name: 'Carla Dias', email: 'carla@cliente.test' } },
  clientName: null, clientContact: '(31) 98888-7777', clientEmail: null,
  attachments: [], services: [], eventCollaborators: [],
  kit: {
    id: 'kit5', name: 'Kit 05', price: 1200,
    items: [
      { service: { id: 'sv-log', name: 'Logística de Entrega e Retirada Especializada' } },
      { service: { id: 'sv-roadie', name: 'Roadie / Auxiliar de Montagem' } },
      { equipment: { id: 'eq-cx', name: 'Caixa ativa' } },
    ],
  },
  equipments: [],
  pricing: PRICING,
  proposal: { sentAt: null },
};

// O resumo da proposta enviada (GET /bookings/:id, campo proposal).
const enviada = (validUntil: string, expired = false) => ({
  sentAt: '2026-11-12T15:00:00.000Z', validUntil, expired, sentTotal: 1500, changedSinceSent: false,
});

const renderFicha = async (reserva: object = RESERVA) => {
  bookingAPI.getById.mockResolvedValue({ data: reserva });
  const view = render(
    <MemoryRouter initialEntries={['/admin/reservas/XP']}>
      <Routes><Route path="/admin/reservas/:id" element={<BookingDetailPage />} /></Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: /^Reserva / });
  return view;
};

const cartaoDoValor = () => screen.getByText('Valor da reserva').closest('.overflow-hidden') as HTMLElement;
const escritosNoPdf = () => pdfText.mock.calls.map((c) => String(c[0]));
const baixarPdf = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Baixar PDF' }));
  await waitFor(() => expect(autoTable).toHaveBeenCalledTimes(1));
};

describe('Ficha da reserva — auditoria do orçamento (onda 2)', () => {
  let open: MockInstance<typeof window.open>;

  beforeEach(() => {
    vi.clearAllMocks();
    bookingAPI.getAuditHistory.mockResolvedValue({ data: [] });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sem rede')));
    open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
  });

  afterEach(() => {
    open.mockRestore();
    vi.unstubAllGlobals();
  });

  // O14/C4: antes o cartão "Valor da reserva" mostrava só o total.
  it('cartão do valor: as mesmas linhas que o cliente vê (itens, frete, pedágio à parte, cupom, ajuste e total)', async () => {
    await renderFicha();

    const cartao = within(cartaoDoValor());
    const linhas = cartao.getByRole('list', { name: 'Linhas da proposta' });
    const textos = within(linhas).getAllByRole('listitem').map((li) => li.textContent?.replace(/\s/g, ' '));
    expect(textos).toEqual([
      `Kit 05 (4 h incluídas + 1 hora extra de R$ 100,00)${formatPrice(1300).replace(/\s/g, ' ')}`,
      `Frete (32 km por trecho; até 15 km incluso no kit)${formatPrice(240).replace(/\s/g, ' ')}`,
      'Pedágio à parteà parte',
    ]);
    expect(cartao.getByText('Desconto (AMIGO10):')).toBeInTheDocument();
    expect(cartao.getByText(`− ${formatPrice(130)}`.replace(/\s/g, ' '))).toBeInTheDocument();
    expect(cartao.getByText('Ajuste no valor final:')).toBeInTheDocument();
    expect(cartao.getByText(`+ ${formatPrice(90)}`.replace(/\s/g, ' '))).toBeInTheDocument();
    expect(cartao.getByText('O pedágio é cobrado à parte e não está no total.')).toBeInTheDocument();
    expect(cartaoDoValor().textContent).not.toMatch(/R\$\s*0,00/);
  });

  // O14/C4: a reserva só de equipamentos dizia "Nenhum kit" e "Nenhum serviço", sem os equipamentos.
  it('reserva só de equipamentos: a seção Equipamentos lista o que foi pedido', async () => {
    await renderFicha({
      ...RESERVA, kit: null, pricing: undefined, items: [], totalPrice: '300.00', discountAmount: null,
      equipments: [{ id: 'eq1', name: 'Mesa de som digital 16 canais' }, { id: 'eq2', name: 'Caixa ativa 15 pol' }],
    });

    const secao = within(screen.getByRole('heading', { name: 'Equipamentos', level: 4 }).parentElement!);
    expect(secao.getByText('Mesa de som digital 16 canais')).toBeInTheDocument();
    expect(secao.getByText('Caixa ativa 15 pol')).toBeInTheDocument();
    expect(secao.queryByText(/Nenhum equipamento/)).not.toBeInTheDocument();
  });

  // E1–E3: os serviços do kit aparecem em Serviços marcados como inclusos (não são cobrados de novo).
  it('serviços que vêm no kit: listados com "Incluso no kit"; o ligado à reserva à parte, sem a marca', async () => {
    const view = await renderFicha();

    let secao = within(screen.getByRole('heading', { name: 'Serviços', level: 4 }).parentElement!);
    const logistica = secao.getByText('Logística de Entrega e Retirada Especializada').parentElement!;
    expect(within(logistica).getByText('Incluso no kit')).toBeInTheDocument();
    expect(within(secao.getByText('Roadie / Auxiliar de Montagem').parentElement!).getByText('Incluso no kit')).toBeInTheDocument();
    view.unmount();

    // Reserva antiga em que o roadie também foi ligado à parte: ele não é "incluso".
    await renderFicha({ ...RESERVA, services: [{ id: 'sv-roadie', name: 'Roadie / Auxiliar de Montagem', price: 100 }] });
    secao = within(screen.getByRole('heading', { name: 'Serviços', level: 4 }).parentElement!);
    expect(within(secao.getByText('Roadie / Auxiliar de Montagem').parentElement!).queryByText('Incluso no kit')).not.toBeInTheDocument();
    expect(within(secao.getByText('Logística de Entrega e Retirada Especializada').parentElement!).getByText('Incluso no kit')).toBeInTheDocument();
  });

  // O25 e D13: a montagem e as respostas de acesso não apareciam em tela nenhuma do painel; as datas iam no fuso do aparelho.
  it('montagem e acesso: a hora da montagem e as respostas escritas ("Não sei" inclusive), no horário de Brasília', async () => {
    await renderFicha();

    expect(screen.getByText('10/01/2027, das 18:00 às 23:00')).toBeInTheDocument();
    expect(screen.getByText('Duração: 5 h')).toBeInTheDocument();
    const bloco = within(screen.getByRole('heading', { name: 'Montagem e acesso' }).parentElement!);
    const valor = (rotulo: string) => bloco.getByText(rotulo).nextElementSibling?.textContent;
    expect(valor('Montagem a partir de')).toBe('15:00');
    expect(valor('Escadas no acesso')).toBe('Não sei');
    expect(valor('Local coberto')).toBe('Não');
    expect(valor('Estacionamento ou carga e descarga')).toBe('Sim');
    expect(bloco.queryByText(/Valores do cadastro da reserva/)).not.toBeInTheDocument();
  });

  it('montagem e acesso sem resposta escrita: o sim/não do cadastro, dito como tal; o ambiente do briefing', async () => {
    const view = await renderFicha({ ...RESERVA, specialRequests: null, setupTime: null, requiresStairs: true, isCovered: false, hasParking: true });
    let bloco = within(screen.getByRole('heading', { name: 'Montagem e acesso' }).parentElement!);
    let valor = (rotulo: string) => bloco.getByText(rotulo).nextElementSibling?.textContent;
    expect(valor('Montagem a partir de')).toBe('Não informado');
    expect(valor('Escadas no acesso')).toBe('Sim');
    expect(valor('Local coberto')).toBe('Não');
    expect(bloco.getByText(/Valores do cadastro da reserva/)).toBeInTheDocument();
    view.unmount();

    await renderFicha({ ...RESERVA, setupTime: null, specialRequests: '— Briefing preenchido pelo cliente —\nAmbiente: Ao ar livre\nEscadas no acesso: Sim\nLiberado para montar a partir de: 14:00' });
    bloco = within(screen.getByRole('heading', { name: 'Montagem e acesso' }).parentElement!);
    valor = (rotulo: string) => bloco.getByText(rotulo).nextElementSibling?.textContent;
    expect(valor('Montagem a partir de')).toBe('14:00');
    expect(valor('Ambiente')).toBe('Ao ar livre');
    expect(bloco.queryByText('Local coberto')).not.toBeInTheDocument();
  });

  // O25: o texto do pedido pode trazer o que o cliente escreveu à vontade (o "O cliente também disse" do briefing), quebra
  // de linha do Windows e o formato antigo (sem as respostas). Só a resposta marcada conta, e tudo sai como texto.
  it('montagem e acesso: texto livre do cliente não vira resposta, HTML sai como texto, CRLF e formato antigo', async () => {
    const view = await renderFicha({
      ...RESERVA, setupTime: null, requiresStairs: true,
      specialRequests: [
        '— Briefing preenchido pelo cliente —',
        'Ambiente: Salão fechado',
        'Liberado para montar a partir de: <img src=x onerror=alert(1)>',
        'O cliente também disse: o acesso é tranquilo',
        'Escadas no acesso: Não',
        'Estacionamento ou carga e descarga: Não',
      ].join('\r\n'),
    });
    let bloco = within(screen.getByRole('heading', { name: 'Montagem e acesso' }).parentElement!);
    let valor = (rotulo: string) => bloco.getByText(rotulo).nextElementSibling?.textContent;
    expect(valor('Ambiente')).toBe('Salão fechado');
    expect(valor('Montagem a partir de')).toBe('<img src=x onerror=alert(1)>');
    expect(bloco.queryByRole('img')).not.toBeInTheDocument();
    // A escada e o estacionamento não foram respondidos no briefing: vale o cadastro, não o que veio no texto livre.
    expect(valor('Escadas no acesso')).toBe('Sim');
    expect(valor('Estacionamento ou carga e descarga')).toBe('Sim');
    view.unmount();

    // Pedido antigo, só com o texto do cliente: o sim/não do cadastro, dito como tal.
    await renderFicha({ ...RESERVA, setupTime: null, specialRequests: 'Cliente pediu luz azul na pista.' });
    bloco = within(screen.getByRole('heading', { name: 'Montagem e acesso' }).parentElement!);
    valor = (rotulo: string) => bloco.getByText(rotulo).nextElementSibling?.textContent;
    expect(valor('Escadas no acesso')).toBe('Não');
    expect(valor('Local coberto')).toBe('Sim');
    expect(bloco.getByText(/Valores do cadastro da reserva/)).toBeInTheDocument();
  });

  // E8: o "PDF + WhatsApp" virou "Enviar link pelo WhatsApp", pelo mesmo envio do "Enviar proposta" (inclusive a
  // confirmação de quando há linha sem preço).
  it('"Enviar link pelo WhatsApp": passa pela confirmação do pedágio à parte, envia a proposta e abre o WhatsApp com o link', async () => {
    bookingAPI.sendProposal.mockResolvedValue({
      data: { link: 'https://xproducoeseeventos.com.br/proposta#token=abc', expiresAt: '2027-01-05T02:59:59.999Z', email: { status: 'queued' } },
    });
    await renderFicha();
    expect(screen.queryByRole('button', { name: 'PDF + WhatsApp' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Enviar link pelo WhatsApp' }));

    const confirmar = await screen.findByRole('dialog', { name: /^Enviar com pedágio à parte/ });
    expect(bookingAPI.sendProposal).not.toHaveBeenCalled();
    fireEvent.click(within(confirmar).getByRole('button', { name: 'Enviar assim mesmo' }));
    await waitFor(() => expect(bookingAPI.sendProposal).toHaveBeenCalledWith('XP-CARLA-20270110', undefined));
    const janela = await screen.findByRole('dialog', { name: 'Proposta enviada' });
    fireEvent.click(within(janela).getByRole('button', { name: 'Abrir WhatsApp' }));
    expect(open).toHaveBeenCalledTimes(1);
    const url = new URL(String(open.mock.calls[0][0]));
    expect(`${url.origin}${url.pathname}`).toBe('https://wa.me/5531988887777');
    expect(url.searchParams.get('text')).toContain('https://xproducoeseeventos.com.br/proposta#token=abc');
    expect(autoTable).not.toHaveBeenCalled();
  });

  it('"Enviar link pelo WhatsApp" com envio anterior e a reserva mudada: aciona o "Reenviar proposta", não outro botão', async () => {
    bookingAPI.sendProposal.mockResolvedValue({
      data: { link: 'https://xproducoeseeventos.com.br/proposta#token=abc', expiresAt: '2027-01-05T02:59:59.999Z', email: { status: 'queued' } },
    });
    const semPedagio = { ...PRICING, lines: PRICING.lines.slice(0, 2), itemsSubtotal: 1540 };
    await renderFicha({ ...RESERVA, pricing: semPedagio, proposal: { ...enviada('2099-01-05T02:59:59.999Z'), changedSinceSent: true } });
    expect(screen.getByText(/^A reserva mudou depois do último envio/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reenviar proposta' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Enviar link pelo WhatsApp' }));

    await waitFor(() => expect(bookingAPI.sendProposal).toHaveBeenCalledWith('XP-CARLA-20270110', undefined));
    expect(await screen.findByRole('dialog', { name: 'Proposta enviada' })).toBeInTheDocument();
  });

  it('sem telefone válido na reserva: "Enviar link pelo WhatsApp" desligado (o "Enviar proposta" do cartão continua)', async () => {
    await renderFicha({ ...RESERVA, clientContact: null, client: { ...RESERVA.client, phone: null } });

    const atalho = screen.getByRole('button', { name: 'Enviar link pelo WhatsApp' });
    expect(atalho).toBeDisabled();
    fireEvent.click(atalho);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(bookingAPI.sendProposal).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Enviar proposta' })).toBeEnabled();
  });

  it('reserva confirmada: sem "Enviar link pelo WhatsApp" (o link da proposta não abre mais)', async () => {
    await renderFicha({ ...RESERVA, status: 'CONFIRMED' });

    expect(screen.getByRole('button', { name: 'Baixar PDF' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar link pelo WhatsApp' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'PDF + WhatsApp' })).not.toBeInTheDocument();
  });

  // O aviso "a reserva mudou depois do último envio" é do Histórico e do "Enviar proposta"; depois de salvar uma edição
  // na ficha, o Histórico tem de recarregar para marcar o envio que ficou para trás.
  it('salvar uma edição recarrega o Histórico da proposta', async () => {
    await renderFicha();
    await waitFor(() => expect(bookingAPI.getAuditHistory).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar edição (formulário)' }));

    await waitFor(() => expect(bookingAPI.getAuditHistory).toHaveBeenCalledTimes(2));
    expect(bookingAPI.getById).toHaveBeenCalledTimes(2);
  });

  // O10/C5/D5, O21, O32/C14, D11 e D13 no PDF do painel (uso interno).
  it('PDF do painel: validade do link, pedágio à parte, nome do cadastro, duração pelas datas e horário de Brasília', async () => {
    await renderFicha({ ...RESERVA, proposal: enviada('2099-01-05T02:59:59.999Z') });

    await baixarPdf();

    const escritos = escritosNoPdf();
    const cabecalho = escritos.find((t) => t.startsWith('Emitida em:')) ?? '';
    expect(cabecalho).toContain('Válida até 04/01/2099');
    expect(cabecalho).not.toContain('Validade: 7 dias');
    expect(escritos).toContain('Carla Dias');
    expect(escritos).not.toContain('Nao informado');
    expect(escritos).toContain('5 h');
    expect(escritos).not.toContain('3h');
    expect(escritos).toContain('10/01/2027 18:00');
    expect(escritos).toContain('10/01/2027 23:00');
    expect(escritos).toContain('O pedágio é cobrado à parte e não está no total.');
    expect(escritos.join(' ')).not.toContain('Mensagem sugerida');
    const pedagio = (autoTable.mock.calls[0][1].body as string[][]).find((l) => l[1] === 'Pedágio à parte');
    expect(pedagio?.slice(4)).toEqual(['-', '-', 'à parte']);
  });

  it('PDF do painel: proposta vencida diz "Venceu em"; confirmada, ou sem o resumo da proposta, não fala de validade', async () => {
    const view = await renderFicha({ ...RESERVA, proposal: enviada('2020-03-02T02:59:59.999Z', true) });
    await baixarPdf();
    expect(escritosNoPdf().find((t) => t.startsWith('Emitida em:'))).toContain('Venceu em 01/03/2020');
    view.unmount();

    for (const reserva of [
      { ...RESERVA, status: 'CONFIRMED', proposal: enviada('2099-01-05T02:59:59.999Z') },
      { ...RESERVA, proposal: { sentAt: null }, validUntil: '2099-01-05T02:59:59.999Z' },
    ]) {
      vi.clearAllMocks();
      const outra = await renderFicha(reserva);
      await baixarPdf();
      const cabecalho = escritosNoPdf().find((t) => t.startsWith('Emitida em:')) ?? '';
      expect(cabecalho).not.toMatch(/Válida|Venceu|Validade/);
      outra.unmount();
    }
  });
});
