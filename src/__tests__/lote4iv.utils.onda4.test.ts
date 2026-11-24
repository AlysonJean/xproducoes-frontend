import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { Views } from 'react-big-calendar';

// Onda 4 da auditoria de 19/11, lote 4-IV: utilitários e configuração (cada bloco diz o achado).
import { toWhatsAppNumber } from '../utils/bookingContact';
import { proposalBaseFromBooking } from '../utils/proposalFromBooking';
import { bookingConfirmedWhatsAppText } from '../utils/whatsappTemplates';
import { normalizeImageUrl } from '../utils/imageUtils';
import { clientsToSheetRows } from '../utils/clientExport';
import { parseHistoryRows, parseSheetMoney } from '../utils/historyImport';
import { generateLocalBusinessSchema, generateOrganizationSchema, generateProductSchema } from '../utils/schemaGenerator';
import { api, friendlyNetworkError } from '../services/api';
import { bookingMatchesSearch } from '../utils/bookingSearch';
import { STEP_LABELS, modalEventEnd, periodTitle, stepDate } from '../utils/calendarNavigation';
import { GUEST_PHOTO_TYPES, prepareGuestPhoto, shouldResizeGuestPhoto } from '../utils/guestPhoto';
import { randomPairingCode } from '../utils/pairingCode';
import { TARGET_CITIES } from '../utils/localSeoConfig';
import { UserRole } from '../types/enums';
import type { Client } from '../types/types';

const FRONT = resolve(__dirname, '../..');
const ler = (rel: string) => readFileSync(resolve(FRONT, rel), 'utf8');

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('F2-09: número do WhatsApp', () => {
  it('zeros da frente saem antes de pôr o 55', () => {
    expect(toWhatsAppNumber('(031) 98888-7777')).toBe('5531988887777');
    expect(toWhatsAppNumber('0 31 3333-4444')).toBe('553133334444');
    expect(toWhatsAppNumber('+55 31 98888-7777')).toBe('5531988887777');
    expect(toWhatsAppNumber('98888')).toBeNull();
  });
});

describe('F2-02: nome do cliente na proposta', () => {
  it('o nome informado na reserva vem antes do da conta', () => {
    const base = { id: 'XP-1', items: [] };
    expect(proposalBaseFromBooking({ ...base, clientName: 'Ana (evento)', client: { user: { name: 'Ana Conta' } } } as never).clientName).toBe('Ana (evento)');
    expect(proposalBaseFromBooking({ ...base, client: { user: { name: 'Ana Conta' } } } as never).clientName).toBe('Ana Conta');
    expect(proposalBaseFromBooking(base as never).clientName).toBe('Cliente sem nome');
  });
});

describe('F2-03: confirmação pelo WhatsApp', () => {
  it('diz que o frete a combinar não está no total', () => {
    const texto = bookingConfirmedWhatsAppText({
      id: 'XP-1', clientName: 'Ana', eventDate: '2026-12-10T22:00:00.000Z', totalPrice: 900,
      items: [
        { itemType: 'KIT', description: 'Kit 01', quantity: 1, unitPrice: 900, totalPrice: 900 },
        { itemType: 'CUSTOM', description: 'Frete (a combinar)', quantity: 1, unitPrice: 0, totalPrice: 0 },
      ],
    } as never);
    expect(texto).toContain('Valor total: R$');
    expect(texto).toContain('O frete ainda vai ser combinado com a equipe e não está no total.');
    // a nota vem logo depois do total
    expect(texto.indexOf('O frete')).toBeGreaterThan(texto.indexOf('Valor total'));
  });
});

describe('F2-04: imagem sem foto', () => {
  it('URL vazia ou do Cloudinary "demo" volta vazia (antes /uploads/..., que não existe)', () => {
    expect(normalizeImageUrl('')).toBe('');
    expect(normalizeImageUrl(null)).toBe('');
    expect(normalizeImageUrl('https://res.cloudinary.com/demo/image/upload/kit-pa.png')).toBe('');
    expect(normalizeImageUrl('https://res.cloudinary.com/xp/image/upload/v1/a.jpg')).toBe('https://res.cloudinary.com/xp/image/upload/v1/a.jpg');
  });
});

