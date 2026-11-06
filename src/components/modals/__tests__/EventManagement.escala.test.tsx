import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ECollaboratorRole, type ICollaborator } from '../../../types/types';
import { EventManagement } from '../EventManagement';

// D3 (aprovada em 02/11/2026): a escala deixa de inventar R$ 50 e "Fotógrafo". Antes, todo colaborador
// adicionado em "Gerenciar Colaboradores" entrava como Fotógrafo e, sem valor por hora cadastrado, com
// R$ 50/h; apagar o valor virava 0. Agora começa com a função e o valor do próprio colaborador; sem
// valor, fica vazio (conta como zero no total); sem função, é preciso escolher antes de salvar.
const evento = {
  id: 'b1',
  title: 'Casamento Ana',
  startTime: '2027-01-10T21:00:00.000Z',
  startDate: '2027-01-10T21:00:00.000Z',
  location: 'Espaço VIP',
};
const semValor: ICollaborator = { id: 'c1', name: 'Ana Lima', role: ECollaboratorRole.SOUND_TECHNICIAN, user: { email: 'ana@teste.com' } };
// O valor por hora é Decimal no banco e chega como texto.
const comValor = { id: 'c2', name: 'Bruno Reis', role: ECollaboratorRole.DJ, hourlyRate: '45', user: { email: 'bruno@teste.com' } } as unknown as ICollaborator;
const semFuncao: ICollaborator = { id: 'c3', name: 'Caio Melo', user: { email: 'caio@teste.com' } };

const abrir = (collaborators: ICollaborator[]) => {
  const onSave = vi.fn();
  render(<EventManagement event={evento} collaborators={collaborators} onSave={onSave} onClose={vi.fn()} />);
  return onSave;
};
const custoTotal = () => screen.getByText('Custo Total').previousElementSibling;

describe('EventManagement — a escala não inventa função nem valor (D3)', () => {
  it('colaborador sem valor por hora: entra com a função dele e o valor vazio (antes: Fotógrafo e R$ 50)', () => {
    const onSave = abrir([semValor]);

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Ana Lima à equipe' }));

    expect(screen.getByLabelText('Função de Ana Lima')).toHaveValue('SOUND_TECHNICIAN');
    expect(screen.getByLabelText('Valor/hora (R$) de Ana Lima')).toHaveValue(null);
    expect(custoTotal()).toHaveTextContent(/R\$\s*0,00/);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Equipe (1)' }));

    expect(onSave).toHaveBeenCalledWith([
      { id: 'assignment-c1', collaboratorId: 'c1', role: 'SOUND_TECHNICIAN', estimatedHours: 4, hourlyRate: null },
    ]);
  });

  it('colaborador com valor por hora: entra com o valor dele, e o total é valor x horas', () => {
    const onSave = abrir([comValor]);

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Bruno Reis à equipe' }));

    expect(screen.getByLabelText('Função de Bruno Reis')).toHaveValue('DJ');
    expect(screen.getByLabelText('Valor/hora (R$) de Bruno Reis')).toHaveValue(45);
    expect(custoTotal()).toHaveTextContent(/R\$\s*180,00/);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Equipe (1)' }));

    expect(onSave).toHaveBeenCalledWith([
      { id: 'assignment-c2', collaboratorId: 'c2', role: 'DJ', estimatedHours: 4, hourlyRate: 45 },
    ]);
  });

  it('apagar o valor deixa o campo vazio e conta zero no total (antes: o campo virava 0)', () => {
    const onSave = abrir([comValor]);
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Bruno Reis à equipe' }));

    fireEvent.change(screen.getByLabelText('Valor/hora (R$) de Bruno Reis'), { target: { value: '' } });

    expect(screen.getByLabelText('Valor/hora (R$) de Bruno Reis')).toHaveValue(null);
    expect(custoTotal()).toHaveTextContent(/R\$\s*0,00/);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Equipe (1)' }));
    expect(onSave.mock.calls[0][0][0].hourlyRate).toBeNull();
  });

  it('colaborador sem função: a função fica vazia e "Salvar" só funciona depois de escolher', () => {
    const onSave = abrir([semFuncao]);
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Caio Melo à equipe' }));

    expect(screen.getByLabelText('Função de Caio Melo')).toHaveValue('');
    expect(screen.getByText('Escolha a função para salvar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar Equipe (1)' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Função de Caio Melo'), { target: { value: 'ASSISTANT' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Equipe (1)' }));

    expect(onSave).toHaveBeenCalledWith([
      { id: 'assignment-c3', collaboratorId: 'c3', role: 'ASSISTANT', estimatedHours: 4, hourlyRate: null },
    ]);
  });
});
