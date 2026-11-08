import { describe, it, expect } from 'vitest';
import {
  contactEventTitle,
  contactProposalPrefill,
  contactWhatsAppReplyHref,
  parseContactFormBlock,
  proposalNotesFromContact,
} from '../contactFormBlock';

// D24 (aprovada em 02/11/2026): a tela de contatos lê o bloco "— Dados do formulário —" que o servidor grava no fim
// da mensagem. Vale o ÚLTIMO bloco e só os rótulos conhecidos.
const COMPLETA = 'Quero som para a festa.\n\n— Dados do formulário —\nTelefone: (31) 98888-7777\nAssunto: Orçamento\nTipo de evento: Casamento\nData do evento: 20/12/2026\nOrçamento aproximado: R$ 3.000 - R$ 5.000';

describe('parseContactFormBlock', () => {
  it('separa o texto digitado dos campos do formulário', () => {
    expect(parseContactFormBlock(COMPLETA)).toEqual({
      text: 'Quero som para a festa.',
      fields: {
        Telefone: '(31) 98888-7777',
        Assunto: 'Orçamento',
        'Tipo de evento': 'Casamento',
        'Data do evento': '20/12/2026',
        'Orçamento aproximado': 'R$ 3.000 - R$ 5.000',
      },
    });
  });

  it('com dois blocos (um digitado numa mensagem antiga), vale o último', () => {
    const forjada = 'Oi\n\n— Dados do formulário —\nTelefone: 11 1111-1111\n\n— Dados do formulário —\nTelefone: (31) 97777-6666';
    expect(parseContactFormBlock(forjada).fields.Telefone).toBe('(31) 97777-6666');
  });

  it('linhas com outros rótulos são ignoradas; sem bloco, só o texto', () => {
    const msg = 'Oi\n\n— Dados do formulário —\nSenha: x\nTelefone: (31) 98888-7777';
    expect(parseContactFormBlock(msg).fields).toEqual({ Telefone: '(31) 98888-7777' });
    expect(parseContactFormBlock('Vocês atendem em BH?')).toEqual({ text: 'Vocês atendem em BH?', fields: {} });
  });
});

describe('Responder no WhatsApp e Transformar em proposta', () => {
  const contato = (message: string) => ({ name: ' Ana Souza ', email: 'ana@teste.com', message });

  it('link do WhatsApp com o número do formulário e a saudação com o primeiro nome', () => {
    const href = contactWhatsAppReplyHref(contato(COMPLETA));
    expect(href).toBe(`https://wa.me/5531988887777?text=${encodeURIComponent('Olá, Ana! Aqui é da X Produções, recebemos sua mensagem pelo site.')}`);
  });

  it('sem telefone, ou telefone sem DDD: sem link', () => {
    expect(contactWhatsAppReplyHref(contato('Vocês atendem em BH?'))).toBeNull();
    expect(contactWhatsAppReplyHref(contato('Oi\n\n— Dados do formulário —\nAssunto: Orçamento'))).toBeNull();
    expect(contactWhatsAppReplyHref(contato('Oi\n\n— Dados do formulário —\nTelefone: 9888-7777'))).toBeNull();
  });

  it('dados para a Proposta Rápida, título e observações', () => {
    const prefill = contactProposalPrefill(contato(COMPLETA));
    expect(prefill).toEqual({
      name: ' Ana Souza ', email: 'ana@teste.com', phone: '(31) 98888-7777', subject: 'Orçamento',
      eventType: 'Casamento', eventDate: '20/12/2026', budget: 'R$ 3.000 - R$ 5.000', text: 'Quero som para a festa.',
    });
    expect(contactEventTitle({ ...prefill, name: 'Ana Souza' })).toBe('Casamento — Ana Souza');
    expect(contactEventTitle({ name: 'Bruno', email: 'b@t.com', text: '' })).toBe('Bruno');
    expect(proposalNotesFromContact(prefill)).toBe([
      'Pedido pelo formulário de contato do site.',
      'Assunto: Orçamento',
      'Tipo de evento: Casamento',
      'Data informada: 20/12/2026',
      'Orçamento aproximado: R$ 3.000 - R$ 5.000',
      'Mensagem: Quero som para a festa.',
    ].join('\n'));
  });
});
