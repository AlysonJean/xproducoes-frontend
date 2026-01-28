import { api } from './api';

// ===== INTERFACES =====
export interface IntegrationHealth {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  responseTime: number;
  lastCheck: string;
  errorMessage?: string;
}

export interface SystemHealth {
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  uptime: number;
}

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  integration: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

export interface DashboardData {
  timestamp: string;
  overview: {
    totalIntegrations: number;
    healthyIntegrations: number;
    warningIntegrations: number;
    errorIntegrations: number;
    activeAlerts: number;
    systemStatus: 'healthy' | 'warning' | 'error';
  };
  integrations: IntegrationHealth[];
  systemHealth: SystemHealth;
  activeAlerts: Alert[];
  uptime: number;
}

export interface HealthSummary {
  status: 'healthy' | 'warning' | 'error';
  timestamp: string;
  totalIntegrations: number;
  healthyIntegrations: number;
  warningIntegrations: number;
  errorIntegrations: number;
  activeAlerts: number;
  uptime: number;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  integrations: {
    name: string;
    responseTime: number;
    status: string;
  }[];
  systemLoad: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  uptime: number;
}

export interface ResourceUsage {
  system: SystemHealth;
  process: {
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    };
    cpu: number;
    uptime: number;
  };
  timestamp: string;
}

// ===== MONITORING API SERVICE =====
export const monitoringAPI = {
  // Dashboard executivo
  getDashboard: (): Promise<DashboardData> => 
  api.get('/monitoring/dashboard').then(res => res.data),

  // Health checks
  getHealthSummary: (): Promise<HealthSummary> => 
    api.get('/monitoring/health/summary').then(res => res.data),

  getHealthCheck: (): Promise<{ status: string; timestamp: string; uptime: number }> => 
    api.get('/monitoring/health').then(res => res.data),

  // Integrações
  getIntegrationsOverview: (): Promise<IntegrationHealth[]> => 
    api.get('/monitoring/integrations/overview').then(res => res.data.integrations || res.data),

  testIntegration: (name: string): Promise<IntegrationHealth> => 
    api.post(`/monitoring/integrations/${name}/test`).then(res => res.data.result || res.data),

  // Métricas
  getPerformanceMetrics: (): Promise<PerformanceMetrics> => 
    api.get('/monitoring/metrics/performance').then(res => res.data.metrics || res.data),

  // Sistema
  getSystemHealth: (): Promise<SystemHealth> => 
    api.get('/monitoring/system/health').then(res => res.data.system || res.data),

  getResourceUsage: (): Promise<ResourceUsage> => 
    api.get('/monitoring/resources/usage').then(res => res.data),

  // Alertas
  getActiveAlerts: (): Promise<Alert[]> => 
    api.get('/monitoring/alerts/active').then(res => res.data.alerts || res.data),

  getAlertsHistory: (limit?: number, resolved?: boolean): Promise<Alert[]> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (resolved !== undefined) params.append('resolved', resolved.toString());
    
    return api.get(`/monitoring/alerts/history?${params.toString()}`).then(res => res.data.history || res.data);
  },
};

// ===== MONITORING SERVICE CLASS =====
export class MonitoringService {
  private static instance: MonitoringService;
  
  private constructor() {}

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  // Wrapper methods with error handling
  async getDashboard(): Promise<DashboardData> {
    try {
      return await monitoringAPI.getDashboard();
    } catch (error) {
      console.error('Erro ao buscar dashboard:', error);
      throw error;
    }
  }

  async getHealthSummary(): Promise<HealthSummary> {
    try {
      return await monitoringAPI.getHealthSummary();
    } catch (error) {
      console.error('Erro ao buscar resumo de saúde:', error);
      throw error;
    }
  }

  async getIntegrationsOverview(): Promise<IntegrationHealth[]> {
    try {
      return await monitoringAPI.getIntegrationsOverview();
    } catch (error) {
      console.error('Erro ao buscar integrações:', error);
      throw error;
    }
  }

  async testIntegration(name: string): Promise<IntegrationHealth> {
    try {
      return await monitoringAPI.testIntegration(name);
    } catch (error) {
      console.error(`Erro ao testar integração ${name}:`, error);
      throw error;
    }
  }

  async getActiveAlerts(): Promise<Alert[]> {
    try {
      return await monitoringAPI.getActiveAlerts();
    } catch (error) {
      console.error('Erro ao buscar alertas:', error);
      throw error;
    }
  }

  async getSystemHealth(): Promise<SystemHealth> {
    try {
      return await monitoringAPI.getSystemHealth();
    } catch (error) {
      console.error('Erro ao buscar saúde do sistema:', error);
      throw error;
    }
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      return await monitoringAPI.getPerformanceMetrics();
    } catch (error) {
      console.error('Erro ao buscar métricas de performance:', error);
      throw error;
    }
  }

  async getResourceUsage(): Promise<ResourceUsage> {
    try {
      return await monitoringAPI.getResourceUsage();
    } catch (error) {
      console.error('Erro ao buscar uso de recursos:', error);
      throw error;
    }
  }

  // Utility methods
  formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  formatUptime(seconds: number): string {
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  }

  getUsageWidth(usage: number): string {
    if (usage >= 80) return 'w-full';
    if (usage >= 60) return 'w-4/5';
    if (usage >= 40) return 'w-3/5';
    if (usage >= 20) return 'w-2/5';
    return 'w-1/5';
  }
}

export default MonitoringService;
