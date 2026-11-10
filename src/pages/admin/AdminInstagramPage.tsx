import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Image as ImageIcon, Instagram, Lightbulb, ListOrdered, RefreshCw, Unplug } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { apiFetch } from '../../services/api';
import { useNotifications } from '@/contexts/NotificationContext';
import { Alert, Badge, BrandLoader, Button, Card, ConfirmModal, Input } from '@/components/ui/StandardComponents';
import type { StandardStatus, StandardVariant } from '@/components/ui/StandardTypes';
import { getOptimizedImageUrl } from '../../utils/imageOptimizer';
import { safeInstagramPermalink, summarizeCaption } from '../../utils/instagram';
import { INSTAGRAM_HANDLE } from '../../data/site';

// Pedido do dono de 09/11/2026 (Instagram): as fotos e os vídeos publicados em @x_producoeseventos aparecem no site
// sozinhos, para ele publicar uma vez só. Esta tela liga o Instagram (o dono cola o token gerado no painel da Meta;
// o servidor confere, guarda cifrado e nunca devolve), mostra a situação da conexão, a hashtag que manda a publicação
// para o Portfólio, o "Sincronizar agora" e a lista do que foi importado, com ocultar, fixar e virar projeto. As dicas
// de foto e de legenda são só sugestões: nada aqui impede ou atrasa uma publicação. Sem consulta repetida ao servidor
// (banco no plano gratuito): os dados são lidos ao abrir a tela e depois de cada ação.

const PAGE_TITLE = 'Instagram';
const BREADCRUMBS = [{ name: 'Admin', href: '/admin/painel' }, { name: 'Instagram' }];

type ConnectionStatus = 'disconnected' | 'ok' | 'refresh_failing' | 'expired';

interface InstagramStatus {
  status: ConnectionStatus;
  username: string | null;
  accountType: string | null;
  tokenExpiresAt: string | null;
  tokenRefreshedAt: string | null;
  refreshError: string | null;
  lastCheckAt: string | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  portfolioHashtag: string;
  syncRunning: boolean;
  counts: { total: number; visible: number; hidden: number; inPortfolio: number };
}

interface PortfolioLink {
  id: string;
  slug: string | null;
  title: string;
}

interface AdminInstagramPost {
  id: string;
  mediaType: string;
  caption: string | null;
  permalink: string;
  postedAt: string;
  imageUrl: string | null;
  isHidden: boolean;
  isPinned: boolean;
  removedAt: string | null;
  portfolio: PortfolioLink | null;
}

const STATUS_BADGE: Record<ConnectionStatus, { text: string; variant: StandardVariant }> = {
  disconnected: { text: 'Não conectado', variant: 'ghost' },
  ok: { text: 'Conectado', variant: 'success' },
  refresh_failing: { text: 'Conectado, com aviso', variant: 'warning' },
  expired: { text: 'Conexão vencida', variant: 'destructive' },
};

const ACCOUNT_TYPE_LABEL: Record<string, string> = { BUSINESS: 'Empresa', MEDIA_CREATOR: 'Criador de conteúdo' };
const MEDIA_TYPE_LABEL: Record<string, string> = { IMAGE: 'Foto', VIDEO: 'Vídeo', CAROUSEL_ALBUM: 'Carrossel' };

const DATE = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });
const TIME = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

const toDate = (iso: string | null | undefined) => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};
const formatDate = (iso: string | null | undefined) => {
  const date = toDate(iso);
  return date ? DATE.format(date) : '';
};
const formatDateTime = (iso: string | null | undefined) => {
  const date = toDate(iso);
  return date ? `${DATE.format(date)} às ${TIME.format(date)}` : '';
};

const str = (value: unknown) => (typeof value === 'string' && value !== '' ? value : null);
const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const messageOf = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

/**
 * Copia só os campos conhecidos da situação da conexão. O servidor nunca devolve o token; mesmo assim, nada além
 * destes campos chega à tela.
 */
