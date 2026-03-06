// Caminho: frontend/src/pages/client/ClientDashboardPage.tsx

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { bookingAPI, authAPI, kitAPI } from '../../services/api';
import { asArray } from '../../utils/normalize';
import { clsx } from 'clsx';
import {
  Button,
  Card,
  Alert,
  Grid,
  Badge
} from '../../components/ui/StandardComponents';
import { BrandLoader } from '../../components/ui/BrandLoader';
import { BookingListItem } from '../../components/ui/BookingListItem';
import { ReviewModal } from '../../components/modals/ReviewModal';
import type { SafeBooking, Kit } from '../../types/types';
import {
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  Heart,
  ArrowRight,
  BarChart3,
  Package,
  Plus,
  Settings,
  Star
} from 'lucide-react';

import { DashboardStats, QuickAction } from '../../types/domains/dashboard';
import { RecommendationSection } from '../../components/ui/RecommendationSection';
import { useMultipleRecommendations } from '../../hooks/useRecommendations';


export const ClientDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // States
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<SafeBooking[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<SafeBooking[]>([]);
  const [recommendedKits, setRecommendedKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);

  // Recommendations hook
  const { personalized, trending, newItems } = useMultipleRecommendations();


  // Quick Actions
  const quickActions: QuickAction[] = [
    {
      id: 'new-booking',
      title: 'Nova Reserva',
      description: 'Faça uma nova reserva de equipamentos',
      icon: <Plus className="h-6 w-6" />,
      href: '/',
      color: 'primary',
      badge: 'Popular'
    },
    {
      id: 'my-bookings',
      title: 'Minhas Reservas',
      description: 'Veja e gerencie suas reservas',
      icon: <Calendar className="h-6 w-6" />,
      href: '/minhas-reservas',
      color: 'success'
    },
    {
      id: 'my-calendar',
      title: 'Minha Agenda',
      description: 'Veja suas reservas no calendário',
      icon: <Calendar className="h-6 w-6" />,
      href: '/cliente/agenda',
      color: 'info',
      badge: 'Novo'
    },
    {
      id: 'favorites',
      title: 'Favoritos',
      description: 'Equipamentos salvos para depois',
      icon: <Heart className="h-6 w-6" />,
      href: '/favoritos',
      color: 'warning',
      badge: stats?.favoriteEquipments ? `${stats.favoriteEquipments}` : undefined
    },
    {
      id: 'profile',
      title: 'Meu Perfil',
      description: 'Atualize suas informações',
      icon: <Settings className="h-6 w-6" />,
      href: '/perfil',
      color: 'info'
    }
  ];

  // Efeito para redirecionar se um admin tentar aceder a esta página
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  // Carregar dados do dashboard
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Buscar dados em paralelo - usando endpoints reais da API
        const [
          statsResponse,
          bookingsResponse,
          upcomingResponse,
          kitsResponse,
          favoritesResponse
        ] = await Promise.allSettled([
          authAPI.getStats(),
          bookingAPI.getMyBookings(),
          bookingAPI.getUpcoming(),
          kitAPI.getRecommended(),
          authAPI.getFavorites()
        ]);

        // Processar favoritos primeiro
        let favoritesCount = 0;
        if (favoritesResponse.status === 'fulfilled') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const favorites = asArray<any>((favoritesResponse.value as any)?.data || favoritesResponse.value);
          favoritesCount = favorites.length;
        }

        // Processar estatísticas do usuário
        if (statsResponse.status === 'fulfilled') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const statsData = (statsResponse.value as any)?.data;
          if (statsData) {
            setStats({
              totalBookings: statsData.totalBookings || 0,
              activeBookings: statsData.activeBookings || 0,
              completedBookings: statsData.completedBookings || 0,
              totalSpent: statsData.totalSpent || 0,
              averageBookingValue: statsData.averageBookingValue || 0,
              favoriteEquipments: statsData.favoriteEquipments || favoritesCount,
              lastBookingDate: statsData.lastBookingDate,
              nextBookingDate: statsData.nextBookingDate
            });
          }
        } else {
          // Se a API de stats falhou, pelo menos definir favoritos
          setStats(prevStats => ({
            ...prevStats,
            favoriteEquipments: favoritesCount
          } as DashboardStats));
        }

        // Processar reservas
        let allBookings: SafeBooking[] = [];
        if (bookingsResponse.status === 'fulfilled') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          allBookings = asArray<SafeBooking>((bookingsResponse.value as any)?.data || bookingsResponse.value);
          setRecentBookings(allBookings.slice(0, 3));
        }

        // Processar próximas reservas
        if (upcomingResponse.status === 'fulfilled') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setUpcomingBookings(asArray<SafeBooking>((upcomingResponse.value as any)?.data || upcomingResponse.value));
        }

        // Processar kits recomendados
        if (kitsResponse.status === 'fulfilled') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setRecommendedKits(asArray<Kit>((kitsResponse.value as any)?.data || kitsResponse.value));
        }

        // Calcular estatísticas localmente como fallback se a API de stats falhar
        if (statsResponse.status === 'rejected' && allBookings.length > 0) {
          const completedBookings = allBookings.filter(b => b.status === 'COMPLETED');
          const activeBookings = allBookings.filter(b =>
            ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(b.status)
          );

          const totalSpent = completedBookings.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0);
          const averageValue = completedBookings.length > 0 ? totalSpent / completedBookings.length : 0;

          const sortedBookings = [...allBookings].sort((a, b) =>
            new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
          );

          setStats({
            totalBookings: allBookings.length,
            activeBookings: activeBookings.length,
            completedBookings: completedBookings.length,
            totalSpent,
            averageBookingValue: averageValue,
            lastBookingDate: sortedBookings[0]?.eventDate,
            nextBookingDate: upcomingBookings[0]?.eventDate,
            favoriteEquipments: favoritesCount
          });
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados do dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string): 'success' | 'primary' | 'warning' | 'destructive' | 'secondary' => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'CONFIRMED': return 'primary';
      case 'PENDING': return 'warning';
      case 'CANCELLED': return 'destructive';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center animate-in fade-in duration-700">
          <BrandLoader size="xl" />
          <p className="mt-8 text-muted-foreground font-medium tracking-widest uppercase text-[10px] animate-pulse">
            Preparando seu painel personalizado X Produções...
          </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="error" title="Erro">
            {error && error.trim() ? error : 'Erro desconhecido ao carregar dashboard. Verifique sua conexão ou tente novamente.'}
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header com Saudação */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Olá, {user?.name?.split(' ')[0] || 'Cliente'}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie suas reservas e descubra novos equipamentos
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button
              variant="primary"
              size="lg"
              leftIcon={<Plus className="h-5 w-5" />}
              onClick={() => navigate('/')}
            >
              Nova Reserva
            </Button>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <Grid columns={{ sm: 1, md: 2, lg: 4 }} gap={6} className="mb-8">
          <Card>
            <div className="flex items-center p-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-muted-foreground">Total de Reservas</p>
                <p className="text-2xl font-bold text-foreground">{stats?.totalBookings || 0}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center p-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-muted-foreground">Reservas Ativas</p>
                <p className="text-2xl font-bold text-foreground">{stats?.activeBookings || 0}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center p-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-muted-foreground">Concluídas</p>
                <p className="text-2xl font-bold text-foreground">{stats?.completedBookings || 0}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center p-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-info/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-info" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-muted-foreground">Total Gasto</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(stats?.totalSpent || 0)}
                </p>
              </div>
            </div>
          </Card>
        </Grid>

        {/* Ações Rápidas */}
        <Card className="mb-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">Ações Rápidas</h2>
            <Grid columns={{ sm: 1, md: 2, lg: 4 }} gap={4}>
              {quickActions.map((action) => (
                <Link key={action.id} to={action.href} className="group">
                  <div className="relative p-4 rounded-lg border border-border hover:border-primary/50 transition-all duration-200 hover:shadow-md">
                    <div className="flex items-start space-x-3">
                      <div className={clsx(
                        'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200',
                        action.color === 'primary' && 'bg-primary/10 text-primary',
                        action.color === 'success' && 'bg-success/10 text-success',
                        action.color === 'warning' && 'bg-warning/10 text-warning',
                        action.color === 'info' && 'bg-info/10 text-info'
                      )}>
                        {action.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {action.title}
                          </h3>
                          {action.badge && (
                            <Badge variant="secondary" size="sm">
                              {action.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {action.description}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" />
                    </div>
                  </div>
                </Link>
              ))}
            </Grid>
          </div>
        </Card>

        {/* Grid Principal */}
        <Grid columns={{ sm: 1, lg: 3 }} gap={8}>

          {/* Próximas Reservas */}
          <div className="lg:col-span-2">
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-foreground">Próximas Reservas</h2>
                  <Link to="/minhas-reservas">
                    <Button variant="outline" size="sm">
                      Ver Todas
                    </Button>
                  </Link>
                </div>

                {upcomingBookings.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingBookings.slice(0, 3).map((booking) => (
                      <div key={booking.id} className="p-4 border border-border rounded-lg hover:border-primary/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-foreground">
                                {formatDate(booking.eventDate)}
                              </span>
                              <Badge
                                variant={getStatusColor(booking.status)}
                                size="sm"
                              >
                                {booking.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {booking.equipments.length} equipamento(s) - {formatCurrency(booking.totalPrice)}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhuma reserva próxima</p>
                    <Button
                      variant="primary"
                      size="sm"
                      className="mt-4"
                      onClick={() => navigate('/')}
                    >
                      Fazer Nova Reserva
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Resumo da Conta */}
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">Resumo da Conta</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Valor Médio por Reserva</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(stats?.averageBookingValue || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Equipamentos Favoritos</span>
                  <span className="font-medium text-foreground">
                    {stats?.favoriteEquipments || 0}
                  </span>
                </div>

                {stats?.lastBookingDate && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">Última Reserva</span>
                    <span className="font-medium text-foreground">
                      {formatDate(stats.lastBookingDate)}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="font-medium text-foreground mb-4">Informações da Conta</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Email</label>
                    <p className="text-sm text-foreground">{user?.email}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Telefone</label>
                    <p className="text-sm text-foreground">{user?.phone || 'Não informado'}</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  className="mt-4"
                  leftIcon={<Settings className="h-4 w-4" />}
                  onClick={() => navigate('/perfil')}
                >
                  Editar Perfil
                </Button>
              </div>
            </div>
          </Card>
        </Grid>

        {/* Histórico Recente */}
        {recentBookings.length > 0 && (
          <Card className="mt-8">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">Reservas Recentes</h2>
                <Link to="/minhas-reservas">
                  <Button variant="outline" size="sm">
                    Ver Histórico Completo
                  </Button>
                </Link>
              </div>

              <div className="space-y-4">
                {recentBookings.map((booking) => (
                  <BookingListItem
                    key={booking.id}
                    booking={booking}
                    onReviewClick={(id) => setReviewBookingId(id)}
                  />
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Kits Recomendados */}
        {recommendedKits.length > 0 && (
          <Card className="mt-8">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">Kits Recomendados</h2>
                <Link to="/kits">
                  <Button variant="outline" size="sm">
                    Ver Todos os Kits
                  </Button>
                </Link>
              </div>

              <Grid columns={{ sm: 1, md: 2, lg: 3 }} gap={6}>
                {recommendedKits.map((kit) => (
                  <Link key={kit.id} to={`/kits/${kit.id}`} className="group">
                    <div className="border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors">
                      {kit.imageUrl && (
                        <div className="aspect-video bg-muted">
                          <img
                            src={kit.imageUrl}
                            alt={kit.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {kit.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {kit.description}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="font-bold text-primary">
                            {formatCurrency(kit.price || 0)}
                          </span>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Package className="h-4 w-4 mr-1" />
                            {kit.equipments?.length || 0} itens
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </Grid>
            </div>
          </Card>
        )}

        {/* Call to Action para usuários sem reservas */}
        {stats?.totalBookings === 0 && (
          <Card className="mt-8">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Comece sua primeira reserva!
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Descubra nossa seleção de equipamentos profissionais e faça sua primeira reserva.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate('/')}
                  leftIcon={<Package className="h-5 w-5" />}
                >
                  Ver Equipamentos
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/kits')}
                  leftIcon={<Star className="h-5 w-5" />}
                >
                  Explorar Kits
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Recomendações Personalizadas */}
        {personalized.recommendations.length > 0 && (
          <div className="mt-8">
            <RecommendationSection
              type="personalized"
              items={personalized.recommendations}
              maxItems={4}
              loading={personalized.loading}
              viewAllLink="/equipamentos"
              viewAllText="Ver Mais Recomendações"
              columns={{ sm: 1, md: 2, lg: 4 }}
            />
          </div>
        )}

        {/* Tendências */}
        {trending.recommendations.length > 0 && (
          <div className="mt-8">
            <RecommendationSection
              type="trending"
              items={trending.recommendations}
              maxItems={4}
              loading={trending.loading}
              viewAllLink="/equipamentos"
              viewAllText="Ver Todos os Populares"
              columns={{ sm: 1, md: 2, lg: 4 }}
            />
          </div>
        )}

        {/* Novidades */}
        {newItems.recommendations.length > 0 && (
          <div className="mt-8">
            <RecommendationSection
              type="new"
              items={newItems.recommendations}
              maxItems={4}
              loading={newItems.loading}
              viewAllLink="/equipamentos"
              viewAllText="Ver Todas as Novidades"
              columns={{ sm: 1, md: 2, lg: 4 }}
            />
          </div>
        )}
      </div>
      {reviewBookingId && (
        <ReviewModal
          bookingId={reviewBookingId}
          onClose={() => setReviewBookingId(null)}
          onSuccess={() => {
            setReviewBookingId(null);
          }}
        />
      )}
    </div>
  );
};
