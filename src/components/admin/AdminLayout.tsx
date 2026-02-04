import React from 'react';
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
      
      <div className="flex-1 md:ml-0 min-h-screen">
        {/* Header */}
        {(title || breadcrumbs) && (
          <div className="bg-muted border-b px-6 py-4 mt-16">
            {breadcrumbs && (
              <nav className="flex mb-2" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2 text-sm">
                  {breadcrumbs.map((crumb, index) => (
                    <li key={index} className="flex items-center">
                      {index > 0 && (
                        <svg className="w-4 h-4 text-muted-foreground mx-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      {crumb.href ? (
                        <a
                          href={crumb.href}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {crumb.name}
                        </a>
                      ) : (
                        <span className="text-primary font-medium">
                          {crumb.name}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            
            {title && (
              <h1 className="text-2xl font-bold text-foreground">
                {title}
              </h1>
            )}
          </div>
        )}
        
        {/* Main content */}
        <main className={`flex-1 p-6 bg-background ${!title && !breadcrumbs ? 'mt-16' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
