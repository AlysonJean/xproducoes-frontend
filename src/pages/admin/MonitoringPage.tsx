import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  Button,
  buttonVariants,
  Card,
  Badge,
  Grid,
  Alert
} from '@/components/ui/StandardComponents';
import { useAuth } from '../../contexts/AuthContext';
import { SentryTestButton } from '../../components/SentryTestButton';
import { useNotifications } from '@/contexts/NotificationContext';
import {
  MonitoringService,
  IntegrationHealth,
  SystemHealth,
  Alert as MonitoringAlert,
  DashboardData
} from '../../services/monitoringService';
import {
  Activity,
  Zap,
  AlertTriangle,
  RefreshCw,
  Cpu,
  HardDrive,
  Clock,
  Server,
  Globe,
  Layout,
  Database,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronRight,
  Monitor,
  ShieldCheck
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { logger } from '../../utils/logger';

const monitoringService = MonitoringService.getInstance();

const PAGE_TITLE = 'Monitoramento';
const BREADCRUMBS = [{ name: 'Admin', href: '/admin/painel' }, { name: 'Monitoramento' }];
const REFRESH_INTERVAL_MS = 30000;

// Mapas de classes completas: o Tailwind só gera classes escritas por inteiro. Antes o ponto de
// status usava `text-emerald-500` numa div sem fundo (invisível) e `ring-${cor}-500/10` (nunca gerado).
const STATUS_INFO = {
  healthy: { variant: 'success' as const, icon: CheckCircle2, label: 'Operacional', text: 'text-success', dot: 'bg-success', ring: 'ring-success/10' },
  warning: { variant: 'warning' as const, icon: AlertTriangle, label: 'Degradado', text: 'text-warning', dot: 'bg-warning', ring: 'ring-warning/10' },
  error: { variant: 'destructive' as const, icon: XCircle, label: 'Falha', text: 'text-destructive', dot: 'bg-destructive', ring: 'ring-destructive/10' },
  unknown: { variant: 'outline' as const, icon: Activity, label: 'Desconhecido', text: 'text-muted-foreground', dot: 'bg-muted-foreground', ring: 'ring-muted/10' },
};

const getStatusInfo = (status: string) =>
  STATUS_INFO[status as keyof typeof STATUS_INFO] || STATUS_INFO.unknown;

const ALERT_TYPE_INFO: Record<MonitoringAlert['type'], { label: string; variant: 'destructive' | 'warning' | 'info'; box: string }> = {
  error: { label: 'Erro', variant: 'destructive', box: 'bg-destructive/10 text-destructive' },
  warning: { label: 'Aviso', variant: 'warning', box: 'bg-warning/10 text-warning' },
  info: { label: 'Informativo', variant: 'info', box: 'bg-info/10 text-info' },
};

const formatLatency = (ms: number) => (ms > 0 ? `${ms} ms` : '—');

export const MonitoringPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationHealth[]>([]);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  const loadDashboardData = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setIsLoading(true);
      const data = await monitoringService.getDashboard();

      // GA4 roda no navegador: o "status" é só se o ID de rastreamento está configurado.
      const gaId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;
      const hasGa = !!gaId && gaId.length > 5;

      const gaIntegration: IntegrationHealth = {
        name: 'Google Analytics 4',
        status: hasGa ? 'healthy' : 'warning',
        responseTime: 0,
        lastCheck: new Date().toISOString(),
        errorMessage: hasGa ? undefined : 'ID de rastreamento não configurado'
      };

      if (!data.integrations.find(i => i.name === 'Google Analytics 4')) {
         data.integrations.push(gaIntegration);
      }

      setDashboardData(data);
      setIntegrations(data.integrations);
      setAlerts(data.activeAlerts);
      setSystemHealth(data.systemHealth);
      setLastUpdate(new Date());
      setLoadError(null);
    } catch {
      logger.error('Erro ao carregar dashboard:', 'MonitoringPage');
      // Antes só um toast — e a área de conteúdo ficava em branco.
      setLoadError('Não foi possível carregar os dados de monitoramento.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData(true);
    const interval = setInterval(() => loadDashboardData(false), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const testIntegration = async (integrationName: string) => {
    if (integrationName === 'Google Analytics 4') {
      // Não há chamada de rede a medir: a latência era um número aleatório. Só confere a configuração.
      const gaId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;
      const hasGa = !!gaId && gaId.length > 5;
      const result: IntegrationHealth = {
        name: 'Google Analytics 4',
        status: hasGa ? 'healthy' : 'warning',
        responseTime: 0,
        lastCheck: new Date().toISOString(),
        errorMessage: hasGa ? undefined : 'ID de rastreamento não configurado'
      };
      setIntegrations(prev => prev.map(i => i.name === integrationName ? result : i));
      addNotification(hasGa
        ? { type: 'success', title: 'Google Analytics', message: 'O ID de rastreamento está configurado.' }
        : { type: 'warning', title: 'Google Analytics', message: 'O ID de rastreamento (VITE_GOOGLE_ANALYTICS_ID) não está configurado.' });
      return;
    }

    try {
      const result = await monitoringService.testIntegration(integrationName);
      setIntegrations(prev => prev.map(i => i.name === integrationName ? result : i));
      addNotification({ type: 'success', title: 'Teste concluído', message: `A integração ${integrationName} respondeu.` });
    } catch {
      addNotification({ type: 'error', title: 'Teste falhou', message: `A integração ${integrationName} não respondeu como esperado.` });
    }
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  if (!user || user.role !== 'ADMIN') {
    return (
      <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
        <Alert variant="error" title="Acesso negado">
          Você não tem permissão para ver o monitoramento do sistema.
        </Alert>
      </AdminLayout>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Visão geral', icon: Layout },
    { id: 'integrations', label: 'Integrações', icon: Globe },
    { id: 'system', label: 'Servidor', icon: Server },
    { id: 'alerts', label: 'Incidentes', icon: AlertTriangle },
    { id: 'sentry', label: 'Sentry', icon: Monitor }
  ];

  const errorAlert = (
    <Alert
      variant="error"
      title="Erro ao carregar o monitoramento"
      action={<Button size="sm" variant="outline" onClick={() => loadDashboardData(true)}>Tentar de novo</Button>}
    >
      {loadError || 'Os dados de monitoramento não estão disponíveis.'}
    </Alert>
  );

  return (
    <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                    <Activity className="h-6 w-6 text-primary" />
                </div>
                <div>
                   <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-foreground">Saúde do sistema</h2>
                        {dashboardData && (
                            <span
                              className={`h-2 w-2 rounded-full ${getStatusInfo(dashboardData.overview.systemStatus).dot}`}
                              aria-hidden="true"
                            />
                        )}
                   </div>
                   <p className="text-sm text-muted-foreground">
                     Atualizado às {lastUpdate.toLocaleTimeString('pt-BR')} · atualiza a cada 30 s
                   </p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 min-w-0">
                <div role="tablist" aria-label="Seções do monitoramento" className="flex max-w-full overflow-x-auto bg-muted/50 p-1 rounded-2xl border border-border">
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === t.id}
                            aria-label={t.label}
                            onClick={() => setActiveTab(t.id)}
                            className={`flex shrink-0 items-center gap-2 px-3 sm:px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                activeTab === t.id
                                ? 'bg-background text-primary shadow-sm border border-border'
                                : 'text-muted-foreground hover:bg-muted/80'
                            }`}
                        >
                            <t.icon className="h-4 w-4" aria-hidden="true" />
                            <span className="hidden sm:inline">{t.label}</span>
                        </button>
                    ))}
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => loadDashboardData(true)}
                    disabled={isLoading}
                    title="Atualizar dados"
                    aria-label="Atualizar dados"
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>
        </div>

        {loadError && dashboardData && errorAlert}

        {isLoading && !dashboardData ? (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <BrandLoader size={120} label="Carregando monitoramento…" />
            </div>
        ) : !dashboardData ? (
            errorAlert
        ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Visão geral */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-6">
                        <Grid columns={{ sm: 1, md: 2, lg: 4 }} gap={6}>
                            <Card className="p-4 bg-primary/5 border-primary/10">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Status geral</p>
                                <div className="flex items-center gap-3">
                                   {React.createElement(getStatusInfo(dashboardData.overview.systemStatus).icon, { className: `h-6 w-6 ${getStatusInfo(dashboardData.overview.systemStatus).text}`, 'aria-hidden': true })}
                                   <p className="text-xl font-bold text-foreground">{getStatusInfo(dashboardData.overview.systemStatus).label}</p>
                                </div>
                            </Card>

                            <Card className="p-4">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Integrações OK</p>
                                <div className="flex items-center gap-3">
                                   <div className="h-10 w-10 rounded-full bg-info/10 flex items-center justify-center text-info">
                                      <Globe className="h-5 w-5" />
                                   </div>
                                   <p className="text-2xl font-bold text-foreground">{dashboardData.overview.healthyIntegrations} / {dashboardData.overview.totalIntegrations}</p>
                                </div>
                            </Card>

                            <Card className={`p-4 ${dashboardData.overview.activeAlerts > 0 ? 'bg-destructive/5 border-destructive/20' : ''}`}>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Alertas ativos</p>
                                <div className="flex items-center gap-3">
                                   <div className={`h-10 w-10 rounded-full flex items-center justify-center ${dashboardData.overview.activeAlerts > 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                                      <AlertTriangle className="h-5 w-5" />
                                   </div>
                                   <p className={`text-2xl font-bold ${dashboardData.overview.activeAlerts > 0 ? 'text-destructive' : 'text-foreground'}`}>{dashboardData.overview.activeAlerts}</p>
                                </div>
                            </Card>

                            <Card className="p-4">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Tempo no ar</p>
                                <div className="flex items-center gap-3">
                                   <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center text-success">
                                      <Clock className="h-5 w-5" />
                                   </div>
                                   <p className="text-2xl font-bold text-foreground">{formatUptime(dashboardData.uptime)}</p>
                                </div>
                            </Card>
                        </Grid>

                        <Grid columns={{ sm: 1, lg: 3 }} gap={6}>
                            <div className="lg:col-span-2">
                                <Card className="p-0 overflow-hidden border-border">
                                    <div className="p-4 sm:p-6 border-b border-border bg-muted/40 flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-3">
                                            <Globe className="h-5 w-5 text-primary" />
                                            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Estado das integrações</h3>
                                        </div>
                                        <Badge variant="outline">Atualiza a cada 30 s</Badge>
                                    </div>
                                    <div>
                                        {dashboardData.integrations.map((integration, idx) => {
                                            const info = getStatusInfo(integration.status);
                                            return (
                                            <div key={integration.name} className={`px-4 sm:px-6 py-4 flex items-center justify-between gap-3 transition-colors hover:bg-muted/30 ${idx !== dashboardData.integrations.length - 1 ? 'border-b border-border' : ''}`}>
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ring-4 ${info.dot} ${info.ring}`} aria-hidden="true" />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-foreground truncate">{integration.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                          Latência: {formatLatency(integration.responseTime)} · Verificado às {new Date(integration.lastCheck).toLocaleTimeString('pt-BR')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Badge variant={info.variant}>{info.label}</Badge>
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                      onClick={() => testIntegration(integration.name)}
                                                      title="Testar integração"
                                                      aria-label={`Testar ${integration.name}`}
                                                    >
                                                        <RefreshCw className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            );
                                        })}
                                    </div>
                                </Card>
                            </div>

                            <div>
                                 <Card className="p-0 overflow-hidden border-border">
                                    <div className="p-4 sm:p-6 border-b border-border bg-muted/40 flex items-center gap-3">
                                        <AlertTriangle className="h-5 w-5 text-warning" />
                                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Incidentes recentes</h3>
                                    </div>
                                    <div className="p-4 sm:p-6 space-y-4">
                                        {dashboardData.activeAlerts.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                                <div className="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center text-success mb-4">
                                                    <ShieldCheck className="h-7 w-7" />
                                                </div>
                                                <p className="text-sm font-bold text-foreground">Nenhum incidente ativo</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {dashboardData.activeAlerts.slice(0, 5).map((alert) => (
                                                    <div key={alert.id} className="p-4 rounded-2xl bg-muted/40 border border-border">
                                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                                            <span className="text-xs font-bold text-primary uppercase tracking-wider truncate">{alert.integration}</span>
                                                            <span className="text-xs text-muted-foreground font-mono shrink-0">{new Date(alert.timestamp).toLocaleTimeString('pt-BR')}</span>
                                                        </div>
                                                        <p className="text-sm text-foreground leading-relaxed line-clamp-2">{alert.message}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {dashboardData.activeAlerts.length > 0 && (
                                        <div className="border-t border-border p-2">
                                          <Button variant="ghost" size="sm" fullWidth onClick={() => setActiveTab('alerts')} rightIcon={<ChevronRight className="h-4 w-4" />}>
                                              Ver todos os incidentes
                                          </Button>
                                        </div>
                                    )}
                                </Card>
                            </div>
                        </Grid>
                    </div>
                )}

                {/* Integrações */}
                {activeTab === 'integrations' && (
                  <Grid columns={{ sm: 1, md: 2, lg: 3 }} gap={6}>
                    {integrations.map((integration) => {
                      const info = getStatusInfo(integration.status);
                      return (
                      <Card key={integration.name} className="overflow-hidden p-0 border-border hover:border-primary/50 transition-colors">
                        <div className="p-4 sm:p-6 border-b border-border bg-muted/30 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                                {React.createElement(info.icon, { className: `h-5 w-5 shrink-0 ${info.text}`, 'aria-hidden': true })}
                                <h3 className="text-sm font-bold text-foreground truncate">{integration.name}</h3>
                            </div>
                            <Badge variant={info.variant}>{info.label}</Badge>
                        </div>
                        <div className="p-4 sm:p-6 space-y-3">
                           <div className="flex justify-between items-center text-sm text-muted-foreground">
                              <span>Latência</span>
                              <span className="text-foreground">{formatLatency(integration.responseTime)}</span>
                           </div>
                           <div className="flex justify-between items-center text-sm text-muted-foreground">
                              <span>Última verificação</span>
                              <span className="text-foreground">{new Date(integration.lastCheck).toLocaleTimeString('pt-BR')}</span>
                           </div>

                           {integration.errorMessage && (
                               <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive leading-relaxed">
                                 {integration.errorMessage}
                               </div>
                           )}

                           <Button
                             onClick={() => testIntegration(integration.name)}
                             variant="outline"
                             size="sm"
                             fullWidth
                             className="mt-2"
                             leftIcon={<Zap size={14} />}
                           >
                             Testar agora
                           </Button>
                        </div>
                      </Card>
                      );
                    })}
                  </Grid>
                )}

                {/* Servidor */}
                {activeTab === 'system' && (
                  !systemHealth ? (
                    <Alert variant="info" title="Dados do servidor indisponíveis">
                      O servidor não enviou métricas de CPU e memória nesta atualização.
                    </Alert>
                  ) : (
                  <Grid columns={{ sm: 1, lg: 3 }} gap={6}>
                    <Card className="p-6 space-y-6">
                      <div className="flex items-center gap-3 pb-4 border-b border-border">
                        <Cpu className="h-5 w-5 text-primary" />
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Processador (CPU)</h3>
                      </div>
                      <div className="flex flex-col items-center py-4">
                        <div className="relative h-32 w-32 flex items-center justify-center">
                            <svg className="h-full w-full rotate-[-90deg]" aria-hidden="true">
                                <circle cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-muted" />
                                <circle cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="8" strokeDasharray={`${Math.PI * 116}`} strokeDashoffset={`${Math.PI * 116 * (1 - systemHealth.cpu.usage / 100)}`} className="text-primary transition-all duration-1000" strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold text-foreground">{systemHealth.cpu.usage.toFixed(0)}%</span>
                                <span className="text-xs text-muted-foreground">em uso</span>
                            </div>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex justify-between gap-2">
                            <span>Núcleos</span>
                            <span className="text-foreground">{systemHealth.cpu.cores}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                            <span>Modelo</span>
                            <span className="text-foreground truncate max-w-[160px]" title={systemHealth.cpu.model}>{systemHealth.cpu.model}</span>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-6 space-y-6">
                      <div className="flex items-center gap-3 pb-4 border-b border-border">
                        <Database className="h-5 w-5 text-info" />
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Memória (RAM)</h3>
                      </div>
                      <div className="flex flex-col items-center py-4">
                        <div className="relative h-32 w-32 flex items-center justify-center">
                            <svg className="h-full w-full rotate-[-90deg]" aria-hidden="true">
                                <circle cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-muted" />
                                <circle cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="8" strokeDasharray={`${Math.PI * 116}`} strokeDashoffset={`${Math.PI * 116 * (1 - systemHealth.memory.usage / 100)}`} className="text-info transition-all duration-1000" strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold text-foreground">{systemHealth.memory.usage.toFixed(0)}%</span>
                                <span className="text-xs text-muted-foreground">em uso</span>
                            </div>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex justify-between">
                            <span>Em uso</span>
                            <span className="text-foreground">{formatBytes(systemHealth.memory.used)}</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-2">
                            <span>Total</span>
                            <span className="text-foreground font-bold">{formatBytes(systemHealth.memory.total)}</span>
                        </div>
                      </div>
                    </Card>

                    {/* O quadro "Plataforma estabilizada… watchdog" era um texto fixo e foi removido. */}
                    <Card className="p-6 space-y-6">
                      <div className="flex items-center gap-3 pb-4 border-b border-border">
                        <HardDrive className="h-5 w-5 text-primary" />
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Tempo no ar</h3>
                      </div>
                      <div className="h-32 flex flex-col items-center justify-center">
                         <div className="text-3xl font-bold text-foreground">{formatUptime(systemHealth.uptime)}</div>
                         <p className="text-sm text-muted-foreground mt-1">desde o último reinício do servidor</p>
                      </div>
                    </Card>
                  </Grid>
                  )
                )}

                {/* Incidentes */}
                {activeTab === 'alerts' && (
                  <Card className="p-0 border-border overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Incidentes ativos</h3>
                        <Badge variant="outline">{alerts.length}</Badge>
                    </div>
                    <div className="p-4 sm:p-6">
                        {alerts.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center text-success mx-auto mb-4">
                                    <ShieldCheck className="h-8 w-8" />
                                </div>
                                <h3 className="text-lg font-bold text-foreground">Nenhum alerta ativo</h3>
                                <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">Quando uma integração falhar, o alerta aparece aqui.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {alerts.map((alert) => {
                                    const typeInfo = ALERT_TYPE_INFO[alert.type] || ALERT_TYPE_INFO.warning;
                                    return (
                                    <div key={alert.id} className="p-4 sm:p-5 rounded-2xl bg-muted/30 border border-border flex flex-col md:flex-row gap-4 md:items-center justify-between">
                                        <div className="flex items-start gap-4 min-w-0">
                                            <div className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 ${typeInfo.box}`}>
                                                <AlertTriangle size={20} aria-hidden="true" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <h4 className="text-sm font-bold text-foreground">{alert.integration}</h4>
                                                    <Badge variant={typeInfo.variant} size="sm">{typeInfo.label}</Badge>
                                                    {alert.resolved && <Badge variant="success" size="sm">Resolvido</Badge>}
                                                </div>
                                                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{alert.message}</p>
                                            </div>
                                        </div>
                                        <span className="text-xs text-muted-foreground shrink-0">{new Date(alert.timestamp).toLocaleString('pt-BR')}</span>
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                  </Card>
                )}

                {/* Sentry */}
                {activeTab === 'sentry' && (
                  <div className="space-y-6 max-w-5xl mx-auto">
                    <Card className="p-6 sm:p-8 border-primary/20 bg-primary/5 rounded-3xl">
                      <div className="flex flex-col md:flex-row gap-6 items-center">
                        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                            <Monitor className="h-9 w-9" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-foreground mb-2">Testes do Sentry</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">Os botões abaixo geram erros de teste para confirmar que o Sentry está recebendo os relatórios de erro deste ambiente.</p>
                        </div>
                      </div>
                    </Card>

                    <Grid columns={{ sm: 1, lg: 2 }} gap={6}>
                        <Card className="p-6 sm:p-8 space-y-6">
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-4">Gerar erro de teste</h3>
                            <div className="grid grid-cols-1 gap-3">
                                <SentryTestButton position="inline" />
                            </div>
                            <ol className="pt-2 space-y-3">
                                <li className="flex items-start gap-3">
                                    <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">1</span>
                                    <p className="text-sm text-muted-foreground leading-relaxed">Clique em um dos botões acima para gerar um erro de teste.</p>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">2</span>
                                    <p className="text-sm text-muted-foreground leading-relaxed">Confira o console do navegador e o painel do Sentry para ver se o erro chegou.</p>
                                </li>
                            </ol>
                        </Card>

                        <Card className="p-0 border-border overflow-hidden">
                            <div className="p-4 sm:p-6 border-b border-border bg-muted/40">
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Configuração</h3>
                            </div>
                            <div className="p-4 sm:p-6 space-y-3">
                                <div className="flex justify-between items-center gap-2 px-4 py-3 rounded-2xl bg-muted/30 border border-border">
                                    <span className="text-sm text-muted-foreground">Ambiente</span>
                                    <Badge variant={import.meta.env.MODE === 'production' ? 'success' : 'warning'}>{import.meta.env.MODE === 'production' ? 'Produção' : import.meta.env.MODE}</Badge>
                                </div>
                                <div className="flex justify-between items-center gap-2 px-4 py-3 rounded-2xl bg-muted/30 border border-border">
                                    <span className="text-sm text-muted-foreground">Sentry (DSN)</span>
                                    <Badge variant={import.meta.env.VITE_SENTRY_DSN ? 'success' : 'destructive'}>{import.meta.env.VITE_SENTRY_DSN ? 'Configurado' : 'Não configurado'}</Badge>
                                </div>

                                <a
                                    href="https://sentry.io"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={buttonVariants({ variant: 'primary', size: 'sm', fullWidth: true, className: 'mt-4' })}
                                >
                                    Abrir o painel do Sentry <ExternalLink className="h-4 w-4" aria-hidden="true" />
                                </a>
                            </div>
                        </Card>
                    </Grid>
                  </div>
                )}
            </div>
        )}
        {/* A pílula fixa "Monitoramento Ativo: Transmissão de telemetria em tempo real" foi removida:
            não era tempo real (atualiza a cada 30 s) e cobria o conteúdo no celular. */}
      </div>
    </AdminLayout>
  );
};

export default MonitoringPage;
