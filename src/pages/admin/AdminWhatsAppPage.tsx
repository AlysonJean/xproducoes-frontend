import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, MessageCircle, Plus, QrCode, RefreshCw, Send, ShieldCheck, Unplug } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { apiFetch } from '../../services/api';
import { useNotifications } from '@/contexts/NotificationContext';
import { Alert, Badge, BrandLoader, Button, Card, ConfirmModal, Input, Textarea } from '@/components/ui/StandardComponents';
import type { StandardVariant } from '@/components/ui/StandardTypes';
import { useVisiblePolling } from '../../hooks/useVisiblePolling';
import { MAX_MESSAGE_LENGTH, QR_MAX_REFRESHES, formatPhoneLabel, formatWhen } from '../../utils/whatsappPanel';

// WhatsApp pelo painel (pedido de Alyson de 24/11/2026): o número da empresa fica no celular do pai dela, e ela também
// precisa falar com os clientes. O servidor liga o número à Evolution API (serviço privado no Render, como o WhatsApp
// Web); esta tela mostra o QR para conectar, as conversas e manda mensagens. Decisões de 24/11: só aparecem e só
// recebem mensagem os telefones de clientes cadastrados (as conversas pessoais do celular ficam fora); as conversas
// antigas não são importadas; cada envio é de uma pessoa, um por vez (limite de 30 por hora no servidor). O telefone
// vai sempre no corpo do pedido, nunca no endereço (o registro de acessos do servidor grava o endereço).

const PAGE_TITLE = 'WhatsApp';
const BREADCRUMBS = [{ name: 'Admin', href: '/admin/painel' }, { name: 'WhatsApp' }];

const CONVERSATIONS_EVERY_MS = 20_000;
const THREAD_EVERY_MS = 10_000;
const STATUS_EVERY_MS = 60_000;
const QR_CHECK_EVERY_MS = 3_000;
const QR_REFRESH_EVERY_MS = 25_000;

type WaState = 'open' | 'connecting' | 'close' | 'none';

interface WaStatus {
  configured: boolean;
  state: WaState;
}

interface QrInfo {
  qr: string | null;
  pairingCode: string | null;
}

interface Conversation {
  phone: string;
  phoneLabel: string;
  name: string;
  bookingId: string | null;
  lastText: string;
  lastFromMe: boolean;
  lastAt: number | null;
  unread: number;
}

interface Contact {
  phone: string;
  name: string;
  phoneLabel: string;
  bookingId: string | null;
}

interface ChatMessage {
  id: string;
  fromMe: boolean;
  text: string;
  at: number | null;
}

const STATE_BADGE: Record<WaState, { text: string; variant: StandardVariant }> = {
  open: { text: 'Conectado', variant: 'success' },
  connecting: { text: 'Conectando…', variant: 'warning' },
  close: { text: 'Desconectado', variant: 'ghost' },
  none: { text: 'Desconectado', variant: 'ghost' },
};

const messageOf = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);
const statusOf = (err: unknown) => (err as { status?: number } | null)?.status;
const str = (value: unknown) => (typeof value === 'string' ? value : '');
const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

// Só os campos conhecidos chegam à tela.
function readStatus(data: unknown): WaStatus {
  const d = (data ?? {}) as Record<string, unknown>;
  const state = d.state === 'open' || d.state === 'connecting' || d.state === 'close' ? d.state : 'none';
  return { configured: d.configured === true, state };
}

function readConnect(data: unknown): QrInfo & { state: WaState } {
  const d = (data ?? {}) as Record<string, unknown>;
  const qr = str(d.qr).startsWith('data:image/') ? str(d.qr) : null;
  return { state: readStatus({ state: d.state }).state, qr, pairingCode: str(d.pairingCode) || null };
}

function readConversations(data: unknown): Conversation[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => (item ?? {}) as Record<string, unknown>)
    .filter((c) => str(c.phone))
    .map((c) => ({
      phone: str(c.phone),
      phoneLabel: str(c.phoneLabel) || str(c.phone),
      name: str(c.name) || str(c.phoneLabel) || str(c.phone),
      bookingId: str(c.bookingId) || null,
      lastText: str(c.lastText),
      lastFromMe: c.lastFromMe === true,
      lastAt: num(c.lastAt),
      unread: Math.max(0, num(c.unread) ?? 0),
    }));
}

