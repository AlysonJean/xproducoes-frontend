// src/components/Layout.tsx

import { Outlet } from 'react-router-dom';
import { Footer } from './Footer';

// Este layout não renderiza mais o Header, pois ele será renderizado globalmente
export const Layout = () => {
  return (
    <div className="min-h-screen bg-background text-primary flex flex-col font-sans">
      <main className="flex-grow container mx-auto p-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