describe('F2-05: planilha de clientes', () => {
  it('sem a coluna CPF/CNPJ e VIP pelo gasto acima de R$ 5.000', () => {
    const cliente = (totalSpent: number) => ({ id: 'c', name: 'Ana', email: 'a@t.com', status: 'ACTIVE', totalBookings: 1, totalSpent, isVip: false, createdAt: '2026-08-10T15:00:00.000Z' }) as unknown as Client;
    const [rico, comum] = clientsToSheetRows([cliente(5000.01), cliente(5000)]);
    expect(rico).not.toHaveProperty('CPF/CNPJ');
    expect(rico['VIP']).toBe('Sim');
    expect(comum['VIP']).toBe('Não');
  });
});

describe('F2-13: valor da agenda importada', () => {
  it('"1.150" é mil cento e cinquenta; "1,15" segue 1,15 e ganha o aviso na prévia', () => {
    expect(parseSheetMoney('1.150')).toBe(1150);
    expect(parseSheetMoney('12.500.000')).toBe(12500000);
    expect(parseSheetMoney('1.150,50')).toBe(1150.5);
    expect(parseSheetMoney('1.5')).toBe(1.5);
    const linha = (valor: string) => ({ 'Código': 'A1', 'Cliente': 'Ana', 'Data': '10/12/2025', 'Valor (R$)': valor });
    const { rows } = parseHistoryRows([linha('1,15'), linha('1.150')] as never);
    expect(rows[0].warnings).toEqual(['Valor abaixo de R$ 10: confira']);
    expect(rows[1].warnings).toBeUndefined();
    expect(rows[1].row?.totalPrice).toBe(1150);
  });
});

describe('F2-07: dados estruturados', () => {
  it('sem geo errado; cidades atendidas pelas landings (com Lagoa Santa)', () => {
    const empresa = generateLocalBusinessSchema() as Record<string, unknown>;
    expect(empresa.geo).toBeUndefined();
    expect(empresa.areaServed).toEqual(TARGET_CITIES.map((c) => ({ '@type': 'City', name: c.name })));
    expect(TARGET_CITIES.map((c) => c.name)).toContain('Lagoa Santa');
    const org = generateOrganizationSchema() as { contactPoint: { areaServed: string[] } };
    expect(org.contactPoint.areaServed).toEqual(['BR', ...TARGET_CITIES.map((c) => c.name)]);
  });

  it('a oferta só com preço e com o endereço canônico (window.location divergia no SSR)', () => {
    const comPreco = generateProductSchema({ name: 'Caixa', description: 'x', image: 'i.jpg', price: 120, url: 'https://www.xproducoeseeventos.com.br/equipamentos/caixa' }) as Record<string, { url?: string; price?: number }>;
    expect(comPreco.offers).toMatchObject({ url: 'https://www.xproducoeseeventos.com.br/equipamentos/caixa', price: 120 });
    expect(generateProductSchema({ name: 'LED', description: 'x', image: 'i.jpg', price: 0 })).not.toHaveProperty('offers');
  });
});

describe('F1-16: erro de rede em português', () => {
  it('tempo esgotado mantém o nome AbortError (a tela do Instagram o separa) e status 0; queda de rede vira "Sem conexão"', () => {
    const abort = new DOMException('signal is aborted without reason', 'AbortError');
    const traduzido = friendlyNetworkError(abort) as Error & { status: number; cause: unknown };
    expect(traduzido.message).toBe('A conexão demorou demais. Confira a internet e tente de novo.');
    expect(traduzido.name).toBe('AbortError');
    expect(traduzido.status).toBe(0);
    expect(traduzido.cause).toBe(abort);
    expect((friendlyNetworkError(new TypeError('Failed to fetch')) as Error).message).toBe('Sem conexão com o servidor. Confira a internet e tente de novo.');
    const outro = Object.assign(new Error('Pedido recusado'), { status: 409 });
    expect(friendlyNetworkError(outro)).toBe(outro);
  });
});