function readStatus(data: unknown): InstagramStatus | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (typeof d.status !== 'string' || !(d.status in STATUS_BADGE)) return null;
  const counts = (d.counts && typeof d.counts === 'object' ? d.counts : {}) as Record<string, unknown>;
  return {
    status: d.status as ConnectionStatus,
    username: str(d.username),
    accountType: str(d.accountType),
    tokenExpiresAt: str(d.tokenExpiresAt),
    tokenRefreshedAt: str(d.tokenRefreshedAt),
    refreshError: str(d.refreshError),
    lastCheckAt: str(d.lastCheckAt),
    lastSyncAt: str(d.lastSyncAt),
    lastSyncError: str(d.lastSyncError),
    portfolioHashtag: str(d.portfolioHashtag) ?? 'portfolioX',
    syncRunning: d.syncRunning === true,
    counts: {
      total: num(counts.total),
      visible: num(counts.visible),
      hidden: num(counts.hidden),
      inPortfolio: num(counts.inPortfolio),
    },
  };
}

function readPortfolioLink(value: unknown): PortfolioLink | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const id = str(v.id);
  return id ? { id, slug: str(v.slug), title: str(v.title) ?? 'Projeto do Portfólio' } : null;
}

function readPosts(data: unknown): AdminInstagramPost[] {
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { posts?: unknown }).posts)
      ? (data as { posts: unknown[] }).posts
      : [];
  return list
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string')
    .map((item) => ({
      id: item.id as string,
      mediaType: str(item.mediaType) ?? 'IMAGE',
      caption: str(item.caption),
      permalink: str(item.permalink) ?? '',
      postedAt: str(item.postedAt) ?? '',
      imageUrl: str(item.imageUrl),
      isHidden: item.isHidden === true,
      isPinned: item.isPinned === true,
      removedAt: str(item.removedAt),
      portfolio: readPortfolioLink(item.portfolio),
    }));
}

// A mesma ordem da rota: fixadas primeiro, depois as mais recentes.
const sortPosts = (list: AdminInstagramPost[]) =>
  [...list].sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || (Date.parse(b.postedAt) || 0) - (Date.parse(a.postedAt) || 0));

type SyncMessage = { variant: StandardStatus; text: string };

function describeSync(data: unknown): SyncMessage {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  if (d.alreadyRunning === true) {
    return {
      variant: 'info',
      text: 'Já existe uma importação em andamento. Aguarde alguns minutos e atualize a página para ver as novidades.',
    };
  }
  if (d.finished === true && d.result && typeof d.result === 'object') {
    const r = d.result as Record<string, unknown>;
    const created = num(r.created);
    const updated = num(r.updated);
    const removed = num(r.removed);
    const projects = num(r.projectsCreated);
    const skipped = num(r.skipped);
    const parts = [
      created ? count(created, 'publicação nova', 'publicações novas') : '',
      updated ? count(updated, 'legenda atualizada', 'legendas atualizadas') : '',
      removed ? count(removed, 'publicação saiu do Instagram', 'publicações saíram do Instagram') : '',
      projects ? count(projects, 'projeto novo no Portfólio', 'projetos novos no Portfólio') : '',
    ].filter(Boolean);
    let text = parts.length ? `Sincronização concluída: ${parts.join(', ')}.` : 'Sincronização concluída: nenhuma novidade no Instagram.';
    if (skipped) {
      text += ` ${count(skipped, 'publicação ficou', 'publicações ficaram')} para a próxima tentativa, porque a imagem não pôde ser copiada.`;
    }
    return { variant: skipped ? 'warning' : 'success', text };
  }
  return {
    variant: 'info',
    text: 'A importação continua em segundo plano. Atualize a página em alguns minutos para ver as novidades.',
  };
}

