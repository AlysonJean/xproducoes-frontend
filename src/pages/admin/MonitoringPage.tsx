import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/Button';
import { SimpleCard, StatsCard } from '@/components/ui/Cards';
import { useAuth } from '../../contexts/AuthContext';
import { SentryTestButton } from '../../components/SentryTestButton';
import { 
  MonitoringService, 
  IntegrationHealth, 
  SystemHealth, 
  Alert, 
  DashboardData 
} from '../../services/monitoringService';

const monitoringService = MonitoringService.getInstance();

export const MonitoringPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationHealth[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { user } = useAuth();

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const data = await monitoringService.getDashboard();
      setDashboardData(data);
      setIntegrations(data.integrations);
      setAlerts(data.activeAlerts);
      setSystemHealth(data.systemHealth);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testIntegration = async (integrationName: string) => {
    try {
      const result = await monitoringService.testIntegration(integrationName);
      
      // Atualizar a integração na lista
      setIntegrations(prev => 
        prev.map(integration => 
          integration.name === integrationName ? result : integration
        )
      );
    } catch (error) {
      console.error(`Erro ao testar integração ${integrationName}:`, error);
    }
  };

  const refreshData = async () => {
    await loadDashboardData();
  };

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Função para formatar bytes
  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Função para formatar uptime
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  // Função para obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Função para obter ícone do status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'integrations', label: '🔗 Integrações' },
    { id: 'system', label: '🖥️ Sistema' },
    { id: 'alerts', label: '🚨 Alertas' },
    { id: 'sentry', label: '🧪 Teste Sentry' }
  ];

  if (!user || user.role !== 'ADMIN') {
    return <div>Acesso negado. Apenas administradores podem acessar esta página.</div>;
  }

  return (
    <AdminLayout
      title="Monitoramento Enterprise"
      breadcrumbs={[
        { name: 'Dashboard', href: '/admin' },
        { name: 'Monitoramento', href: '/admin/monitoring' }
      ]}
    >
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-muted-foreground">
              Sistema de monitoramento em tempo real das integrações e saúde do sistema
            </p>
            <p className="text-sm text-muted-foreground">
              Última atualização: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              onClick={refreshData} 
              disabled={isLoading} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
              Atualizar
            </Button>
          </div>
        </div>

        {/* Navegação por abas */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo das abas */}
        {isLoading && !dashboardData ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin text-4xl mb-4">🔄</div>
              <p className="text-muted-foreground">Carregando dados de monitoramento...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Dashboard Executivo */}
            {activeTab === 'dashboard' && dashboardData && (
              <div className="space-y-6">
                {/* Cards de métricas principais */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatsCard
                    title="Status Geral"
                    value={getStatusIcon(dashboardData.overview.systemStatus)}
                    description={`Sistema ${dashboardData.overview.systemStatus}`}
                  />
                  <StatsCard
                    title="Integrações Saudáveis"
                    value={`${dashboardData.overview.healthyIntegrations}/${dashboardData.overview.totalIntegrations}`}
                    description={`${Math.round((dashboardData.overview.healthyIntegrations / dashboardData.overview.totalIntegrations) * 100)}% operacionais`}
                  />
                  <StatsCard
                    title="Alertas Ativos"
                    value={dashboardData.overview.activeAlerts.toString()}
                    description={dashboardData.overview.activeAlerts === 0 ? 'Nenhum problema' : 'Requer atenção'}
                  />
                  <StatsCard
                    title="Uptime"
                    value={formatUptime(dashboardData.uptime)}
                    description="Tempo de funcionamento"
                  />
                </div>

                {/* Gráficos principais */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SimpleCard title="🔗 Status das Integrações">
                    <div className="space-y-3">
                      {dashboardData.integrations.map((integration) => (
                        <div key={integration.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{getStatusIcon(integration.status)}</span>
                            <div>
                              <p className="font-medium capitalize">{integration.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {integration.responseTime}ms • {new Date(integration.lastCheck).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(integration.status)}`}>
                            {integration.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </SimpleCard>

                  <SimpleCard title="🚨 Alertas Recentes">
                    {dashboardData.activeAlerts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <div className="text-4xl mb-2">✅</div>
                        <p>Nenhum alerta ativo</p>
                        <p className="text-sm">Todos os sistemas funcionando normalmente</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {dashboardData.activeAlerts.slice(0, 5).map((alert) => (
                          <div key={alert.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <span className="text-lg">
                              {alert.type === 'error' ? '🔴' : alert.type === 'warning' ? '🟡' : 'ℹ️'}
                            </span>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{alert.integration}</p>
                              <p className="text-xs text-muted-foreground">{alert.message}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(alert.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </SimpleCard>
                </div>
              </div>
            )}

            {/* Integrações */}
            {activeTab === 'integrations' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {integrations.map((integration) => (
                  <SimpleCard key={integration.name} title={`${getStatusIcon(integration.status)} ${integration.name.charAt(0).toUpperCase() + integration.name.slice(1)}`}>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(integration.status)}`}>
                          {integration.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Tempo de Resposta</span>
                        <span className="text-sm font-medium">{integration.responseTime}ms</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Último Check</span>
                        <span className="text-sm font-medium">
                          {new Date(integration.lastCheck).toLocaleTimeString()}
                        </span>
                      </div>

                      {integration.errorMessage && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                          {integration.errorMessage}
                        </div>
                      )}

                      <Button 
                        onClick={() => testIntegration(integration.name)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        🧪 Testar Agora
                      </Button>
                    </div>
                  </SimpleCard>
                ))}
              </div>
            )}

            {/* Sistema */}
            {activeTab === 'system' && systemHealth && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <SimpleCard title="🖥️ CPU">
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">{systemHealth.cpu.usage.toFixed(1)}%</div>
                      <p className="text-sm text-muted-foreground">Uso atual</p>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className={`bg-primary h-2 rounded-full transition-all duration-300 ${
                          systemHealth.cpu.usage >= 80 ? 'w-full' :
                          systemHealth.cpu.usage >= 60 ? 'w-4/5' :
                          systemHealth.cpu.usage >= 40 ? 'w-3/5' :
                          systemHealth.cpu.usage >= 20 ? 'w-2/5' : 'w-1/5'
                        }`}
                      ></div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <p>{systemHealth.cpu.cores} cores</p>
                      <p className="truncate">{systemHealth.cpu.model}</p>
                    </div>
                  </div>
                </SimpleCard>

                <SimpleCard title="💾 Memória">
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">{systemHealth.memory.usage.toFixed(1)}%</div>
                      <p className="text-sm text-muted-foreground">Uso atual</p>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className={`bg-blue-500 h-2 rounded-full transition-all duration-300 ${
                          systemHealth.memory.usage >= 80 ? 'w-full' :
                          systemHealth.memory.usage >= 60 ? 'w-4/5' :
                          systemHealth.memory.usage >= 40 ? 'w-3/5' :
                          systemHealth.memory.usage >= 20 ? 'w-2/5' : 'w-1/5'
                        }`}
                      ></div>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>Total:</span>
                        <span>{formatBytes(systemHealth.memory.total)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Usado:</span>
                        <span>{formatBytes(systemHealth.memory.used)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Livre:</span>
                        <span>{formatBytes(systemHealth.memory.free)}</span>
                      </div>
                    </div>
                  </div>
                </SimpleCard>

                <SimpleCard title="⏱️ Uptime">
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">{formatUptime(systemHealth.uptime)}</div>
                      <p className="text-sm text-muted-foreground">Tempo ativo</p>
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      <p>Sistema operando continuamente</p>
                      <p>desde o último reinício</p>
                    </div>
                  </div>
                </SimpleCard>
              </div>
            )}

            {/* Alertas */}
            {activeTab === 'alerts' && (
              <SimpleCard title="🚨 Gestão de Alertas">
                {alerts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎉</div>
                    <h3 className="text-lg font-medium mb-2">Nenhum alerta ativo!</h3>
                    <p className="text-muted-foreground">
                      Todos os sistemas estão funcionando perfeitamente.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {alerts.map((alert) => (
                      <div key={alert.id} className="border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {alert.type === 'error' ? '🔴' : alert.type === 'warning' ? '🟡' : 'ℹ️'}
                            </span>
                            <h4 className="font-medium">{alert.integration}</h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              alert.type === 'error' ? 'bg-red-100 text-red-700' :
                              alert.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {alert.type}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(alert.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{alert.message}</p>
                        {!alert.resolved && (
                          <Button variant="outline" size="sm">
                            Marcar como Resolvido
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </SimpleCard>
            )}

            {/* Teste Sentry */}
            {activeTab === 'sentry' && (
              <div className="space-y-6">
                <SimpleCard title="🧪 Teste de Monitoramento de Erros (Sentry)">
                  <div className="space-y-4">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div>
                          <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                            Atenção: Área de Testes
                          </h4>
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            Esta seção permite testar a integração com o Sentry, nosso sistema de monitoramento de erros.
                            Os erros gerados aqui são intencionais e serão capturados pelo Sentry.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="prose dark:prose-invert max-w-none">
                      <h3 className="text-lg font-semibold mb-3">Como funciona?</h3>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>
                          <strong>💥 Lançar Erro:</strong> Simula um erro não tratado que será capturado pelo Error Boundary
                        </li>
                        <li>
                          <strong>⚠️ Capturar Exceção:</strong> Simula um erro tratado manualmente com try/catch
                        </li>
                        <li>
                          <strong>📝 Enviar Mensagem:</strong> Envia uma mensagem informativa para o Sentry
                        </li>
                      </ul>

                      <h3 className="text-lg font-semibold mb-3 mt-6">Verificando os Resultados</h3>
                      <ol className="space-y-2 text-sm text-muted-foreground">
                        <li>1. Clique em um dos botões de teste abaixo</li>
                        <li>2. Em desenvolvimento: veja o log no console do navegador</li>
                        <li>3. Em produção: acesse o <a href="https://sentry.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">dashboard do Sentry</a></li>
                        <li>4. Verifique os eventos capturados na seção "Issues"</li>
                      </ol>
                    </div>

                    <div className="border-t border-border pt-6 mt-6">
                      <h3 className="text-lg font-semibold mb-4">Painel de Testes</h3>
                      <div className="flex justify-center">
                        <SentryTestButton position="inline" />
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-6">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">ℹ️</span>
                        <div>
                          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                            Informação
                          </h4>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            Em ambiente de desenvolvimento, os erros são apenas registrados no console.
                            Em produção, todos os erros são enviados para o Sentry para monitoramento em tempo real.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </SimpleCard>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SimpleCard title="📊 Configuração Atual">
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Ambiente:</span>
                        <span className="font-medium">
                          {import.meta.env.MODE === 'production' ? '🟢 Produção' : '🟡 Desenvolvimento'}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Sentry DSN:</span>
                        <span className="font-medium">
                          {import.meta.env.VITE_SENTRY_DSN ? '✅ Configurado' : '❌ Não configurado'}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Error Boundary:</span>
                        <span className="font-medium">✅ Ativo</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">Performance Monitoring:</span>
                        <span className="font-medium">✅ Ativo</span>
                      </div>
                    </div>
                  </SimpleCard>

                  <SimpleCard title="🔗 Links Úteis">
                    <div className="space-y-3">
                      <a
                        href="https://sentry.io"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🌐</span>
                          <div>
                            <p className="font-medium text-sm">Dashboard Sentry</p>
                            <p className="text-xs text-muted-foreground">Visualizar erros capturados</p>
                          </div>
                        </div>
                        <span className="text-muted-foreground">→</span>
                      </a>

                      <a
                        href="/docs/SENTRY_CONFIGURATION.md"
                        className="flex items-center justify-between p-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">📚</span>
                          <div>
                            <p className="font-medium text-sm">Documentação</p>
                            <p className="text-xs text-muted-foreground">Guia de configuração</p>
                          </div>
                        </div>
                        <span className="text-muted-foreground">→</span>
                      </a>

                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">👤</span>
                          <div>
                            <p className="font-medium text-sm">Usuário Atual</p>
                            <p className="text-xs text-muted-foreground">{user?.email || 'Não autenticado'}</p>
                          </div>
                        </div>
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100">
                          Admin
                        </span>
                      </div>
                    </div>
                  </SimpleCard>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default MonitoringPage;