function readThread(data: unknown): { contact: Contact | null; messages: ChatMessage[] } {
  const d = (data ?? {}) as Record<string, unknown>;
  const client = (d.client ?? {}) as Record<string, unknown>;
  const phone = str(client.digits);
  const contact = phone
    ? { phone, name: str(client.name) || formatPhoneLabel(phone), phoneLabel: formatPhoneLabel(phone), bookingId: str(client.bookingId) || null }
    : null;
  const messages = (Array.isArray(d.messages) ? d.messages : [])
    .map((item) => (item ?? {}) as Record<string, unknown>)
    .filter((m) => str(m.id))
    .map((m) => ({ id: str(m.id), fromMe: m.fromMe === true, text: str(m.text), at: num(m.at) }));
  return { contact, messages };
}

export const AdminWhatsAppPage = () => {
  const { addNotification } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const [status, setStatus] = useState<WaStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [qr, setQr] = useState<QrInfo | null>(null);
  const qrRefreshes = useRef(0);
  const [qrNotice, setQrNotice] = useState<{ variant: 'error' | 'info'; text: string } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);

  const [showNew, setShowNew] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newPhoneError, setNewPhoneError] = useState<string | null>(null);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  // Cada abertura (ou fechamento) de conversa muda o número: a resposta de um pedido antigo, que chegue depois de
  // abrir outra conversa, é ignorada (senão a tela voltava para a conversa anterior).
  const openSeq = useRef(0);

  const isOpen = status?.configured === true && status.state === 'open';

  const loadStatus = useCallback(async () => {
    try {
      const next = readStatus(await apiFetch<unknown>('/admin/whatsapp/status'));
      setStatus(next);
      setStatusError(null);
      return next;
    } catch (err) {
      setStatusError(messageOf(err, 'Tente de novo em instantes.'));
      return null;
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      setConversations(readConversations(await apiFetch<unknown>('/admin/whatsapp/conversations')));
      setConversationsError(null);
    } catch (err) {
      setConversationsError(messageOf(err, 'Tente de novo em instantes.'));
    } finally {
      setConversationsLoaded(true);
    }
  }, []);

  /** Abre (ou atualiza, com `quiet`) a conversa com um telefone de cliente. */
  const openConversation = useCallback(async (phone: string, quiet = false) => {
    const seq = quiet ? openSeq.current : ++openSeq.current;
    const current = () => seq === openSeq.current;
    if (!quiet) {
      setThreadLoading(true);
      setThreadError(null);
    }
    try {
      const data = await apiFetch<unknown>('/admin/whatsapp/conversation', { method: 'POST', body: JSON.stringify({ phone }) });
      if (!current()) return false;
      const { contact, messages: next } = readThread(data);
      if (contact) setSelected(contact);
      setMessages(next);
      setThreadError(null);
      return true;
    } catch (err) {
      if (!quiet && current()) {
        setSelected(null);
        setMessages([]);
        setThreadError(messageOf(err, 'Não foi possível abrir a conversa.'));
      }
      return false;
    } finally {
      if (!quiet && current()) setThreadLoading(false);
    }
  }, []);

  const closeConversation = useCallback(() => {
    openSeq.current += 1;
    setSelected(null);
    setMessages([]);
    setThreadLoading(false);
  }, []);

  // Ao abrir a tela: a situação da conexão e, conectado, as conversas. Vindo da ficha de uma reserva, o telefone chega
  // pelo estado da navegação (nunca pelo endereço) e a conversa já abre.
  useEffect(() => {
    const fromBooking = (location.state as { phone?: unknown } | null)?.phone;
    const phone = typeof fromBooking === 'string' ? fromBooking : null;
    if (phone) navigate(location.pathname, { replace: true, state: null });
    void loadStatus().then((next) => {
      if (next?.configured && next.state === 'open') {
        void loadConversations();
        if (phone) void openConversation(phone);
      }
    });
    // Só ao abrir a tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rola até a última mensagem quando chega mensagem nova.
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, selected?.phone]);

  const { paused } = useVisiblePolling(loadConversations, CONVERSATIONS_EVERY_MS, { enabled: isOpen });
  useVisiblePolling(() => (selected ? openConversation(selected.phone, true) : undefined), THREAD_EVERY_MS, {
    enabled: isOpen && Boolean(selected),
  });
  // Conectado: confere de vez em quando se o celular não desligou o painel.
  useVisiblePolling(loadStatus, STATUS_EVERY_MS, { enabled: isOpen });

  // Com o QR na tela: confere a cada 3 s se o celular já leu, e troca o QR antes de ele vencer.
  const checkQr = useCallback(async () => {
    const next = await loadStatus();
    if (next?.state === 'open') {
      setQr(null);
      setQrNotice(null);
      addNotification({ type: 'success', title: 'WhatsApp conectado', message: 'As conversas com clientes aparecem abaixo.' });
      void loadConversations();
    }
  }, [addNotification, loadConversations, loadStatus]);
  useVisiblePolling(checkQr, QR_CHECK_EVERY_MS, { enabled: Boolean(qr) });

  const requestQr = useCallback(async () => {
    const result = readConnect(await apiFetch<unknown>('/admin/whatsapp/connect', { method: 'POST' }));
    if (result.state === 'open') {
      setQr(null);
      await checkQr();
      return;
    }
    if (!result.qr && !result.pairingCode) throw new Error('O serviço do WhatsApp não mandou o QR. Tente de novo em instantes.');
    setQr({ qr: result.qr, pairingCode: result.pairingCode });
    setStatus((prev) => (prev ? { ...prev, state: 'connecting' } : prev));
  }, [checkQr]);

  const refreshQr = useCallback(async () => {
    qrRefreshes.current += 1;
    if (qrRefreshes.current >= QR_MAX_REFRESHES) {
      setQr(null);
      setQrNotice({ variant: 'info', text: 'O QR venceu sem ser lido. Clique em "Conectar" para gerar outro.' });
      void loadStatus();
      return;
    }
    try {
      await requestQr();
    } catch {
      // Mantém o QR atual; a próxima troca tenta de novo.
    }
  }, [loadStatus, requestQr]);
  useVisiblePolling(refreshQr, QR_REFRESH_EVERY_MS, { enabled: Boolean(qr) });

  const handleConnect = async () => {
    setConnecting(true);
    setQrNotice(null);
    qrRefreshes.current = 0;
    try {
      await requestQr();
    } catch (err) {
      setQr(null);
      setQrNotice({ variant: 'error', text: messageOf(err, 'Tente de novo em instantes.') });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      setStatus(readStatus(await apiFetch<unknown>('/admin/whatsapp/connection', { method: 'DELETE' })));
      setConfirmDisconnect(false);
      setConversations([]);
      setConversationsLoaded(false);
      closeConversation();
      addNotification({ type: 'success', title: 'WhatsApp desconectado', message: 'O celular continua com o WhatsApp normal.' });
    } catch (err) {
      addNotification({ type: 'error', title: 'Não foi possível desconectar', message: messageOf(err, 'Tente de novo.') });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleNewConversation = async (event: FormEvent) => {
    event.preventDefault();
    const digits = newPhone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) {
      setNewPhoneError('Digite o telefone com o DDD, por exemplo (31) 98888-7777.');
      return;
    }
    setNewPhoneError(null);
    if (await openConversation(newPhone)) {
      setShowNew(false);
      setNewPhone('');
    }
  };

  const handleSend = async () => {
    const message = text.trim();
    if (!selected || !message || sending) return;
    setSending(true);
    try {
      await apiFetch<unknown>('/admin/whatsapp/messages', {
        method: 'POST',
        body: JSON.stringify({ phone: selected.phone, text: message, ...(selected.bookingId ? { bookingId: selected.bookingId } : {}) }),
      });
      setText('');
      addNotification({ type: 'success', title: 'Mensagem enviada', message: `Para ${selected.name}.` });
      void openConversation(selected.phone, true);
      void loadConversations();
    } catch (err) {
      if (statusOf(err) === 409) void loadStatus();
      addNotification({ type: 'error', title: 'A mensagem não foi enviada', message: messageOf(err, 'Tente de novo.') });
    } finally {
      setSending(false);
    }
  };

  const handleComposerKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void handleSend();
    }
  };

  if (!status && !statusError) {
    return (
      <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
        <div className="flex min-h-[400px] flex-col items-center justify-center">
          <BrandLoader size={120} label="Carregando WhatsApp…" />
        </div>
      </AdminLayout>
    );
  }

  const state = status?.state ?? 'none';
  const badge = status && !status.configured ? { text: 'Não configurado', variant: 'ghost' as StandardVariant } : STATE_BADGE[state];

  return (
    <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
      <div className="space-y-6">
        {statusError && (
          <Alert
            variant="error"
            title="Não foi possível carregar a situação do WhatsApp"
            action={
              <Button size="sm" variant="outline" onClick={() => void loadStatus()}>
                Tentar de novo
              </Button>
            }
          >
            {statusError}
          </Alert>
        )}

        {/* Conexão */}
        <Card className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3">
                <MessageCircle className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">WhatsApp da empresa</h2>
                <p className="text-sm text-muted-foreground">Conversas com clientes cadastrados, pelo número do celular da empresa.</p>
              </div>
            </div>
            <Badge variant={badge.variant} size="lg">
              {badge.text}
            </Badge>
          </div>

          {status && !status.configured && (
            <Alert variant="info" title="O WhatsApp ainda não foi ligado no servidor">
              Falta criar o serviço do WhatsApp no Render e colocar o endereço e a chave dele no servidor (EVOLUTION_URL e
              EVOLUTION_API_KEY). Depois disso, esta tela mostra o QR para conectar o celular.
            </Alert>
          )}

          {status?.configured && !isOpen && !qr && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                O painel ainda não está ligado ao celular. Clique em &quot;Conectar&quot; e leia o QR com o celular da empresa, como no
                WhatsApp Web.
              </p>
              <Button onClick={() => void handleConnect()} isLoading={connecting} leftIcon={<QrCode className="h-4 w-4" aria-hidden="true" />}>
                Conectar
              </Button>
            </div>
          )}

          {qr && (
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              {qr.qr && (
                <img
                  src={qr.qr}
                  alt="QR para conectar o WhatsApp"
                  className="h-64 w-64 shrink-0 rounded-xl border border-border bg-white p-2"
                />
              )}
              <div className="space-y-3 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">No celular da empresa:</p>
                <ol className="list-decimal space-y-1 pl-5">
                  <li>Abra o WhatsApp.</li>
                  <li>Toque nos três pontinhos (Android) ou em Configurações (iPhone).</li>
                  <li>Toque em &quot;Aparelhos conectados&quot; e depois em &quot;Conectar um aparelho&quot;.</li>
                  <li>Aponte a câmera para o QR desta tela.</li>
                </ol>
                {qr.pairingCode && (
                  <p>
                    Ou, em &quot;Conectar com número de telefone&quot;, digite o código{' '}
                    <strong className="font-mono text-foreground">{qr.pairingCode}</strong>.
                  </p>
                )}
                <p>O QR muda sozinho a cada pouco tempo. Esta tela avisa quando o celular conectar.</p>
              </div>
            </div>
          )}

          {qrNotice && (
            <Alert variant={qrNotice.variant} onClose={() => setQrNotice(null)}>
              {qrNotice.text}
            </Alert>
          )}

          {isOpen && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">O celular continua com o WhatsApp normal. As conversas pessoais não aparecem aqui.</p>
              <Button variant="outline" size="sm" onClick={() => setConfirmDisconnect(true)} leftIcon={<Unplug className="h-4 w-4" aria-hidden="true" />}>
                Desconectar
              </Button>
            </div>
          )}

          <ul className="space-y-2 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Aparecem e recebem mensagem só os telefones de clientes cadastrados (perfil de cliente ou contato de uma reserva). As
                conversas antigas, de antes de conectar, não são importadas.
              </span>
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Mande uma mensagem por vez, escrita para aquele cliente. A mesma mensagem para muitos números pode fazer o WhatsApp
                bloquear o número. O painel aceita até 30 envios por hora.
              </span>
            </li>
          </ul>
        </Card>

        {isOpen && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
            {/* Conversas */}
            <Card className={`space-y-4 p-4 sm:p-5 ${selected || threadLoading ? 'hidden lg:block' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-foreground">Conversas com clientes</h2>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void loadConversations()}
                    aria-label="Atualizar conversas"
                    leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
                  />
                  <Button size="sm" variant="outline" onClick={() => setShowNew((v) => !v)} leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}>
                    Nova conversa
                  </Button>
                </div>
              </div>

              {showNew && (
                <form onSubmit={(e) => void handleNewConversation(e)} className="space-y-2">
                  <Input
                    label="Telefone do cliente"
                    inputMode="tel"
                    autoComplete="off"
                    placeholder="(31) 98888-7777"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    error={newPhoneError ?? undefined}
                    description="Só abre se o telefone for de um cliente cadastrado."
                  />
                  <Button type="submit" size="sm" isLoading={threadLoading}>
                    Abrir conversa
                  </Button>
                </form>
              )}

              {paused && (
                <p className="text-xs text-muted-foreground">Atualização automática pausada (tela parada). Clique em qualquer lugar para retomar.</p>
              )}

              {conversationsError && (
                <Alert variant="error" title="Não foi possível carregar as conversas">
                  {conversationsError}
                </Alert>
              )}

              {!conversationsLoaded ? (
                <p className="text-sm text-muted-foreground">Carregando conversas…</p>
              ) : conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma conversa com cliente ainda. Elas aparecem aqui quando um cliente cadastrado manda mensagem, ou quando você
                  começa uma em &quot;Nova conversa&quot;.
                </p>
              ) : (
                <ul className="-mx-2 divide-y divide-border" aria-label="Conversas">
                  {conversations.map((c) => (
                    <li key={c.phone}>
                      <button
                        type="button"
                        onClick={() => void openConversation(c.phone)}
                        aria-current={selected?.phone === c.phone ? 'true' : undefined}
                        className={`flex w-full items-start gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-muted/60 ${
                          selected?.phone === c.phone ? 'bg-primary/10' : ''
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate font-semibold text-foreground">{c.name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">{formatWhen(c.lastAt)}</span>
                          </span>
                          <span className="block text-xs text-muted-foreground">{c.phoneLabel}</span>
                          <span className="mt-1 block truncate text-sm text-muted-foreground">
                            {c.lastFromMe ? 'Você: ' : ''}
                            {c.lastText}
                          </span>
                        </span>
                        {c.unread > 0 && (
                          <Badge variant="success" size="sm">
                            {c.unread}
                            <span className="sr-only"> não lidas</span>
                          </Badge>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Conversa aberta */}
            <Card className={`flex min-h-[420px] flex-col p-4 sm:p-5 ${selected || threadLoading || threadError ? '' : 'hidden lg:flex'}`}>
              {threadError && (
                <Alert variant="error" title="Não foi possível abrir a conversa" onClose={() => setThreadError(null)}>
                  {threadError}
                </Alert>
              )}

              {threadLoading && !selected && <p className="text-sm text-muted-foreground">Abrindo a conversa…</p>}

              {!selected && !threadLoading && !threadError && (
                <p className="m-auto text-center text-sm text-muted-foreground">Escolha uma conversa ao lado ou comece uma nova.</p>
              )}

              {selected && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="lg:hidden"
                        onClick={closeConversation}
                        aria-label="Voltar às conversas"
                        leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
                      />
                      <div>
                        <h2 className="text-base font-bold text-foreground">{selected.name}</h2>
                        <p className="text-xs text-muted-foreground">{selected.phoneLabel}</p>
                      </div>
                    </div>
                    {selected.bookingId && (
                      <Link
                        to={`/admin/reservas/${encodeURIComponent(selected.bookingId)}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        Ver reserva <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    )}
                  </div>

                  <div ref={chatRef} className="flex-1 space-y-2 overflow-y-auto py-4 lg:max-h-[55vh]" aria-label="Mensagens" role="log">
                    {messages.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground">
                        Nenhuma mensagem com este cliente desde que o painel foi conectado.
                      </p>
                    ) : (
                      messages.map((m) => (
                        <div key={m.id} className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                              m.fromMe ? 'rounded-br-sm bg-primary/15 text-foreground' : 'rounded-bl-sm bg-muted text-foreground'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{m.text}</p>
                            <p className="mt-1 text-right text-[11px] text-muted-foreground">{formatWhen(m.at)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <form
                    className="space-y-2 border-t border-border pt-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleSend();
                    }}
                  >
                    <Textarea
                      label={`Mensagem para ${selected.name}`}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={handleComposerKey}
                      maxLength={MAX_MESSAGE_LENGTH}
                      rows={3}
                      resize="vertical"
                      placeholder="Escreva a mensagem…"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {text.length}/{MAX_MESSAGE_LENGTH} · Ctrl+Enter envia
                      </span>
                      <Button
                        type="submit"
                        size="sm"
                        isLoading={sending}
                        disabled={!text.trim()}
                        leftIcon={<Send className="h-4 w-4" aria-hidden="true" />}
                      >
                        Enviar
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </Card>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmDisconnect}
        onClose={() => setConfirmDisconnect(false)}
        onConfirm={() => void handleDisconnect()}
        title="Desconectar o WhatsApp do painel?"
        message="O painel para de mostrar e mandar mensagens. O celular continua com o WhatsApp normal; para ligar de novo, é preciso ler o QR outra vez."
        variant="warning"
        isLoading={disconnecting}
        confirmText="Desconectar"
        cancelText="Manter conectado"
      />
    </AdminLayout>
  );
};
