import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const { post, useAuth } = vi.hoisted(() => ({ post: vi.fn(), useAuth: vi.fn() }));
vi.mock('../../../services/api', () => ({ api: { post } }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../components/SEO', () => ({ SEO: () => null }));

import { BriefingPage } from '../BriefingPage';
import { NEED_BAND, NEED_DJ, briefingFromText, briefingTextState } from '../../../utils/briefing';

// "Conte seu evento" (20/11/2026): a página inicial lê o texto livre com a IA e abre o briefing com as respostas no
// estado da navegação. Elas entram no primeiro passo, para conferir; o texto vai para "Quer contar mais alguma coisa?",
// também quando a leitura falhou; depois o estado é limpo. O que não é opção da página não marca nada.

const Estado = () => <pre data-testid="estado">{JSON.stringify(useLocation().state ?? null)}</pre>;

const renderWith = (state: unknown) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/briefing', state }]}>
      <Routes>
        <Route path="/briefing" element={<><BriefingPage /><Estado /></>} />
      </Routes>
    </MemoryRouter>,
  );

const pressed = (name: string) => screen.getByRole('button', { name }).getAttribute('aria-pressed');
const value = (label: string) => (screen.getByLabelText(label) as HTMLInputElement).value;
const continuar = () => fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

const TEXTO = 'Casamento dia 14/03/2030 em Contagem, 150 pessoas, das 18h à meia-noite, com banda de 5 pessoas e DJ, tomada 220';

describe('BriefingPage — respostas do "Conte seu evento"', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuth.mockReturnValue({ user: null, setAuthenticatedUser: vi.fn() });
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('só com a cidade: marca tudo no passo certo, com "Ainda não sei" o local e a cidade escrita; o texto vai para os detalhes', async () => {
    renderWith(
      briefingTextState(TEXTO, {
        eventType: 'Casamento',
        eventDate: '2030-03-14',
        startTime: '18:00',
        endTime: '00:00',
        guests: '100 a 200',
        city: 'Contagem',
        state: 'MG',
        environment: 'Fechado',
        needs: ['Som', NEED_DJ, NEED_BAND],
        bandSize: '5',
        djOption: 'Preciso de um DJ',
        voltage: '220V',
      }),
    );

    await waitFor(() => expect(pressed('Casamento')).toBe('true'));
    expect(screen.getByRole('status')).toHaveTextContent('Marcamos 12 respostas com o que você contou. Confira cada passo e complete o que faltou.');
    expect(screen.getByText('Passo 1 de 5')).toBeInTheDocument();
    expect(value('Qual é a data?')).toBe('2030-03-14');
    expect(value('Começa às')).toBe('18:00');
    expect(value('Termina às')).toBe('00:00');
    expect(pressed('100 a 200')).toBe('true');
    // O estado da navegação é limpo: recarregar não troca de novo o que a pessoa mudar.
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('null'));

    continuar();
    // O primeiro "Ainda não sei" é o do local; o segundo, o do espaço.
    const [localAindaNaoSei, espacoAindaNaoSei] = screen.getAllByRole('button', { name: 'Ainda não sei' });
    expect(localAindaNaoSei).toHaveAttribute('aria-pressed', 'true');
    expect(espacoAindaNaoSei).toHaveAttribute('aria-pressed', 'false');
    expect(value('Cidade')).toBe('Contagem');
    expect(value('UF')).toBe('MG');
    expect(pressed('Fechado')).toBe('true');

    continuar();
    expect(pressed('Som')).toBe('true');
    expect(pressed(NEED_DJ)).toBe('true');
    expect(pressed(NEED_BAND)).toBe('true');
    expect(value('Quantas pessoas na banda? (opcional)')).toBe('5');
    expect(value('Quer contar mais alguma coisa? (opcional)')).toBe(TEXTO);

    continuar();
    expect(pressed('220V')).toBe('true');
    expect(pressed('Preciso de um DJ')).toBe('true');
  });

  it('com o nome do local: "Já sei o local", o nome e o endereço aberto com a cidade', async () => {
    renderWith(briefingTextState(TEXTO, { eventType: 'Formatura', eventDate: '2030-03-14', guests: '200 a 500', venue: 'Espaço Kalahari', city: 'Belo Horizonte' }));

    await waitFor(() => expect(pressed('Formatura')).toBe('true'));
    continuar();
    expect(pressed('Já sei o local')).toBe('true');
    expect(value('Nome do local (opcional)')).toBe('Espaço Kalahari');
    expect(value('Cidade')).toBe('Belo Horizonte');
    expect(screen.getByLabelText('Rua')).toBeInTheDocument();
  });

  it('leitura falhou (sem respostas): o texto vai para os detalhes e o aviso diz para responder as perguntas', async () => {
    renderWith(briefingTextState(TEXTO, {}));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Não deu para marcar as respostas pelo seu texto agora.'));
    expect(pressed('Casamento')).toBe('false');
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('null'));

    fireEvent.click(screen.getByRole('button', { name: 'Outro' }));
    fireEvent.change(screen.getByLabelText('Qual é a data?'), { target: { value: '2030-03-20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Até 50' }));
    continuar();
    fireEvent.click(screen.getByRole('button', { name: 'Ainda não sei' }));
    fireEvent.change(screen.getByLabelText('Cidade'), { target: { value: 'Betim' } });
    continuar();
    expect(value('Quer contar mais alguma coisa? (opcional)')).toBe(TEXTO);
  });

  it('o que não é opção da página não marca nada (e não conta como resposta)', async () => {
    renderWith(
      briefingTextState(TEXTO, { eventType: 'Rave', guests: '9999', eventDate: '14/03/2030', startTime: '25:00', state: 'Minas', needs: ['Laser', 'Projetor 4K'], price: 'R$ 2.000' }),
    );

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Não deu para marcar as respostas'));
    for (const opcao of ['Casamento', 'Outro', 'Até 50', 'Mais de 500 (sob consulta)']) expect(pressed(opcao)).toBe('false');
    expect(value('Qual é a data?')).toBe('');
    expect(value('Começa às')).toBe('19:00');
  });

  it('com rascunho guardado: as respostas do texto entram por cima, as necessidades se somam e o texto vai depois do que já estava escrito', async () => {
    localStorage.setItem(
      'briefing-draft',
      JSON.stringify({ values: { step: 2, answers: { eventType: 'Corporativo', eventDate: '2030-05-01', needs: ['Microfones'], moreInfo: 'Palestra de manhã.' } }, savedAt: Date.now() }),
    );
    renderWith(briefingTextState(TEXTO, { eventType: 'Casamento', guests: 'Até 50', needs: ['Som'] }));

    await waitFor(() => expect(pressed('Casamento')).toBe('true'));
    expect(screen.getByText('Passo 1 de 5')).toBeInTheDocument();
    expect(value('Qual é a data?')).toBe('2030-05-01');
    continuar();
    fireEvent.click(screen.getByRole('button', { name: 'Ainda não sei' }));
    fireEvent.change(screen.getByLabelText('Cidade'), { target: { value: 'Betim' } });
    continuar();
    expect(pressed('Microfones')).toBe('true');
    expect(pressed('Som')).toBe('true');
    expect(value('Quer contar mais alguma coisa? (opcional)')).toBe(`Palestra de manhã.\n\n${TEXTO}`);
  });

  it('sem o estado do "Conte seu evento": nenhum aviso e nada marcado', () => {
    renderWith(null);

    expect(screen.queryByText(/Marcamos/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Não deu para marcar/)).not.toBeInTheDocument();
    expect(pressed('Casamento')).toBe('false');
  });
});

