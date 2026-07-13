import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '@/services/api';
import type { BookingDetails } from '@/types/types';
import { formatPrice } from '@/utils/formatPrice';
import BrandLoader from '@/components/ui/BrandLoader';
import { logger } from '../../utils/logger';

export const BookingDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteProofModal, setShowDeleteProofModal] = useState(false);
  const [proofToDelete, setProofToDelete] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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
      await apiFetch(`/bookings/${id}/attachments/${proofToDelete}`, {
        method: 'DELETE',
      });

      // Atualizar a lista de comprovantes após exclusão
      await fetchBookingDetails();

      setShowDeleteProofModal(false);
      setProofToDelete(null);

    } catch (error) {
      logger.error('Erro ao excluir comprovante:', 'BookingDetailsPage', error);
      // Aqui você pode adicionar uma notificação de erro
      setShowDeleteProofModal(false);
      setProofToDelete(null);
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

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return <BrandLoader fullScreen size={140} label="Carregando reserva..." />;
  }

  if (error || !booking) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center bg-destructive/10 p-8 rounded-lg border border-destructive">
          <h2 className="text-2xl font-bold mb-4 text-destructive">Erro</h2>
          <p className="text-muted-foreground mb-6">{error || 'Reserva não encontrada'}</p>
          <button
            onClick={() => navigate('/minhas-reservas')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-6 rounded-lg"
          >
            Voltar para Reservas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 rounded-2xl mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Detalhes da Reserva</h1>
            <p className="text-primary-foreground/80 mt-1">
              Reserva #{booking.id}
            </p>
          </div>
          <button
            onClick={() => navigate('/minhas-reservas')}
            className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground px-4 py-2 rounded-lg transition-colors"
          >
            ← Voltar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações Principais */}
        <div className="lg:col-span-2 space-y-6">
          {/* Detalhes do Evento */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Detalhes do Evento</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Data do Evento</p>
                <p className="font-medium text-foreground">{formatDate(booking.eventDate)}</p>
              </div>
              {booking.eventEndDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Data de Término</p>
                  <p className="font-medium text-foreground">{formatDate(booking.eventEndDate)}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Local</p>
                <p className="font-medium text-foreground">{booking.location || booking.eventLocation || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <span className="px-3 py-1 text-sm font-semibold rounded-full bg-primary/20 text-primary">
                  {booking.status}
                </span>
              </div>
            </div>
          </div>

          {/* Itens da Reserva */}
          {((booking.kits && booking.kits.length > 0) || (booking.equipments && booking.equipments.length > 0) || (booking.services && booking.services.length > 0) || booking.kit) && (
            <div className="bg-card rounded-xl p-6 border border-border">
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
                            <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                              <p className="font-medium text-foreground">{kitName || 'Kit'}</p>
                              <p className="text-sm text-primary font-semibold">Incluído no Total</p>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
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
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
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
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <p className="font-medium text-foreground">{s.name}</p>
                          <p className="text-sm text-primary font-semibold">{formatPrice(Number(s.price || 0))}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Kits */}
          {/* Removido temporariamente para evitar conflitos de tipo */}

          {/* Colaboradores */}
          {(booking.eventCollaborators && booking.eventCollaborators.length > 0) && (
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Equipe do Evento</h2>
              <div className="space-y-3">
                {booking.eventCollaborators.map((collaborator, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-success to-success/80 rounded-full flex items-center justify-center text-success-foreground font-semibold">
                        {(collaborator.collaborator?.name || 'C')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {collaborator.collaborator?.name || 'Colaborador'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {collaborator.role || 'Função não definida'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-success">
                        {formatPrice(collaborator.totalPayment || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {collaborator.totalHours}h
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Resumo Financeiro */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Resumo Financeiro</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Equipamentos:</span>
                <span className="font-medium text-foreground">
                  {formatPrice(booking.totalPrice || 0)}
                </span>
              </div>
              {booking.serviceValue && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Serviços:</span>
                  <span className="font-medium text-foreground">
                    {formatPrice(booking.serviceValue)}
                  </span>
                </div>
              )}
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-foreground">Total:</span>
                  <span className="text-primary">
                    {formatPrice((Number(booking.totalPrice) || 0) + (booking.serviceValue || 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Comprovantes de Pagamento */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Comprovantes</h2>
              <button
                onClick={handleUploadClick}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm px-3 py-1 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Adicionar
              </button>
            </div>

            <div className="space-y-3">
              {/* Exibir comprovantes reais se existirem */}
              {booking.attachments && booking.attachments.length > 0 ? (
                booking.attachments.map((attachment, idx) => (
                  <div key={idx} className="p-3 bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div>
                          <p className="font-medium text-foreground text-sm">
                            {attachment.filename || `Comprovante_${idx + 1}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {attachment.createdAt ? new Date(attachment.createdAt).toLocaleDateString('pt-BR') : 'Data não disponível'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteProof(attachment.id || `attachment-${idx}`)}
                        className="text-destructive hover:text-destructive/80 p-1"
                        aria-label="Excluir comprovante"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs py-1 px-2 rounded transition-colors text-center"
                      >
                        Visualizar
                      </a>
                      <a
                        href={attachment.url}
                        download={attachment.filename}
                        className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs py-1 px-2 rounded transition-colors text-center"
                      >
                        Baixar
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                /* Estado vazio */
                <div className="text-center py-4 text-muted-foreground border-2 border-dashed border-muted rounded-lg">
                  <svg className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm">Nenhum comprovante</p>
                </div>
              )}
            </div>
          </div>

          {/* Informações do Cliente */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Informações do Cliente</h2>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-medium text-foreground">{booking.client?.name || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-medium text-foreground">{booking.client?.phone || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium text-foreground">{booking.client?.email || 'Não informado'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Upload de Comprovante */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Adicionar Comprovante</h3>
                  <p className="text-sm text-muted-foreground">Selecione um arquivo para enviar</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="proof-file-input" className="block text-sm font-medium text-foreground mb-2">
                    Arquivo
                  </label>
                  <input
                    id="proof-file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Arquivo selecionado: {selectedFile.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={cancelUpload}
                  className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                  disabled={uploading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUploadProof}
                  disabled={!selectedFile || uploading}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Excluir Comprovante */}
      {showDeleteProofModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Excluir Comprovante</h3>
                  <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita</p>
                </div>
              </div>

              <p className="text-foreground mb-6">
                Tem certeza que deseja excluir este comprovante? Todos os dados associados serão perdidos permanentemente.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={cancelDeleteProof}
                  className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteProof}
                  className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};