export const AdminInstagramPage = () => {
  const { addNotification } = useNotifications();

  const [status, setStatus] = useState<InstagramStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [posts, setPosts] = useState<AdminInstagramPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [busyPostId, setBusyPostId] = useState<string | null>(null);

  // O token só existe neste campo até o envio: não vai para rascunho, notificação, log nem endereço.
  const [token, setToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectMessage, setConnectMessage] = useState<string | null>(null);

  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [hashtagDraft, setHashtagDraft] = useState<string | null>(null);
  const [hashtagError, setHashtagError] = useState<string | null>(null);
  const [savingHashtag, setSavingHashtag] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<SyncMessage | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const data = await apiFetch<unknown>('/admin/instagram/status');
      const next = readStatus(data);
      if (!next) throw new Error('Resposta inesperada do servidor.');
      setStatus(next);
      setStatusError(null);
    } catch (err) {
      setStatusError(messageOf(err, 'Não foi possível carregar a situação do Instagram.'));
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const loadPosts = useCallback(async () => {
    try {
      const data = await apiFetch<unknown>('/admin/instagram/posts');
      setPosts(sortPosts(readPosts(data)));
      setPostsError(null);
    } catch (err) {
      setPostsError(messageOf(err, 'Não foi possível carregar as publicações importadas.'));
    } finally {
      setPostsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
    void loadPosts();
  }, [loadStatus, loadPosts]);

  const handleConnect = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const accessToken = token.trim();
    // Sai do campo já no envio, dê certo ou não: o token não fica na tela.
    setToken('');
    if (!accessToken) return;
    setConnecting(true);
    setConnectError(null);
    setConnectMessage(null);
    try {
      const data = await apiFetch<unknown>('/admin/instagram/connection', {
        method: 'POST',
        body: JSON.stringify({ accessToken }),
      });
      const next = readStatus(data);
      if (next) setStatus(next);
      else await loadStatus();
      setConnectMessage(
        'Instagram conectado. A primeira importação começou e pode levar alguns minutos. Depois, clique em "Sincronizar agora" ou atualize a página.'
      );
    } catch (err) {
      // Revisão de 09/11/2026: o servidor confere o formato do token antes de falar com o Instagram (validateBody); essa
      // recusa chega com a mensagem genérica da validação ("Dados de entrada inválidos") e o texto específico fica em
      // errors[], que o apiFetch não mostra. Aqui ela vira uma frase que diz o que fazer.
      const message = messageOf(err, '');
      setConnectError(
        (err as { status?: number }).status === 400 && /^Dados (de entrada )?inválidos\.?$/.test(message)
          ? 'Isto não parece um token do Instagram completo. Copie de novo o token inteiro no painel da Meta, sem espaços, e cole aqui.'
          : message || 'Não foi possível conectar. Confira o token e tente de novo.'
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await apiFetch('/admin/instagram/connection', { method: 'DELETE' });
      setConfirmDisconnect(false);
      setConnectMessage(null);
      await loadStatus();
      addNotification({
        type: 'success',
        title: 'Instagram desconectado',
        message: 'As publicações já importadas e os projetos do Portfólio continuam no site.',
      });
    } catch (err) {
      addNotification({ type: 'error', title: 'Não foi possível desconectar', message: messageOf(err, 'Tente de novo.') });
    } finally {
      setDisconnecting(false);
    }
  };

  const hashtagValue = hashtagDraft ?? status?.portfolioHashtag ?? 'portfolioX';

  const handleSaveHashtag = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const clean = hashtagValue.trim().replace(/^#+/, '');
    if (!/^[\p{L}\p{N}_]{1,50}$/u.test(clean)) {
      setHashtagError('Use só letras, números e _ (sem espaços e sem #), com até 50 caracteres.');
      return;
    }
    setSavingHashtag(true);
    setHashtagError(null);
    try {
      await apiFetch('/admin/instagram/settings', { method: 'PUT', body: JSON.stringify({ portfolioHashtag: clean }) });
      setStatus((prev) => (prev ? { ...prev, portfolioHashtag: clean } : prev));
      setHashtagDraft(null);
      addNotification({
        type: 'success',
        title: 'Hashtag salva',
        message: `Publicações com #${clean} na legenda viram projeto do Portfólio.`,
      });
    } catch (err) {
      setHashtagError(messageOf(err, 'Não foi possível salvar a hashtag.'));
    } finally {
      setSavingHashtag(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const data = await apiFetch<unknown>('/admin/instagram/sync', { method: 'POST' });
      setSyncMessage(describeSync(data));
      await Promise.all([loadStatus(), loadPosts()]);
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') {
        // O navegador desistiu de esperar a resposta; no servidor a importação continua.
        setSyncMessage(describeSync({ finished: false }));
      } else {
        // 400 (sem conta conectada ou token vencido) e 502 (o Instagram falhou na rodada) chegam com a mensagem do
        // servidor, em português.
        setSyncMessage({ variant: 'error', text: messageOf(err, 'Não foi possível sincronizar agora. Tente de novo em alguns minutos.') });
      }
      // A situação pode ter mudado na rodada (ex.: token recusado vira "Conexão vencida").
      await loadStatus();
    } finally {
      setSyncing(false);
    }
  };

  const updatePost = async (post: AdminInstagramPost, patch: { isHidden?: boolean; isPinned?: boolean }, title: string, message: string) => {
    setBusyPostId(post.id);
    try {
      await apiFetch(`/admin/instagram/posts/${encodeURIComponent(post.id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
      setPosts((prev) => sortPosts(prev.map((item) => (item.id === post.id ? { ...item, ...patch } : item))));
      addNotification({ type: 'success', title, message });
      // Os números de "Publicações importadas" (no site, ocultas) mudam junto.
      void loadStatus();
    } catch (err) {
      addNotification({ type: 'error', title: 'Não foi possível salvar', message: messageOf(err, 'Tente de novo.') });
    } finally {
      setBusyPostId(null);
    }
  };

  const handleCreateProject = async (post: AdminInstagramPost) => {
    setBusyPostId(post.id);
    try {
      const data = await apiFetch<unknown>(`/admin/instagram/posts/${encodeURIComponent(post.id)}/portfolio`, { method: 'POST' });
      const portfolio = readPortfolioLink((data as { portfolio?: unknown } | null)?.portfolio);
      if (portfolio) {
        setPosts((prev) => prev.map((item) => (item.id === post.id ? { ...item, portfolio } : item)));
      } else {
        await loadPosts();
      }
      addNotification({
        type: 'success',
        title: 'Projeto criado no Portfólio',
        message: portfolio
          ? `"${portfolio.title}" já está no Portfólio do site. Em "Ver projeto" você confere o título e a descrição.`
          : 'O projeto já está no Portfólio do site.',
      });
      // O número "no Portfólio" de "Publicações importadas" muda junto.
      void loadStatus();
    } catch (err) {
      if ((err as { status?: number }).status === 409) {
        await loadPosts();
        addNotification({ type: 'info', title: 'Este post já tem um projeto', message: 'Use "Ver projeto" para abrir o projeto no Portfólio.' });
      } else {
        addNotification({ type: 'error', title: 'Não foi possível criar o projeto', message: messageOf(err, 'Tente de novo.') });
      }
    } finally {
      setBusyPostId(null);
    }
  };

  if (statusLoading && !status) {
    return (
      <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
        <div className="flex min-h-[400px] flex-col items-center justify-center">
          <BrandLoader size={120} label="Carregando Instagram…" />
        </div>
      </AdminLayout>
    );
  }

  const current = status?.status ?? 'disconnected';
  const isLinked = current !== 'disconnected';
  const accountType = status?.accountType ? ACCOUNT_TYPE_LABEL[status.accountType.toUpperCase()] ?? status.accountType : null;
  const hashtag = status?.portfolioHashtag ?? 'portfolioX';
  const canSync = current === 'ok' || current === 'refresh_failing';

  return (
    <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
      <div className="space-y-6">
        {statusError && (
          <Alert
            variant="error"
            title="Não foi possível carregar a situação do Instagram"
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
                <Instagram className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Conexão com o Instagram</h2>
                <p className="text-sm text-muted-foreground">
                  {status?.username ? `@${status.username}` : INSTAGRAM_HANDLE}
                  {accountType ? ` · conta ${accountType}` : ''}
                </p>
              </div>
            </div>
            <Badge variant={STATUS_BADGE[current].variant} size="lg">
              {STATUS_BADGE[current].text}
            </Badge>
          </div>

          {current === 'disconnected' && (
            <p className="text-sm text-muted-foreground">
              O Instagram ainda não está conectado. Siga os passos de &quot;Como conectar&quot;, mais abaixo, e cole o token no campo
              abaixo.
            </p>
          )}

          {(current === 'ok' || current === 'refresh_failing') && status?.tokenExpiresAt && (
            <p className="text-sm text-muted-foreground">
              A conexão vale até <strong className="text-foreground">{formatDate(status.tokenExpiresAt)}</strong> e o sistema renova
              sozinho antes de vencer
              {status.tokenRefreshedAt ? ` (última renovação em ${formatDate(status.tokenRefreshedAt)})` : ''}.
            </p>
          )}

          {current === 'refresh_failing' && (
            <Alert variant="warning" title="O sistema não conseguiu renovar a conexão">
              <p>
                A conexão continua funcionando
                {status?.tokenExpiresAt ? ` até ${formatDate(status.tokenExpiresAt)}` : ''}, e o sistema tenta renovar de novo
                sozinho. Se este aviso continuar amanhã, gere um token novo no painel da Meta e cole no campo abaixo.
              </p>
              {status?.refreshError && <p className="mt-2 text-xs text-muted-foreground">Detalhe técnico: {status.refreshError}</p>}
            </Alert>
          )}

          {current === 'expired' && (
            <Alert variant="error" title="A conexão com o Instagram venceu ou foi cancelada">
              <p>
                As publicações já importadas continuam no site, mas as novas não chegam. Gere um token novo no painel da Meta e
                cole no campo abaixo.
              </p>
              {status?.refreshError && <p className="mt-2 text-xs text-muted-foreground">Detalhe técnico: {status.refreshError}</p>}
            </Alert>
          )}

          <form onSubmit={handleConnect} className="space-y-3" autoComplete="off">
            <Input
              label={isLinked ? 'Trocar o token de acesso' : 'Token de acesso do Instagram'}
              name="instagramAccessToken"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Cole aqui o token gerado no painel da Meta"
              helperText="O token fica guardado cifrado no servidor e não aparece mais nesta tela. Nunca envie o token por chat ou e-mail."
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" isLoading={connecting} disabled={connecting || token.trim() === ''}>
                {isLinked ? 'Trocar token' : 'Conectar'}
              </Button>
              {isLinked && (
                <Button type="button" variant="outline" onClick={() => setConfirmDisconnect(true)} leftIcon={<Unplug className="h-4 w-4" aria-hidden="true" />}>
                  Desconectar
                </Button>
              )}
            </div>
          </form>

          {connectError && (
            <Alert variant="error" title="Não foi possível conectar" onClose={() => setConnectError(null)}>
              {connectError}
            </Alert>
          )}
          {connectMessage && (
            <Alert variant="success" title="Pronto" onClose={() => setConnectMessage(null)}>
              {connectMessage}
            </Alert>
          )}
        </Card>

        {/* Hashtag e sincronização */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-4 p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">Hashtag do Portfólio</h2>
              <p className="text-sm text-muted-foreground">
                Publicação com <strong className="text-foreground">#{hashtag}</strong> na legenda vira projeto do Portfólio sozinha, na
                próxima sincronização.
              </p>
            </div>
            <form onSubmit={handleSaveHashtag} className="space-y-3">
              <Input
                label="Hashtag (sem o #)"
                name="portfolioHashtag"
                value={hashtagValue}
                maxLength={51}
                autoComplete="off"
                onChange={(e) => {
                  setHashtagDraft(e.target.value);
                  setHashtagError(null);
                }}
                error={hashtagError ?? undefined}
              />
              <Button type="submit" variant="outline" isLoading={savingHashtag} disabled={savingHashtag}>
                Salvar hashtag
              </Button>
            </form>
          </Card>

          <Card className="space-y-4 p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">Sincronização</h2>
              <p className="text-sm text-muted-foreground">
                O sistema confere o Instagram sozinho a cada hora. Use o botão para buscar agora o que acabou de publicar.
              </p>
            </div>
            <dl className="space-y-1 text-sm">
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted-foreground">Última verificação:</dt>
                <dd className="text-foreground">{formatDateTime(status?.lastCheckAt) || 'ainda não houve desde a última atualização do servidor'}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted-foreground">Última importação com novidades:</dt>
                <dd className="text-foreground">{formatDateTime(status?.lastSyncAt) || 'nenhuma ainda'}</dd>
              </div>
              {status && (
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted-foreground">Publicações importadas:</dt>
                  <dd className="text-foreground">
                    {status.counts.total} ({status.counts.visible} no site, {count(status.counts.hidden, 'oculta', 'ocultas')},{' '}
                    {status.counts.inPortfolio} no Portfólio)
                  </dd>
                </div>
              )}
            </dl>
            {status?.syncRunning && !syncing && <p className="text-sm text-info">Uma importação está em andamento agora.</p>}
            {status?.lastSyncError && (
              <Alert variant="warning" title="A última busca no Instagram deu erro">
                <p>O sistema tenta de novo sozinho na próxima hora. Se o erro continuar, confira a conexão acima.</p>
                <p className="mt-2 text-xs text-muted-foreground">Detalhe técnico: {status.lastSyncError}</p>
              </Alert>
            )}
            <div className="space-y-2">
              <Button
                type="button"
                onClick={() => void handleSync()}
                isLoading={syncing}
                disabled={syncing || !canSync}
                leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
              >
                {syncing ? 'Sincronizando… (até meio minuto)' : 'Sincronizar agora'}
              </Button>
              {!canSync && (
                <p className="text-xs text-muted-foreground">
                  {current === 'expired' ? 'Cole um token novo para voltar a sincronizar.' : 'Conecte o Instagram para sincronizar.'}
                </p>
              )}
            </div>
            {syncMessage && (
              <Alert variant={syncMessage.variant} onClose={() => setSyncMessage(null)}>
                {syncMessage.text}
              </Alert>
            )}
          </Card>
        </div>

        {/* Dicas e passos: só orientação, nada aqui trava uma publicação. */}
        <div className="grid gap-6 lg:grid-cols-2">
          <details className="group rounded-lg border border-border bg-card p-5">
            <summary className="flex cursor-pointer items-center gap-2 font-semibold text-foreground">
              <Lightbulb className="h-4 w-4 text-primary" aria-hidden="true" />
              Dicas para as publicações
            </summary>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>A primeira linha da legenda vira o título do projeto; o resto vira a descrição.</li>
              <li>Use #{hashtag} na legenda para mandar a publicação para o Portfólio.</li>
              <li>No carrossel, coloque as melhores fotos primeiro.</li>
              <li>Prefira fotos na horizontal e com boa luz.</li>
              <li>Um vídeo curto da estrutura funcionando mostra bem o trabalho.</li>
            </ul>
            <p className="mt-4 text-sm font-medium text-foreground">São só sugestões; nada impede a publicação.</p>
          </details>

          <details className="group rounded-lg border border-border bg-card p-5">
            <summary className="flex cursor-pointer items-center gap-2 font-semibold text-foreground">
              <ListOrdered className="h-4 w-4 text-primary" aria-hidden="true" />
              Como conectar
            </summary>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>A conta do Instagram precisa ser profissional (Empresa ou Criador de conteúdo).</li>
              <li>Crie um app na Meta for Developers (developers.facebook.com) com o produto Instagram.</li>
              <li>Adicione a conta {INSTAGRAM_HANDLE} ao app.</li>
              <li>
                Em &quot;Instagram &gt; Configuração da API com login da empresa no Instagram&quot;, clique em &quot;Gerar token&quot;.
              </li>
              <li>Cole o token aqui e clique em Conectar. Nunca envie o token por chat ou e-mail.</li>
              <li>O sistema renova a conexão sozinho, antes de vencer.</li>
            </ol>
          </details>
        </div>

        {/* Publicações importadas */}
        <Card className="space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">Publicações importadas</h2>
            <p className="text-sm text-muted-foreground">
              As fixadas aparecem primeiro no site. Ocultar tira a publicação da seção do Instagram no site, sem mexer no
              Instagram nem nos projetos do Portfólio.
            </p>
          </div>

          {postsError && (
            <Alert
              variant="error"
              title="Não foi possível carregar as publicações"
              action={
                <Button size="sm" variant="outline" onClick={() => void loadPosts()}>
                  Tentar de novo
                </Button>
              }
            >
              {postsError}
            </Alert>
          )}

          {postsLoading ? (
            <div className="flex justify-center py-12">
              <BrandLoader size={80} label="Carregando publicações…" />
            </div>
          ) : posts.length === 0 && !postsError ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma publicação importada ainda. Depois de conectar, elas aparecem aqui.
            </p>
          ) : (
            <ul className="divide-y divide-border" aria-label="Publicações importadas">
              {posts.map((post) => {
                const busy = busyPostId === post.id;
                const postUrl = safeInstagramPermalink(post.permalink);
                const snippet = summarizeCaption(post.caption) || 'Sem legenda';
                return (
                  <li key={post.id} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-start">
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      {post.imageUrl ? (
                        <img
                          src={getOptimizedImageUrl(post.imageUrl, { width: 160, height: 160, crop: 'fill' })}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-6 w-6" aria-hidden="true" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-sm text-foreground">{snippet}</p>
                      <p className="text-xs text-muted-foreground">
                        {MEDIA_TYPE_LABEL[post.mediaType] ?? post.mediaType}
                        {formatDate(post.postedAt) ? ` · ${formatDate(post.postedAt)}` : ''}
                        {postUrl && (
                          <>
                            {' · '}
                            <a href={postUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                              Ver no Instagram
                              <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            </a>
                          </>
                        )}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {post.isHidden && <Badge variant="ghost">Oculto</Badge>}
                        {post.isPinned && <Badge variant="primary">Fixado</Badge>}
                        {post.portfolio && <Badge variant="success">No portfólio</Badge>}
                        {post.removedAt && <Badge variant="warning">Removido do Instagram</Badge>}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:max-w-xs sm:justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          void updatePost(
                            post,
                            { isHidden: !post.isHidden },
                            post.isHidden ? 'Publicação de volta ao site' : 'Publicação oculta',
                            post.isHidden
                              ? 'Ela volta a aparecer no site.'
                              : `Ela sai da seção do Instagram no site; no Instagram nada muda.${
                                  post.portfolio ? ' O projeto do Portfólio feito com ela continua no site.' : ''
                                }`
                          )
                        }
                      >
                        {post.isHidden ? 'Mostrar' : 'Ocultar do site'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          void updatePost(
                            post,
                            { isPinned: !post.isPinned },
                            post.isPinned ? 'Publicação desafixada' : 'Publicação fixada',
                            post.isPinned ? 'Ela volta para a ordem por data.' : 'Ela aparece primeiro no site.'
                          )
                        }
                      >
                        {post.isPinned ? 'Desafixar' : 'Fixar no topo'}
                      </Button>
                      {post.portfolio ? (
                        <Link
                          to={`/admin/portfolio?editar=${encodeURIComponent(post.portfolio.id)}`}
                          className="inline-flex h-8 items-center rounded-lg px-3 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          Ver projeto
                        </Link>
                      ) : (
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => void handleCreateProject(post)}>
                          Transformar em projeto do Portfólio
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <ConfirmModal
        isOpen={confirmDisconnect}
        onClose={() => setConfirmDisconnect(false)}
        onConfirm={() => void handleDisconnect()}
        title="Desconectar o Instagram?"
        message="O site para de buscar publicações novas. As publicações já importadas e os projetos do Portfólio continuam no site."
        variant="warning"
        isLoading={disconnecting}
        confirmText="Desconectar"
        cancelText="Manter conectado"
      />
    </AdminLayout>
  );
};

export default AdminInstagramPage;