describe('F1-12: o axios só repete o 403 do CSRF em gravação', () => {
  const montar = (respostas: Record<string, Array<{ status: number; data: unknown }>>) => {
    const chamadas: string[] = [];
    api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      const chave = `${String(config.method).toUpperCase()} ${config.url}`;
      chamadas.push(chave);
      if (config.url === '/csrf-token') return { data: { success: true, data: { csrfToken: 't0k3n' } }, status: 200, statusText: '', headers: {}, config };
      const fila = respostas[chave];
      const r = fila.length > 1 ? fila.shift()! : fila[0];
      const response = { data: r.data, status: r.status, statusText: '', headers: {}, config };
      if (r.status >= 400) throw new AxiosError('falhou', 'ERR_BAD_REQUEST', config, null, response);
      return response;
    };
    return chamadas;
  };
  const adapterOriginal = api.defaults.adapter;
  afterEach(() => { api.defaults.adapter = adapterOriginal; });

  it('GET com 403 sobe na hora (antes repetia qualquer 403)', async () => {
    const chamadas = montar({ 'GET /admin/x': [{ status: 403, data: { message: 'Acesso negado' } }] });
    await expect(api.get('/admin/x')).rejects.toMatchObject({ response: { status: 403 } });
    expect(chamadas.filter((c) => c === 'GET /admin/x')).toHaveLength(1);

    // Nem com "CSRF" no corpo: a leitura não passa pelo CSRF, então repetir não resolve.
    const outra = montar({ 'GET /admin/y': [{ status: 403, data: { error: 'CSRF token validation failed' } }] });
    await expect(api.get('/admin/y')).rejects.toMatchObject({ response: { status: 403 } });
    expect(outra.filter((c) => c === 'GET /admin/y')).toHaveLength(1);
  });

  it('POST com 403 do CSRF renova o token e repete uma vez; 403 de permissão não repete', async () => {
    let chamadas = montar({ 'POST /coisas': [{ status: 403, data: { error: 'CSRF token validation failed' } }, { status: 200, data: { ok: true } }] });
    await expect(api.post('/coisas', {})).resolves.toMatchObject({ data: { ok: true } });
    expect(chamadas.filter((c) => c === 'POST /coisas')).toHaveLength(2);

    chamadas = montar({ 'POST /coisas': [{ status: 403, data: { message: 'Sem permissão.' } }] });
    await expect(api.post('/coisas', {})).rejects.toMatchObject({ response: { status: 403 } });
    expect(chamadas.filter((c) => c === 'POST /coisas')).toHaveLength(1);
  });
});

describe('F7admin2-11: busca da lista de reservas', () => {
  const reserva = {
    id: 'XP-ANA-20261210-2200-K4Q', clientName: 'Ana Souza', clientContact: '(31) 98888-7777', location: 'Espaço Jardim',
    client: { companyName: 'Ana Eventos Ltda', phone: '31 3333-4444', user: { name: 'Ana S.', email: 'ana@cliente.test' } },
  };

  it('nome, empresa, e-mail, local e código; telefone com 4 dígitos ou mais', () => {
    for (const termo of ['ana souza', 'EVENTOS LTDA', 'ana@cliente', 'jardim', 'k4q', 'espaço']) expect(bookingMatchesSearch(reserva, termo)).toBe(true);
    expect(bookingMatchesSearch(reserva, '8888-7777')).toBe(true);
    expect(bookingMatchesSearch(reserva, '3333')).toBe(true);
    expect(bookingMatchesSearch(reserva, '888')).toBe(false);
    expect(bookingMatchesSearch(reserva, 'bruno')).toBe(false);
    expect(bookingMatchesSearch(reserva, '   ')).toBe(true);
  });
});

describe('F6P1-13 e F6P1-16: agenda do painel', () => {
  const dia = new Date(2026, 10, 18, 15, 0); // 18/11/2026, quarta

  it('as setas andam pela visão', () => {
    expect(stepDate(dia, Views.WEEK, 1)).toEqual(new Date(2026, 10, 25, 15, 0));
    expect(stepDate(dia, Views.DAY, -1)).toEqual(new Date(2026, 10, 17, 15, 0));
    expect(stepDate(dia, Views.MONTH, 1)).toEqual(new Date(2026, 11, 1));
    expect(stepDate(dia, Views.AGENDA, -1)).toEqual(new Date(2026, 9, 1));
    expect(STEP_LABELS.week.prev).toBe('Semana anterior');
    expect(STEP_LABELS.day.next).toBe('Próximo dia');
  });

  it('o título acompanha a visão', () => {
    expect(periodTitle(dia, Views.MONTH)).toBe('novembro 2026');
    expect(periodTitle(dia, Views.DAY)).toBe('18 de novembro 2026');
    expect(periodTitle(dia, Views.WEEK)).toBe('15 nov – 21 nov 2026');
  });

  it('o término da janela é o eventEndDate (a duração vem arredondada)', () => {
    expect(modalEventEnd({ eventDate: '2026-11-18T23:00:00.000Z', eventEndDate: '2026-11-19T01:30:00.000Z', duration: 3 }).toISOString()).toBe('2026-11-19T01:30:00.000Z');
    expect(modalEventEnd({ eventDate: '2026-11-18T23:00:00.000Z', duration: 2 }).toISOString()).toBe('2026-11-19T01:00:00.000Z');
    expect(modalEventEnd({ eventDate: '2026-11-18T23:00:00.000Z', eventEndDate: 'lixo' }).toISOString()).toBe('2026-11-19T03:00:00.000Z');
  });
});

