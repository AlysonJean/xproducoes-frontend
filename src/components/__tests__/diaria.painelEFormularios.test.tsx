import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { apiFetch, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));

import { EquipmentForm } from '../forms/EquipmentFormPage';
import { AdminBookingForm } from '../forms/AdminBookingForm';
import { ManualBookingModal } from '../modals/ManualBookingModal';
import EquipmentListPage from '../../pages/admin/EquipmentListPage';

// Lote 13, diária nas telas (decisão do dono de 06/11). No painel, o cadastro e a lista de equipamentos diziam
// "Preço por Hora" e "/h", e os textos do valor final diziam "pelas horas do evento". A coluna continua
// pricePerHour (sem mudar o banco); os textos seguem a chave do servidor (GET /equipments/pricing-rules).
const CAIXA = { id: 'eq-caixa', name: 'Caixa Ativa', pricePerHour: 720, status: 'ACTIVE', category: { name: 'Som' } };
const KIT = { id: 'kit-1', name: 'Kit Som', price: 1200 };
const servidor = (unidade: 'hour' | 'day') =>
  apiFetch.mockImplementation((url: string) => {
    if (url === '/equipments/pricing-rules') return Promise.resolve({ equipmentPriceUnit: unidade, kitPrice: 'PER_EVENT' });
    if (url === '/equipments') return Promise.resolve([CAIXA]);
    if (url === '/kits') return Promise.resolve([KIT]);
    return Promise.resolve([]);
  });

describe('Diária no painel (lote 13)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('cadastro do equipamento com a chave "day": "Preço da Diária (R$)" no mesmo campo pricePerHour', async () => {
    servidor('day');
    render(<EquipmentForm onSuccess={vi.fn()} onCancel={vi.fn()} />);

    const campo = await screen.findByLabelText('Preço da Diária (R$)');
    expect(campo).toHaveAttribute('name', 'pricePerHour');
    expect(screen.queryByLabelText('Preço por Hora (R$)')).not.toBeInTheDocument();
  });

  it('lista de equipamentos com a chave "day": coluna "Preço/diária", "/diária" na linha e o subtítulo', async () => {
    servidor('day');
    render(<MemoryRouter><EquipmentListPage /></MemoryRouter>);

    expect(await screen.findByText('Preço/diária')).toBeInTheDocument();
    expect(screen.getByText('/diária')).toBeInTheDocument();
    expect(screen.getByText('Cadastro, preço da diária e status de manutenção.')).toBeInTheDocument();
    expect(screen.queryByText('Preço/hora')).not.toBeInTheDocument();
    expect(screen.queryByText('/h')).not.toBeInTheDocument();
  });

  it('lista de equipamentos com a chave "hour": os textos de hoje', async () => {
    servidor('hour');
    render(<MemoryRouter><EquipmentListPage /></MemoryRouter>);

    expect(await screen.findByText('Preço/hora')).toBeInTheDocument();
    expect(await screen.findByText('/h')).toBeInTheDocument();
    expect(screen.getByText('Cadastro, preço por hora e status de manutenção.')).toBeInTheDocument();
  });

  it('"Adicionar Reserva Manual" com a chave "day": "/diária" no equipamento e "pelas diárias do evento"', async () => {
    servidor('day');
    render(<ManualBookingModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);

    expect(await screen.findByLabelText(/^Caixa Ativa - R\$\s720,00\/diária$/)).toBeInTheDocument();
    // Auditoria do orçamento (12/11/2026), O12: o texto diz também que o frete e o pedágio ficam à parte.
    expect(screen.getByText('Opcional. Em branco, é calculado pelo kit ou pelos equipamentos e pelas diárias do evento. O frete e o pedágio, quando houver, entram à parte: total = itens + frete + pedágio.')).toBeInTheDocument();
    expect(screen.queryByText(/pelas horas do evento/)).not.toBeInTheDocument();
  });

  it('"Adicionar Reserva Manual" com a chave "hour": os textos de hoje', async () => {
    servidor('hour');
    render(<ManualBookingModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);

    expect(await screen.findByLabelText(/^Caixa Ativa - R\$\s720,00\/hora$/)).toBeInTheDocument();
    // Auditoria do orçamento (12/11/2026), O12: o texto diz também que o frete e o pedágio ficam à parte.
    expect(screen.getByText('Opcional. Em branco, é calculado pelo kit ou pelos equipamentos e pelas horas do evento. O frete e o pedágio, quando houver, entram à parte: total = itens + frete + pedágio.')).toBeInTheDocument();
  });

  it('formulário de reservas (criação) com a chave "day": "pelas diárias do evento"', async () => {
    servidor('day');
    render(<AdminBookingForm defaultClientType="manual" onSuccess={vi.fn()} onCancel={vi.fn()} />);

    expect(await screen.findByText(/Em branco, é calculado pelos itens e pelas diárias do evento\./)).toBeInTheDocument();
    expect(screen.queryByText(/pelas horas do evento/)).not.toBeInTheDocument();
  });
});
