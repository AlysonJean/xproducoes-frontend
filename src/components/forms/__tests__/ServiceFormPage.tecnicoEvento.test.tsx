import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));

import { ServiceForm } from '../ServiceFormPage';
import type { Service } from '../../../types/types';

const TECNICO = {
  id: 'sv-1', name: 'Técnico de Som e Operação Profissional', description: 'Operação de som do começo ao fim',
  price: 300, duration: 180, status: 'ACTIVE', coversWholeEvent: true,
} as unknown as Service;

const renderForm = (initialData: Service | null = null) => {
  apiFetch.mockResolvedValue({ id: 'sv-1' });
  render(<ServiceForm initialData={initialData} onSuccess={vi.fn()} onCancel={vi.fn()} />);
};

const caixa = () => screen.getByLabelText('Pode acompanhar o evento todo') as HTMLInputElement;

const enviado = async (method: 'POST' | 'PUT') => {
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
  await waitFor(() => expect(apiFetch.mock.calls.some((c) => c[1]?.method === method)).toBe(true));
  const call = apiFetch.mock.calls.find((c) => c[1]?.method === method)!;
  return { url: call[0] as string, body: call[1].body as FormData };
};

const preencherBasico = () => {
  fireEvent.change(screen.getByLabelText('Nome do Serviço'), { target: { value: 'Técnico de Luz' } });
  fireEvent.change(screen.getByLabelText('Preço Base (R$)'), { target: { value: '250' } });
  fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Luz do começo ao fim' } });
  fireEvent.change(screen.getByLabelText('Duração Padrão (horas)'), { target: { value: '3' } });
};

// Lote 13, técnico durante o evento (decisão do dono de 06/11/2026): o dono marca no cadastro do serviço "Pode
// acompanhar o evento todo". O serviço marcado aparece na caixa do técnico do pedido e cobra pelas horas do evento: o
// preço vale para a duração cadastrada e cada hora a mais sai proporcional. O formulário manda multipart, então o
// valor vai como texto, sempre "true" ou "false" (o servidor recusa outro valor; sem o campo, deixa como está).
describe('Formulário do serviço — "Pode acompanhar o evento todo"', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('a caixa, desmarcada no serviço novo, com a ajuda de uma linha', () => {
    renderForm();
    expect(caixa().checked).toBe(false);
    expect(screen.getByText('O preço vale para a duração cadastrada; cada hora a mais do evento sai proporcional.')).toBeInTheDocument();
    expect(caixa()).toHaveAccessibleDescription('O preço vale para a duração cadastrada; cada hora a mais do evento sai proporcional.');
  });

  it('marcada: o envio manda "true", com a duração em minutos', async () => {
    renderForm();
    preencherBasico();
    fireEvent.click(caixa());

    const { url, body } = await enviado('POST');
    expect(url).toBe('/services');
    expect(body.get('coversWholeEvent')).toBe('true');
    expect(body.get('duration')).toBe('180');
  });

  it('desmarcada: o envio manda "false" (nunca vazio)', async () => {
    renderForm();
    preencherBasico();

    const { body } = await enviado('POST');
    expect(body.get('coversWholeEvent')).toBe('false');
  });

  it('edição: carrega marcada e, desmarcando, manda "false"', async () => {
    renderForm(TECNICO);
    await waitFor(() => expect(caixa().checked).toBe(true));
    fireEvent.click(caixa());

    const { url, body } = await enviado('PUT');
    expect(url).toBe('/services/sv-1');
    expect(body.get('coversWholeEvent')).toBe('false');
  });

  it('o rascunho guarda a marcação e a restaura', async () => {
    localStorage.setItem('xp-draft-service-new', JSON.stringify({
      values: { name: 'Técnico de Luz', description: 'Luz do começo ao fim', price: '250', duration: '3', status: 'ACTIVE', coversWholeEvent: true },
      savedAt: Date.now(),
    }));
    renderForm();
    fireEvent.click(await screen.findByRole('button', { name: 'Restaurar' }));
    expect(caixa().checked).toBe(true);

    fireEvent.click(caixa());
    await waitFor(() => expect(JSON.parse(localStorage.getItem('xp-draft-service-new')!).values.coversWholeEvent).toBe(false));
  });
});
