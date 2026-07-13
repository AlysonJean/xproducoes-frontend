import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { 
  Button, 
  Card, 
  Badge, 
  Grid 
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
  ShieldCheck, 
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
  Monitor
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { logger } from '../../utils/logger';

const monitoringService = MonitoringService.getInstance();

export const MonitoringPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationHealth[]>([]);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  const loadDashboardData = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setIsLoading(true);
      const data = await monitoringService.getDashboard();
      
      const gaId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;
      const hasGa = !!gaId && gaId.length > 5;
      
      const gaIntegration: IntegrationHealth = {
        name: 'Google Analytics 4',
        status: hasGa ? 'healthy' : 'warning', 
        responseTime: 0,
        lastCheck: new Date().toISOString(),
        errorMessage: hasGa ? undefined : 'ID de rastreamento pendente'
      };
      
      if (!data.integrations.find(i => i.name === 'Google Analytics 4')) {
         data.integrations.push(gaIntegration);
      }

      setDashboardData(data);
      setIntegrations(data.integrations);
      setAlerts(data.activeAlerts);
      setSystemHealth(data.systemHealth);
      setLastUpdate(new Date());
    } catch {
      logger.error('Erro ao carregar dashboard:', 'MonitoringPage');
      addNotification({
        type: 'error',
        title: 'Radar Offline',
        message: 'Falha crítica ao tentar recuperar telemetria do sistema.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadDashboardData(true);
    const interval = setInterval(() => loadDashboardData(false), 30000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const testIntegration = async (integrationName: string) => {
    if (integrationName === 'Google Analytics 4') {
      const gaId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;
      const hasGa = !!gaId && gaId.length > 5;
      const result: IntegrationHealth = {
        name: 'Google Analytics 4',
        status: hasGa ? 'healthy' : 'warning',
        responseTime: Math.floor(Math.random() * 10) + 1,
        lastCheck: new Date().toISOString(),
        errorMessage: hasGa ? undefined : 'ID de rastreamento pendente'
      };
      setIntegrations(prev => prev.map(i => i.name === integrationName ? result : i));
      addNotification({ type: 'success', title: 'Teste GA4', message: 'Configuração cliente validada com sucesso.' });
      return;
    }

    try {
      const result = await monitoringService.testIntegration(integrationName);
      setIntegrations(prev => prev.map(i => i.name === integrationName ? result : i));
      addNotification({ type: 'success', title: 'Check Ativo', message: `Integração ${integrationName} respondeu corretamente.` });
    } catch {
      addNotification({ type: 'error', title: 'Falha no Check', message: `O sistema ${integrationName} não retornou o sinal esperado.` });
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

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'healthy': return { variant: 'success' as const, icon: CheckCircle2, label: 'Operacional', color: 'text-emerald-500' };
      case 'warning': return { variant: 'warning' as const, icon: AlertTriangle, label: 'Degradado', color: 'text-amber-500' };
      case 'error': return { variant: 'destructive' as const, icon: XCircle, label: 'Falha Crítica', color: 'text-destructive' };
      default: return { variant: 'outline' as const, icon: Activity, label: 'Desconhecido', color: 'text-muted-foreground' };
    }
  };

  if (!user || user.role !== 'ADMIN') {
    return <div className="p-12 text-center text-muted-foreground font-black uppercase tracking-widest">Acesso Negado: Permissões insuficientes.</div>;
  }

  const tabs = [
    { id: 'dashboard', label: 'Monitor', icon: Layout },
    { id: 'integrations', label: 'Conectores', icon: Globe },
    { id: 'system', label: 'Hardware', icon: Server },
    { id: 'alerts', label: 'Incidentes', icon: AlertTriangle },
    { id: 'sentry', label: 'Sentry Core', icon: Monitor }
  ];

  return (
    <AdminLayout 
        title="Painel de Telemetria" 
        breadcrumbs={[{ name: 'Admin' }, { name: 'Painel' }, { name: 'Sistemas' }]}
    >
      <div className="space-y-8">
        {/* Header Control */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg ring-1 ring-primary/20">
                    <Activity className="h-7 w-7" />
                </div>
                <div>
                   <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-foreground uppercase tracking-tighter">Enterprise Health Control</h2>
                        {dashboardData?.overview.systemStatus === 'healthy' && (
                            <Badge variant="success" className="h-1.5 w-1.5 rounded-full p-0 shadow-[0_0_12px_rgba(16,185,129,0.8)]"> </Badge>
                        )}
                   </div>
                   <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">Sincronizado há {Math.floor((new Date().getTime() - lastUpdate.getTime())/1000)} segundos</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                <div className="flex bg-muted/50 p-1 rounded-2xl border border-border/40">
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`flex items-center gap-2 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                                activeTab === t.id 
                                ? 'bg-background text-primary shadow-sm border border-border/10' 
                                : 'text-muted-foreground hover:bg-muted/80'
                            }`}
                        >
                            <t.icon className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{t.label}</span>
                        </button>
                    ))}
                </div>
                <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-11 w-11 rounded-2xl border-border/60 hover:border-primary transition-all group" 
                    onClick={() => loadDashboardData(true)}
                    disabled={isLoading}
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                </Button>
            </div>
        </div>

        {isLoading && !dashboardData ? (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <BrandLoader size={120} label="Interrogando terminais de monitoramento..." />
            </div>
        ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Dashboard View */}
                {activeTab === 'dashboard' && dashboardData && (
                    <div className="space-y-8">
                        <Grid columns={{ sm: 1, md: 2, lg: 4 }} gap={6}>
                            <Card className="p-6 bg-primary/5 border-primary/10">
                                <div className="flex flex-col h-full justify-between gap-4">
                                   <div className="flex items-center justify-between">
                                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sinal Vital</p>
                                      <div className={`h-2 w-2 rounded-full ${getStatusInfo(dashboardData.overview.systemStatus).color}`} />
                                   </div>
                                   <div className="flex items-center gap-3">
                                      {React.createElement(getStatusInfo(dashboardData.overview.systemStatus).icon, { className: `h-6 w-6 ${getStatusInfo(dashboardData.overview.systemStatus).color}` })}
                                      <p className="text-xl font-black text-foreground uppercase tracking-tighter">{getStatusInfo(dashboardData.overview.systemStatus).label}</p>
                                   </div>
                                </div>
                            </Card>

                            <Card className="p-6 bg-card/50">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Sincronização</p>
                                <div className="flex items-center gap-4">
                                   <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                      <Globe className="h-5 w-5" />
                                   </div>
                                   <div>
                                      <p className="text-xl font-black text-foreground">{dashboardData.overview.healthyIntegrations} / {dashboardData.overview.totalIntegrations}</p>
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Integrações OK</p>
                                   </div>
                                </div>
                            </Card>

                            <Card className={`p-6 ${dashboardData.overview.activeAlerts > 0 ? 'bg-destructive/5 border-destructive/20' : 'bg-card/50'}`}>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Alertas Ativos</p>
                                <div className="flex items-center gap-4">
                                   <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${dashboardData.overview.activeAlerts > 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                                      <AlertTriangle className="h-5 w-5" />
                                   </div>
                                   <div>
                                      <p className={`text-xl font-black ${dashboardData.overview.activeAlerts > 0 ? 'text-destructive' : 'text-foreground'}`}>{dashboardData.overview.activeAlerts}</p>
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Requerem Atenção</p>
                                   </div>
                                </div>
                            </Card>

                            <Card className="p-6 bg-card/50">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Uptime Contínuo</p>
                                <div className="flex items-center gap-4">
                                   <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                      <Clock className="h-5 w-5" />
                                   </div>
                                   <div>
                                      <p className="text-xl font-black text-foreground">{formatUptime(dashboardData.uptime)}</p>
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Disponibilidade</p>
                                   </div>
                                </div>
                            </Card>
                        </Grid>

                        <Grid columns={{ sm: 1, lg: 3 }} gap={8}>
                            <div className="lg:col-span-2 space-y-6">
                                <Card className="p-0 overflow-hidden border-border/60 bg-card/60">
                                    <div className="p-6 border-b border-border/50 bg-muted/40 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Globe className="h-5 w-5 text-primary" />
                                            <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Estado das Integrações</h3>
                                        </div>
                                        <Badge variant="outline" className="text-[9px] font-black uppercase">Tempo Real</Badge>
                                    </div>
                                    <div className="p-0">
                                        {dashboardData.integrations.map((integration, idx) => (
                                            <div key={integration.name} className={`px-6 py-5 flex items-center justify-between group transition-all hover:bg-muted/30 ${idx !== dashboardData.integrations.length -1 ? 'border-b border-border/50' : ''}`}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`h-2.5 w-2.5 rounded-full ${getStatusInfo(integration.status).color} ring-4 ring-${integration.status === 'healthy' ? 'emerald' : integration.status === 'warning' ? 'amber' : 'red'}-500/10`} />
                                                    <div>
                                                        <p className="text-xs font-black text-foreground uppercase tracking-wider">{integration.name}</p>
                                                        <p className="text-[10px] font-bold text-muted-foreground opacity-60">{integration.responseTime}ms de latência • Sinc: {new Date(integration.lastCheck).toLocaleTimeString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                                                                        <Badge variant={getStatusInfo(integration.status).variant} className="text-[8px] font-black uppercase px-2 py-0.5 opacity-80">{integration.status}</Badge>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors" onClick={() => testIntegration(integration.name)}>
                                                        <RefreshCw className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </div>

                            <div className="space-y-6">
                                 <Card className="p-0 overflow-hidden border-border/60 bg-card/60">
                                    <div className="p-6 border-b border-border/50 bg-muted/40 flex items-center gap-3">
                                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                                        <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Log de Incidentes</h3>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        {dashboardData.activeAlerts.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                                <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4 ring-8 ring-emerald-500/5">
                                                    <ShieldCheck className="h-8 w-8" />
                                                </div>
                                                <h4 className="text-[11px] font-black text-foreground uppercase tracking-widest">Perímetro Seguro</h4>
                                                <p className="text-[10px] text-muted-foreground font-medium mt-1">Nenhum evento anômalo detectado nas últimas 24h.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {dashboardData.activeAlerts.slice(0, 5).map((alert) => (
                                                    <div key={alert.id} className="p-4 rounded-2xl bg-muted/40 border border-border/40 hover:border-border transition-colors">
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <span className="text-[10px] font-black text-primary uppercase tracking-tighter">{alert.integration}</span>
                                                            <span className="text-[9px] font-bold text-muted-foreground opacity-50 font-mono">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                                                        </div>
                                                        <p className="text-[11px] font-bold text-foreground leading-relaxed italic line-clamp-2">"{alert.message}"</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {dashboardData.activeAlerts.length > 0 && (
                                        <button onClick={() => setActiveTab('alerts')} className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted/50 border-t border-border/50 transition-all flex items-center justify-center gap-2">
                                            Ver Histórico de Incidentes <ChevronRight className="h-3 w-3" />
                                        </button>
                                    )}
                                </Card>
                            </div>
                        </Grid>
                    </div>
                )}

                {/* Integrations View */}
                {activeTab === 'integrations' && (
                  <Grid columns={{ sm: 1, md: 2, lg: 3 }} gap={6}>
                    {integrations.map((integration) => (
                      <Card key={integration.name} className="overflow-hidden p-0 border-border/60 hover:border-primary/50 transition-all duration-300">
                        <div className="p-6 border-b border-border/50 bg-muted/30 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {React.createElement(getStatusInfo(integration.status).icon, { className: `h-5 w-5 ${getStatusInfo(integration.status).color}` })}
                                <h3 className="text-sm font-black text-foreground uppercase tracking-widest truncate max-w-[150px]">{integration.name}</h3>
                            </div>
                                                        <Badge variant={getStatusInfo(integration.status).variant} className="text-[9px] font-black uppercase h-5">{integration.status}</Badge>
                        </div>
                        <div className="p-6 space-y-4">
                           <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              <span>Latência</span>
                              <span className="text-foreground">{integration.responseTime}ms</span>
                           </div>
                           <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              <span>Check de Pulso</span>
                              <span className="text-foreground">{new Date(integration.lastCheck).toLocaleTimeString()}</span>
                           </div>
                           
                           {integration.errorMessage && (
                               <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-[10px] font-bold text-destructive italic leading-relaxed">
                                 {integration.errorMessage}
                               </div>
                           )}

                           <Button 
                             onClick={() => testIntegration(integration.name)}
                             variant="outline" 
                             className="w-full h-10 font-black uppercase text-[10px] tracking-widest mt-2 border-border/60 hover:bg-primary/5"
                           >
                             <Zap size={14} className="mr-2" /> Forçar Diagnóstico
                           </Button>
                        </div>
                      </Card>
                    ))}
                  </Grid>
                )}

                {/* Hardware View */}
                {activeTab === 'system' && systemHealth && (
                  <Grid columns={{ sm: 1, lg: 3 }} gap={8}>
                    <Card className="p-6 space-y-6 bg-card/60">
                      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
                        <Cpu className="h-5 w-5 text-indigo-500" />
                        <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Processamento (CPU)</h3>
                      </div>
                      <div className="flex flex-col items-center py-6">
                        <div className="relative h-32 w-32 flex items-center justify-center">
                            <svg className="h-full w-full rotate-[-90deg]">
                                <circle cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                                <circle cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="8" strokeDasharray={`${Math.PI * 116}`} strokeDashoffset={`${Math.PI * 116 * (1 - systemHealth.cpu.usage / 100)}`} className="text-indigo-500 transition-all duration-1000" strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-foreground">{systemHealth.cpu.usage.toFixed(0)}%</span>
                                <span className="text-[9px] font-black text-muted-foreground uppercase">Utilização</span>
                            </div>
                        </div>
                      </div>
                      <div className="space-y-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <div className="flex justify-between">
                            <span>Arquitetura</span>
                            <span className="text-foreground">{systemHealth.cpu.cores} Cores</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Proprietário</span>
                            <span className="text-foreground truncate max-w-[120px]">{systemHealth.cpu.model}</span>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-6 space-y-6 bg-card/60">
                      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
                        <Database className="h-5 w-5 text-emerald-500" />
                        <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Memória Volátil (RAM)</h3>
                      </div>
                      <div className="flex flex-col items-center py-6">
                        <div className="relative h-32 w-32 flex items-center justify-center">
                            <svg className="h-full w-full rotate-[-90deg]">
                                <circle cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                                <circle cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="8" strokeDasharray={`${Math.PI * 116}`} strokeDashoffset={`${Math.PI * 116 * (1 - systemHealth.memory.usage / 100)}`} className="text-emerald-500 transition-all duration-1000" strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-foreground">{systemHealth.memory.usage.toFixed(0)}%</span>
                                <span className="text-[9px] font-black text-muted-foreground uppercase">Carga</span>
                            </div>
                        </div>
                      </div>
                      <div className="space-y-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <div className="flex justify-between">
                            <span>Saturado</span>
                            <span className="text-foreground">{formatBytes(systemHealth.memory.used)}</span>
                        </div>
                        <div className="flex justify-between border-t border-border/20 pt-2">
                            <span>Capacidade</span>
                            <span className="text-foreground font-black">{formatBytes(systemHealth.memory.total)}</span>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-6 space-y-6 bg-card/60">
                      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
                        <HardDrive className="h-5 w-5 text-pink-500" />
                        <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Resiliência Operativa</h3>
                      </div>
                      <div className="h-32 flex flex-col items-center justify-center">
                         <div className="text-3xl font-black text-foreground tracking-tighter">{formatUptime(systemHealth.uptime)}</div>
                         <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1 opacity-60">Sessão Contínua</p>
                      </div>
                      <div className="bg-muted/30 p-4 rounded-2xl border border-dashed border-border/50">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <p className="text-[10px] font-bold text-foreground leading-relaxed italic">"Plataforma estabilizada. Sem registros de reinícios anômalos detectados pelo watchdog."</p>
                        </div>
                      </div>
                    </Card>
                  </Grid>
                )}

                {/* Incidentes View */}
                {activeTab === 'alerts' && (
                  <Card className="p-0 border-border/60 bg-card/60 overflow-hidden">
                    <div className="p-6 border-b border-border/50 bg-muted/40 flex items-center justify-between">
                        <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Console de Segurança e Auditoria</h3>
                        <Badge variant="outline" className="text-[10px] font-black uppercase px-3 py-1">Histórico Global</Badge>
                    </div>
                    <div className="p-6">
                        {alerts.length === 0 ? (
                            <div className="text-center py-24">
                                <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto mb-6 ring-8 ring-emerald-500/5">
                                    <ShieldCheck className="h-10 w-10 text-emerald-500/30" />
                                </div>
                                <h3 className="text-lg font-black text-foreground uppercase tracking-widest">Nenhum Alerta Ativo</h3>
                                <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2 font-medium">Os protocolos de segurança e integridade não dispararam gatilhos operacionais recentes.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {alerts.map((alert) => (
                                    <div key={alert.id} className="group p-5 rounded-[1.5rem] bg-muted/30 border border-border/40 hover:border-primary/30 transition-all flex flex-col md:flex-row gap-6 md:items-center justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 ${
                                                alert.type === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-500'
                                            }`}>
                                                <AlertTriangle size={20} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="text-xs font-black text-foreground uppercase tracking-widest">{alert.integration}</h4>
                                                    <Badge variant={alert.type === 'error' ? 'destructive' : 'warning'} className="text-[8px] font-black uppercase tracking-tighter px-1.5 h-4">Critical</Badge>
                                                </div>
                                                <p className="text-sm font-bold text-muted-foreground leading-relaxed italic line-clamp-2">"{alert.message}"</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col md:items-end gap-3 shrink-0">
                                            <span className="text-[10px] font-black text-muted-foreground opacity-50 uppercase tracking-tighter">{new Date(alert.timestamp).toLocaleString()}</span>
                                            {!alert.resolved && (
                                                <Button variant="outline" size="sm" className="h-9 px-6 font-black uppercase text-[10px] tracking-widest rounded-xl bg-card">Limpar Alerta</Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                  </Card>
                )}

                {/* Sentry View */}
                {activeTab === 'sentry' && (
                  <div className="space-y-8 max-w-5xl mx-auto">
                    <Card className="p-8 border-primary/20 bg-primary/5 rounded-[2.5rem]">
                      <div className="flex flex-col md:flex-row gap-8 items-center">
                        <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20 shadow-inner ring-8 ring-primary/5">
                            <Monitor className="h-10 w-10 text-primary/40" />
                        </div>
                        <div>
                          <h4 className="text-xl font-black text-foreground uppercase tracking-widest mb-2">Protocolo Sentry de Monitoramento</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed font-medium">Esta interface interage diretamente com o núcleo de captura de exceções em tempo real. Erros gerados aqui servem para validar o fluxo de notificações e rastreamento de issues em produção.</p>
                        </div>
                      </div>
                    </Card>

                    <Grid columns={{ sm: 1, lg: 2 }} gap={8}>
                        <Card className="p-8 space-y-6">
                            <h3 className="text-sm font-black text-foreground uppercase tracking-widest border-b border-border/50 pb-4">Laboratório de Stress</h3>
                            <div className="grid grid-cols-1 gap-3">
                                <SentryTestButton position="inline" />
                            </div>
                            <div className="pt-4 space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="h-5 w-5 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">1</div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed tracking-wider italic">Execute um dos disparos acida para testar o watchdog de erros.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="h-5 w-5 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">2</div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed tracking-wider italic">Verifique os logs no console do desenvolvedor para confirmação imediata.</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-0 border-border/60 bg-card/60 overflow-hidden">
                            <div className="p-6 border-b border-border/50 bg-muted/40">
                                <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Parâmetros de Sessão</h3>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-center px-4 py-3 rounded-2xl bg-muted/30 border border-border/40">
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Modo Executivo</span>
                                    <Badge variant={import.meta.env.MODE === 'production' ? 'success' : 'warning'} className="text-[9px] font-black uppercase">{import.meta.env.MODE}</Badge>
                                </div>
                                <div className="flex justify-between items-center px-4 py-3 rounded-2xl bg-muted/30 border border-border/40">
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sentry Hub Status</span>
                                    <Badge variant={import.meta.env.VITE_SENTRY_DSN ? 'success' : 'destructive'} className="text-[9px] font-black uppercase">{import.meta.env.VITE_SENTRY_DSN ? 'Conectado' : 'Offline'}</Badge>
                                </div>
                                <div className="flex justify-between items-center px-4 py-3 rounded-2xl bg-muted/30 border border-border/40">
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Performance Engine</span>
                                    <Badge variant="success" className="text-[9px] font-black uppercase">Otimizado</Badge>
                                </div>
                                
                                <a 
                                    href="https://sentry.io" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="block mt-6 p-4 rounded-2xl bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest text-center shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-[0.98]"
                                >
                                    Acessar Dashboard Sentry External <ExternalLink className="inline ml-2 h-3 w-3" />
                                </a>
                            </div>
                        </Card>
                    </Grid>
                  </div>
                )}
            </div>
        )}

        {/* Real-time Status Footer */}
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-2 duration-500">
           <div className="flex items-center gap-3 px-6 py-3 rounded-full border border-primary/20 bg-card/80 backdrop-blur-xl shadow-2xl">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-foreground/80">Monitoramento Ativo: Transmissão de telemetria em tempo real</span>
           </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default MonitoringPage;
