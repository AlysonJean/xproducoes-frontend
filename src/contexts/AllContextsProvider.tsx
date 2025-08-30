import React from 'react';
import { ThemeProvider } from './ThemeContext';
import { CartProvider } from './CartContext';
import { NotificationProvider } from './NotificationContext';
import { CompareProvider } from './CompareContext';
import { SettingsProvider } from './SettingsContext';
import { FavoritesProvider } from './FavoritesContext';
import { CollaboratorProvider } from './CollaboratorContext';
import { AuthProvider } from './AuthContext';

export const AllContextsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <ThemeProvider>
      <CompareProvider>
        <SettingsProvider>
          <FavoritesProvider>
            <CollaboratorProvider>
              <NotificationProvider>
                <CartProvider>{children}</CartProvider>
              </NotificationProvider>
            </CollaboratorProvider>
          </FavoritesProvider>
        </SettingsProvider>
      </CompareProvider>
    </ThemeProvider>
  </AuthProvider>
);
