import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../contexts/SettingsContext', () => ({ useSettings: () => ({ companyName: 'X Produções', googleReviewUrl: null }) }));
vi.mock('../modals/ModalContext', () => ({ useModal: () => ({ openModal: vi.fn() }) }));
vi.mock('../ui/ThemedLogo', () => ({ default: () => <span>logo</span> }));

import { Footer } from '../Footer';
import { COMPANY_FULL_ADDRESS, COMPANY_REGISTERED_NAME, SUPPORT_RESPONSE_LABEL, formatPhoneDisplay } from '../../data/site';
import { getWhatsAppPhone } from '../../utils/whatsapp';

// Textos legais (13/11/2026): o Decreto 7.962/2013, art. 2º, pede, em local visível do site, o nome empresarial e o
// CNPJ (I) e o endereço físico e eletrônico com o contato (II); o art. 4º pede resposta ao consumidor em até 5 dias.
// O rodapé mostrava só o nome comercial ("X Produções e Eventos"), o endereço sem CEP e nenhum prazo de resposta.

const norm = (text: string) => text.replace(/\s+/g, ' ').trim();

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Footer />
    </MemoryRouter>
  );

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe('Rodapé — dados obrigatórios da empresa (Decreto 7.962/2013, art. 2º)', () => {
  it('a fonte única (src/data/site.ts) tem o nome empresarial completo e o endereço com CEP', () => {
    expect(COMPANY_REGISTERED_NAME).toBe('55.343.824 ERNANE MOURA DA SILVA');
    expect(COMPANY_FULL_ADDRESS).toBe("Rua Flor d'Água, 407, Jardim Alvorada, Belo Horizonte - MG, CEP 30810-310");
    expect(SUPPORT_RESPONSE_LABEL).toBe('Atendimento: respondemos em até 5 dias');
  });

  it.each(['/', '/termos', '/orcamento', '/contato'])('em %s: nome empresarial, CNPJ, endereço com CEP, e-mail, telefone e prazo de resposta', (path) => {
    const { container } = renderAt(path);
    const text = norm(container.textContent ?? '');

    expect(text).toMatch(/© \d{4} X Produções e Eventos/);
    expect(text).toContain('Nome empresarial: 55.343.824 ERNANE MOURA DA SILVA · CNPJ: 55.343.824/0001-56');
    expect(text).toContain("Rua Flor d'Água, 407, Jardim Alvorada, Belo Horizonte - MG, CEP 30810-310");
    expect(text).toContain('Atendimento: respondemos em até 5 dias');
    expect(screen.getByRole('link', { name: 'suporte@xproducoeseeventos.com.br' })).toHaveAttribute(
      'href',
      'mailto:suporte@xproducoeseeventos.com.br'
    );
    const phone = getWhatsAppPhone();
    expect(screen.getByRole('link', { name: formatPhoneDisplay(phone) })).toHaveAttribute('href', `tel:+${phone}`);
    // Uma vez só: o rodapé não repete o endereço nem o CNPJ.
    expect(text.split('CEP 30810-310')).toHaveLength(2);
    expect(text.split('55.343.824/0001-56')).toHaveLength(2);
  });

  it('o telefone é o do WhatsApp do site (VITE_WHATSAPP_PHONE), sem número fixo no rodapé', () => {
    vi.stubEnv('VITE_WHATSAPP_PHONE', '(31) 98888-7777');
    renderAt('/');

    expect(screen.getByRole('link', { name: '(31) 98888-7777' })).toHaveAttribute('href', 'tel:+5531988887777');
  });

  it('um telefone só no rodapé (o da empresa): o crédito do desenvolvedor fica, sem número', () => {
    // Revisão (13/11/2026): o crédito mostrava um segundo telefone, que podia ser confundido com o da empresa.
    const { container } = renderAt('/');
    const text = norm(container.textContent ?? '');
    const phones = text.match(/\(\d{2}\)\s?\d{4,5}-\d{4}/g) ?? [];
    expect(phones).toEqual([formatPhoneDisplay(getWhatsAppPhone())]);
    expect(text).toContain('Desenvolvido com ❤️ por Alyson Jean');
    expect(container.querySelectorAll('a[href^="tel:"]')).toHaveLength(1);
  });

  it('o painel e o portal do colaborador continuam sem o rodapé', () => {
    for (const path of ['/admin', '/colaborador/painel']) {
      const { container } = renderAt(path);
      expect(container.querySelector('footer')).toBeNull();
      cleanup();
    }
  });
});