describe('briefingFromText', () => {
  it('estado sem o texto, de outro formato ou vazio: nada', () => {
    for (const state of [null, undefined, 'texto', {}, { contado: null }, { contado: { prefill: {} } }, { contado: { text: '   ' } }]) {
      expect(briefingFromText(state)).toBeNull();
    }
  });

  it('confere cada campo; necessidades sem repetição; local e horário ajustam as perguntas que dependem deles', () => {
    expect(
      briefingFromText(
        briefingTextState('  festa de 15 anos  ', {
          eventType: 'Aniversário ou 15 anos',
          startTime: '20:00',
          venue: '  Salão Azul ',
          city: 'x'.repeat(61),
          state: 'mg',
          needs: ['Som', 'Som', 'Iluminação', 3],
          bandSize: '123',
          voltage: '380V',
          djOption: 'Não sei',
        }),
      ),
    ).toEqual({
      text: 'festa de 15 anos',
      filled: 4,
      answers: {
        eventType: 'Aniversário ou 15 anos',
        startTime: '20:00',
        venue: 'Salão Azul',
        needs: ['Som', 'Iluminação'],
        venueKnown: 'yes',
        timeUnknown: false,
      },
    });
  });

  it('texto mais longo que 800 caracteres é cortado', () => {
    expect(briefingFromText(briefingTextState('a'.repeat(900), {}))?.text).toHaveLength(800);
  });
});
