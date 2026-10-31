import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../services/api', () => ({ apiFetch: vi.fn().mockResolvedValue([]) }));

import { EquipmentForm } from '../EquipmentFormPage';
import { ServiceForm } from '../ServiceFormPage';

// Auditoria do painel: os campos de preço diziam (€) — a empresa cobra em reais, e o símbolo
// errado arrisca preenchimento errado por quem cadastra.
describe('formulários do admin — moeda dos campos de preço', () => {
  it('equipamento: "Preço por Hora (R$)"', async () => {
    render(<EquipmentForm onSuccess={vi.fn()} onCancel={vi.fn()} />);
    expect(await screen.findByLabelText('Preço por Hora (R$)')).toBeInTheDocument();
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();
  });

  it('serviço: "Preço Base (R$)"', async () => {
    render(<ServiceForm onSuccess={vi.fn()} onCancel={vi.fn()} />);
    expect(await screen.findByLabelText('Preço Base (R$)')).toBeInTheDocument();
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();
  });
});
