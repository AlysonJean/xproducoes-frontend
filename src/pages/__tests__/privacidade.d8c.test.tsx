import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { axe, toHaveNoViolations } from 'jest-axe';
import { PrivacyPage } from '../PrivacyPage';
import { PRIVACY_POLICY_SECTIONS, PRIVACY_POLICY_UPDATED_AT } from '../../data/privacyPolicy';
import { SUPPORT_EMAIL } from '../../data/site';

// D8c (aprovada em 02/11/2026), parte 4: a Política de Privacidade nova, escrita a partir do que o sistema faz. A
// página antiga citava um provedor de pagamento e a finalidade "personalizar a experiência", que não existem, e não
// tinha CNPJ, base legal, prazos, serviços usados, transferência para fora do Brasil, fotos do mural nem as regras da
// exclusão da conta. Aqui: todas as seções do arquivo de dados aparecem na ordem pedida, com os fatos conferidos.
// Textos legais (13/11/2026): versão nova, com a seção "Dados de orçamentos e contratos" (testada em
// privacidade.contratos.test.tsx), o nome empresarial confirmado (Q7) e o armazenamento temporário no Render (D19).

expect.extend(toHaveNoViolations);

const norm = (text: string) => text.replace(/\s+/g, ' ').trim();

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/privacidade']}>
        <PrivacyPage />
      </MemoryRouter>
    </HelmetProvider>
  );
}

const pageText = () => norm(document.body.textContent ?? '');

afterEach(() => cleanup());

