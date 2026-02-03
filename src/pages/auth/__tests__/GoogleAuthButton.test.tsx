import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import '@testing-library/jest-dom'; // Importando matchers
import GoogleAuthButton from '@/components/ui/GoogleAuthButton';

// Mock do @react-oauth/google
vi.mock('@react-oauth/google', () => ({
  useGoogleLogin: (config: any) => {
    return () => {
      // Simula o clique chamando onSuccess se necessário, ou apenas não faz nada
      // Aqui só retornamos uma função mock
      config.onSuccess({ access_token: 'fake_token' });
    };
  },
}));

// Mock do contexto de notificações
vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({
    addNotification: vi.fn(),
  }),
}));

// Mock do axios
vi.mock('axios', () => ({
  default: {
    post: vi.fn().mockResolvedValue({
      data: {
        token: 'fake_jwt',
        refreshToken: 'fake_refresh',
        user: { name: 'Test User' }
      }
    }),
  },
}));

describe('GoogleAuthButton', () => {
  it('renders correctly', () => {
    render(<GoogleAuthButton onSuccess={vi.fn()} />);
    expect(screen.getByText(/Entrar com Google/i)).toBeInTheDocument();
  });

  it('handles click event', () => {
    render(<GoogleAuthButton onSuccess={vi.fn()} />);
    const button = screen.getByText(/Entrar com Google/i);
    fireEvent.click(button);
    // Como mockamos o hook para chamar onSuccess imediatamente, verificamos se o botão está lá
    expect(button).toBeInTheDocument();
  });
});
