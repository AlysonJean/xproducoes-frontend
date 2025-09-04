// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { AuthContext } from '../../contexts/AuthContext';
import { NotificationContext } from '../../contexts/NotificationContext';
import { GoogleAuthButton } from '../../pages/auth/GoogleAuthButton';

describe('GoogleAuthButton', () => {
  it('renders the Google auth button', () => {
    const handleOAuthToken = vi.fn(() => Promise.resolve());
    const addNotification = vi.fn();

    const { container } = render(
      <AuthContext.Provider
        value={{
          isAuthenticated: false,
          isLoading: false,
          user: null,
          logout: vi.fn(),
          handleOAuthToken
        }}
      >
        <NotificationContext.Provider
          value={{
            notifications: [],
            addNotification,
            removeNotification: vi.fn(),
            clearAll: vi.fn()
          }}
        >
          <GoogleAuthButton />
        </NotificationContext.Provider>
      </AuthContext.Provider>
    );

    const button = container.querySelector('button');
    expect(button).toBeTruthy();
    expect(button?.textContent).toContain('Entrar com Google');
  });

  it('button is clickable and has proper attributes', () => {
    const handleOAuthToken = vi.fn(() => Promise.resolve());
    const addNotification = vi.fn();

    const { container } = render(
      <AuthContext.Provider
        value={{
          isAuthenticated: false,
          isLoading: false,
          user: null,
          logout: vi.fn(),
          handleOAuthToken
        }}
      >
        <NotificationContext.Provider
          value={{
            notifications: [],
            addNotification,
            removeNotification: vi.fn(),
            clearAll: vi.fn()
          }}
        >
          <GoogleAuthButton />
        </NotificationContext.Provider>
      </AuthContext.Provider>
    );

    const button = container.querySelector('button');
    expect(button).toBeTruthy();
    expect(button?.disabled).toBe(false);
    expect(button?.className).toContain('bg-red-700');
  });
});
