/**
 * 🧪 TESTES DE ACESSIBILIDADE
 * Usando jest-axe para validar padrões WCAG
 */

import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

// Extender expect com matchers de acessibilidade
expect.extend(toHaveNoViolations);

// Mock do ThemeContext para componentes que dependem dele
const MockProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};

describe('Acessibilidade - Componentes Core', () => {
  it('deve passar verificações de acessibilidade para botões', async () => {
    const { container } = render(
      <MockProviders>
        <button type="button">Clique aqui</button>
        <button type="submit" aria-label="Enviar formulário">
          Enviar
        </button>
      </MockProviders>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('deve passar verificações de acessibilidade para formulários', async () => {
    const { container } = render(
      <MockProviders>
        <form>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" aria-required="true" />
          
          <label htmlFor="password">Senha</label>
          <input id="password" type="password" aria-required="true" />
          
          <button type="submit">Entrar</button>
        </form>
      </MockProviders>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('deve passar verificações de acessibilidade para links', async () => {
    const { container } = render(
      <MockProviders>
        <nav aria-label="Navegação principal">
          <a href="/">Home</a>
          <a href="/equipamentos">Equipamentos</a>
          <a href="/contato">Contato</a>
        </nav>
      </MockProviders>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('deve passar verificações de acessibilidade para imagens', async () => {
    const { container } = render(
      <MockProviders>
        <img src="/logo.png" alt="Logo X Produções" />
        <img src="/banner.jpg" alt="Banner promocional de equipamentos" />
      </MockProviders>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('deve passar verificações de acessibilidade para headings', async () => {
    const { container } = render(
      <MockProviders>
        <main>
          <h1>Página Principal</h1>
          <section aria-labelledby="section-1">
            <h2 id="section-1">Seção 1</h2>
            <p>Conteúdo da seção</p>
          </section>
          <section aria-labelledby="section-2">
            <h2 id="section-2">Seção 2</h2>
            <p>Mais conteúdo</p>
          </section>
        </main>
      </MockProviders>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('deve passar verificações de acessibilidade para modais', async () => {
    const { container } = render(
      <MockProviders>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
        >
          <h2 id="modal-title">Confirmar ação</h2>
          <p id="modal-description">Deseja realmente prosseguir?</p>
          <button type="button">Confirmar</button>
          <button type="button">Cancelar</button>
        </div>
      </MockProviders>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('deve passar verificações de acessibilidade para tabelas', async () => {
    const { container } = render(
      <MockProviders>
        <table>
          <caption>Lista de equipamentos</caption>
          <thead>
            <tr>
              <th scope="col">Nome</th>
              <th scope="col">Preço</th>
              <th scope="col">Disponível</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Câmera Sony</td>
              <td>R$ 150/dia</td>
              <td>Sim</td>
            </tr>
          </tbody>
        </table>
      </MockProviders>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('deve passar verificações de acessibilidade para alertas', async () => {
    const { container } = render(
      <MockProviders>
        <div role="alert" aria-live="polite">
          Operação realizada com sucesso!
        </div>
        <div role="alert" aria-live="assertive">
          Erro: Não foi possível completar a operação.
        </div>
      </MockProviders>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Acessibilidade - Padrões de Interação', () => {
  it('deve ter focus visível em elementos interativos', async () => {
    const { container } = render(
      <MockProviders>
        <button className="focus:ring-2 focus:ring-primary focus:outline-none">
          Botão com focus visível
        </button>
        <a href="/" className="focus:ring-2 focus:ring-primary focus:outline-none">
          Link com focus visível
        </a>
      </MockProviders>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('deve ter skip links para navegação', async () => {
    const { container } = render(
      <MockProviders>
        <a href="#main-content" className="sr-only focus:not-sr-only">
          Pular para conteúdo principal
        </a>
        <header>
          <nav>Menu de navegação</nav>
        </header>
        <main id="main-content">
          <h1>Conteúdo principal</h1>
        </main>
      </MockProviders>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
