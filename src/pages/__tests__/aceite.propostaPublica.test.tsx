import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Aceite online (13/11/2026): com contract.enabled = true no /proposals/view (CONTRACTS_ENABLED no servidor), a página
// da proposta mostra "Aceitar proposta" e o aceite em passos: dados de quem contrata → resumo, contrato completo (o PDF
// exato preparado, com a impressão digital) e o código do e-mail → confirmação com protocolo, PIX da parcela inicial e
// "Desistir da contratação". Sem a chave, a página fica como estava. As chamadas seguem o "CONTRATO DA API" do roteiro
// da leva B (aqui simuladas).
const { apiFetch, quotePdfAPI, contractAPI } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  quotePdfAPI: { fromProposal: vi.fn() },
  contractAPI: { prepare: vi.fn(), pdf: vi.fn(), download: vi.fn(), sendCode: vi.fn(), accept: vi.fn(), withdraw: vi.fn() },
}));
vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  return { apiFetch, quotePdfAPI, contractAPI, readApiError: actual.readApiError };
});
vi.mock('react-ga4', () => ({ default: { event: vi.fn(), initialize: vi.fn(), send: vi.fn(), set: vi.fn() } }));

import PublicProposalPage from '../PublicProposalPage';
import vercelConfig from '../../../vercel.json';

const CODIGO = 'p1.TESTE';
const SHA = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
const SHA2 = '60303ae22b998861bce3b28f33eec1be758a213c86c93c076dbe9f558c11c752';
const CNPJ_PIX = '55.343.824/0001-56';
const BLOB_URL = 'blob:http://localhost/contrato-1';

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

const resumo = (withdrawalDays: 7 | null) => ({
  object: 'Locação de equipamentos de som e iluminação e serviços de montagem, operação técnica e desmontagem',
  eventDate: '2027-12-21T01:00:00.000Z',
  eventEndDate: '2027-12-21T07:00:00.000Z',
  location: 'Rua do Evento, 100, Savassi, Belo Horizonte - MG',
  total: 1800,
  initialPayment: { amount: 900, dueDate: '2027-12-03T02:59:59.999Z' },
  balance: { amount: 900, dueDate: '2027-12-19T01:00:00.000Z' },
  freight: 'Frete incluído no kit até 15 km',
  cancellation:
    withdrawalDays === 7
      ? [
          { range: '61 dias ou mais antes do evento', percent: 10 },
          { range: '7 dias ou menos antes, ou não comparecimento', percent: 50 },
        ]
      : [
          { range: '61 dias ou mais antes do evento', percent: 20 },
          { range: '7 dias ou menos antes, ou não comparecimento', percent: 70 },
        ],
  withdrawalDays,
  forum: withdrawalDays === 7 ? 'Foro do seu domicílio' : 'Foro de Belo Horizonte - MG',
});

const preparado = (over: Partial<{ contractId: string; sha256: string; withdrawalDays: 7 | null }> = {}) => ({
  contractId: over.contractId ?? 'ct1',
  templateVersion: '2026-11-13',
  sha256: over.sha256 ?? SHA,
  summary: resumo(over.withdrawalDays === undefined ? 7 : over.withdrawalDays),
  otp: { sentTo: 'a***@cliente.test', expiresAt: '2027-11-30T13:10:00.000Z' },
});

const ACEITO = {
  acceptedAt: '2027-11-30T13:00:00.000Z',
  protocol: 'XP-CT-2027-0001',
  sha256: SHA,
  initialPayment: { amount: 900, dueDate: '2027-12-03T02:59:59.999Z' },
  balance: { amount: 900, dueDate: '2027-12-19T01:00:00.000Z' },
  withdrawUntil: '2027-12-07T13:00:00.000Z',
  // O servidor manda a chave só com os dígitos; a tela formata.
  pix: { key: '55343824000156', keyType: 'CNPJ' },
};

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

const preencherEndereco = () => {
  digitar('E-mail', 'ana@cliente.test');
  digitar('Telefone com DDD', '(31) 98888-7777');
  digitar('CEP', '30140-000');
  digitar('Número', '10');
  digitar('Rua', 'Rua A');
  digitar('Bairro', 'Savassi');
  digitar('Cidade', 'Belo Horizonte');
  digitar('Estado', 'MG');
};
const preencherPF = () => {
  digitar('Nome completo', 'Ana Souza');
  digitar('CPF', '529.982.247-25');
  preencherEndereco();
  fireEvent.click(screen.getByLabelText(/Para o meu próprio evento/));
};

const PARTY_PF = {
  personType: 'PF',
  name: 'Ana Souza',
  document: '52998224725',
  email: 'ana@cliente.test',
  phone: '31988887777',
  address: { street: 'Rua A', number: '10', neighborhood: 'Savassi', city: 'Belo Horizonte', state: 'MG', zipCode: '30140000' },
  purpose: 'OWN_EVENT',
};

