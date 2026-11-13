import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useParams, useNavigate } from 'react-router-dom';
import ReactGA from 'react-ga4';
import { ArrowLeft, FileDown, FileText, Mail, MessageCircle, Plus, Trash2, Upload } from 'lucide-react';
import { apiFetch, quotePdfAPI } from '@/services/api';
import type { BookingDetails } from '@/types/types';
import { formatBookingTotal, formatPrice, hasBookingTotal } from '@/utils/formatPrice';
import { bookingPricing, formatPricingLineTotal, toArrangeNote } from '@/utils/bookingPricing';
import { bookingStatusVariant, clientBookingStatusLabel, clientProposalValidityText } from '@/utils/bookingStatus';
import { Badge, Button, Card, ConfirmModal, Modal, buttonVariants } from '@/components/ui/StandardComponents';
import { ClientPage, ClientPageError, ClientPageLoading } from '../../components/client/ClientPage';
import { logger } from '../../utils/logger';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { BookingChatPanel } from '../../components/client/BookingChatPanel';
import { ClientContractCard } from '../../components/proposal/ClientContractCard';
import { bookingEmail, bookingPhone } from '../../utils/bookingContact';
import { formatBookingCode } from '../../utils/bookingCode';
import { buildBookingContactText, buildWhatsAppUrl, getWhatsAppPhone } from '../../utils/whatsapp';
import { SUPPORT_EMAIL } from '../../data/site';
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_RULE_TEXT,
  attachmentFileProblem,
  attachmentUploadErrorMessage,
  bookingAttachmentFilePath,
  openBookingAttachment,
  uploadBookingAttachment,
} from '../../utils/bookingAttachments';

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
  const [fileProblem, setFileProblem] = useState<string | null>(null);
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

  // D21: tipo e tamanho conferidos já na escolha, antes de enviar 10 MB à toa.
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const problem = attachmentFileProblem(file);
    setFileProblem(problem);
    setSelectedFile(problem ? null : file);
  };

  const handleUploadProof = async () => {
    if (!selectedFile || !id) return;

    try {
      setUploading(true);

      // D21 (aprovada em 02/11/2026): o arquivo vai direto para a reserva e fica privado (antes subia por
      // /upload/image como imagem pública, com link eterno, e PDF era recusado).
      await uploadBookingAttachment(id, selectedFile);

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
      // Antes a falha era silenciosa: o modal só parava de girar, sem dizer o que houve. O envio tem teto
      // de 3 por hora por conta: nesse caso "tente novamente" enganaria — o certo é esperar.
      addNotification({ type: 'error', title: 'Erro', message: attachmentUploadErrorMessage(error) });
    } finally {
      setUploading(false);
    }
  };

  const cancelUpload = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setFileProblem(null);
    const fileInput = document.getElementById('proof-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // D21: o comprovante abre por um link de 5 minutos que a API dá a quem é dono da reserva. A janela é
  // aberta dentro do clique (openBookingAttachment), senão o navegador a bloquearia depois da espera.
  const handleOpenProof = (attachmentId: string, download: boolean) => {
    if (!id) return;
    void openBookingAttachment(bookingAttachmentFilePath(id, attachmentId), { download }).catch((error: unknown) => {
      logger.error('Erro ao abrir comprovante:', 'BookingDetailsPage', error);
      addNotification({ type: 'error', title: 'Erro', message: 'Não foi possível abrir o comprovante. Tente novamente.' });
    });
  };

  // Orçamento em PDF (13/11/2026): o PDF é o orçamento que o servidor gera na hora, a partir da reserva atual (o mesmo
  // do link da proposta e da ficha do painel). Antes era montado aqui no navegador (jsPDF), com outro visual e outra
  // conta de datas e validade.
  const handleDownloadProposal = async () => {
    if (!booking) return;
    try {
      setDownloadingProposal(true);
      await quotePdfAPI.forClient(booking.id);
    } catch (error) {
      logger.error('Erro ao baixar o orçamento em PDF:', 'BookingDetailsPage', error);
      addNotification({ type: 'error', title: 'Erro', message: 'Não foi possível baixar o orçamento agora. Tente de novo em alguns minutos.' });
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

  // D8a e P16: o resumo de preço da API (linhas, desconto, ajuste e o valor final), o mesmo dos PDFs.
  const pricing = bookingPricing(booking);
  // Pedido do briefing chega sem itens: o total fica zerado até a equipe preparar o orçamento.
  // Auditoria do orçamento (12/11/2026), O3: a mesma regra de formatBookingTotal; sem valor, nada de PDF da proposta.
  const hasPrice = hasBookingTotal(pricing.total);
  // Auditoria do orçamento (12/11/2026), O21/D9: frete a combinar e pedágio à parte ficam fora do total, e a tela diz.
  const toArrange = toArrangeNote(pricing.lines);
  // O11/D6: a validade da proposta enviada (vencida: "peça uma nova").
  const proposalValidity = clientProposalValidityText(booking);
  // D21: o cliente apaga comprovante só enquanto o pagamento não foi registrado (a mesma regra do servidor).
  const clientMayDeleteProof = booking.paymentStatus !== 'PAID' && booking.paymentStatus !== 'PARTIAL';
  // D20: texto pronto do contato com a equipe (o nome informado na reserva ou o da conta, o código inteiro
  // e a data do evento em Brasília), o mesmo no WhatsApp e no corpo do e-mail.
  const bookingCode = formatBookingCode(booking.id);
  const contactText = buildBookingContactText({ clientName: booking.clientName || user?.name, bookingId: booking.id, eventDate: booking.eventDate });
  // Como no botão flutuante (FloatingWhatsApp): ao GA vai só de onde veio o clique, sem nome, código ou
  // contato (D7). O GA só carrega depois do aceite de cookies (useGoogleAnalytics).
  const trackWhatsAppClick = () => {
    ReactGA.event({ category: 'contact', action: 'whatsapp_click', label: 'area_cliente' });
  };

  return (
    <ClientPage
      width="6xl"
      title="Detalhes da Reserva"
      description={<span className="break-all">Reserva #{booking.id}</span>}
      actions={
        <>
          {/* Auditoria do orçamento (12/11/2026), O3: o PDF saía com "Total: R$ 0,00" no pedido ainda sem valor. */}
          {hasPrice && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadProposal}
              isLoading={downloadingProposal}
              leftIcon={<FileDown className="h-4 w-4" aria-hidden="true" />}
            >
              {downloadingProposal ? 'Gerando PDF...' : 'Baixar orçamento (PDF)'}
            </Button>
          )}
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
                    {clientBookingStatusLabel(booking)}
                  </Badge>
                  {proposalValidity && <p className="mt-2 text-sm text-muted-foreground">{proposalValidity}</p>}
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
                          {/* D8a/P16: o preço combinado está no Resumo Financeiro; o preço de hoje do catálogo não
                              aparece (nem na reserva antiga sem itens gravados, como no PDF). */}
                          <p className="text-sm text-primary font-semibold">Incluído no Total</p>
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
                          <p className="text-sm text-primary font-semibold">Incluído no Total</p>
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
          {/* D8a e P16 (aprovadas em 02/11/2026): um valor final só. Antes a tela mostrava "Equipamentos" com o
              totalPrice e "Serviços" com o serviceValue, e o Total somava os dois — como texto, porque o valor
              chega como "1500.00": R$ 15.001.500,00. Agora as linhas da proposta (técnico, montagem e frete
              inclusive), o desconto, o ajuste e um Total só, os mesmos do PDF e do painel (pricing da API). */}
          <Card padding>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Resumo Financeiro</h2>
            <div className="space-y-3">
              {pricing.lines.length > 0 && (
                <ul className="space-y-2" aria-label="Itens da proposta">
                  {pricing.lines.map((line, idx) => (
                    <li key={idx} className="flex justify-between gap-3">
                      <span className="text-muted-foreground min-w-0 break-words">
                        {line.quantity > 1 ? `${line.quantity}× ` : ''}{line.description}
                      </span>
                      <span className="font-medium text-foreground shrink-0">{formatPricingLineTotal(line)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {pricing.couponDiscount && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Desconto{pricing.couponDiscount.code ? ` (${pricing.couponDiscount.code})` : ''}:</span>
                  <span className="font-medium text-foreground shrink-0">− {formatPrice(pricing.couponDiscount.amount)}</span>
                </div>
              )}
              {pricing.adjustment !== 0 && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Ajuste no valor final:</span>
                  <span className="font-medium text-foreground shrink-0">{pricing.adjustment < 0 ? '− ' : '+ '}{formatPrice(Math.abs(pricing.adjustment))}</span>
                </div>
              )}
              <div className={pricing.lines.length > 0 || pricing.couponDiscount ? 'border-t border-border pt-3' : ''}>
                <div className="flex justify-between gap-3 text-lg font-bold">
                  <span className="text-foreground">Total:</span>
                  <span className="text-primary">{formatBookingTotal(pricing.total)}</span>
                </div>
                {toArrange && <p className="mt-2 text-sm text-muted-foreground">{toArrange}</p>}
              </div>
            </div>
          </Card>

          {/* Aceite online (13/11/2026): o contrato aceito pelo site (estado, data, vencimentos, baixar e, no prazo,
              "Desistir da contratação"). Sem contrato (ou com o aceite desligado), nada aparece. */}
          {booking.contractSummary && (
            <ClientContractCard bookingId={booking.id} summary={booking.contractSummary} onChanged={fetchBookingDetails} />
          )}

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
              {/* D21: com o pagamento registrado (pago ou parcial), o comprovante fica guardado com a reserva: o
                  servidor recusa a exclusão pelo cliente e a lixeira não aparece. */}
              {booking.attachments && booking.attachments.length > 0 && !clientMayDeleteProof && (
                <p className="text-xs text-muted-foreground">Com o pagamento registrado, os comprovantes ficam guardados com a reserva.</p>
              )}
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
                      {clientMayDeleteProof && attachment.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteProof(attachment.id!)}
                          className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Excluir comprovante ${attachment.filename || idx + 1}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                    {attachment.id && (
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" onClick={() => handleOpenProof(attachment.id!, false)}>
                          Visualizar
                        </Button>
                        <Button variant="secondary" size="sm" className="flex-1" onClick={() => handleOpenProof(attachment.id!, true)}>
                          Baixar
                        </Button>
                      </div>
                    )}
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
                <dd className="font-medium text-foreground">{booking.client?.user?.name || booking.clientName || 'Não informado'}</dd>
              </div>
              {/* Achado (auditoria ponta a ponta): o telefone era só o do cadastro, e o e-mail lia client.email,
                  que a API não manda (o do cadastro é o da conta), e saía sempre "Não informado". Agora é o
                  informado na reserva antes do cadastro (utils/bookingContact). */}
              <div>
                <dt className="text-sm text-muted-foreground">Telefone</dt>
                <dd className="font-medium text-foreground">{bookingPhone(booking) || 'Não informado'}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">E-mail</dt>
                <dd className="font-medium text-foreground break-all">{bookingEmail(booking) || 'Não informado'}</dd>
              </div>
            </dl>
          </Card>

          {/* D20 (aprovada em 02/11/2026): "Mensagens sobre esta reserva" virou "Fale com a equipe". O
              cliente escrevia num chat que ninguém lia (o painel não tem tela de chat). Agora: WhatsApp com
              nome, código e data já escritos, e o e-mail como alternativa. O chat continua no código e só
              aparece com VITE_CLIENT_BOOKING_CHAT_ENABLED=true (no servidor, CLIENT_BOOKING_CHAT_ENABLED). */}
          <Card padding>
            <h2 className="text-xl font-semibold mb-2 text-foreground">Fale com a equipe sobre esta reserva</h2>
            <p className="text-sm text-muted-foreground mb-4">
              A mensagem já vai com o seu nome, o código da reserva e a data do evento.
            </p>
            <div className="flex flex-col gap-2">
              <a
                href={buildWhatsAppUrl(getWhatsAppPhone(), contactText)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={trackWhatsAppClick}
                className={buttonVariants({ size: 'sm', fullWidth: true })}
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Chamar no WhatsApp
              </a>
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Reserva ${bookingCode}`)}&body=${encodeURIComponent(contactText)}`}
                className={buttonVariants({ variant: 'outline', size: 'sm', fullWidth: true })}
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Enviar e-mail
              </a>
            </div>
            <p className="mt-3 text-xs text-muted-foreground break-all">E-mail da equipe: {SUPPORT_EMAIL}</p>
          </Card>

          {id && import.meta.env.VITE_CLIENT_BOOKING_CHAT_ENABLED === 'true' && (
            <BookingChatPanel bookingId={id} currentUserId={user?.id} />
          )}
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
          {/* D21: os mesmos tipos e o mesmo teto que o servidor confere (pelo conteúdo do arquivo). */}
          <p className="text-sm text-muted-foreground">Selecione o arquivo do comprovante: {ATTACHMENT_RULE_TEXT}.</p>
          <div>
            <label htmlFor="proof-file-input" className="block text-sm font-medium text-foreground mb-2">
              Arquivo
            </label>
            <input
              id="proof-file-input"
              type="file"
              accept={ATTACHMENT_ACCEPT}
              onChange={handleFileSelect}
              className="w-full px-3 py-2 border-2 border-border rounded-lg bg-card text-foreground text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground mt-1 break-all">
                Arquivo selecionado: {selectedFile.name}
              </p>
            )}
            {fileProblem && (
              <p className="text-sm text-destructive mt-1" role="alert">
                {fileProblem}
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
