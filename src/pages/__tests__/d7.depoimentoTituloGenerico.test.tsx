import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../services/api', () => ({ apiFetch }));
vi.mock('../../components/ui/TestimonialCard', () => ({ TestimonialCard: () => <div>depoimento</div> }));

import { ReviewDetailPage } from '../ReviewDetailPage';

// D7 (aprovada em 02/11/2026): "troco títulos ... por textos genéricos nas páginas com dados". A aba da página de um
// depoimento era "Depoimento de <nome de quem escreveu>", e o Google Analytics manda o título da aba em todo evento da
// página (ex.: o clique no WhatsApp flutuante). Agora a aba diz "Depoimento de cliente"; o nome segue no texto da página.
describe('D7 — título genérico na página do depoimento', () => {
  it('a aba não leva o nome de quem escreveu', async () => {
    apiFetch.mockResolvedValue({ id: 'r1', rating: 5, comment: 'Som impecável na festa.', user: { name: 'Bruno Souza' } });

    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/depoimentos/bruno-souza']}>
          <Routes>
            <Route path="/depoimentos/:slug" element={<ReviewDetailPage />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>,
    );

    expect(await screen.findByText('depoimento')).toBeInTheDocument();
    await waitFor(() => {
      expect(document.title).toBe('Depoimento de cliente | X Produções');
    });
    expect(document.title).not.toMatch(/bruno/i);
  });
});
