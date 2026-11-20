import { api } from './api';
import { logger } from '../utils/logger';

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

// ===== MONITORING API SERVICE =====
// Resposta de POST /monitoring/email/test (D1): o e-mail de teste ao dono saiu, ou o motivo.
export interface EmailTestResult {
  success: boolean;
  to?: string;
  message: string;
  error?: { code?: string; responseCode?: number; message: string };
}

export const monitoringAPI = {
  // Dashboard executivo
  getDashboard: (): Promise<DashboardData> => 
  api.get('/monitoring/dashboard').then(res => res.data),

  // Integrações
  testIntegration: (name: string): Promise<IntegrationHealth> => 
    api.post(`/monitoring/integrations/${name}/test`).then(res => res.data.result || res.data),

  // D1: manda na hora um e-mail de teste para ADMIN_EMAIL. Falha também devolve o corpo (motivo e
  // erro do servidor de e-mail), em vez de só lançar.
  sendTestEmail: (): Promise<EmailTestResult> =>
    api.post('/monitoring/email/test').then(
      res => res.data as EmailTestResult,
      (error: { response?: { data?: Partial<EmailTestResult> } }) => {
        const body = error?.response?.data;
        if (body && typeof body.message === 'string') return { success: false, ...body } as EmailTestResult;
        throw error;
      },
    ),
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
      logger.error('Erro ao buscar dashboard', 'monitoringService', error);
      throw error;
    }
  }

  async testIntegration(name: string): Promise<IntegrationHealth> {
    try {
      return await monitoringAPI.testIntegration(name);
    } catch (error) {
      logger.error(`Erro ao testar integração ${name}`, 'monitoringService', error);
      throw error;
    }
  }
}

export default MonitoringService;
