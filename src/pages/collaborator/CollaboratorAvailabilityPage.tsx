import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Clock,
} from 'lucide-react';
import { CollaboratorLayout } from '../../components/collaborator/CollaboratorLayout';
import { CollaboratorError } from '../../components/collaborator/CollaboratorStates';
import { SimpleCard } from '../../components/ui/Cards';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import type { StandardVariant } from '../../components/ui/StandardTypes';
import { collaboratorProfileAPI } from '../../services/api';
import { useNotifications } from '@/contexts/NotificationContext';
import { logger } from '../../utils/logger';

interface Availability {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'AVAILABLE' | 'BUSY' | 'OFF_DUTY' | 'VACATION';
  notes?: string;
}

const BREADCRUMBS = [
  { name: 'Colaborador', href: '/colaborador/painel' },
  { name: 'Disponibilidade' },
];

const STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'Disponível' },
  { value: 'BUSY', label: 'Ocupado' },
  { value: 'OFF_DUTY', label: 'Folga' },
];

const statusLabels: Record<string, string> = {
  AVAILABLE: 'Disponível',
  BUSY: 'Ocupado',
  OFF_DUTY: 'Folga',
  VACATION: 'Férias',
};

const statusVariants: Record<string, StandardVariant> = {
  AVAILABLE: 'success',
  BUSY: 'destructive',
  OFF_DUTY: 'ghost',
  VACATION: 'info',
};

// Data de hoje no fuso local (toISOString() devolve a data em UTC — depois das 21h no horário de
// Brasília já seria "amanhã").
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// A data da disponibilidade é gravada como meia-noite UTC (new Date('AAAA-MM-DD') no backend).
// Formatar no fuso local mostrava o dia anterior no Brasil (UTC-3).
const formatAvailabilityDate = (value: string) =>
  new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

const CollaboratorAvailabilityPage: React.FC = () => {
  const { addNotification } = useNotifications();
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAvailability, setNewAvailability] = useState({
    date: todayLocal(),
    startTime: '09:00',
    endTime: '17:00',
    status: 'AVAILABLE' as Availability['status'],
    notes: ''
  });

  const loadAvailabilities = React.useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const response = await collaboratorProfileAPI.getAvailability();
      const data = response.data?.data ?? response.data;
      setAvailabilities(Array.isArray(data) ? data : []);
    } catch (error) {
      logger.error('Erro ao carregar disponibilidades:', 'CollaboratorAvailabilityPage', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAvailabilities();
  }, [loadAvailabilities]);

  const handleAddAvailability = async () => {
    try {
      if (!newAvailability.date || !newAvailability.startTime || !newAvailability.endTime) {
        addNotification({
          type: 'warning',
          title: 'Atenção',
          message: 'Preencha todos os campos obrigatórios.'
        });
        return;
      }

      setSaving(true);
      await collaboratorProfileAPI.updateAvailability({
        // Achado: o front mandava só `startDate`, mas a validação do backend (availabilityCreateSchema)
        // exige `date` — toda tentativa de cadastrar voltava 400.
        date: newAvailability.date,
        startTime: newAvailability.startTime,
        endTime: newAvailability.endTime,
        status: newAvailability.status,
        notes: newAvailability.notes
      });

      addNotification({
        type: 'success',
        title: 'Sucesso',
        message: 'Disponibilidade adicionada!'
      });
      setShowAddForm(false);
      loadAvailabilities();
    } catch (error) {
      logger.error('Erro ao adicionar:', 'CollaboratorAvailabilityPage', error);
      addNotification({
        type: 'error',
        title: 'Erro',
        message: 'Erro ao adicionar disponibilidade.'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <CollaboratorLayout
      title="Disponibilidade"
      breadcrumbs={BREADCRUMBS}
      actions={
        !showAddForm && (
          <Button size="sm" onClick={() => setShowAddForm(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Nova data
          </Button>
        )
      }
    >
      <div className="space-y-6">
        {showAddForm && (
          <SimpleCard title="Adicionar disponibilidade">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="date"
                label="Data"
                size="sm"
                value={newAvailability.date}
                onChange={(e) => setNewAvailability({ ...newAvailability, date: e.target.value })}
              />
              <Select
                label="Status"
                size="sm"
                options={STATUS_OPTIONS}
                value={newAvailability.status}
                onChange={(e) => setNewAvailability({ ...newAvailability, status: e.target.value as Availability['status'] })}
              />
              <Input
                type="time"
                label="Início"
                size="sm"
                value={newAvailability.startTime}
                onChange={(e) => setNewAvailability({ ...newAvailability, startTime: e.target.value })}
              />
              <Input
                type="time"
                label="Fim"
                size="sm"
                value={newAvailability.endTime}
                onChange={(e) => setNewAvailability({ ...newAvailability, endTime: e.target.value })}
              />
              <div className="md:col-span-2">
                <Input
                  type="text"
                  label="Observações"
                  size="sm"
                  value={newAvailability.notes}
                  onChange={(e) => setNewAvailability({ ...newAvailability, notes: e.target.value })}
                  placeholder="Ex.: disponível apenas à tarde"
                />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button size="sm" onClick={handleAddAvailability} isLoading={saving}>
                Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)} disabled={saving}>
                Cancelar
              </Button>
            </div>
          </SimpleCard>
        )}

        <SimpleCard title="Próximas disponibilidades">
          {loading ? (
            <div className="space-y-3" role="status" aria-label="Carregando disponibilidades">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : loadError ? (
            <CollaboratorError
              message="Não conseguimos carregar suas disponibilidades."
              onRetry={loadAvailabilities}
            />
          ) : availabilities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma disponibilidade cadastrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-border text-left text-sm font-medium text-muted-foreground">
                    <th scope="col" className="py-3 px-4">Data</th>
                    <th scope="col" className="py-3 px-4">Horário</th>
                    <th scope="col" className="py-3 px-4">Status</th>
                    <th scope="col" className="py-3 px-4">Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {availabilities.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Calendar className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                          <span>{formatAvailabilityDate(item.date)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Clock className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                          <span>{item.startTime} – {item.endTime}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={statusVariants[item.status] ?? 'ghost'}>
                          {statusLabels[item.status] ?? item.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{item.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SimpleCard>
      </div>
    </CollaboratorLayout>
  );
};

export default CollaboratorAvailabilityPage;
