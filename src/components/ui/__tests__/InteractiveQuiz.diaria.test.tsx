import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { apiFetch, getByBudget } = vi.hoisted(() => ({ apiFetch: vi.fn(), getByBudget: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch, recommendationAPI: { getByBudget } }));
vi.mock('@/services/api', () => ({ apiFetch, recommendationAPI: { getByBudget } }));

import { InteractiveQuiz } from '../InteractiveQuiz';

// Lote 13, diária nas telas (decisão do dono de 06/11). O teste da Home mostrava "Faixa estimada de
// investimento por hora", "/h" nos equipamentos sugeridos e "/hora" na mensagem do WhatsApp, e buscava os
// equipamentos por preço da hora. Com a chave "day", a faixa vira por diária pela regra do dono (diária = 4 ×
// o preço da hora) e a busca compara com os preços já gravados como diária.
const responder = async () => {
  render(<InteractiveQuiz />);
  fireEvent.click(screen.getByRole('button', { name: /Casamento/ }));
  // Os três passos ficam na página o tempo todo (só a opacidade muda); cada resposta avança 400 ms depois.
  fireEvent.click(screen.getByRole('button', { name: /Projeto Íntimo/ }));
  fireEvent.click(screen.getByRole('button', { name: /Salão Fechado/ }));
  await waitFor(() => expect(getByBudget).toHaveBeenCalled(), { timeout: 3000 });
};
const servidor = (unidade: 'hour' | 'day') => {
  apiFetch.mockImplementation((url: string) =>
    Promise.resolve(url === '/equipments/pricing-rules' ? { equipmentPriceUnit: unidade, kitPrice: 'PER_EVENT' } : []),
  );
  getByBudget.mockResolvedValue({ data: [{ id: 'eq-caixa', name: 'Caixa Ativa', pricePerHour: 720 }] });
};
const linkDoWhatsApp = () => decodeURIComponent((screen.getByRole('link', { name: /SOLICITAR PROPOSTA AGORA/ }) as HTMLAnchorElement).href);

describe('InteractiveQuiz — faixa e preços na unidade do servidor (lote 13)', { timeout: 15000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chave "hour": faixa por hora (R$ 80 a R$ 250), "/h" e "/hora", como hoje', async () => {
    servidor('hour');
    await responder();

    expect(getByBudget).toHaveBeenLastCalledWith(80, 250, 3);
    expect(await screen.findByText('Faixa estimada de investimento por hora')).toBeInTheDocument();
    expect(await screen.findByText(/720,00\/h$/)).toBeInTheDocument();
    expect(linkDoWhatsApp()).toMatch(/250,00\/hora/);
  });

  it('chave "day": faixa por diária (4 × a da hora: R$ 320 a R$ 1.000), "/diária" no item e no WhatsApp', async () => {
    servidor('day');
    await responder();

    await waitFor(() => expect(getByBudget).toHaveBeenLastCalledWith(320, 1000, 3));
    expect(await screen.findByText('Faixa estimada de investimento por diária')).toBeInTheDocument();
    expect(await screen.findByText(/720,00\/diária$/)).toBeInTheDocument();
    expect(linkDoWhatsApp()).toMatch(/1\.000,00\/diária/);
    expect(linkDoWhatsApp()).not.toMatch(/hora/);
    expect(screen.queryByText('Faixa estimada de investimento por hora')).not.toBeInTheDocument();
  });

  it('sem responder nada, o teste não consulta a chave (quem só abre a Home não gera consulta)', async () => {
    servidor('day');
    render(<InteractiveQuiz />);
    await new Promise((r) => setTimeout(r, 50));
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