describe('F8-20: foto do convidado', () => {
  const arquivo = (type: string, size: number, name = 'foto.jpg') => new File([new Uint8Array(size)], name, { type });

  it('tipos aceitos como no servidor; só JPEG/PNG/WEBP acima de 2 MB são reduzidos', () => {
    for (const t of ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']) expect(GUEST_PHOTO_TYPES.test(t)).toBe(true);
    for (const t of ['application/pdf', 'video/mp4', '']) expect(GUEST_PHOTO_TYPES.test(t)).toBe(false);
    vi.stubGlobal('createImageBitmap', vi.fn());
    expect(shouldResizeGuestPhoto(arquivo('image/jpeg', 3 * 1024 * 1024))).toBe(true);
    expect(shouldResizeGuestPhoto(arquivo('image/jpeg', 2 * 1024 * 1024))).toBe(false);
    expect(shouldResizeGuestPhoto(arquivo('image/gif', 3 * 1024 * 1024))).toBe(false);
  });

  it('a foto grande sai com o maior lado em 1920 px, em JPEG; se o aparelho não lê a imagem, vai a original', async () => {
    const drawImage = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 4000, height: 3000, close: vi.fn() })));
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as never);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, cb: BlobCallback) {
      cb(new Blob([new Uint8Array(500_000)], { type: 'image/jpeg' }));
    });
    const original = arquivo('image/png', 3 * 1024 * 1024, 'festa.png');
    const reduzida = await prepareGuestPhoto(original);
    expect(reduzida).not.toBe(original);
    expect(reduzida.name).toBe('festa.jpg');
    expect(reduzida.type).toBe('image/jpeg');
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1920, 1440);

    getContext.mockReturnValue(null);
    expect(await prepareGuestPhoto(original)).toBe(original);
    vi.stubGlobal('createImageBitmap', vi.fn(async () => { throw new Error('HEIC'); }));
    expect(await prepareGuestPhoto(original)).toBe(original);
  });
});

describe('F8-10: código de pareamento do telão', () => {
  it('6 dígitos, de 100000 a 999999, pelo crypto', () => {
    const spy = vi.spyOn(crypto, 'getRandomValues');
    for (let i = 0; i < 50; i++) expect(randomPairingCode()).toMatch(/^[1-9]\d{5}$/);
    expect(spy).toHaveBeenCalled();
    spy.mockImplementation(((arr: Uint32Array) => { arr[0] = 0; return arr; }) as never);
    expect(randomPairingCode()).toBe('100000');
    spy.mockImplementation(((arr: Uint32Array) => { arr[0] = 899999; return arr; }) as never);
    expect(randomPairingCode()).toBe('999999');
  });
});

describe('F1-19, F1-23, F2-15 e F7admin2-09', () => {
  it('F1-19: o build não publica mapas de código', () => {
    expect(ler('vite.config.ts')).toMatch(/sourcemap:\s*false/);
  });

  it('F1-23: a Vercel instala pelo lock (npm ci)', () => {
    expect(JSON.parse(ler('vercel.json')).installCommand).toBe('npm ci --include=dev');
  });

  it('F2-15: os tipos de catálogo têm uma declaração só, e os papéis são os do servidor', () => {
    expect(ler('src/types/domains/equipment.ts')).not.toMatch(/export interface/);
    expect(Object.values(UserRole)).toEqual(expect.arrayContaining(['CLIENT', 'ADMIN', 'COLLABORATOR', 'MANAGER', 'OPERATOR']));
  });

  it('F7admin2-09: excluir categoria diz que só vale para categoria sem equipamentos', () => {
    expect(ler('src/pages/admin/CategoryListPage.tsx')).toContain('Só categorias sem equipamentos podem ser excluídas. Esta ação é definitiva.');
  });
});
