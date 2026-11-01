import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Menu, X } from 'lucide-react';
import { CollaboratorSidebar } from './CollaboratorSidebar';

interface CollaboratorLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: Array<{ name: string; href?: string }>;
  /** Ações da página (botões) ao lado do título. */
  actions?: React.ReactNode;
}

export const CollaboratorLayout: React.FC<CollaboratorLayoutProps> = ({
  children,
  title,
  breadcrumbs,
  actions,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <CollaboratorSidebar open={menuOpen} onOpenChange={setMenuOpen} />

      {/* min-w-0: item flex não encolhe abaixo do conteúdo sem isso — no celular a área
          esticava (556 px numa tela de 390) e a página rolava para o lado. */}
      <div className="flex-1 min-w-0 md:ml-0 min-h-screen">
        {/* Achado (auditoria mobile): o botão do menu era `fixed top-4 left-4 z-50` — em cima do
            logo do Header global fixo (também z-50), com dois "hambúrgueres" lado a lado. Agora
            fica numa barra própria, presa logo abaixo do Header (h-16 no celular). */}
        <div className="sticky top-16 z-30 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-2 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-controls="collaborator-sidebar"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            {menuOpen ? 'Fechar menu' : 'Menu do colaborador'}
          </button>
        </div>

        {(title || breadcrumbs) && (
          <div className="bg-muted border-b border-border px-4 py-4 sm:px-6">
            {breadcrumbs && (
              <nav className="flex mb-2" aria-label="Trilha de navegação">
                <ol className="flex flex-wrap items-center gap-y-1 text-sm">
                  {breadcrumbs.map((crumb, index) => (
                    <li key={index} className="flex items-center">
                      {index > 0 && (
                        <ChevronRight className="w-4 h-4 text-muted-foreground mx-2" aria-hidden="true" />
                      )}
                      {crumb.href ? (
                        <Link
                          to={crumb.href}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {crumb.name}
                        </Link>
                      ) : (
                        <span className="text-primary font-medium" aria-current="page">
                          {crumb.name}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            {(title || actions) && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {title && (
                  <h1 className="text-2xl font-bold text-foreground break-words">
                    {title}
                  </h1>
                )}
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
              </div>
            )}
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
};

export default CollaboratorLayout;