describe('D8c — Política de Privacidade (src/data/privacyPolicy.ts)', () => {
  it('tem as 12 seções pedidas, nesta ordem, e a página mostra cada título numerado', () => {
    expect(PRIVACY_POLICY_SECTIONS.map((section) => section.id)).toEqual([
      'quem-cuida',
      'canal',
      'dados',
      'orcamentos-e-contratos',
      'servicos',
      'cookies',
      'direitos',
      'mural',
      'prazos',
      'exclusao',
      'codigo-da-reserva',
      'versao',
    ]);
    renderPage();
    const titles = screen.getAllByRole('heading', { level: 2 }).map((heading) => norm(heading.textContent ?? ''));
    expect(titles).toEqual(PRIVACY_POLICY_SECTIONS.map((section, index) => `${index + 1}. ${section.title}`));
  });

  it('mostra todo o texto do arquivo de dados (parágrafos, listas e células das tabelas)', () => {
    renderPage();
    const text = pageText();
    for (const section of PRIVACY_POLICY_SECTIONS) {
      for (const block of section.blocks) {
        const pieces =
          block.kind === 'paragraph'
            ? [block.text, ...(block.link ? [block.link.label] : [])]
            : block.kind === 'list'
              ? [...block.items]
              : [...block.columns, ...block.rows.flat()];
        for (const piece of pieces) expect(text).toContain(norm(piece));
      }
    }
  });

  it('quem cuida dos dados: nome comercial com o nome empresarial confirmado em 13/11 (Q7), CNPJ, endereço com CEP e e-mail', () => {
    renderPage();
    const section = within(document.getElementById('quem-cuida') as HTMLElement);
    expect(section.getByText('Nome: X Produções e Eventos (nome empresarial 55.343.824 ERNANE MOURA DA SILVA)')).toBeInTheDocument();
    expect(section.getByText('CNPJ: 55.343.824/0001-56')).toBeInTheDocument();
    expect(section.getByText("Endereço: Rua Flor d'Água, 407, Jardim Alvorada, Belo Horizonte - MG, CEP 30810-310")).toBeInTheDocument();
    expect(section.getByText(`E-mail: ${SUPPORT_EMAIL}`)).toBeInTheDocument();
    // A forma abreviada de antes (a conferir) não aparece mais.
    expect(pageText()).not.toContain('ERNANE M. S.');
  });

  it('canal do titular: e-mail de atendimento com link, quem responde e a dispensa de encarregado da Resolução CD/ANPD nº 2/2022', () => {
    renderPage();
    const section = within(document.getElementById('canal') as HTMLElement);
    expect(section.getByRole('link', { name: SUPPORT_EMAIL })).toHaveAttribute('href', `mailto:${SUPPORT_EMAIL}`);
    const text = norm(document.getElementById('canal')?.textContent ?? '');
    expect(text).toContain('Quem lê e responde é a própria X Produções e Eventos');
    expect(text).toContain('Resolução CD/ANPD nº 2/2022');
    expect(text).toContain('não precisa indicar um encarregado de dados, mas mantém este canal');
  });

  it('a tabela de dados tem as 4 colunas e uma linha para cada tipo de dado pedido', () => {
    renderPage();
    const table = screen.getByRole('table', { name: 'Dados tratados, finalidade, base legal e prazo' });
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Dado',
      'Para quê',
      'Base legal (LGPD, art. 7º)',
      'Por quanto tempo',
    ]);
    const rowHeaders = within(table).getAllByRole('rowheader').map((th) => norm(th.textContent ?? ''));
    for (const start of [
      'Conta e perfil',
      'Pedidos de orçamento e reservas',
      'Comprovantes de pagamento',
      'Formulário de contato',
      'Chat da reserva',
      'Avaliações',
      'Fotos do mural',
      'Dados de colaboradores',
      'Registros de acesso e segurança',
      'Cookies e medição de visitas',
    ]) {
      expect(rowHeaders.some((header) => header.startsWith(start))).toBe(true);
    }
    // Revisão: o colaborador grava chave PIX e dados bancários (PUT /collaborators/me/settings); a linha tem de dizer.
    expect(rowHeaders.find((header) => header.startsWith('Dados de colaboradores'))).toContain('chave PIX e dados bancários');
    // Revisão: o gtag renova a validade dos cookies do GA a cada visita; "até 2 anos" prometia um teto que não existe.
    const cookiesRow = within(table).getByRole('rowheader', { name: /^Cookies e medição de visitas/ }).closest('tr') as HTMLElement;
    expect(norm(cookiesRow.textContent ?? '')).toContain('Cookies do Google Analytics: até 2 anos depois da última visita');
  });

  it('comprovante: arquivo privado, aberto só pelo cliente e pela administração, por um link de 5 minutos (D21)', () => {
    renderPage();
    const table = screen.getByRole('table', { name: 'Dados tratados, finalidade, base legal e prazo' });
    const row = within(table).getByRole('rowheader', { name: /^Comprovantes de pagamento/ }).closest('tr') as HTMLElement;
    expect(norm(row.textContent ?? '')).toContain(
      'O arquivo é privado: só você e a administração da X Produções e Eventos abrem, por um link que vale 5 minutos.'
    );
  });

  it('serviços usados, cada um com o país, e a base da transferência (art. 33, IX e VIII)', () => {
    renderPage();
    const table = screen.getByRole('table', { name: 'Serviços usados pelo site e onde ficam' });
    const countryOf = (service: string) => {
      const row = within(table).getByRole('rowheader', { name: service }).closest('tr') as HTMLElement;
      const cells = within(row).getAllByRole('cell');
      return norm(cells[cells.length - 1].textContent ?? '');
    };
    expect(countryOf('Vercel')).toBe('Estados Unidos e outros países (as páginas são montadas em São Paulo)');
    expect(countryOf('Render')).toBe('Estados Unidos (Oregon)');
    expect(countryOf('Neon')).toBe('Estados Unidos (Virgínia)');
    // D19 (12/11/2026): o armazenamento temporário saiu do Redis Cloud (São Paulo) e foi para o Render (Oregon).
    expect(within(table).queryByRole('rowheader', { name: 'Redis Cloud' })).toBeNull();
    expect(norm(within(table).getByRole('rowheader', { name: 'Render' }).closest('tr')?.textContent ?? '')).toContain(
      'Também guarda o armazenamento temporário do servidor: fila de e-mails, contagem de tentativas, sessões encerradas e respostas guardadas por pouco tempo.'
    );
    // Revisão: a região da conta do Cloudinary não aparece no código e as imagens saem por servidores no mundo todo.
    expect(countryOf('Cloudinary')).toBe('Estados Unidos e outros países');
    expect(countryOf('Sentry')).toBe('Estados Unidos');
    expect(countryOf('Google')).toBe('Estados Unidos e outros países');
    expect(countryOf('GitHub')).toBe('Estados Unidos');
    expect(countryOf('Resend')).toContain('Estados Unidos');
    expect(countryOf('Cloudflare')).toBe('Estados Unidos e outros países');
    expect(countryOf('ViaCEP')).toBe('Brasil');
    expect(countryOf('Meta (WhatsApp)')).toBe('Estados Unidos');

    const google = norm(within(table).getByRole('rowheader', { name: 'Google' }).closest('tr')?.textContent ?? '');
    expect(google).toContain('Google Analytics, só com o seu aceite.');
    expect(google).toContain('Login com Google.');
    expect(google).toContain('Google Fonts');
    expect(google).toContain('Routes API, que calcula o frete e recebe o endereço do evento.');
    expect(google).toContain('Google Agenda da administração, quando conectada');
    // Revisão: a caixa que recebe o suporte@ não aparece no código; a política não afirma qual é (ownerDecisionNeeded).
    expect(google).not.toContain('Gmail');
    expect(norm(within(table).getByRole('rowheader', { name: 'Cloudflare' }).closest('tr')?.textContent ?? '')).toContain(
      'recebe os e-mails enviados para o domínio da empresa e os repassa para a caixa de e-mail da equipe'
    );
    // Revisão: a equipe manda proposta, confirmação, lembrete e pedido de avaliação pelo WhatsApp a partir do painel.
    expect(norm(within(table).getByRole('rowheader', { name: 'Meta (WhatsApp)' }).closest('tr')?.textContent ?? '')).toContain(
      'quando a equipe manda mensagens sobre o seu pedido ou a sua reserva pelo WhatsApp (vão o seu número e o texto da mensagem)'
    );
    expect(norm(within(table).getByRole('rowheader', { name: 'GitHub' }).closest('tr')?.textContent ?? '')).toContain(
      'cifrada, por 90 dias'
    );
    expect(norm(within(table).getByRole('rowheader', { name: 'Sentry' }).closest('tr')?.textContent ?? '')).toContain(
      'sem o seu endereço IP'
    );

    const text = pageText();
    // Revisão: o art. 33, IX só cobre o que se apoia nos incisos II, V e VI do art. 7º (obrigação legal, contrato e
    // passos antes dele, defesa de direitos). A frase não pode pôr nele os dados de legítimo interesse ou de consentimento.
    expect(text).toContain(
      'Quando os dados vão para eles porque são necessários para o orçamento que você pediu, para o contrato com você, para cumprir uma obrigação legal ou para defender direitos num processo, a transferência se apoia na lei (LGPD, art. 33, IX).'
    );
    expect(text).not.toContain('A transferência é feita porque é necessária');
    // Revisão: imagens que vêm direto de outros serviços (data/guides.ts, utils/imageUtils.ts) recebem o IP do visitante.
    expect(text).toContain(
      'as fotos de capa dos guias (Unsplash) e as imagens provisórias de itens ainda sem foto (placehold.co)'
    );
    expect(text).toContain(
      'O Google pode tratar os dados do Google Analytics fora do Brasil, inclusive nos Estados Unidos. Por isso o Google Analytics só funciona com o seu consentimento específico e em destaque, dado no aviso de cookies (LGPD, art. 33, VIII).'
    );
    // Revisão: a frase do art. 33, VIII aparece em destaque também na política (antes nenhum teste olhava o estilo).
    const highlighted = screen.getByText(/Por isso o Google Analytics só funciona com o seu consentimento específico/);
    expect(highlighted.tagName).toBe('P');
    expect(highlighted.className).toContain('font-semibold');
  });

  it('não cita provedor de pagamento nem a finalidade "personalizar a experiência", que não existem', () => {
    renderPage();
    const text = pageText().toLowerCase();
    expect(text).not.toContain('personalizar');
    expect(text).not.toContain('provedores de hospedagem, e-mail, pagamento');
    for (const provider of ['mercado pago', 'pagseguro', 'stripe', 'paypal', 'gateway', 'provedor de pagamento']) {
      expect(text).not.toContain(provider);
    }
  });

  it('cookies e direitos: links para /cookies e /lgpd, os direitos do art. 18 e a resposta em até 15 dias (art. 19)', () => {
    renderPage();
    expect(within(document.getElementById('cookies') as HTMLElement).getByRole('link', { name: 'Política de Cookies' })).toHaveAttribute(
      'href',
      '/cookies'
    );
    const rights = document.getElementById('direitos') as HTMLElement;
    expect(within(rights).getByRole('link', { name: 'LGPD' })).toHaveAttribute('href', '/lgpd');
    const text = norm(rights.textContent ?? '');
    expect(text).toContain('Pela LGPD (art. 18), você pode pedir:');
    expect(text).toContain('você baixa uma cópia dos seus dados e exclui a conta na página LGPD');
    expect(text).toContain('Portabilidade dos dados');
    expect(text).toContain('Revogação do consentimento.');
    expect(text).toContain('Respondemos em até 15 dias (LGPD, art. 19).');
    expect(text).toContain('Autoridade Nacional de Proteção de Dados (ANPD)');
  });

  it('fotos do mural: aparecem no telão, saem a pedido e são apagadas 90 dias depois do evento', () => {
    renderPage();
    const text = norm(document.getElementById('mural')?.textContent ?? '');
    expect(text).toContain('A foto aparece no telão do evento');
    expect(text).toContain('As fotos são apagadas 90 dias depois do evento.');
    expect(text).toContain('Se você pedir, a sua foto sai do telão antes.');
    expect(text).toContain(SUPPORT_EMAIL);
  });

  it('prazos do Q8, sem "a confirmar com o contador" na página pública', () => {
    renderPage();
    const text = norm(document.getElementById('prazos')?.textContent ?? '');
    expect(text).toContain('Pedidos que não viraram contrato, com os anexos e as mensagens: 12 meses depois do pedido.');
    expect(text).toContain(
      'Reservas contratadas ou pagas, com o comprovante e o chat: 5 anos contados de 1º de janeiro do ano seguinte ao evento.'
    );
    expect(text).toContain('Exemplo: um evento de 2027 fica guardado até o fim de 2032.');
    expect(text).toContain(
      'Contrato aceito pelo site, com o registro do aceite e os dados de quem contratou: 10 anos depois do fim do contrato.'
    );
    expect(text).toContain('Mensagens do formulário de contato: 12 meses depois do envio.');
    expect(text).toContain('Fotos do mural: 90 dias depois do evento.');
    expect(text).toContain('Cópias de segurança do banco de dados: somem em até 90 dias.');
    expect(pageText().toLowerCase()).not.toContain('contador');
  });

  it('exclusão da conta: exatamente as regras do item d8c-excluir', () => {
    renderPage();
    const items = within(document.getElementById('exclusao') as HTMLElement)
      .getAllByRole('listitem')
      .map((li) => norm(li.textContent ?? ''));
    expect(items).toEqual([
      'Com a conta conectada, use "Excluir minha conta" na página LGPD. O site pede a senha da conta.',
      'Se você entra com o Google e não sabe a senha, peça um link de confirmação por e-mail. O link vale por 1 hora e funciona uma vez só.',
      `Contas da equipe (administrador, gerente e operador) não se excluem pelo site: escreva para ${SUPPORT_EMAIL}.`,
      'Se você tem uma reserva confirmada cujo evento ainda não terminou, uma reserva contratada com pagamento pendente ou um comprovante de pagamento que a equipe ainda não conferiu, a exclusão fica adiada até o fim do evento ou até o pagamento ser acertado. Até lá, a conta continua funcionando, e você pode cancelar o pedido de exclusão na página LGPD.',
      'Para colaboradores, a exclusão fica adiada enquanto houver escala ativa num evento futuro ou pagamento pendente.',
      'Conta de cliente sem nenhuma reserva: é apagada por completo.',
      'Nos outros casos, a conta é anonimizada: saem nome, e-mail, telefone, endereço, foto, preferências, notificações, favoritos, carrinho, login social e sessões.',
      'A avaliação fica só com as estrelas, sem o comentário e as fotos.',
      'Pedidos que nunca foram contratados são cancelados, e os anexos e as mensagens deles são apagados.',
      'Reservas contratadas ou pagas guardam só o que a contabilidade precisa: data, itens, valores, situação, cupom, comprovante de pagamento e o chat da reserva. Elas ficam por 5 anos contados de 1º de janeiro do ano seguinte ao evento, sem o nome, o e-mail e o telefone.',
      'O contrato aceito pelo site e o registro do aceite, com os dados de quem contratou, ficam guardados por 10 anos depois do fim do contrato.',
      'O código da reserva leva até 5 letras do início do nome do cliente e continua nesse registro.',
      'As cópias de segurança somem em até 90 dias.',
      'O "Excluir cliente" do painel da administração segue a mesma regra.',
    ]);
    // A página não promete o que a rotina não faz: nada de "exclusão permanente" de tudo.
    expect(pageText().toLowerCase()).not.toContain('permanentemente');
  });

  it('código da reserva: até 5 letras do início do nome, e continua no registro guardado', () => {
    renderPage();
    const text = norm(document.getElementById('codigo-da-reserva')?.textContent ?? '');
    expect(text).toContain('XP-BRUNO-20270110-1430-K7Q');
    expect(text).toContain('até 5 letras do início do nome do cliente');
    expect(text).toContain('continua no registro guardado da reserva, mesmo depois da exclusão da conta');
  });

  it('versão de 13/11/2026 e SEO: título da aba e descrição com a data', async () => {
    expect(PRIVACY_POLICY_UPDATED_AT).toBe('13/11/2026');
    renderPage();
    expect(norm(document.getElementById('versao')?.textContent ?? '')).toContain('Versão de 13/11/2026.');
    expect(screen.getByRole('heading', { level: 1, name: 'Política de Privacidade' })).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Política de Privacidade | X Produções'));
    await waitFor(() =>
      expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
        'Como a X Produções e Eventos trata seus dados: o que guarda, para quê, com quem e por quanto tempo. Atualizada em 13/11/2026.'
      )
    );
  });

  it('não tem violações de acessibilidade (tabelas com legenda e cabeçalhos, títulos em ordem)', async () => {
    const { container } = renderPage();
    expect(await axe(container)).toHaveNoViolations();
  });
});
