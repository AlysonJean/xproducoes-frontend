// Caminho: frontend/src/pages/admin/BookingDetailPage.tsx

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
// apiFetch was removed in favor of bookingAPI helpers
import type { BookingDetails } from '../../types/types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
// Assuming WhatsAppConfirmationModal is a shared component, moved to a consistent path
import { WhatsAppConfirmationModal } from '../../components/modals/WhatsAppConfirmationModal';
import { isToday } from 'date-fns';
import { useNotifications } from '../../contexts/NotificationContext';
import { EventManagement } from '../../components/modals/EventManagement';
import { bookingAPI, collaboratorsAPI, api } from '../../services/api';
import { createAndClickAnchor } from '../../utils/dom';
import { AdminLayout } from '../../components/admin/AdminLayout';

export const BookingDetailPage = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  // Função para exportar reserva
  const handleExportBooking = () => {
    if (!booking) return;
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(booking, null, 2));
  createAndClickAnchor({ href: dataStr, download: `reserva_${booking.id || 'detalhe'}.json` });
  };
  // Função para deletar reserva
  const handleDeleteBooking = async () => {
    if (!booking?.id) return;
    if (!window.confirm('Tem certeza que deseja deletar esta reserva?')) return;
    try {
  await bookingAPI.delete(booking.id);
  navigate('/admin/reservas');
    } catch (err: unknown) {
      alert('Erro ao deletar reserva: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    }
  };

  // Função para alterar reserva
  const handleEditBooking = () => {
    if (!booking?.id) return;
  navigate(`/admin/reservas/${booking.id}/editar`);
  };
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para o modal do WhatsApp
  const [isWppModalOpen, setWppModalOpen] = useState(false);
  const [wppMessage, setWppMessage] = useState('');
  const [wppContact, setWppContact] = useState('');
  const [actionToConfirm, setActionToConfirm] = useState<(() => Promise<void>) | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  // Estados para o modal de confirmação
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPrice, setConfirmPrice] = useState('');
  const [confirmCollaboratorId, setConfirmCollaboratorId] = useState('');
  const [confirmRole, setConfirmRole] = useState('ASSISTANT');
  // EventManagement modal
  const [isEventModalOpen, setEventModalOpen] = useState(false);
  const [availableCollaborators, setAvailableCollaborators] = useState<any[]>([]);
  const { user } = useAuth();

  const fetchAvailableCollaborators = async () => {
    try {
      const res = await collaboratorsAPI.getAll();
      if (res && res.data && (res.data as any).data && Array.isArray((res.data as any).data)) {
        setAvailableCollaborators((res.data as any).data);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    const fetchBooking = async () => {
      if (!id) return;
      setLoading(true);
      try {
  const res = await bookingAPI.getById(id);
        setBooking((res.data && (res.data as any).data) as BookingDetails);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : 'Não foi possível carregar os detalhes da reserva.'
        );
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [id]);

  const getClientContact = () => booking?.client?.phone || booking?.clientContact || booking?.clientEmail;

  const prepareWhatsAppMessage = (
    action: 'confirm' | 'cancel' | 'complete' | 'on_the_way' | 'arrived' | 'setup_complete' | 'thank_you'
  ) => {
    const contact = getClientContact();
    if (!contact) {
      alert('Este cliente não possui um número de contato registado.');
      return;
    }

    let message = '';
    switch (action) {
      case 'confirm':
        message = `Olá, ${booking?.client?.name || booking?.clientName}! A sua reserva #${booking?.id ? booking.id.substring(0, 8) : ''} foi confirmada. Estamos ansiosos pelo seu evento!`;
        setActionToConfirm(() => () => booking?.id ? handleStatusChange(booking.id, 'status', 'CONFIRMED') : Promise.resolve());
        break;
      case 'cancel':
        message = `Olá, ${booking?.client?.name || booking?.clientName}. Informamos que a sua reserva #${booking?.id ? booking.id.substring(0, 8) : ''} foi cancelada. Se precisar de ajuda, fale connosco.`;
        setActionToConfirm(() => () => booking?.id ? handleStatusChange(booking.id, 'status', 'CANCELLED') : Promise.resolve());
        break;
      case 'on_the_way':
        message = `Olá, ${booking?.client?.name || booking?.clientName}! Seu pedido #${booking?.id ? booking.id.substring(0, 8) : ''} está a caminho. Em breve estaremos aí!`;
        setActionToConfirm(() => () => booking?.id ? handleStatusChange(booking.id, 'deliveryStatus', 'ON_THE_WAY') : Promise.resolve());
        break;
      case 'arrived':
        message = `Chegamos! Estamos no local para o seu evento #${booking?.id ? booking.id.substring(0, 8) : ''}.`;
        setActionToConfirm(() => () => booking?.id ? handleStatusChange(booking.id, 'deliveryStatus', 'ARRIVED') : Promise.resolve());
        break;
      case 'setup_complete':
        message = `Montagem concluída para o seu evento #${booking?.id ? booking.id.substring(0, 8) : ''}. Qualquer coisa, estamos por aqui!`;
        setActionToConfirm(() => () => booking?.id ? handleStatusChange(booking.id, 'deliveryStatus', 'SETUP_COMPLETE') : Promise.resolve());
        break;
      case 'complete':
        message = `Pedido #${booking?.id ? booking.id.substring(0, 8) : ''} concluído. Obrigado pela preferência!`;
        setActionToConfirm(() => () => booking?.id ? handleStatusChange(booking.id, 'status', 'COMPLETED') : Promise.resolve());
        break;
      case 'thank_you':
        message = `Obrigado por escolher a nossa empresa! Se puder, deixe sua opinião sobre o serviço. Até a próxima!`;
        setActionToConfirm(() => async () => Promise.resolve());
        break;
      // Adicione outros casos aqui...
    }

    setWppMessage(message);
    setWppContact(contact.replace(/\D/g, '')); // Remove caracteres não numéricos
    setWppModalOpen(true);
  };

  const handleStatusChange = async (
    bookingId: string,
    field: 'status' | 'deliveryStatus',
    value: string
  ) => {
    try {
      setActionLoading(true);
      if (field === 'status') {
        await bookingAPI.updateStatus(bookingId, value);
      } else {
        await bookingAPI.updateStatus(bookingId, value);
      }

      const resp = await bookingAPI.getById(bookingId);
      setBooking((resp.data && (resp.data as any).data) as BookingDetails);
      addNotification({ type: 'success', title: 'Atualizado', message: 'Status atualizado com sucesso.' });
    } catch (err: unknown) {
      addNotification({ type: 'error', title: 'Erro', message: (err instanceof Error ? err.message : 'Erro ao atualizar status') });
    }
    finally {
      setActionLoading(false);
    }
  };

  const handleOpenEventManagement = async () => {
    await fetchAvailableCollaborators();
    setEventModalOpen(true);
  };

  const handleSaveAssignments = async (assignments: any[]) => {
    if (!booking?.id) return;
    try {
      setActionLoading(true);
      // Build collaborators payload expected by backend: array of { collaboratorId, role, estimatedHours, hourlyRate }
      const collaboratorsPayload = assignments.map((a: any) => ({
        collaboratorId: a.collaboratorId,
        role: a.role || 'PHOTOGRAPHER',
        totalHours: a.estimatedHours || 0,
        hourlyRate: a.hourlyRate || 0,
        totalPayment: (a.hourlyRate || 0) * (a.estimatedHours || 0)
      }));

  // Example: derive totalPrice from existing totalPrice or sum of assignments
  let totalPrice = booking.totalPrice ?? 0;
      if (!totalPrice) {
  totalPrice = collaboratorsPayload.reduce((sum: number, c: any) => sum + (c.hourlyRate || 0) * (c.estimatedHours || 0), 0);
      }

  await bookingAPI.confirmWithDetails(booking.id, { totalPrice, collaborators: collaboratorsPayload });
  const updatedResp = await bookingAPI.getById(booking.id);
  setBooking((updatedResp.data && (updatedResp.data as any).data) as BookingDetails);
      setEventModalOpen(false);
      addNotification({ type: 'success', title: 'Confirmado', message: 'Reserva confirmada e colaboradores atribuídos.' });
    } catch (err: unknown) {
      addNotification({ type: 'error', title: 'Erro', message: err instanceof Error ? err.message : 'Erro ao confirmar reserva' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmWpp = async () => {
    if (actionToConfirm) {
      await actionToConfirm();
    }
    setWppModalOpen(false);
    setActionToConfirm(null);
  };

  const handleConfirmWithDetails = async () => {
    if (!booking?.id) return;
    try {
      setActionLoading(true);
      const payload: any = {};
      if (confirmPrice) payload.totalPrice = Number(confirmPrice);
      if (confirmCollaboratorId) {
        payload.collaborators = [
          {
            collaboratorId: confirmCollaboratorId,
            role: confirmRole || 'ASSISTANT',
          },
        ];
      }
      await bookingAPI.confirmWithDetails(booking.id, payload);
      const updatedResp = await bookingAPI.getById(booking.id);
      setBooking((updatedResp.data && (updatedResp.data as any).data) as BookingDetails);
      setConfirmOpen(false);
      addNotification({ type: 'success', title: 'Confirmado', message: 'Reserva confirmada com sucesso.' });
    } catch (err: unknown) {
      addNotification({ type: 'error', title: 'Erro', message: err instanceof Error ? err.message : 'Erro ao confirmar reserva' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-card flex items-center justify-center">
        <LoadingSpinner label="A carregar detalhes..." />
  </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-card flex items-center justify-center">
        <div className="text-destructive bg-destructive/10 p-4 rounded-xl text-xl">
          {error}
        </div>
      </div>
    );
  }
  if (!booking) {
    return (
      <div className="min-h-screen bg-card flex items-center justify-center">
        <div className="text-muted-foreground text-lg">Reserva não encontrada.</div>
      </div>
    );
  }

  const isEventToday = isToday(new Date(booking.eventDate));

  return (
    <AdminLayout
      title={`Detalhes da Reserva #${booking.id ? booking.id.substring(0, 8) : ''}`}
      breadcrumbs={[{ name: 'Admin' }, { name: 'Reservas', href: '/admin/reservas' }, { name: 'Detalhes' }]}
    >
      <div className="flex justify-end items-center mb-4">
        <Link
          to="/admin/reservas"
          className="mr-auto bg-muted hover:bg-muted text-primary font-bold py-2 px-4 rounded-lg transition-colors border border-border"
        >
          &larr; Voltar
        </Link>
        <div className="flex gap-2">
          <button
            onClick={handleEditBooking}
            className="bg-accent hover:bg-accent text-accent-foreground py-2 px-4 rounded-lg font-bold border border-border"
          >
            Alterar Reserva
          </button>
          <button
            onClick={handleDeleteBooking}
            className="bg-destructive hover:bg-destructive text-destructive-foreground py-2 px-4 rounded-lg font-bold border border-border"
          >
            Deletar Reserva
          </button>
          <button
            onClick={() => navigate('/admin/reservas/nova')}
            className="bg-success hover:bg-success text-success-foreground py-2 px-4 rounded-lg font-bold border border-border"
          >
            ➕ Nova Reserva
          </button>
          <button
            onClick={() => handleExportBooking()}
            className="bg-info hover:bg-info text-info-foreground py-2 px-4 rounded-lg font-bold border border-border"
          >
            📊 Exportar
          </button>
        </div>
      </div>

      {/* Painel de Ações do Admin */}
      <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
        <h2 className="text-xl font-semibold mb-4 text-primary">Gerir Reserva</h2>
        <div className="flex flex-wrap gap-4">
          {booking.status !== 'CONFIRMED' && (
            <button
              onClick={() => {
                setConfirmPrice(String(booking.serviceValue || booking.totalPrice || ''));
                setConfirmOpen(true);
              }}
              className="bg-primary hover:bg-primary text-primary-foreground p-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              Confirmar Reserva
            </button>
          )}
          <button
            onClick={() => prepareWhatsAppMessage('confirm')}
            className="bg-success hover:bg-success text-success-foreground p-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            Confirmar e Notificar
          </button>
          <button
            onClick={() => prepareWhatsAppMessage('cancel')}
            className="bg-destructive hover:bg-destructive text-destructive-foreground p-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            Cancelar e Notificar
          </button>
          <button
            onClick={() => prepareWhatsAppMessage('complete')}
            className="bg-primary hover:bg-primary text-primary-foreground p-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            Concluir e Notificar
          </button>
          <button
            onClick={() => prepareWhatsAppMessage('thank_you')}
            className="bg-secondary hover:bg-secondary text-secondary-foreground p-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            Enviar Agradecimento
          </button>
        </div>
        {isEventToday && (
          <div className="mt-4 pt-4 border-t border-border">
            <h3 className="text-lg font-semibold mb-2 text-primary">
              Ações do Dia do Evento
            </h3>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => prepareWhatsAppMessage('on_the_way')} className="bg-info hover:bg-info text-info-foreground p-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                Notificar "A Caminho"
              </button>
              <button onClick={() => prepareWhatsAppMessage('arrived')} className="bg-warning hover:bg-warning text-warning-foreground p-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                Notificar "Chegamos"
              </button>
              <button onClick={() => prepareWhatsAppMessage('setup_complete')} className="bg-accent hover:bg-accent text-accent-foreground p-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                Notificar "Montagem Concluída"
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detalhes da Reserva */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Attachments / Comprovantes */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-lg font-semibold mb-3 text-primary">Comprovantes</h3>
            {booking.attachments && booking.attachments.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {booking.attachments.map((a: any) => (
                  <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="block border rounded overflow-hidden">
                    <img src={a.url} alt={a.filename || 'anexo'} className="w-full h-36 object-cover" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground">Nenhum comprovante anexado.</div>
            )}

            {/* Upload adicional (apenas admin ou criador) */}
            { (/* admin check */ true) && (
              <div className="mt-4">
                <label htmlFor="attachments-upload" className="block text-sm font-medium mb-1">Anexar Comprovante</label>
                <input id="attachments-upload" type="file" multiple onChange={async (e) => {
                  const files = e.target.files;
                  if (!files || !files.length) return;
                  try {
                    for (let i = 0; i < files.length; i++) {
                      const f = files[i];
                      const fd = new FormData();
                      fd.append('image', f);
                      fd.append('folder', 'bookings');
                      const uploadResp = await api.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                      const imageUrl = uploadResp.data && uploadResp.data.imageUrl ? uploadResp.data.imageUrl : uploadResp.data;
                      await api.post(`/bookings/${booking.id}/attachments`, { url: imageUrl, filename: f.name, mimeType: f.type });
                    }
                    const updated = await bookingAPI.getById(booking.id);
                    setBooking((updated.data && (updated.data as any).data) as any);
                    addNotification({ type: 'success', title: 'Upload', message: 'Comprovante(s) anexado(s) com sucesso.' });
                  } catch (err: unknown) {
                    addNotification({ type: 'error', title: 'Erro', message: err instanceof Error ? err.message : 'Erro ao anexar comprovante' });
                  }
                }} />
              </div>
            )}
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-lg font-semibold mb-3 text-primary">Informações do Cliente</h3>
            <div className="text-sm text-foreground space-y-1">
              <div><span className="text-muted-foreground">Nome:</span> {booking.client?.name || booking.clientName || '—'}</div>
              <div><span className="text-muted-foreground">Contato:</span> {booking.client?.phone || booking.clientContact || '—'}</div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-lg font-semibold mb-3 text-primary">Itens</h3>
            {booking.kits && booking.kits.length > 0 ? (
              <ul className="list-disc pl-5 text-foreground">
                {booking.kits.map((k: any) => (
                  <li key={k.id || (k as any).kitId}>{k.name || k.kit?.name || 'Kit'}</li>
                ))}
              </ul>
            ) : booking.kit ? (
              <div className="text-sm">{booking.kit.name}</div>
            ) : (
              <div className="text-muted-foreground text-sm">Sem itens associados.</div>
            )}
            {/* Colaboradores atribuídos */}
            {booking.eventCollaborators && booking.eventCollaborators.length > 0 && (
              <div className="mt-4">
                <h4 className="text-md font-semibold mb-2">Colaboradores</h4>
                <ul className="space-y-3">
                  {booking.eventCollaborators.map((ec: any) => (
                    <li key={ec.id} className="p-3 border rounded-lg bg-muted/40">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-semibold">{ec.collaborator?.user?.name || ec.collaborator?.name || '—'}</div>
                          <div className="text-sm text-muted-foreground">{ec.role}</div>
                        </div>
                        <div className="ml-auto text-sm text-foreground">
                          <div>Horas: {ec.totalHours ?? '—'}</div>
                          <div>Pago: R$ {ec.totalPayment ? Number(ec.totalPayment).toFixed(2) : '0.00'}</div>
                        </div>
                      </div>

                      {/* Payments for this collaborator */}
                      {ec.collaborator?.payments && ec.collaborator.payments.length > 0 && (
                        <div className="mt-3">
                          <div className="text-sm font-medium">Pagamentos</div>
                          <ul className="mt-2 space-y-1 text-sm">
                            {ec.collaborator.payments.map((p: any) => (
                              <li key={p.id} className="flex justify-between items-center">
                                <div>
                                  <div>{p.type} — R$ {Number(p.amount).toFixed(2)}</div>
                                  <div className="text-xs text-muted-foreground">{p.status}{p.paymentDate ? ` • ${new Date(p.paymentDate).toLocaleDateString()}` : ''}</div>
                                </div>
                                <div>
                                  {user?.role === 'ADMIN' && p.status !== 'PAID' && (
                                    <button onClick={async () => {
                                      try {
                                        await api.put(`/collaborator-payments/${p.id}`, { status: 'PAID' });
                                        const updated = await bookingAPI.getById(booking.id);
                                        setBooking((updated.data && (updated.data as any).data) as BookingDetails);
                                        addNotification({ type: 'success', title: 'Pago', message: 'Pagamento marcado como PAGO.' });
                                      } catch (err: unknown) {
                                        addNotification({ type: 'error', title: 'Erro', message: err instanceof Error ? err.message : 'Erro ao atualizar pagamento' });
                                      }
                                    }} className="px-3 py-1 bg-success text-success-foreground rounded text-sm">Marcar como pago</button>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={handleOpenEventManagement}
            className="bg-accent hover:bg-accent text-accent-foreground py-2 px-4 rounded-lg font-bold border border-border"
          >
            Gerenciar Colaboradores
          </button>
        </div>
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-lg font-semibold mb-3 text-primary">Resumo</h3>
            <div className="text-sm text-foreground space-y-1">
              <div><span className="text-muted-foreground">Data:</span> {new Date(booking.eventDate).toLocaleString()}</div>
              {booking.eventEndDate && (
                <div><span className="text-muted-foreground">Término:</span> {new Date(booking.eventEndDate).toLocaleString()}</div>
              )}
              <div><span className="text-muted-foreground">Status:</span> {booking.status || '—'}</div>
              {booking.deliveryStatus && (
                <div><span className="text-muted-foreground">Entrega:</span> {booking.deliveryStatus}</div>
              )}
              {booking.totalPrice !== undefined && booking.totalPrice !== null && (
                <div><span className="text-muted-foreground">Total:</span> R$ {Number(booking.totalPrice).toFixed(2)}</div>
              )}
              {/* Service value (if admin specified) */}
              {booking.serviceValue !== undefined && booking.serviceValue !== null && (
                <div><span className="text-muted-foreground">Valor do Serviço:</span> R$ {Number(booking.serviceValue).toFixed(2)}</div>
              )}
              {/* Payment proof (one URL) */}
              {booking.paymentProofUrl && (
                <div>
                  <span className="text-muted-foreground">Comprovante:</span>
                  <div className="mt-2">
                    <a href={booking.paymentProofUrl} target="_blank" rel="noreferrer" className="inline-block border rounded p-1 hover:shadow">
                      <img src={booking.paymentProofUrl} alt="Comprovante" className="w-40 h-28 object-cover rounded" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <WhatsAppConfirmationModal
        isOpen={isWppModalOpen}
        onClose={() => setWppModalOpen(false)}
        onConfirm={handleConfirmWpp}
        message={wppMessage}
        contactNumber={wppContact}
        isSending={actionLoading}
      />
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-50 p-4">
          <div className="bg-card border rounded-xl p-6 shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground">Confirmar reserva</h2>
              <button className="text-2xl text-muted-foreground hover:text-foreground" onClick={() => setConfirmOpen(false)} aria-label="Fechar">&times;</button>
            </div>
            <div className="space-y-3">
              <div>
                <label htmlFor="confirm-price" className="block text-sm text-muted-foreground mb-1">Valor do serviço (R$)</label>
                <input
                  id="confirm-price"
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 rounded border bg-background text-foreground"
                  value={confirmPrice}
                  onChange={(e) => setConfirmPrice(e.target.value)}
                  placeholder="Ex.: 500.00"
                />
              </div>
              <div>
                <label htmlFor="confirm-collaborator" className="block text-sm text-muted-foreground mb-1">Atribuir colaborador</label>
                <select
                  id="confirm-collaborator"
                  className="w-full px-3 py-2 rounded border bg-background text-foreground"
                  value={confirmCollaboratorId}
                  onChange={(e) => setConfirmCollaboratorId(e.target.value)}
                >
                  <option value="">(Opcional) Selecionar colaborador</option>
                  {availableCollaborators.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {confirmCollaboratorId && (
                <div>
                  <label htmlFor="confirm-role" className="block text-sm text-muted-foreground mb-1">Função</label>
                  <select
                    id="confirm-role"
                    className="w-full px-3 py-2 rounded border bg-background text-foreground"
                    value={confirmRole}
                    onChange={(e) => setConfirmRole(e.target.value)}
                  >
                    <option value="PHOTOGRAPHER">Fotógrafo</option>
                    <option value="ASSISTANT">Assistente</option>
                    <option value="PRODUCER">Produtor</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button className="toolbar-btn" onClick={() => setConfirmOpen(false)}>Cancelar</button>
              <button className="toolbar-btn today" onClick={handleConfirmWithDetails} disabled={!!actionLoading}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
      {isEventModalOpen && (
        <EventManagement
          event={{
            id: booking.id,
            title: booking.kit?.name || booking.clientName || 'Evento',
            startDate: booking.eventDate,
            startTime: new Date(booking.eventDate).toISOString(),
            endTime: booking.eventEndDate || undefined,
            location: booking.location || booking.eventLocation || '',
          }}
          collaborators={availableCollaborators}
          onSave={(assignments) => handleSaveAssignments(assignments)}
          onClose={() => setEventModalOpen(false)}
        />
      )}
    </AdminLayout>
  );
};
