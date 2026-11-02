import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileDown, FileText, Plus, Trash2, Upload } from 'lucide-react';
import { apiFetch } from '@/services/api';
import type { BookingDetails } from '@/types/types';
import { formatPrice } from '@/utils/formatPrice';
import { bookingStatusLabel, bookingStatusVariant } from '@/utils/bookingStatus';
import { Badge, Button, Card, ConfirmModal, Modal, buttonVariants } from '@/components/ui/StandardComponents';
import { ClientPage, ClientPageError, ClientPageLoading } from '../../components/client/ClientPage';
import { logger } from '../../utils/logger';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { BookingChatPanel } from '../../components/client/BookingChatPanel';
import { generateBookingProposalPdf } from '../../utils/generateBookingProposalPdf';

export const BookingDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteProofModal, setShowDeleteProofModal] = useState(false);
  const [proofToDelete, setProofToDelete] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingProposal, setDownloadingProposal] = useState(false);
  const [deletingProof, setDeletingProof] = useState(false);

  const fetchBookingDetails = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await apiFetch(`/bookings/${id}`);
      setBooking(response as BookingDetails);
      setError(null); // Limpar erro anterior
    } catch (err: unknown) {
      // ✅ Mensagens de erro contextuais baseadas no status HTTP
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 404) {
          setError('Reserva não encontrada. Ela pode ter sido cancelada ou excluída.');
        } else if (status === 403) {
          setError('Você não tem permissão para visualizar esta reserva.');
        } else if (status === 401) {
          setError('Sessão expirada. Faça login novamente.');
        } else if (status !== undefined && status >= 500) {
          setError('Erro no servidor. Tente novamente em alguns instantes.');
        } else {
          setError(err.response?.data?.message || 'Erro ao carregar detalhes da reserva.');
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Não foi possível carregar os detalhes da reserva.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBookingDetails();
    }, [fetchBookingDetails]);

  const handleDeleteProof = (proofId: string) => {
    setProofToDelete(proofId);
    setShowDeleteProofModal(true);
  };

  const confirmDeleteProof = async () => {
    if (!proofToDelete) return;

    try {
      setDeletingProof(true);
      await apiFetch(`/bookings/${id}/attachments/${proofToDelete}`, {
        method: 'DELETE',
      });

      setShowDeleteProofModal(false);
      setProofToDelete(null);

      // Atualizar a lista de comprovantes após exclusão
      await fetchBookingDetails();
    } catch (error) {
      logger.error('Erro ao excluir comprovante:', 'BookingDetailsPage', error);
      // Antes a falha era silenciosa (só logger): o comprovante continuava lá sem explicação.
      addNotification({ type: 'error', title: 'Erro', message: 'Não foi possível excluir o comprovante. Tente novamente.' });
      setShowDeleteProofModal(false);
      setProofToDelete(null);
    } finally {
      setDeletingProof(false);
    }
  };

  const cancelDeleteProof = () => {
    setShowDeleteProofModal(false);
    setProofToDelete(null);
  };

  const handleUploadClick = () => {
    setShowUploadModal(true);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadProof = async () => {
    if (!selectedFile || !id) return;

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', selectedFile);

      await apiFetch(`/bookings/${id}/attachments`, {
        method: 'POST',
        body: formData,
      });

      // Atualizar a lista de comprovantes após upload
      await fetchBookingDetails();

      setShowUploadModal(false);
      setSelectedFile(null);

      // Reset file input
      const fileInput = document.getElementById('proof-file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      logger.error('Erro ao enviar comprovante:', 'BookingDetailsPage', error);
      // Antes a falha era silenciosa: o modal só parava de girar, sem dizer o que houve.
      addNotification({ type: 'error', title: 'Erro', message: 'Não foi possível enviar o comprovante. Tente novamente.' });
    } finally {
      setUploading(false);
    }
  };

  const cancelUpload = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    const fileInput = document.getElementById('proof-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Achado (auditoria de produto): o gerador de proposta em PDF (jsPDF + logo/branding) só
  // existia no lado admin, para propostas montadas manualmente numa ligação. O cliente não
  // tinha nenhuma forma de baixar um PDF formal do próprio orçamento já existente.
  const handleDownloadProposal = async () => {
    if (!booking) return;
    try {
      setDownloadingProposal(true);
      await generateBookingProposalPdf(booking);
    } catch (error) {
      logger.error('Erro ao gerar PDF da proposta:', 'BookingDetailsPage', error);
      addNotification({ type: 'error', title: 'Erro', message: 'Não foi possível gerar o PDF agora.' });
    } finally {
      setDownloadingProposal(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <ClientPage width="6xl">
        <ClientPageLoading label="Carregando reserva..." />
      </ClientPage>
    );
  }

  if (error || !booking) {
    return (
      <ClientPage
        width="6xl"
        title="Detalhes da Reserva"
        actions={
          <Link to="/minhas-reservas" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar para Reservas
          </Link>
        }
      >
        <ClientPageError message={error || 'Reserva não encontrada'} onRetry={fetchBookingDetails} />
      </ClientPage>
    );
  }

  return (
    <ClientPage
      width="6xl"
      title="Detalhes da Reserva"
      description={<span className="break-all">Reserva #{booking.id}</span>}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadProposal}
            isLoading={downloadingProposal}
            leftIcon={<FileDown className="h-4 w-4" aria-hidden="true" />}
          >
            {downloadingProposal ? 'Gerando PDF...' : 'Baixar proposta (PDF)'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/minhas-reservas')}
            leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
          >
            Voltar
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações Principais */}
        <div className="lg:col-span-2 space-y-6">
          {/* Detalhes do Evento */}
          <Card padding>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Detalhes do Evento</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-muted-foreground">Data do Evento</dt>
                <dd className="font-medium text-foreground">{formatDate(booking.eventDate)}</dd>
              </div>
              {booking.eventEndDate && (
                <div>
                  <dt className="text-sm text-muted-foreground">Data de Término</dt>
                  <dd className="font-medium text-foreground">{formatDate(booking.eventEndDate)}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-muted-foreground">Local</dt>
                <dd className="font-medium text-foreground">{booking.location || booking.eventLocation || 'Não informado'}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Status</dt>
                <dd className="mt-1">
                  <Badge variant={bookingStatusVariant(booking.status)} size="lg">
                    {bookingStatusLabel(booking.status)}
                  </Badge>
                </dd>
              </div>
            </dl>
          </Card>

          {/* Itens da Reserva */}
          {((booking.kits && booking.kits.length > 0) || (booking.equipments && booking.equipments.length > 0) || (booking.services && booking.services.length > 0) || booking.kit) && (
            <Card padding>
              <h2 className="text-xl font-semibold mb-4 text-foreground">Itens da Reserva</h2>
              <div className="space-y-4">
                {/* Kits */}
                {((booking.kits && booking.kits.length > 0) || booking.kit) && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">Kits</h3>
                    <div className="space-y-2">
                      {booking.kits && booking.kits.length > 0 ? (
                        booking.kits.map((kitItem, idx) => {
                          const kitName = 'kit' in kitItem ? kitItem.kit?.name : kitItem.name;
                          return (
                            <div key={idx} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg">
                              <p className="font-medium text-foreground">{kitName || 'Kit'}</p>
                              <p className="text-sm text-primary font-semibold">Incluído no Total</p>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg">
                          <p className="font-medium text-foreground">{booking.kit?.name || 'Kit'}</p>
                          <p className="text-sm text-primary font-semibold">Incluído no Total</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Equipamentos Avulsos */}
                {booking.equipments && booking.equipments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">Equipamentos Individuais</h3>
                    <div className="space-y-2">
                      {booking.equipments?.map((eq, idx) => (
                        <div key={idx} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg">
                          <p className="font-medium text-foreground">{eq.name}</p>
                          <p className="text-sm text-primary font-semibold">{formatPrice(Number(eq.pricePerHour || 0))}/h</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Serviços */}
                {booking.services && booking.services.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">Serviços Adicionais</h3>
                    <div className="space-y-2">
                      {booking.services?.map((s, idx) => (
                        <div key={idx} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg">
                          <p className="font-medium text-foreground">{s.name}</p>
                          <p className="text-sm text-primary font-semibold">{formatPrice(Number(s.price || 0))}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Colaboradores */}
          {(booking.eventCollaborators && booking.eventCollaborators.length > 0) && (
            <Card padding>
              <h2 className="text-xl font-semibold mb-4 text-foreground">Equipe do Evento</h2>
              <div className="space-y-3">
                {booking.eventCollaborators.map((collaborator, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="w-10 h-10 shrink-0 bg-success/10 text-success rounded-full flex items-center justify-center font-semibold" aria-hidden="true">
                        {(collaborator.collaborator?.name || 'C')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {collaborator.collaborator?.name || 'Colaborador'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {collaborator.role || 'Função não definida'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {/* Achado (revisão antes do deploy): aqui aparecia o cachê do colaborador
                          (totalPayment, o "custo de equipe" da margem no painel admin), que não é
                          preço do cliente — a API não manda mais esse valor ao cliente. As horas só
                          aparecem quando lançadas (a escala nasce com totalHours nulo e sobrava um "h"). */}
                      {collaborator.totalHours != null && (
                        <p className="text-xs text-muted-foreground">
                          {collaborator.totalHours}h
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Resumo Financeiro */}
          <Card padding>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Resumo Financeiro</h2>
            <div className="space-y-3">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Equipamentos:</span>
                <span className="font-medium text-foreground">
                  {formatPrice(booking.totalPrice || 0)}
                </span>
              </div>
              {/* Ternário: com `&&`, serviceValue = 0 aparecia como um "0" solto na tela. */}
              {booking.serviceValue ? (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Serviços:</span>
                  <span className="font-medium text-foreground">
                    {formatPrice(booking.serviceValue)}
                  </span>
                </div>
              ) : null}
              <div className="border-t border-border pt-3">
                <div className="flex justify-between gap-3 text-lg font-bold">
                  <span className="text-foreground">Total:</span>
                  <span className="text-primary">
                    {formatPrice((Number(booking.totalPrice) || 0) + (booking.serviceValue || 0))}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Comprovantes de Pagamento */}
          <Card padding>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-semibold text-foreground">Comprovantes</h2>
              <Button
                size="sm"
                onClick={handleUploadClick}
                leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
              >
                Adicionar
              </Button>
            </div>

            <div className="space-y-3">
              {/* Exibir comprovantes reais se existirem */}
              {booking.attachments && booking.attachments.length > 0 ? (
                booking.attachments.map((attachment, idx) => (
                  <div key={idx} className="p-3 bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="h-5 w-5 shrink-0 text-info" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">
                            {attachment.filename || `Comprovante_${idx + 1}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {attachment.createdAt ? new Date(attachment.createdAt).toLocaleDateString('pt-BR') : 'Data não disponível'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteProof(attachment.id || `attachment-${idx}`)}
                        className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Excluir comprovante ${attachment.filename || idx + 1}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonVariants({ size: 'sm', className: 'flex-1' })}
                      >
                        Visualizar
                      </a>
                      <a
                        href={attachment.url}
                        download={attachment.filename}
                        className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'flex-1' })}
                      >
                        Baixar
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                /* Estado vazio */
                <div className="text-center py-4 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" aria-hidden="true" />
                  <p className="text-sm">Nenhum comprovante</p>
                </div>
              )}
            </div>
          </Card>

          {/* Informações do Cliente */}
          <Card padding>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Informações do Cliente</h2>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm text-muted-foreground">Nome</dt>
                <dd className="font-medium text-foreground">{booking.client?.name || 'Não informado'}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Telefone</dt>
                <dd className="font-medium text-foreground">{booking.client?.phone || 'Não informado'}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">E-mail</dt>
                <dd className="font-medium text-foreground break-all">{booking.client?.email || 'Não informado'}</dd>
              </div>
            </dl>
          </Card>

          {/* Chat sobre a reserva */}
          {id && <BookingChatPanel bookingId={id} currentUserId={user?.id} />}
        </div>
      </div>

      {/* Modal de Upload de Comprovante (antes: div `fixed inset-0` sem role="dialog", Esc nem foco) */}
      <Modal
        isOpen={showUploadModal}
        onClose={cancelUpload}
        title="Adicionar comprovante"
        size="sm"
        closeOnOverlayClick={!uploading}
        closeOnEscape={!uploading}
        showCloseButton={!uploading}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Selecione um arquivo (PDF, JPG ou PNG) para enviar.</p>
          <div>
            <label htmlFor="proof-file-input" className="block text-sm font-medium text-foreground mb-2">
              Arquivo
            </label>
            <input
              id="proof-file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="w-full px-3 py-2 border-2 border-border rounded-lg bg-card text-foreground text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground mt-1 break-all">
                Arquivo selecionado: {selectedFile.name}
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={cancelUpload} disabled={uploading}>
              Cancelar
            </Button>
            <Button
              onClick={handleUploadProof}
              disabled={!selectedFile}
              isLoading={uploading}
              leftIcon={<Upload className="h-4 w-4" aria-hidden="true" />}
            >
              {uploading ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmação de exclusão (antes: modal feito à mão) */}
      <ConfirmModal
        isOpen={showDeleteProofModal}
        onClose={cancelDeleteProof}
        onConfirm={confirmDeleteProof}
        title="Excluir comprovante"
        message="Tem certeza que deseja excluir este comprovante? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        variant="danger"
        isLoading={deletingProof}
      />
    </ClientPage>
  );
};
