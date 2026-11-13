import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { post, useAuth } = vi.hoisted(() => ({ post: vi.fn(), useAuth: vi.fn() }));
vi.mock('../../../services/api', () => ({ api: { post } }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../components/SEO', () => ({ SEO: () => null }));

import { BriefingPage } from '../BriefingPage';

// Auditoria do orçamento (12/11/2026), fuso: a data mínima do briefing era o dia no aparelho de quem preenche. Em Tóquio,
// às 13:00 de 20/03 em Brasília (01:00 de 21/03 lá), a pessoa não conseguia escolher 20/03, o dia do evento em BH. O
// horário pedido é o de Brasília, e a tela diz isso.
const ORIGINAL_TZ = process.env.TZ;
afterAll(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

describe('BriefingPage — data e horário de Brasília', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuth.mockReturnValue({ user: null, setAuthenticatedUser: vi.fn() });
    process.env.TZ = 'Asia/Tokyo';
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2027-03-20T16:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('em Tóquio, já 21/03 lá e ainda 20/03 em Brasília: a data mínima é 20/03 e o horário diz "Horário de Brasília."', () => {
    render(
      <MemoryRouter initialEntries={['/briefing']}>
        <BriefingPage />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Qual é a data?')).toHaveAttribute('min', '2027-03-20');
    expect(screen.getByText('Horário de Brasília.')).toBeInTheDocument();
  });
});
