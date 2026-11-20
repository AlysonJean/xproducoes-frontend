import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { BookingListItem } from '../BookingListItem';
import type { SafeBooking } from '../../../types/types';

// Auditoria completa (19/11/2026), "Minhas Reservas" e o painel do cliente (BookingListItem): o GET /bookings/user manda
// equipments[].name, o kit em `kit` e o endereço nos campos da reserva. A lista lia equipments[].equipment.name (todo
// equipamento virava "Equipamento"), kits[] (o kit nunca aparecia, e a reserva só de kit dizia "Nenhum equipamento
// listado") e venue (o endereço não saía).
const reserva = (over: Record<string, unknown>) =>
  ({
    id: 'XP-ANA-1', eventDate: '2027-12-21T01:00:00.000Z', eventTitle: 'Formatura', status: 'CONFIRMED', totalPrice: 1500,
    equipments: [], ...over,
  }) as unknown as SafeBooking;
const itensDe = (titulo: string) =>
  Array.from(screen.getByRole('heading', { name: titulo }).nextElementSibling!.querySelectorAll('li')).map((li) => li.textContent);

describe('BookingListItem — itens e endereço da reserva (auditoria de 19/11/2026)', () => {
  it('forma atual: o nome de cada equipamento, o kit em `kit` e o endereço nos campos da reserva', () => {
    render(
      <BookingListItem
        booking={reserva({
          equipments: [{ id: 'eq1', name: 'Caixa ativa 15 pol' }, { id: 'eq2', name: 'Microfone sem fio' }],
          kit: { id: 'k5', name: 'Kit 05' },
          street: 'Rua A', addressNumber: '10', neighborhood: 'Savassi', city: 'Belo Horizonte', state: 'MG', zipCode: '30140-000',
        })}
      />,
    );

    expect(itensDe('Kit Reservado:')).toEqual(['Kit 05']);
    expect(itensDe('Equipamentos Reservados:')).toEqual(['Caixa ativa 15 pol', 'Microfone sem fio']);
    expect(screen.queryByText('Equipamento')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Local do Evento:' })).toBeInTheDocument();
    expect(screen.getByText('Rua A, 10, Savassi, Belo Horizonte - MG, CEP 30140-000')).toBeInTheDocument();
  });

  it('reserva só de kit: mostra o kit, sem "Nenhum equipamento listado"', () => {
    render(<BookingListItem booking={reserva({ kit: { id: 'k8', name: 'Kit 08 (sem palco)' } })} />);

    expect(itensDe('Kit Reservado:')).toEqual(['Kit 08 (sem palco)']);
    expect(screen.queryByText(/Nenhum equipamento listado/)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Equipamentos Reservados:' })).not.toBeInTheDocument();
  });

  it('forma antiga (equipments[].equipment, kits[] e venue) continua lida', () => {
    render(
      <BookingListItem
        booking={reserva({
          equipments: [{ equipmentId: 'eq3', equipment: { id: 'eq3', name: 'Mesa de som 16 canais' } }],
          kits: [{ kitId: 'k1', kit: { id: 'k1', name: 'Kit 01' } }],
          venue: { street: 'Av. Brasil, 100', city: 'Belo Horizonte', state: 'MG', zipCode: '30140-001' },
        })}
      />,
    );

    expect(itensDe('Kit Reservado:')).toEqual(['Kit 01']);
    expect(itensDe('Equipamentos Reservados:')).toEqual(['Mesa de som 16 canais']);
    expect(screen.getByText('Av. Brasil, 100, Belo Horizonte - MG, CEP 30140-001')).toBeInTheDocument();
  });

  it('sem kit e sem equipamento: "— Nenhum equipamento listado", e sem o bloco do local', () => {
    render(<BookingListItem booking={reserva({})} />);

    expect(itensDe('Equipamentos Reservados:')).toEqual(['— Nenhum equipamento listado']);
    expect(screen.queryByRole('heading', { name: 'Kit Reservado:' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Local do Evento:' })).not.toBeInTheDocument();
  });
});