/** Abre a proposta com o aceite ligado, preenche o passo 1 (pessoa física) e chega ao passo 2. */
const chegarAoPasso2 = async () => {
  apiFetch.mockResolvedValue(proposta({ enabled: true, state: 'NONE' }));
  montar();
  fireEvent.click(await screen.findByRole('button', { name: 'Aceitar proposta' }));
  preencherPF();
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  await screen.findByRole('heading', { name: 'Passo 2 de 3: resumo, contrato e código' });
  await screen.findByTitle('Contrato completo (PDF)');
};

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(URL, { createObjectURL: vi.fn(() => BLOB_URL), revokeObjectURL: vi.fn() });
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  contractAPI.prepare.mockResolvedValue(preparado());
  contractAPI.pdf.mockResolvedValue({ blob: new Blob(['%PDF-'], { type: 'application/pdf' }), filename: 'contrato-XP-ANA-1.pdf' });
});

afterEach(() => {
  window.history.replaceState(null, '', '/');
  document.head.innerHTML = '';
});

describe('aceite online — chave desligada', () => {
  it.each([
    ['sem o campo contract', undefined],
    ['contract.enabled = false', { enabled: false, state: 'NONE' }],
  ])('%s: nada do aceite; a página segue como antes, com o nome empresarial e o endereço completo na moldura', async (_caso, contract) => {
    // Nenhuma chamada nova: só o /proposals/view (pelo apiFetch simulado) e nenhum fetch direto.
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    apiFetch.mockResolvedValue(proposta(contract));
    montar();
    await screen.findByRole('heading', { name: 'Formatura da Ana' });

    expect(screen.queryByRole('button', { name: 'Aceitar proposta' })).not.toBeInTheDocument();
    expect(screen.queryByText('Contrato')).not.toBeInTheDocument();
    expect(texto()).toContain('Para confirmar ou ajustar a proposta, fale com a equipe.');
    expect(texto()).toContain('55.343.824 ERNANE MOURA DA SILVA');
    expect(texto()).toContain("Rua Flor d'Água, 407, Jardim Alvorada, Belo Horizonte - MG, CEP 30810-310");
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith('/proposals/view', expect.objectContaining({ method: 'POST' }));
    Object.values(contractAPI).forEach((fn) => expect(fn).not.toHaveBeenCalled());
    expect(quotePdfAPI.fromProposal).not.toHaveBeenCalled();
    expect(fetchSpy.mock.calls.filter(([url]) => /\/api\//.test(String(url)))).toHaveLength(0);
    fetchSpy.mockRestore();
  });

  it('chave desligada depois de um aceite: o contrato aceito continua com "Baixar" e "Desistir" (CDC, art. 49)', async () => {
    apiFetch.mockResolvedValue(
      proposta({ enabled: false, state: 'ACCEPTED', contractId: 'ct9', acceptedAt: ACEITO.acceptedAt, sha256: SHA, withdrawUntil: ACEITO.withdrawUntil, canWithdraw: true }),
    );
    montar();

    await screen.findByRole('heading', { name: 'Passo 3 de 3: contrato aceito' });
    expect(screen.queryByRole('button', { name: 'Aceitar proposta' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desistir da contratação' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Baixar contrato (PDF)' })).toBeInTheDocument();
    // Nada é chamado sozinho: o contrato só é baixado ou desistido a pedido.
    Object.values(contractAPI).forEach((fn) => expect(fn).not.toHaveBeenCalled());
  });
});

describe('aceite online — fluxo completo', () => {
  it('pessoa física: dados → resumo, contrato completo e código → confirmação com protocolo, PIX e desistência', async () => {
    contractAPI.accept.mockResolvedValue(ACEITO);
    await chegarAoPasso2();

    // Passo 1 → servidor: o código no corpo e o contratante com documento, telefone e CEP só com números.
    expect(contractAPI.prepare).toHaveBeenCalledWith(CODIGO, PARTY_PF);
    expect(contractAPI.pdf).toHaveBeenCalledWith(CODIGO, 'ct1');

    // Resumo em destaque.
    const resumoBox = screen.getByRole('region', { name: 'Resumo da contratação' });
    const r = (resumoBox.textContent ?? '').replace(/\s+/g, ' ');
    expect(r).toContain('Locação de equipamentos de som e iluminação');
    expect(r).toContain('Início 20/12/2027 às 22:00 · término 21/12/2027 às 04:00');
    expect(r).toContain('Rua do Evento, 100, Savassi');
    expect(r).toMatch(/Valor total\s*R\$ 1\.800,00/);
    expect(r).toContain('R$ 900,00, por PIX, até 02/12/2027 se você aceitar hoje (o prazo conta do aceite)');
    expect(r).toContain('R$ 900,00, até 18/12/2027 às 22:00');
    expect(r).toContain('Frete incluído no kit até 15 km');
    expect(r).toContain('Você pode desistir em até 7 dias corridos depois do aceite');
    expect(r).toContain('Foro do seu domicílio');
    expect(within(resumoBox).getByRole('row', { name: /61 dias ou mais antes do evento\s*10%/ })).toBeInTheDocument();
    expect(r).toContain('A retenção fica limitada ao valor que você já pagou');
    // Cliente final: a multa não impede a reparação de outros prejuízos (CDC, art. 6º, VI).
    expect(r).toContain('art. 6º, VI');
    // Cláusulas que limitam direitos, em destaque.
    expect(r).toContain('Quem contrata responde por dano, perda, furto ou extravio');
    expect(r).toContain('menos as despesas com terceiros já feitas e comprovadas');
    expect(r).toContain('não responde por falha da rede elétrica');

    // Contrato completo: o PDF preparado no visualizador, abrir em tela cheia e baixar (o mesmo arquivo).
    expect(screen.getByTitle('Contrato completo (PDF)')).toHaveAttribute('src', BLOB_URL);
    const abrir = screen.getByRole('link', { name: 'Abrir o contrato em tela cheia' });
    expect(abrir).toHaveAttribute('href', BLOB_URL);
    expect(abrir).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: 'Baixar contrato (PDF)' })).toHaveAttribute('download', 'contrato-XP-ANA-1.pdf');
    expect(texto()).toContain('No celular, abra o contrato em tela cheia');
    expect(screen.getByTestId('contrato-sha256')).toHaveTextContent(SHA);
    expect(texto()).toContain('a***@cliente.test');

    // A caixa vem desmarcada e o "Aceito" só habilita com a caixa E os 6 dígitos (nada de aceite por omissão).
    const caixa = screen.getByLabelText('Li o contrato inteiro, inclusive as cláusulas em destaque, e concordo');
    const aceito = screen.getByRole('button', { name: 'Aceito' });
    const codigo = screen.getByLabelText('Código de confirmação');
    expect(caixa).not.toBeChecked();
    expect(aceito).toBeDisabled();
    expect(aceito).toHaveAccessibleDescription('Para aceitar, falta: marcar a caixa de concordância; digitar os 6 dígitos do código.');
    digitar('Código de confirmação', '123456');
    expect(aceito).toBeDisabled();
    fireEvent.click(aceito);
    fireEvent.submit(aceito.closest('form') as HTMLFormElement);
    fireEvent.click(caixa);
    digitar('Código de confirmação', '12345');
    expect(aceito).toBeDisabled();
    fireEvent.submit(aceito.closest('form') as HTMLFormElement);
    expect(contractAPI.accept).not.toHaveBeenCalled();
    fireEvent.click(caixa);
    digitar('Código de confirmação', '123456');
    expect(aceito).toBeDisabled();
    fireEvent.click(caixa);
    expect(aceito).toBeEnabled();
    expect(aceito).not.toHaveAttribute('aria-describedby');

    // A ordem do Tab segue a da tela: caixa → código → "Corrigir dados" → "Aceito".
    const corrigir = screen.getByRole('button', { name: 'Corrigir dados' });
    const antes = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(antes(caixa, codigo) && antes(codigo, corrigir) && antes(corrigir, aceito)).toBe(true);
    // Todo o texto do aceite com 16 px ou mais (nada de text-sm/text-xs no cartão).
    const cartao = screen.getByRole('heading', { name: 'Passo 2 de 3: resumo, contrato e código' }).closest('section') as HTMLElement;
    expect(cartao.querySelectorAll('.text-sm, .text-xs')).toHaveLength(0);

    fireEvent.click(aceito);

    await screen.findByRole('heading', { name: 'Passo 3 de 3: contrato aceito' });
    expect(contractAPI.accept).toHaveBeenCalledTimes(1);
    expect(contractAPI.accept).toHaveBeenCalledWith(CODIGO, { contractId: 'ct1', sha256: SHA, code: '123456' });
    // O endereço local do PDF é solto quando o passo 2 sai da tela.
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith(BLOB_URL));
    expect((screen.getByRole('heading', { name: 'Passo 3 de 3: contrato aceito' }).closest('section') as HTMLElement).querySelectorAll('.text-sm, .text-xs')).toHaveLength(0);
    const page = texto();
    expect(page).toContain('XP-CT-2027-0001');
    expect(page).toContain('30/11/2027 às 10:00 (horário de Brasília)');
    expect(page).toContain(SHA);
    expect(page).toContain('Valor: R$ 900,00, até 02/12/2027.');
    expect(page).toContain(`Chave PIX (CNPJ): ${CNPJ_PIX}`);
    expect(page).toContain('Saldo: R$ 900,00, até 18/12/2027 às 22:00.');
    expect(page).toContain('Enviamos o contrato para o seu e-mail (a***@cliente.test)');
    expect(page).toContain('Você pode desistir da contratação até 07/12 às 10:00');
    expect(screen.getByRole('button', { name: 'Desistir da contratação' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Copiar chave PIX' }));
    expect(await screen.findByText('Chave PIX copiada.')).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith('55343824000156');

    fireEvent.click(screen.getByRole('button', { name: 'Baixar contrato (PDF)' }));
    expect(contractAPI.download).toHaveBeenCalledWith(CODIGO, 'ct1');
  });

  it('pessoa jurídica: razão social, CNPJ, quem aceita (nome, CPF e cargo) e a declaração de poderes; revendedor sem desistência', async () => {
    contractAPI.prepare.mockResolvedValue(preparado({ withdrawalDays: null }));
    apiFetch.mockResolvedValue(proposta({ enabled: true, state: 'NONE' }));
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Aceitar proposta' }));

    fireEvent.click(screen.getByLabelText('Empresa (pessoa jurídica)'));
    digitar('Razão social', 'Produtora Exemplo Ltda');
    digitar('CNPJ', '11.222.333/0001-81');
    digitar('Nome completo de quem aceita', 'Bruno Lima');
    digitar('CPF de quem aceita', '111.444.777-35');
    digitar('Cargo', 'Sócio');
    preencherEndereco();
    fireEvent.click(screen.getByLabelText(/Para revender ou produzir o evento de outra pessoa/));

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('Confirme que você tem poderes para representar a empresa.')).toBeInTheDocument();
    expect(contractAPI.prepare).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText(/Declaro que tenho poderes para representar a empresa/));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    await screen.findByRole('heading', { name: 'Passo 2 de 3: resumo, contrato e código' });
    expect(contractAPI.prepare).toHaveBeenCalledWith(CODIGO, {
      ...PARTY_PF,
      personType: 'PJ',
      name: 'Produtora Exemplo Ltda',
      document: '11222333000181',
      representative: { name: 'Bruno Lima', cpf: '11144477735', role: 'Sócio' },
      purpose: 'RESALE',
    });
    const r = (screen.getByRole('region', { name: 'Resumo da contratação' }).textContent ?? '').replace(/\s+/g, ' ');
    expect(r).toContain('não há prazo de desistência');
    expect(r).not.toContain('art. 6º, VI');
    expect(r).toContain('70%');
  });

  it('validação no site: campos vazios e CPF com dígito errado; o foco vai para o primeiro erro e nada vai ao servidor', async () => {
    apiFetch.mockResolvedValue(proposta({ enabled: true, state: 'PREPARED' }));
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Aceitar proposta' }));
    expect(texto()).toContain('Estes dados são necessários para emitir e cumprir o contrato.');

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('Informe o seu nome completo.')).toBeInTheDocument();
    expect(screen.getByText('Informe um CPF válido.')).toBeInTheDocument();
    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(screen.getByText('Informe o CEP (8 números).')).toBeInTheDocument();
    expect(screen.getByText('Escolha o estado.')).toBeInTheDocument();
    expect(screen.getByText('Responda para quem é a contratação.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome completo')).toHaveFocus();
    expect(screen.getByLabelText('Nome completo')).toHaveAttribute('aria-invalid', 'true');
    // Passo 1 também com 16 px ou mais (rótulos, dicas, erros e campos).
    const passo1 = screen.getByRole('heading', { name: 'Passo 1 de 3: seus dados' }).closest('section') as HTMLElement;
    expect(passo1.querySelectorAll('.text-sm, .text-xs')).toHaveLength(0);

    preencherPF();
    digitar('CPF', '529.982.247-24');
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('Informe um CPF válido.')).toBeInTheDocument();
    expect(screen.getByLabelText('CPF')).toHaveFocus();
    expect(screen.getByLabelText('CPF')).toHaveAccessibleDescription('Informe um CPF válido.');
    expect(contractAPI.prepare).not.toHaveBeenCalled();
  });

  it('erro por campo do servidor (fieldErrors) e "Corrigir dados" volta ao passo 1 com os dados preenchidos', async () => {
    contractAPI.prepare.mockRejectedValueOnce(
      apiError(400, { message: 'Confira os dados.', fieldErrors: { 'party.document': 'CPF não confere com o nome informado.' } }),
    );
    apiFetch.mockResolvedValue(proposta({ enabled: true, state: 'NONE' }));
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Aceitar proposta' }));
    preencherPF();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('CPF não confere com o nome informado.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Confira os campos destacados.');
    expect(screen.getByLabelText('CPF')).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByRole('heading', { name: 'Passo 2 de 3: resumo, contrato e código' });
    fireEvent.click(screen.getByRole('button', { name: 'Corrigir dados' }));

    await screen.findByRole('heading', { name: 'Passo 1 de 3: seus dados' });
    expect(screen.getByLabelText('Nome completo')).toHaveValue('Ana Souza');
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@cliente.test');
  });

  it('empresa: o fieldErrors do representante ("party.representative", "party.representative.cpf") vai para os campos de quem aceita', async () => {
    contractAPI.prepare.mockRejectedValueOnce(
      apiError(400, {
        code: 'VALIDATION_ERROR',
        message: 'Confira os dados destacados.',
        fieldErrors: { 'party.representative': 'Informe nome, CPF e cargo de quem aceita pela empresa.', 'party.representative.cpf': 'CPF de quem aceita inválido.' },
      }),
    );
    apiFetch.mockResolvedValue(proposta({ enabled: true, state: 'NONE' }));
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Aceitar proposta' }));
    fireEvent.click(screen.getByLabelText('Empresa (pessoa jurídica)'));
    digitar('Razão social', 'Produtora Exemplo Ltda');
    digitar('CNPJ', '12.ABC.345/01DE-35');
    digitar('Nome completo de quem aceita', 'Bruno Lima');
    digitar('CPF de quem aceita', '111.444.777-35');
    digitar('Cargo', 'Sócio');
    fireEvent.click(screen.getByLabelText(/Declaro que tenho poderes para representar a empresa/));
    preencherEndereco();
    fireEvent.click(screen.getByLabelText(/Para o meu próprio evento/));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('Informe nome, CPF e cargo de quem aceita pela empresa.')).toBeInTheDocument();
    expect(screen.getByLabelText('CPF de quem aceita')).toHaveAccessibleDescription('CPF de quem aceita inválido.');
    expect(screen.getByLabelText('Nome completo de quem aceita')).toHaveFocus();
    // CNPJ alfanumérico: vai sem pontuação e em maiúsculas.
    expect(contractAPI.prepare).toHaveBeenCalledWith(CODIGO, expect.objectContaining({ personType: 'PJ', document: '12ABC34501DE35' }));
  });

  it('erro do servidor com frase para o cliente (422, proposta sem valor): a frase aparece no passo 1', async () => {
    contractAPI.prepare.mockRejectedValueOnce(
      apiError(422, { code: 'CONTRACT_WITHOUT_TOTAL' }, 'A proposta ainda está sem valor. Fale com a equipe antes de aceitar.'),
    );
    apiFetch.mockResolvedValue(proposta({ enabled: true, state: 'NONE' }));
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Aceitar proposta' }));
    preencherPF();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('A proposta ainda está sem valor. Fale com a equipe antes de aceitar.');
    expect(screen.getByRole('heading', { name: 'Passo 1 de 3: seus dados' })).toBeInTheDocument();
  });
});

