import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';


interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: Array<{ name: string; href?: string }>;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title,
  breadcrumbs
}) => {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />

      {/* min-w-0: item flex não encolhe abaixo do conteúdo sem isso — no celular a área
          esticava além da tela (até 761 px numa tela de 390) e o painel rolava para o lado. */}
      <div className="flex-1 min-w-0 md:ml-0 min-h-screen">
        {/* Header */}
        {(title || breadcrumbs) && (
          <div className="bg-muted border-b border-border px-4 sm:px-6 py-4 mt-16">
            {breadcrumbs && (
              <nav className="flex mb-2" aria-label="Trilha de navegação">
                <ol className="flex flex-wrap items-center gap-y-1 text-sm">
                  {breadcrumbs.map((crumb, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    return (
                      <li key={index} className="flex items-center">
                        {index > 0 && (
                          <ChevronRight className="w-4 h-4 text-muted-foreground mx-2" aria-hidden="true" />
                        )}
                        {crumb.href && !isLast ? (
                          // <Link> (antes <a href>): o <a> recarregava o app inteiro a cada clique na trilha.
                          <Link
                            to={crumb.href}
                            className="text-muted-foreground hover:text-foreground transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {crumb.name}
                          </Link>
                        ) : (
                          <span className="text-primary font-medium" aria-current={isLast ? 'page' : undefined}>
                            {crumb.name}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </nav>
            )}

            {title && (
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {title}
              </h1>
            )}
          </div>
        )}

        {/* Main content — 16px de margem no celular, 24px a partir de sm. */}
        <main className={`flex-1 p-4 sm:p-6 bg-background ${!title && !breadcrumbs ? 'mt-16' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
