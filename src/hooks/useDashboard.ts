import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Booking, Equipment } from '@/types/types';
import { logger } from '../utils/logger';

export interface DashboardStats {
  totalBookings: number;
  totalRevenue: number;
  activeBookings: number;
  activeEquipments: number;
  pendingPayments: number;
  totalSpent: number;
  recentBookings: Booking[];
  monthlyRevenue: number[];
  topEquipments: Equipment[];
  nextEvent?: {
    date: string;
    name: string;
  };
}

export const useDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    totalRevenue: 0,
    activeBookings: 0,
    activeEquipments: 0,
    pendingPayments: 0,
    totalSpent: 0,
    recentBookings: [],
    monthlyRevenue: [],
    topEquipments: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Busca dados reais do dashboard
      const response = await fetch(`/api/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      if (!response.ok) throw new Error('Erro ao buscar dados do dashboard');
      const data = await response.json();
      setStats(data.data || {});
    } catch (error) {
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchDashboardData,
    refreshData: fetchDashboardData,
    bookings: stats.recentBookings,
    recentActivity: stats.recentBookings,
    cancelBooking: async (id: string) => {
      logger.info(`Cancelando booking: ${id}`);
    },
  };
};
