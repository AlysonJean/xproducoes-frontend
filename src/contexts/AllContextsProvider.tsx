import React from 'react';
import { MemoizedThemeProvider } from './ThemeContext';
import { MemoizedCartProvider } from './CartContext';
import { NotificationProvider } from './NotificationContext';
import { CompareProvider } from './CompareContext';
import { SettingsProvider } from './SettingsContext';
import { FavoritesProvider } from './FavoritesContext';
import { CollaboratorProvider } from './CollaboratorContext';
import { AuthProvider } from './AuthContext';

export const AllContextsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <MemoizedThemeProvider>
      <CompareProvider>
        <SettingsProvider>
          <FavoritesProvider>
            <CollaboratorProvider>
              <NotificationProvider>
                <MemoizedCartProvider>{children}</MemoizedCartProvider>
              </NotificationProvider>
            </CollaboratorProvider>
          </FavoritesProvider>
        </SettingsProvider>
      </CompareProvider>
    </MemoizedThemeProvider>
  </AuthProvider>
);
