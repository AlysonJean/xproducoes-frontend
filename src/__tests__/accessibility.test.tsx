/**
 * 🧪 TESTES DE ACESSIBILIDADE
 * Usando jest-axe para validar padrões WCAG — contra os componentes REAIS do app.
 *
 * Achado (Fase 3): esta suíte antes renderizava apenas marcação HTML inline construída à
 * mão (um <button> genérico, uma <table> genérica, um <div role="dialog"> genérico) — nada
 * disso importava um componente de verdade do projeto. Passar aqui não dava nenhuma garantia
 * sobre a acessibilidade real do Modal, do Input, do Button etc. (o Modal real, por exemplo,
 * não tinha role="dialog" nem trap de foco até a correção em ui/Modal.tsx, mas o teste de
 * "modais" aqui sempre passava porque testava um <div> escrito à mão com os atributos certos
 * já colocados, não o componente real).
 *
 * Removido sem substituto (em vez de fingir com marcação inline):
 * - "tabelas": não há um componente de Tabela reutilizável no projeto — cada página admin
 *   escreve seu próprio <table> inline (AdminDashboardPage, ClientListPage, etc.), pesado
 *   demais para testar aqui sem mockar autenticação/API de cada página individualmente.
 * - "skip links": não existe nenhum link "pular para o conteúdo" implementado em lugar
 *   nenhum do app (grep confirma) — mantinha um teste de uma funcionalidade que não existe.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { SafeImage } from '../components/ui/SafeImage';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { PageLayout } from '../components/layouts/PageLayout';
import { Modal } from '../components/ui/Modal';
import CookieConsentBanner from '../components/CookieConsentBanner';
import { CookieConsentProvider } from '../contexts/CookieConsentContext';

expect.extend(toHaveNoViolations);

// HelmetProvider é obrigatório aqui: Breadcrumbs/PageLayout usam <StructuredData> (JSON-LD),
// que é implementado com <Helmet>. Sem HelmetProvider como ancestral, o Dispatcher interno
// do react-helmet-async quebra com "Cannot read properties of undefined (reading 'add')" —
// isso foi descoberto rodando esta própria suíte (ver nota no topo do arquivo sobre o achado
// mais amplo de SSR: o app real só fornece HelmetProvider no cliente, via src/Providers.tsx,
// nunca no servidor — o que quer dizer que este mesmo crash pode ocorrer de verdade em
// produção assim que o problema de streaming/Suspense do SSR for corrigido).
const MockProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <HelmetProvider>
      <BrowserRouter>{children}</BrowserRouter>
    </HelmetProvider>
  );
};

describe('Acessibilidade - Componentes Core (componentes reais do projeto)', () => {
  it('Button (todas as variantes) não tem violações de acessibilidade', async () => {
    const { container } = render(
      <MockProviders>
        <Button variant="primary">Confirmar</Button>
        <Button variant="secondary">Cancelar</Button>
        <Button variant="destructive" aria-label="Excluir item">Excluir</Button>
        <Button variant="ghost" isLoading>Carregando</Button>
      </MockProviders>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Input (com label e descrição) não tem violações de acessibilidade', async () => {
    const { container } = render(
      <MockProviders>
        <form>
          <Input label="Email" type="email" name="email" required />
          <Input label="Senha" type="password" name="password" showPasswordToggle required />
          <Button type="submit">Entrar</Button>
        </form>
      </MockProviders>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Breadcrumbs (navegação real, usada em toda página via PageLayout) não tem violações de acessibilidade', async () => {
    const { container } = render(
      <MockProviders>
        <Breadcrumbs items={[{ label: 'Equipamentos', path: '/equipamentos' }, { label: 'Câmera Sony' }]} />
      </MockProviders>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('SafeImage (usado para toda imagem de equipamento/kit) não tem violações de acessibilidade', async () => {
    const { container } = render(
      <MockProviders>
        <SafeImage src="/xproducoes-logo.png" alt="Logo X Produções" width={200} height={100} />
      </MockProviders>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('PageLayout (título h1 real + Breadcrumbs + conteúdo) não tem violações de acessibilidade', async () => {
    const { container } = render(
      <MockProviders>
        <PageLayout title="Catálogo de Equipamentos" description="Encontre o equipamento ideal para seu evento.">
          <section aria-labelledby="section-destaques">
            <h2 id="section-destaques">Destaques</h2>
            <p>Conteúdo da seção</p>
          </section>
        </PageLayout>
      </MockProviders>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Modal real (role="dialog"/aria-modal, ver Modal.test.tsx para trap de foco) não tem violações de acessibilidade', async () => {
    const { container } = render(
      <MockProviders>
        <Modal isOpen onClose={() => {}} title="Confirmar ação">
          <p>Deseja realmente prosseguir?</p>
          <Button>Confirmar</Button>
          <Button variant="ghost">Cancelar</Button>
        </Modal>
      </MockProviders>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Alert (sucesso e erro) não tem violações de acessibilidade', async () => {
    const { container } = render(
      <MockProviders>
        <Alert variant="success" title="Sucesso" description="Operação realizada com sucesso!" />
        <Alert variant="error" title="Erro" description="Não foi possível completar a operação." onClose={() => {}} />
      </MockProviders>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Acessibilidade - CookieConsentBanner (adicionado nesta sessão)', () => {
  it('não tem violações de acessibilidade', async () => {
    window.localStorage.clear();
    const { container } = render(
      <MockProviders>
        <CookieConsentProvider>
          <CookieConsentBanner />
        </CookieConsentProvider>
      </MockProviders>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Acessibilidade - Navegação por teclado (componentes reais)', () => {
  it('Tab alcança um Button real e depois um Input real, na ordem esperada', async () => {
    const user = userEvent.setup();
    render(
      <MockProviders>
        <Button>Primeiro</Button>
        <Input label="Campo" name="campo" />
      </MockProviders>
    );

    const button = screen.getByRole('button', { name: 'Primeiro' });
    const input = screen.getByLabelText('Campo');

    await user.tab();
    expect(button).toHaveFocus();

    await user.tab();
    expect(input).toHaveFocus();
  });
});