describe('aceite online — respostas do código e do contrato', () => {
  it('código errado (tentativas restantes) e código vencido (reenviar na hora; limitador com espera)', async () => {
    await chegarAoPasso2();
    expect(screen.getByRole('button', { name: 'Reenviar código em 60 s' })).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Li o contrato inteiro, inclusive as cláusulas em destaque, e concordo'));

    contractAPI.accept.mockRejectedValueOnce(apiError(400, { code: 'INVALID_CODE', attemptsLeft: 2 }));
    digitar('Código de confirmação', '111111');
    fireEvent.click(screen.getByRole('button', { name: 'Aceito' }));
    expect(await screen.findByText('Código incorreto. Restam 2 tentativas.')).toBeInTheDocument();
    expect(screen.getByLabelText('Código de confirmação')).toHaveValue('');

    contractAPI.accept.mockRejectedValueOnce(apiError(400, { code: 'INVALID_CODE', attemptsLeft: 1 }));
    digitar('Código de confirmação', '222222');
    fireEvent.click(screen.getByRole('button', { name: 'Aceito' }));
    expect(await screen.findByText('Código incorreto. Resta 1 tentativa.')).toBeInTheDocument();

    contractAPI.accept.mockRejectedValueOnce(apiError(410, { code: 'CODE_EXPIRED' }));
    digitar('Código de confirmação', '333333');
    fireEvent.click(screen.getByRole('button', { name: 'Aceito' }));
    expect(await screen.findByText('O código venceu. Peça um novo código e digite-o aqui.')).toBeInTheDocument();

    contractAPI.sendCode.mockResolvedValueOnce({ sentTo: 'a***@cliente.test', expiresAt: '2027-11-30T13:30:00.000Z' });
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar código' }));
    expect(await screen.findByText('Enviamos um novo código para a***@cliente.test.')).toBeInTheDocument();
    expect(contractAPI.sendCode).toHaveBeenCalledWith(CODIGO, 'ct1');
    expect(screen.getByRole('button', { name: 'Reenviar código em 60 s' })).toBeDisabled();
  });

  it('as tentativas acabaram: pede um novo código; o limitador (429) manda esperar o tempo que o servidor disser', async () => {
    await chegarAoPasso2();
    fireEvent.click(screen.getByLabelText('Li o contrato inteiro, inclusive as cláusulas em destaque, e concordo'));
    contractAPI.accept.mockRejectedValueOnce(apiError(400, { code: 'INVALID_CODE', attemptsLeft: 0 }));
    digitar('Código de confirmação', '111111');
    fireEvent.click(screen.getByRole('button', { name: 'Aceito' }));
    expect(await screen.findByText(/as tentativas deste código acabaram\. Peça um novo código\./)).toBeInTheDocument();

    contractAPI.sendCode.mockRejectedValueOnce(apiError(429, { message: 'Muitos códigos.', retryAfter: 120 }));
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar código' }));
    expect(await screen.findByRole('button', { name: 'Reenviar código em 120 s' })).toBeDisabled();
    expect(screen.getByText('Você pediu muitos códigos seguidos. Aguarde a contagem para pedir outro.')).toBeInTheDocument();
  });

  it('a reserva mudou (CONTRACT_CHANGED): prepara de novo com os mesmos dados e volta ao passo 2 com o contrato novo', async () => {
    await chegarAoPasso2();
    fireEvent.click(screen.getByLabelText('Li o contrato inteiro, inclusive as cláusulas em destaque, e concordo'));
    digitar('Código de confirmação', '123456');
    contractAPI.accept.mockRejectedValueOnce(apiError(409, { code: 'CONTRACT_CHANGED' }));
    let liberar: (value: unknown) => void = () => undefined;
    contractAPI.prepare.mockReturnValueOnce(new Promise((resolve) => (liberar = resolve)));

    fireEvent.click(screen.getByRole('button', { name: 'Aceito' }));

    // Enquanto o contrato novo é preparado, o anterior não pode ser aceito.
    expect(await screen.findByText('A proposta mudou. Preparando o contrato de novo...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aceito' })).toBeDisabled();
    liberar(preparado({ contractId: 'ct2', sha256: SHA2 }));

    expect(await screen.findByText(/A proposta mudou depois que você abriu o contrato\./)).toBeInTheDocument();
    // O endereço local do PDF anterior é solto.
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith(BLOB_URL));
    await waitFor(() => expect(screen.getByTestId('contrato-sha256')).toHaveTextContent(SHA2));
    expect(contractAPI.prepare).toHaveBeenCalledTimes(2);
    expect(contractAPI.prepare).toHaveBeenLastCalledWith(CODIGO, PARTY_PF);
    expect(contractAPI.pdf).toHaveBeenLastCalledWith(CODIGO, 'ct2');
    expect(screen.getByRole('heading', { name: 'Passo 2 de 3: resumo, contrato e código' })).toBeInTheDocument();
    // O aceite do contrato novo começa do zero: caixa desmarcada e código vazio.
    expect(screen.getByLabelText('Li o contrato inteiro, inclusive as cláusulas em destaque, e concordo')).not.toBeChecked();
    expect(screen.getByLabelText('Código de confirmação')).toHaveValue('');
  });

  it('proposta já aceita (ALREADY_ACCEPTED): abre a proposta de novo e mostra a confirmação (passo 3)', async () => {
    await chegarAoPasso2();
    fireEvent.click(screen.getByLabelText('Li o contrato inteiro, inclusive as cláusulas em destaque, e concordo'));
    digitar('Código de confirmação', '123456');
    contractAPI.accept.mockRejectedValueOnce(apiError(409, { code: 'ALREADY_ACCEPTED' }));
    apiFetch.mockResolvedValue(
      proposta({ enabled: true, state: 'ACCEPTED', contractId: 'ct1', acceptedAt: ACEITO.acceptedAt, sha256: SHA, withdrawUntil: ACEITO.withdrawUntil, canWithdraw: true }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Aceito' }));

    await screen.findByRole('heading', { name: 'Passo 3 de 3: contrato aceito' });
    expect(apiFetch).toHaveBeenCalledTimes(2);
    expect(texto()).toContain(SHA);
  });

  it('já aceita no passo 1 (ALREADY_ACCEPTED no preparo): também vai direto à confirmação', async () => {
    contractAPI.prepare.mockRejectedValueOnce(apiError(409, { code: 'ALREADY_ACCEPTED' }));
    apiFetch.mockResolvedValueOnce(proposta({ enabled: true, state: 'NONE' }));
    apiFetch.mockResolvedValueOnce(
      proposta({ enabled: true, state: 'ACCEPTED', contractId: 'ct1', acceptedAt: ACEITO.acceptedAt, sha256: SHA, withdrawUntil: null, canWithdraw: false }),
    );
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Aceitar proposta' }));
    preencherPF();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    await screen.findByRole('heading', { name: 'Passo 3 de 3: contrato aceito' });
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });

  it('o contrato não abriu: o "Aceito" fica desabilitado até o PDF carregar ("Tentar de novo")', async () => {
    contractAPI.pdf.mockRejectedValueOnce(Object.assign(new Error('Erro'), { status: 500 }));
    apiFetch.mockResolvedValue(proposta({ enabled: true, state: 'NONE' }));
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Aceitar proposta' }));
    preencherPF();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('Não conseguimos abrir o contrato agora. Tente de novo em alguns instantes.')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Li o contrato inteiro, inclusive as cláusulas em destaque, e concordo'));
    digitar('Código de confirmação', '123456');
    const aceito = screen.getByRole('button', { name: 'Aceito' });
    expect(aceito).toBeDisabled();
    expect(aceito).toHaveAccessibleDescription('Para aceitar, falta: o contrato completo aberto nesta página.');

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await screen.findByTitle('Contrato completo (PDF)');
    expect(contractAPI.pdf).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Aceito' })).toBeEnabled();
  });
});

