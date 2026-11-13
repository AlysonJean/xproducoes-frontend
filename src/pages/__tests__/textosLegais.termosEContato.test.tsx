import type { ReactElement } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

vi.mock('../../services/api', () => ({ apiFetch: vi.fn() }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import { TermsPage } from '../TermsPage';
import { ContactPage } from '../ContactPage';
import { formatPhoneDisplay } from '../../data/site';
import { getWhatsAppPhone } from '../../utils/whatsapp';

// Textos legais (13/11/2026): os Termos ficam coerentes com o contrato e as políticas novas (quem é a empresa, objeto
// de locação e serviços, como a contratação se forma, aceite pelo site só quando a proposta oferecer, responsabilidade
// nos termos da lei, foro), e o Contato mostra o nome empresarial e o prazo de resposta do Decreto 7.962/2013 (art. 4º).
// Antes: os Termos não diziam quem era a empresa, nem o objeto, nem o foro, e excluíam "danos indiretos" de forma
// genérica; o Contato prometia "Respondemos em até 24h" e mostrava só o CNPJ.

const norm = (text: string) => text.replace(/\s+/g, ' ').trim();
const renderPage = (ui: ReactElement, path: string) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </HelmetProvider>
  );
const sectionText = (id: string) => norm(document.getElementById(id)?.textContent ?? '');

afterEach(() => cleanup());

describe('Termos de Uso — coerentes com o contrato e as políticas', () => {
  it('quem somos: nome comercial, nome empresarial, CNPJ e endereço com CEP', () => {
    renderPage(<TermsPage />, '/termos');
    expect(sectionText('aceite-dos-termos')).toContain(
      "Este site é da X Produções e Eventos, nome empresarial 55.343.824 ERNANE MOURA DA SILVA, CNPJ 55.343.824/0001-56, Rua Flor d'Água, 407, Jardim Alvorada, Belo Horizonte - MG, CEP 30810-310."
    );
  });

  it('objeto: locação de equipamentos e serviços de montagem, operação técnica e desmontagem', () => {
    renderPage(<TermsPage />, '/termos');
    expect(sectionText('servicos')).toContain(
      'Cada contratação é a locação de equipamentos de som e iluminação e a prestação dos serviços de montagem, operação técnica e desmontagem que estiverem na proposta.'
    );
  });

  it('contratação: pedido não é reserva, proposta de 7 dias, aceite e parcela inicial (sem "sinal")', () => {
    renderPage(<TermsPage />, '/termos');
    const text = sectionText('contratacao');
    expect(text).toContain('O pedido de orçamento não é uma reserva: a equipe responde com uma proposta, que vale por 7 dias.');
    expect(text).toContain('A contratação acontece quando você aceita a proposta.');
    expect(text).toContain('A data só fica reservada depois do pagamento da parcela inicial do preço, no prazo da proposta.');
    expect(norm(document.body.textContent ?? '')).not.toMatch(/\bsinal\b/i);
  });

  it('aceite pelo site: só quando a proposta oferecer, com código no e-mail e cópia em PDF', () => {
    renderPage(<TermsPage />, '/termos');
    const text = sectionText('aceite-eletronico');
    expect(text).toContain('Quando a proposta oferecer o aceite pelo site');
    expect(text).toContain('confirma com o código enviado ao seu e-mail e clica em "Aceito"');
    expect(text).toContain('Medida Provisória 2.200-2/2001, art. 10, § 2º');
    expect(text).toContain('você recebe a cópia do contrato em PDF por e-mail');
  });

  it('responsabilidade nos termos da lei (sem a exclusão genérica de danos indiretos) e foro do consumidor', () => {
    renderPage(<TermsPage />, '/termos');
    expect(sectionText('responsabilidade')).toContain(
      'responde pelos equipamentos que entrega e pelo trabalho da sua equipe, nos termos da lei'
    );
    expect(norm(document.body.textContent ?? '')).not.toContain('danos indiretos');
    // Revisão: a frase que limita a responsabilidade vem em destaque (CDC, art. 54, § 4º).
    const limit = within(document.getElementById('responsabilidade') as HTMLElement).getByText(
      /não responde por falha da rede elétrica ou da instalação do local/
    );
    expect(limit.tagName).toBe('P');
    expect(limit.className).toContain('font-semibold');
    expect(limit.className).toContain('border-primary/40');
    expect(norm(limit.textContent ?? '')).toBe(
      'A X Produções e Eventos não responde por falha da rede elétrica ou da instalação do local nem por problema causado por informação errada sobre o evento, salvo se forneceu o gerador ou se a falha vier dos equipamentos ou da equipe dela.'
    );
    const foro = sectionText('foro');
    expect(foro).toContain('Se você contrata como consumidor, as ações correm no foro da cidade onde você mora.');
    expect(foro).toContain('Nos demais casos, fica eleito o foro de Belo Horizonte - MG.');
  });

  it('dados e contato: link para a Privacidade, e-mail, telefone do WhatsApp do site e prazo de resposta; sem link para a política de reserva (rascunho)', () => {
    renderPage(<TermsPage />, '/termos');
    expect(within(document.getElementById('dados') as HTMLElement).getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute(
      'href',
      '/privacidade'
    );
    const phone = getWhatsAppPhone();
    expect(screen.getByRole('link', { name: formatPhoneDisplay(phone) })).toHaveAttribute('href', `tel:+${phone}`);
    expect(sectionText('contato')).toContain('Atendimento: respondemos em até 5 dias.');
    expect(document.querySelector('a[href="/politica-de-reserva"]')).toBeNull();
  });
});

describe('Contato — nome empresarial e prazo de resposta', () => {
  it('o cartão da empresa mostra o nome empresarial e o CNPJ; o e-mail, o prazo de 5 dias (não "24h"); o endereço, o CEP', () => {
    renderPage(<ContactPage />, '/contato');
    expect(screen.getByText('55.343.824 ERNANE MOURA DA SILVA')).toBeInTheDocument();
    expect(screen.getByText('CNPJ 55.343.824/0001-56')).toBeInTheDocument();
    expect(screen.getByText('Atendimento: respondemos em até 5 dias')).toBeInTheDocument();
    expect(screen.queryByText(/em até 24h/)).not.toBeInTheDocument();
    expect(norm(screen.getByText(/Rua Flor d'Água, 407, Jardim Alvorada/).textContent ?? '')).toBe(
      "Rua Flor d'Água, 407, Jardim AlvoradaBelo Horizonte - MG, CEP 30810-310"
    );
  });
});
