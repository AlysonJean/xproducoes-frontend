import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { PrivacyPage } from '../PrivacyPage';
import { PRIVACY_POLICY_SECTIONS } from '../../data/privacyPolicy';

// Textos legais (13/11/2026): a Política de Privacidade ganha a seção "Dados de orçamentos e contratos", para o aceite
// online e o contrato em PDF: bases legais (LGPD, art. 7º, V, II e VI), a necessidade dos dados em destaque, o registro
// do aceite com o código enviado ao e-mail, com quem os dados são compartilhados (hospedagem, e-mail, contabilidade),
// a transferência pelo art. 33, IX, a guarda do contrato por 10 anos depois do fim do contrato e a exclusão dos
// orçamentos não aceitos em até 12 meses, direitos e canal. O WhatsApp não tem envio automático (sem API): só aparece
// como canal de conversa, sem a Meta como quem envia.

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

const sectionElement = () => document.getElementById('orcamentos-e-contratos') as HTMLElement;
const sectionText = () => norm(sectionElement()?.textContent ?? '');

afterEach(() => cleanup());

describe('Privacidade — Dados de orçamentos e contratos', () => {
  it('a seção vem logo depois da tabela de dados, com o título numerado', () => {
    const ids = PRIVACY_POLICY_SECTIONS.map((section) => section.id);
    expect(ids.indexOf('orcamentos-e-contratos')).toBe(ids.indexOf('dados') + 1);
    renderPage();
    expect(sectionElement()).not.toBeNull();
    expect(within(sectionElement()).getByRole('heading', { level: 2 })).toHaveTextContent('4. Dados de orçamentos e contratos');
  });

  it('dados de quem contrata e a necessidade em destaque, sem depender de consentimento', () => {
    renderPage();
    const text = sectionText();
    expect(text).toContain(
      'tratamos os dados de quem contrata: nome ou razão social, CPF ou CNPJ, e-mail, telefone e endereço e, se for empresa, nome, CPF e cargo de quem aceita em nome dela.'
    );
    const necessary = within(sectionElement()).getByText(/^Estes dados são necessários para emitir e cumprir o contrato\./);
    expect(necessary.tagName).toBe('P');
    expect(necessary.className).toContain('font-semibold');
    expect(necessary.className).toContain('border-primary/40');
    expect(necessary).toHaveTextContent('Por isso eles não dependem do seu consentimento.');
  });

  it('bases legais: execução do contrato (V), obrigação legal (II) e exercício de direitos (VI)', () => {
    renderPage();
    const items = within(sectionElement())
      .getAllByRole('listitem')
      .map((li) => norm(li.textContent ?? ''));
    expect(items.some((item) => item.startsWith('Execução do contrato e dos passos antes dele, a seu pedido (inciso V)'))).toBe(true);
    expect(items.some((item) => item.startsWith('Cumprimento de obrigação legal (inciso II)'))).toBe(true);
    expect(items.some((item) => item.startsWith('Exercício regular de direitos em processo (inciso VI)'))).toBe(true);
    expect(sectionText()).toContain('As bases legais (LGPD, art. 7º) são:');
  });

  it('registro do aceite com o código enviado ao e-mail, o hash do PDF e a cópia por e-mail', () => {
    renderPage();
    const text = sectionText();
    for (const fragment of [
      // Revisão: no condicional, porque o aceite online nasce desligado.
      'Se a proposta oferecer o aceite pelo site e você aceitar por ele, guardamos o registro do aceite',
      'o e-mail para o qual enviamos o código de confirmação e a conferência desse código',
      'o endereço IP, o navegador e o aparelho, a versão do contrato e a impressão digital do arquivo (hash SHA-256)',
      'O código vale por pouco tempo e não fica guardado de forma legível.',
      'O contrato aceito fica guardado sem alteração, e você recebe a cópia em PDF por e-mail.',
    ]) {
      expect(text).toContain(fragment);
    }
  });

  it('compartilhamento (hospedagem, e-mail, contabilidade), WhatsApp só como canal e transferência pelo art. 33, IX', () => {
    renderPage();
    const text = sectionText();
    expect(text).toContain(
      'Esses dados passam pelos serviços de hospedagem, banco de dados, armazenamento de arquivos e e-mail listados na seção seguinte e vão para a contabilidade da empresa'
    );
    expect(text).toContain('O WhatsApp só entra como canal de conversa');
    expect(text).toContain('não há envio automático do contrato por ele');
    expect(text).not.toContain('Meta');
    expect(text).toContain('a transferência se apoia na lei (LGPD, art. 33, IX).');
    // O art. 33, IX cobre só o que se apoia nos incisos II, V e VI do art. 7º; a frase não cita consentimento nem
    // legítimo interesse.
    expect(text).not.toContain('legítimo interesse');
  });

  it('guarda: contrato por 10 anos depois do fim do contrato (mesmo com a conta excluída) e orçamentos não aceitos em até 12 meses', () => {
    renderPage();
    const text = sectionText();
    expect(text).toContain(
      'Contrato aceito pelo site, registro do aceite e dados de quem contratou: 10 anos depois do fim do contrato, mesmo que você exclua a conta.'
    );
    // Revisão: o servidor anonimiza o pedido não contratado (retentionService), não o apaga.
    expect(text).toContain(
      'Orçamentos que não foram aceitos: os dados pessoais são apagados ou anonimizados em até 12 meses depois do pedido.'
    );
    expect(text).toContain('Durante o prazo de guarda, o contrato e o registro do aceite não são apagados a pedido');
  });

  it('direitos e canal: link para o e-mail de atendimento', () => {
    renderPage();
    const link = within(sectionElement()).getByRole('link', { name: 'suporte@xproducoeseeventos.com.br' });
    expect(link).toHaveAttribute('href', 'mailto:suporte@xproducoeseeventos.com.br');
    expect(sectionText()).toContain('Para pedir acesso, correção ou os outros direitos da seção "Seus direitos" sobre estes dados, escreva para');
  });
});
