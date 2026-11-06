
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { socialService, SocialPost } from '../../services/socialService';
import { ModerationGrid } from '../../components/social/ModerationGrid';
import {
  RefreshCw,
  Settings,
  Check,
  Tv,
  Zap,
  ShieldCheck,
  Layout,
  Globe,
  ArrowLeft,
  XCircle
} from 'lucide-react';
import { io } from 'socket.io-client';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  Button,
  Card,
  Modal,
  Badge,
  Input,
  Select,
  Checkbox,
  Alert,
} from '../../components/ui/StandardComponents';
import { apiFetch } from '../../services/api';
import { BrandLoader } from '../../components/ui/BrandLoader';
import { useNotifications } from '@/contexts/NotificationContext';
import { logger } from '../../utils/logger';

interface SponsorLogo {
    id: string;
    name: string;
    imageUrl: string;
}

type ModerationTab = 'PENDING' | 'APPROVED' | 'REJECTED';

// Achado (lote 12): desde adcea6a (31/03/2026) o interceptor do axios tira o envelope { success, data } das
// respostas, e o socialService devolve o valor direto (a lista de publicações, o mural). Esta tela lia `.data`
// de novo: a lista ficava vazia, o mural vinha undefined e a moderação caía em "Não foi possível carregar as
// publicações do mural"; depois de salvar as configurações, o mural sumia da tela. Aceita os dois formatos.
function withoutEnvelope<T>(value: unknown): T | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'data' in value) {
    return (value as { data?: T }).data;
  }
  return value as T | undefined;
}

// Título e breadcrumb constantes (antes o título trocava de "Social Moderation" para "Mural: …"
// quando os dados chegavam). O nome do mural aparece no cabeçalho da página.
const PAGE_TITLE = 'Moderação do mural';
const BREADCRUMBS = [
  { name: 'Admin', href: '/admin/painel' },
  { name: 'Mural social', href: '/admin/social' },
  { name: 'Moderação' },
];

const TABS: { id: ModerationTab; label: string; icon: typeof Check; color: string }[] = [
  { id: 'PENDING', label: 'Aguardando moderação', icon: ShieldCheck, color: 'text-warning' },
  { id: 'APPROVED', label: 'No telão', icon: Check, color: 'text-success' },
  { id: 'REJECTED', label: 'Arquivadas', icon: XCircle, color: 'text-destructive' },
];

const AdminSocialPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  // Distinguish context based on URL
  const isBookingContext = location.pathname.includes('/reservas/');
  const eventId = isBookingContext ? id : undefined;
  const settingId = !isBookingContext ? id : undefined;

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string[]>([]);
  const [tab, setTab] = useState<ModerationTab>('PENDING');
  const [pairingCode, setPairingCode] = useState('');
  const [pairingLoading, setPairingLoading] = useState(false);
  const [wall, setWall] = useState<Record<string, unknown> | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [allSponsors, setAllSponsors] = useState<SponsorLogo[]>([]);
  const [selectedSponsorIds, setSelectedSponsorIds] = useState<string[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);
  // Estado real da conexão em tempo real (antes um rodapé fixo dizia "Socket.io Conectado" sempre).
  const [socketConnected, setSocketConnected] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
        if (!id) return;
        setLoading(true);
        const response = await socialService.getPosts({
            eventId: eventId,
            settingId: settingId,
            status: tab,
            limit: 100
        });
        setPosts(withoutEnvelope<SocialPost[]>(response) || []);

        // O settingId do envelope só vinha no contexto de reserva (sem rota no painel); o do endereço vale.
        const targetId = (Array.isArray(response) ? undefined : response?.settingId) || settingId;
        if (targetId) {
            const wallData = withoutEnvelope<Record<string, unknown>>(await socialService.getAdminWall(targetId)) ?? null;
            setWall(wallData);
            setSelectedSponsorIds((wallData?.sponsors as {id: string}[] | undefined)?.map(s => s.id) || []);
        }
        setLoadError(null);
    } catch (error) {
        // Antes: só toast — a grade dizia que não havia publicações.
        logger.error('Failed to fetch posts', 'AdminSocialPage', error);
        setLoadError('Não foi possível carregar as publicações do mural.');
    } finally {
        setLoading(false);
    }
  }, [id, eventId, settingId, tab]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const fetchSponsors = async () => {
     try {
         const data = await apiFetch<SponsorLogo[]>('/admin/sponsors');
         setAllSponsors(data || []);
     } catch (err) {
         logger.error('Erro', 'AdminSocialPage', err);
     }
  };

  useEffect(() => {
    if (!id) return;

    const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:4000' : '/';
    const socket = io(socketUrl, { path: '/socket.io' });

    socket.on('connect', () => {
        setSocketConnected(true);
        // D5: só a sala do mural. A sala event:<reserva> é da equipe do evento e não recebe mais as fotos.
        if (settingId) {
            socket.emit('join', `wall:${settingId}`);
        }
    });

    socket.on('disconnect', () => setSocketConnected(false));

    socket.on('post:new', (post: SocialPost) => {
        setPosts(prev => {
            if (post.status === tab) {
                 if (prev.find(p => p.id === post.id)) return prev;
                 return [post, ...prev];
            } else {
                 return prev.filter(p => p.id !== post.id);
            }
        });
        if (post.status === 'PENDING') {
            addNotification({ type: 'info', title: 'Nova publicação', message: 'O mural recebeu uma nova foto para moderar.' });
        }
    });

    socket.on('post:remove', ({ id: postId }: { id: string }) => {
        setPosts(prev => prev.filter(p => p.id !== postId));
    });

    return () => {
        socket.disconnect();
        setSocketConnected(false);
    };
  }, [id, eventId, settingId, tab, addNotification]);

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingCode || (!settingId && !eventId)) return;

    try {
        setPairingLoading(true);
        await socialService.pairDevice({
            pairingCode: String(pairingCode),
            settingId: settingId ? String(settingId) : undefined,
            eventId: eventId ? String(eventId) : undefined,
            deviceName: 'TV do evento'
        });

        addNotification({ type: 'success', title: 'TV pareada', message: 'O telão está conectado a este mural.' });
        setPairingCode('');
    } catch (error: unknown) {
        addNotification({ type: 'error', title: 'Falha no pareamento', message: (error instanceof Error ? error.message : String(error)) || 'Código inválido ou expirado.' });
    } finally {
        setPairingLoading(false);
    }
  };

  const handleModerate = async (postId: string, status: 'APPROVED' | 'REJECTED') => {
    const originalPosts = [...posts];
    setProcessing(prev => [...prev, postId]);
    setPosts(prev => prev.filter(p => p.id !== postId));

    try {
      await socialService.moderatePost(postId, status);
      // A mensagem antiga interpolava o enum em inglês ("feed de approved").
      addNotification({
        type: status === 'APPROVED' ? 'success' : 'info',
        title: status === 'APPROVED' ? 'Foto aprovada' : 'Foto rejeitada',
        message: status === 'APPROVED' ? 'A foto vai aparecer no telão.' : 'A foto foi arquivada.'
      });
    } catch (error) {
       logger.error('Erro', 'AdminSocialPage', error);
       setPosts(originalPosts);
       addNotification({ type: 'error', title: 'Erro na moderação', message: 'Não foi possível salvar a moderação.' });
    } finally {
       setProcessing(prev => prev.filter(pid => pid !== postId));
    }
  };

  const handleManualSync = async () => {
    if (!id) return;
    try {
        await socialService.syncNow(id, settingId ? 'setting' : 'event');
        addNotification({ type: 'info', title: 'Sincronização iniciada', message: 'Buscando novas publicações. Aguarde.' });
    } catch {
        addNotification({ type: 'error', title: 'Erro na sincronização', message: 'Não foi possível atualizar o feed.' });
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!wall?.id) return;
      try {
          setSavingSettings(true);
          const form = e.target as HTMLFormElement;
          const formData = new FormData(form);
          // Achado (auditoria): o payload enviava `enableMosaic`/`enableGamification` lidos de campos que
          // não existem neste formulário — sempre false. Cada "Salvar" desligava o mosaico (padrão: ligado)
          // e a gamificação do telão. Agora os dois ficam fora do payload: o backend só altera os campos
          // enviados, então os valores atuais do mural são preservados.
          const data: Record<string, unknown> = {
              name: formData.get('name') as string,
              slug: formData.get('slug') as string,
              hashtag: formData.get('hashtag') as string,
              layoutMode: formData.get('layoutMode') as string,
              qrCodeText: formData.get('qrCodeText') as string,
              enableQrCode: formData.get('enableQrCode') === 'on',
              autoApprove: formData.get('autoApprove') === 'on',
              sponsorIds: selectedSponsorIds
          };

        await socialService.updateWall(wall.id as string, data);
        setIsSettingsOpen(false);
        const updated = await socialService.getAdminWall(wall.id as string);
        setWall(withoutEnvelope<Record<string, unknown>>(updated) ?? null);
        addNotification({ type: 'success', title: 'Configurações salvas', message: 'As configurações do mural foram atualizadas.' });
    } catch (err: unknown) {
        addNotification({
          type: 'error',
          title: 'Erro ao salvar',
          message: (err as {response?: {data?: {error?: string}}})?.response?.data?.error || 'Verifique se o endereço (slug) ou a hashtag já estão em uso.'
        });
    } finally {
        setSavingSettings(false);
    }
  };

  const stats = useMemo(() => ({
    hashtag: (wall?.hashtag as string | undefined) || '',
  }), [wall]);

  if (loading && posts.length === 0 && !loadError) {
      return (
        <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <BrandLoader size={120} label="Carregando publicações…" />
            </div>
        </AdminLayout>
      );
  }

  return (
    <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
        <div className="space-y-6">
            {/* Barra de controle */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="rounded-xl shrink-0" aria-label="Voltar" title="Voltar">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                             <h2 className="text-xl font-bold text-foreground">{(wall?.name as string) || 'Mural'}</h2>
                             <Badge variant={socketConnected ? 'success' : 'warning'}>
                               {socketConnected ? 'Ao vivo' : 'Reconectando…'}
                             </Badge>
                        </div>
                        {stats.hashtag && (
                          <p className="text-sm text-muted-foreground mt-0.5">
                              Hashtag monitorada: <span className="text-primary font-bold">#{stats.hashtag}</span>
                          </p>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <form onSubmit={handlePair} className="flex gap-2 w-full sm:w-auto">
                        <div className="w-28">
                          <Input
                              size="sm"
                              type="text"
                              placeholder="Código"
                              aria-label="Código de pareamento da TV"
                              className="text-center font-bold tracking-widest uppercase"
                              value={pairingCode}
                              onChange={e => setPairingCode(e.target.value)}
                              maxLength={4}
                          />
                        </div>
                        <Button type="submit" size="sm" isLoading={pairingLoading} disabled={!pairingCode}>
                            Parear TV
                        </Button>
                    </form>

                    <div className="h-8 w-px bg-border hidden sm:block mx-1" />

                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={handleManualSync} leftIcon={<RefreshCw className="h-4 w-4" />}>
                            Sincronizar
                        </Button>
                        <Button variant="outline" size="sm" leftIcon={<Tv className="h-4 w-4" />} onClick={() => {
                            const url = wall?.slug ? `/tv?slug=${wall.slug}` : `/tv?settingId=${id}`;
                            window.open(url, '_blank');
                        }}>
                            Abrir telão
                        </Button>
                        <Button
                            variant="primary"
                            size="icon"
                            className="shrink-0"
                            aria-label="Configurações do mural"
                            title="Configurações do mural"
                            onClick={() => {
                                fetchSponsors();
                                setIsSettingsOpen(true);
                            }}
                        >
                            <Settings className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {loadError && (
              <Alert
                variant="error"
                title="Erro ao carregar"
                description={loadError}
                action={<Button size="sm" variant="outline" onClick={fetchPosts}>Tentar de novo</Button>}
              />
            )}

            {/* Moderação */}
            <Card className="border-border p-0 overflow-hidden shadow-sm">
                <div className="flex overflow-x-auto bg-muted/20 border-b border-border" role="tablist" aria-label="Situação das publicações">
                    {TABS.map((status) => {
                        const selected = tab === status.id;
                        return (
                          <button
                              key={status.id}
                              type="button"
                              role="tab"
                              aria-selected={selected}
                              onClick={() => setTab(status.id)}
                              className={`flex-1 min-w-[150px] py-4 px-6 text-xs font-bold uppercase tracking-wider transition-all relative flex items-center justify-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                                  selected
                                  ? 'text-primary bg-primary/5'
                                  : 'text-muted-foreground hover:bg-muted/50'
                              }`}
                          >
                              <status.icon className={`h-4 w-4 ${selected ? 'text-primary' : status.color}`} aria-hidden="true" />
                              {status.label}
                              {selected && (
                                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary animate-in fade-in duration-300" />
                              )}
                          </button>
                        );
                    })}
                </div>

                <div className="p-4 sm:p-8 min-h-[500px]" role="tabpanel">
                    {loading ? (
                        <div className="flex flex-col justify-center items-center h-[400px]">
                            <BrandLoader size={80} label="Carregando publicações…" />
                        </div>
                    ) : loadError && posts.length === 0 ? null : (
                        <ModerationGrid
                            posts={posts}
                            onApprove={(postId) => handleModerate(postId, 'APPROVED')}
                            onReject={(postId) => handleModerate(postId, 'REJECTED')}
                            processingIds={processing}
                        />
                    )}
                </div>
            </Card>
        </div>

        <Modal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            title="Configurações do mural"
            size="lg"
        >
            <form onSubmit={handleUpdateSettings} className="space-y-8 py-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
                            <h4 className="font-bold text-sm text-foreground">Identificação</h4>
                        </div>
                        <div className="space-y-4">
                            <Input size="sm" label="Nome do mural" name="name" defaultValue={(wall?.name as string) || ''} placeholder="Ex.: Casamento Ana e João" />
                            <Input size="sm" label="Hashtag (sem #)" name="hashtag" defaultValue={(wall?.hashtag as string) || ''} placeholder="festa2026" />
                            <Input
                              size="sm"
                              label="Endereço do telão (slug)"
                              name="slug"
                              defaultValue={(wall?.slug as string) || ''}
                              placeholder="festa-ana-joao"
                              description="Acesso pelo endereço /tv?slug=seu-endereco"
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Layout className="h-4 w-4 text-primary" aria-hidden="true" />
                            <h4 className="font-bold text-sm text-foreground">Exibição</h4>
                        </div>
                        <div className="space-y-4">
                            <Select
                              size="sm"
                              label="Orientação da tela"
                              name="layoutMode"
                              defaultValue={(wall?.layoutMode as string) || 'LANDSCAPE'}
                              options={[
                                { value: 'LANDSCAPE', label: 'Horizontal (TV)' },
                                { value: 'PORTRAIT', label: 'Vertical (totem)' },
                              ]}
                            />
                            <Input size="sm" label="Texto do QR Code" name="qrCodeText" defaultValue={(wall?.qrCodeText as string) || ''} placeholder="Escaneie para participar" />
                            <div className="grid grid-cols-1 gap-3 pt-2">
                                <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-1">
                                    <Checkbox
                                      name="enableQrCode"
                                      label="Mostrar instruções com QR Code"
                                      defaultChecked={Boolean(wall?.enableQrCode)}
                                      aria-describedby="enableQrCode-hint"
                                    />
                                    <p id="enableQrCode-hint" className="text-xs text-muted-foreground pl-6">Exibe no telão o card com o QR Code e as instruções.</p>
                                </div>
                                <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/5 space-y-1">
                                    <Checkbox
                                      name="autoApprove"
                                      label="Aprovação automática"
                                      defaultChecked={Boolean(wall?.autoApprove)}
                                      aria-describedby="autoApprove-hint"
                                    />
                                    <p id="autoApprove-hint" className="text-xs text-destructive pl-6">Toda foto vai direto para o telão, sem moderação. Use com cuidado.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-border">
                    <div className="flex items-center gap-2 mb-4">
                        <Globe className="h-4 w-4 text-primary" aria-hidden="true" />
                        <h4 className="font-bold text-sm text-foreground">Patrocinadores exibidos</h4>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-h-48 overflow-y-auto p-1">
                        {allSponsors.map(sponsor => {
                            const selected = selectedSponsorIds.includes(sponsor.id);
                            return (
                              // Era um <div onClick> — sem foco nem teclado. Agora é um botão de alternar.
                              <button
                                  key={sponsor.id}
                                  type="button"
                                  aria-pressed={selected}
                                  onClick={() => {
                                      setSelectedSponsorIds(prev =>
                                          prev.includes(sponsor.id)
                                          ? prev.filter(sid => sid !== sponsor.id)
                                          : [...prev, sponsor.id]
                                      );
                                  }}
                                  className={`relative p-3 border-2 rounded-2xl transition-all flex flex-col items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                      selected
                                      ? 'border-primary bg-primary/5 shadow-inner'
                                      : 'border-border bg-card grayscale hover:grayscale-0 hover:border-primary/50'
                                  }`}
                              >
                                  <div className="h-12 w-full flex items-center justify-center p-1">
                                      <img src={sponsor.imageUrl} alt="" className="max-h-full max-w-full object-contain" />
                                  </div>
                                  <span className="text-xs font-bold truncate w-full text-center text-foreground">{sponsor.name}</span>

                                  {selected && (
                                      <div className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground rounded-full p-1 shadow-lg ring-2 ring-background" aria-hidden="true">
                                          <Check size={10} strokeWidth={4} />
                                      </div>
                                  )}
                              </button>
                            );
                        })}
                    </div>
                    {allSponsors.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 bg-muted/30 rounded-2xl border border-dashed border-border px-4">
                             <p className="text-sm text-muted-foreground text-center">Nenhum patrocinador cadastrado.</p>
                             <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => navigate('/admin/social/sponsors')}>Cadastrar patrocinador</Button>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-border">
                    <Button type="button" variant="outline" onClick={() => setIsSettingsOpen(false)}>Cancelar</Button>
                    <Button type="submit" isLoading={savingSettings}>
                         Salvar
                    </Button>
                </div>
            </form>
        </Modal>
    </AdminLayout>
  );
};

export default AdminSocialPage;