describe('aceite online — reabrir o link', () => {
  it('contrato aceito: mostra o passo 3 (data, impressão digital, PIX, "Baixar contrato (PDF)" pelo contractId) sem "Aceitar proposta"', async () => {
    apiFetch.mockResolvedValue(
      proposta({ enabled: true, state: 'ACCEPTED', contractId: 'ct1', acceptedAt: ACEITO.acceptedAt, sha256: SHA, withdrawUntil: ACEITO.withdrawUntil, canWithdraw: true }),
    );
    montar();

    await screen.findByRole('heading', { name: 'Passo 3 de 3: contrato aceito' });
    const page = texto();
    expect(page).toContain('30/11/2027 às 10:00');
    expect(page).toContain(SHA);
    expect(page).toContain(`Chave PIX (CNPJ): ${CNPJ_PIX}`);
    expect(page).toContain('Os valores e os vencimentos estão no e-mail do contrato.');
    expect(screen.queryByRole('button', { name: 'Aceitar proposta' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desistir da contratação' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Baixar contrato (PDF)' }));
    expect(contractAPI.download).toHaveBeenCalledWith(CODIGO, 'ct1');
    // Sem a resposta do aceite, a chave é o CNPJ do site; copia só os dígitos.
    fireEvent.click(screen.getByRole('button', { name: 'Copiar chave PIX' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('55343824000156'));
  });

  it('contrato aceito com os dados de pagamento no view: protocolo, parcela inicial, saldo e PIX ao reabrir o link', async () => {
    apiFetch.mockResolvedValue(
      proposta({
        enabled: false,
        state: 'ACCEPTED',
        contractId: 'ct1',
        acceptedAt: ACEITO.acceptedAt,
        sha256: SHA,
        withdrawUntil: ACEITO.withdrawUntil,
        canWithdraw: true,
        protocol: ACEITO.protocol,
        initialPayment: ACEITO.initialPayment,
        balance: ACEITO.balance,
        pix: ACEITO.pix,
      }),
    );
    montar();

    await screen.findByRole('heading', { name: 'Passo 3 de 3: contrato aceito' });
    const page = texto();
    expect(page).toContain('XP-CT-2027-0001');
    expect(page).toContain('Valor: R$ 900,00, até 02/12/2027.');
    expect(page).toContain('Saldo: R$ 900,00, até 18/12/2027 às 22:00.');
    expect(page).toContain(`Chave PIX (CNPJ): ${CNPJ_PIX}`);
    expect(page).not.toContain('Os valores e os vencimentos estão no e-mail do contrato.');
  });

  it('reserva já confirmada ({ state: "closed" }) com contrato aceito: a confirmação continua no link (baixar e desistir)', async () => {
    apiFetch.mockResolvedValue({
      state: 'closed',
      contract: { enabled: true, state: 'ACCEPTED', contractId: 'ct1', acceptedAt: ACEITO.acceptedAt, sha256: SHA, withdrawUntil: ACEITO.withdrawUntil, canWithdraw: true },
    });
    contractAPI.withdraw.mockResolvedValue({ withdrawnAt: '2027-12-01T15:00:00.000Z' });
    montar();

    await screen.findByRole('heading', { name: 'Passo 3 de 3: contrato aceito' });
    expect(texto()).not.toContain('Esta proposta já foi confirmada.');
    expect(screen.getByRole('button', { name: 'Baixar contrato (PDF)' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Desistir da contratação' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Desistir' }));
    expect(await screen.findByRole('heading', { name: 'Contratação desistida em 01/12' })).toBeInTheDocument();
    expect(contractAPI.withdraw).toHaveBeenCalledWith(CODIGO);
  });

  it('reserva confirmada sem contrato pelo site: o aviso de sempre', async () => {
    apiFetch.mockResolvedValue({ state: 'closed', contract: { enabled: true, state: 'NONE' } });
    montar();

    expect(await screen.findByText('Esta proposta já foi confirmada.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aceitar proposta' })).not.toBeInTheDocument();
  });

  it('contrato aceito fora do prazo de desistência (canWithdraw false): sem o botão', async () => {
    apiFetch.mockResolvedValue(
      proposta({ enabled: true, state: 'ACCEPTED', acceptedAt: ACEITO.acceptedAt, sha256: SHA, withdrawUntil: ACEITO.withdrawUntil, canWithdraw: false, contractId: 'ct9' }),
    );
    montar();

    await screen.findByRole('heading', { name: 'Passo 3 de 3: contrato aceito' });
    expect(screen.queryByRole('button', { name: 'Desistir da contratação' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Baixar contrato (PDF)' }));
    expect(contractAPI.download).toHaveBeenCalledWith(CODIGO, 'ct9');
  });

  it('contratação desistida (200 com a proposta): "Contratação desistida em DD/MM", sem validade nem orçamento em PDF', async () => {
    apiFetch.mockResolvedValue(
      proposta({ enabled: true, state: 'WITHDRAWN', contractId: 'ct1', withdrawnAt: '2027-12-01T15:00:00.000Z', sha256: SHA, canWithdraw: false }),
    );
    montar();

    expect(await screen.findByRole('heading', { name: 'Contratação desistida em 01/12' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aceitar proposta' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desistir da contratação' })).not.toBeInTheDocument();
    // O orçamento em PDF responde 409 na proposta desistida: o botão não aparece.
    expect(screen.queryByRole('button', { name: 'Baixar orçamento (PDF)' })).not.toBeInTheDocument();
    expect(texto()).not.toContain('Válida até');
    expect(texto()).toContain('Para contratar de novo, fale com a equipe.');
  });

  it('o servidor diz que a contratação foi desistida (CONTRACT_WITHDRAWN no aceite): abre a proposta de novo, no estado desistido', async () => {
    await chegarAoPasso2();
    fireEvent.click(screen.getByLabelText('Li o contrato inteiro, inclusive as cláusulas em destaque, e concordo'));
    digitar('Código de confirmação', '123456');
    contractAPI.accept.mockRejectedValueOnce(apiError(409, { code: 'CONTRACT_WITHDRAWN' }, 'Esta contratação foi desistida e a reserva foi cancelada.'));
    apiFetch.mockResolvedValue(proposta({ enabled: true, state: 'WITHDRAWN', contractId: 'ct1', withdrawnAt: '2027-12-01T15:00:00.000Z' }));

    fireEvent.click(screen.getByRole('button', { name: 'Aceito' }));

    expect(await screen.findByRole('heading', { name: 'Contratação desistida em 01/12' })).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });
});

describe('CSP do site (vercel.json, Report-Only) — visualizador do contrato', () => {
  const diretivas = () => {
    const geral = vercelConfig.headers.find((rule) => rule.source === '/(.*)');
    const csp = geral?.headers.find((h) => h.key === 'Content-Security-Policy-Report-Only')?.value ?? '';
    return Object.fromEntries(
      csp
        .split(';')
        .map((d) => d.trim().split(/\s+/))
        .filter((d) => d[0])
        .map(([nome, ...fontes]) => [nome, fontes]),
    ) as Record<string, string[]>;
  };

  it('blob: no frame-src (o quadro do PDF) e no object-src (o leitor de PDF do navegador), e em nenhum outro lugar', () => {
    const d = diretivas();
    expect(d['frame-src']).toContain('blob:');
    expect(d['object-src']).toEqual(['blob:']);
    Object.entries(d)
      .filter(([nome]) => !['frame-src', 'object-src', 'img-src'].includes(nome))
      .forEach(([, fontes]) => expect(fontes).not.toContain('blob:'));
    expect(d['default-src']).toEqual(["'self'"]);
    expect(d['frame-ancestors']).toEqual(["'none'"]);
  });
});

describe('aceite online — desistência pela página da proposta', () => {
  const aceita = () =>
    proposta({ enabled: true, state: 'ACCEPTED', acceptedAt: ACEITO.acceptedAt, sha256: SHA, withdrawUntil: ACEITO.withdrawUntil, canWithdraw: true });

  it('"Desistir da contratação" confirma no modal do design system (nunca window.confirm) e mostra a desistência', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    contractAPI.withdraw.mockResolvedValue({ withdrawnAt: '2027-12-01T15:00:00.000Z' });
    apiFetch.mockResolvedValue(aceita());
    montar();

    fireEvent.click(await screen.findByRole('button', { name: 'Desistir da contratação' }));
    const dialog = await screen.findByRole('dialog', { name: 'Desistir da contratação?' });
    expect(contractAPI.withdraw).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Desistir' }));

    expect(await screen.findByRole('heading', { name: 'Contratação desistida em 01/12' })).toBeInTheDocument();
    expect(contractAPI.withdraw).toHaveBeenCalledWith(CODIGO);
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('desistência recusada (WITHDRAWAL_CLOSED): a frase do servidor diz por quê (reason) e o botão sai', async () => {
    contractAPI.withdraw.mockRejectedValue(
      apiError(409, { code: 'WITHDRAWAL_CLOSED', reason: 'EVENT' }, 'O evento já começou ou a reserva foi encerrada. Fale com a equipe.'),
    );
    apiFetch.mockResolvedValue(aceita());
    montar();

    fireEvent.click(await screen.findByRole('button', { name: 'Desistir da contratação' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Desistir' }));

    expect(await screen.findByText('O evento já começou ou a reserva foi encerrada. Fale com a equipe.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desistir da contratação' })).not.toBeInTheDocument();
  });

  it('desistência recusada sem frase do servidor: o motivo padrão (prazo)', async () => {
    contractAPI.withdraw.mockRejectedValue(apiError(409, { code: 'WITHDRAWAL_CLOSED' }, 'HTTP 409: Conflict'));
    apiFetch.mockResolvedValue(aceita());
    montar();

    fireEvent.click(await screen.findByRole('button', { name: 'Desistir da contratação' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Desistir' }));

    expect(await screen.findByText(/O prazo de desistência terminou\./)).toBeInTheDocument();
  });
});
